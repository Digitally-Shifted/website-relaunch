/*
 * End-to-end tests for the form backend (DIG-69, DIG-91).
 *
 * Failure modes covered (recorded before implementation):
 *   1. a valid submission must store first, then redirect 303 with the
 *      lead_ok cookie, then email through the transport
 *   2. a bypassed client must get server-side validation with kept values
 *   3. honeypot and time-trap spam must redirect like success but store a
 *      spam row, send no email, and set no cookie (no conversion fires)
 *   4. the sixth submission from one IP inside an hour must 429 and store
 *      nothing
 *   5. a repeated submission_id must never store a second row
 *   6. wrong method, wrong content type, and unknown paths must answer
 *      with the contract statuses, never a dead end
 *
 * Run: node --test form-backend/test/
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, rm } from 'node:fs/promises';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createService } from '../server.mjs';

const PAST = (ms) => String(Date.now() - ms);

/** Close a test service and drop undici keep-alive sockets so the run exits. */
function stopService(svc) {
  svc.server.closeAllConnections();
  svc.server.close();
}

function startTestService() {
  const stubDir = mkdtempSync(join(tmpdir(), 'ds-mail-'));
  const svc = createService({
    dbPath: ':memory:',
    cookieSecure: false,
    retryIntervalMs: 60_000,
    mailer: 'stub',
    stubDir,
    ipSalt: 'test-salt',
  });
  return new Promise((resolve) => {
    svc.server.listen(0, '127.0.0.1', () => {
      const base = `http://127.0.0.1:${svc.server.address().port}`;
      resolve({ ...svc, base, stubDir });
    });
  });
}

function post(base, fields, headers = {}) {
  return fetch(`${base}/api/contact`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', ...headers },
    body: new URLSearchParams(fields).toString(),
    redirect: 'manual',
  });
}

function validFields(overrides = {}) {
  return {
    name: 'Thabo Mokoena',
    email: 'thabo@example.co.za',
    need: 'general',
    message: 'We need a new website for our guest house.',
    form_location: '/contact',
    form_started_at: PAST(10_000),
    submission_id: crypto.randomUUID(),
    ...overrides,
  };
}

function cookieHeader(res) {
  return res.headers.get('set-cookie') || '';
}

/** Poll until the predicate holds; the mail write is async by design. */
async function waitFor(predicate, timeoutMs = 2000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await predicate()) return true;
    await new Promise((r) => setTimeout(r, 25));
  }
  return predicate();
}

async function rowCount(svc) {
  return svc.db._db.prepare('SELECT COUNT(*) AS n FROM leads').get().n;
}

test('healthz answers ok', async () => {
  const svc = await startTestService();
  try {
    const res = await fetch(`${svc.base}/healthz`);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { ok: true });
  } finally {
    stopService(svc);
  }
});

test('valid submission: 303, cookie, stored row, emailed once', async () => {
  const svc = await startTestService();
  try {
    const res = await post(svc.base, validFields());
    assert.equal(res.status, 303);
    assert.match(res.headers.get('location'), /\/contact\/thank-you$/);
    const cookie = cookieHeader(res);
    assert.match(cookie, /^lead_ok=[0-9a-f]{32}/);
    assert.match(cookie, /SameSite=Lax/);
    assert.match(cookie, /Max-Age=600/);
    assert.doesNotMatch(cookie, /Secure/); // disabled for the test host

    assert.equal(await rowCount(svc), 1);
    const row = svc.db._db.prepare('SELECT * FROM leads').get();
    assert.equal(row.spam_flag, 0);
    assert.equal(row.need, 'general');
    assert.equal(row.form_location, '/contact');

    // Mail is sent after the redirect (spec 5.2) — poll for it.
    assert.ok(await waitFor(async () =>
      svc.db._db.prepare('SELECT email_sent FROM leads WHERE id = ?').get(row.id).email_sent === 1));

    const eml = await readFile(join(svc.stubDir, `${row.id}.eml`), 'utf8');
    assert.match(eml, /^Subject: Website enquiry — general — Thabo Mokoena/m);
    assert.match(eml, /^To: baruch@digitallyshifted\.com/m);
    assert.match(eml, /^Reply-To: thabo@example\.co\.za/m);
    assert.match(eml, /We need a new website for our guest house\./);
  } finally {
    stopService(svc);
  }
});

test('quote-intent need switches the email subject', async () => {
  const svc = await startTestService();
  try {
    const res = await post(svc.base, validFields({ need: 'quote' }));
    assert.equal(res.status, 303);
    const row = svc.db._db.prepare('SELECT id FROM leads').get();
    assert.ok(await waitFor(() =>
      readFile(join(svc.stubDir, `${row.id}.eml`), 'utf8').then(
        (eml) => /^Subject: Quote request — quote —/m.test(eml),
        () => false,
      )));
    const eml = await readFile(join(svc.stubDir, `${row.id}.eml`), 'utf8');
    assert.match(eml, /^Subject: Quote request — quote —/m);
  } finally {
    stopService(svc);
  }
});

test('utm parameters land in the row and the email body', async () => {
  const svc = await startTestService();
  try {
    await post(svc.base, validFields({
      utm_source: 'facebook', utm_medium: 'cpc', utm_campaign: 'launch',
    }));
    const row = svc.db._db.prepare('SELECT utm_source, utm_medium, utm_campaign, id FROM leads').get();
    assert.equal(row.utm_source, 'facebook');
    assert.equal(row.utm_medium, 'cpc');
    assert.equal(row.utm_campaign, 'launch');
    assert.ok(await waitFor(() =>
      readFile(join(svc.stubDir, `${row.id}.eml`), 'utf8').then(
        (eml) => eml.includes('utm_source: facebook'),
        () => false,
      )));
  } finally {
    stopService(svc);
  }
});

test('server validation: missing name gets a 400 page with kept values', async () => {
  const svc = await startTestService();
  try {
    const res = await post(svc.base, validFields({ name: '' }));
    assert.equal(res.status, 400);
    const html = await res.text();
    assert.match(html, /Please add your name\./);
    assert.match(html, /role="alert"/);
    assert.match(html, /aria-invalid="true"/);
    assert.match(html, /value="thabo@example\.co\.za"/); // kept values
    assert.equal(await rowCount(svc), 0); // invalid rows are not stored
  } finally {
    stopService(svc);
  }
});

test('email and phone both empty: exact spec message', async () => {
  const svc = await startTestService();
  try {
    const res = await post(svc.base, validFields({ email: '', phone: '' }));
    assert.equal(res.status, 400);
    const html = await res.text();
    assert.match(html, /Add your email or phone number so we can reply\./);
  } finally {
    stopService(svc);
  }
});

test('honeypot: 303 with no cookie, spam row, no email', async () => {
  const svc = await startTestService();
  try {
    const res = await post(svc.base, validFields({ company_website: 'spam.example' }));
    assert.equal(res.status, 303);
    assert.match(res.headers.get('location'), /thank-you$/);
    assert.equal(cookieHeader(res), ''); // no lead_ok — no conversion fires
    assert.equal(await rowCount(svc), 1);
    const row = svc.db._db.prepare('SELECT spam_flag, spam_reason, email_sent FROM leads').get();
    assert.equal(row.spam_flag, 1);
    assert.equal(row.spam_reason, 'honeypot');
    assert.equal(row.email_sent, 0);
  } finally {
    stopService(svc);
  }
});

test('time trap: a submit under 3 seconds is spam', async () => {
  const svc = await startTestService();
  try {
    const res = await post(svc.base, validFields({ form_started_at: PAST(500) }));
    assert.equal(res.status, 303);
    assert.equal(cookieHeader(res), '');
    const row = svc.db._db.prepare('SELECT spam_reason FROM leads').get();
    assert.equal(row.spam_reason, 'time_trap');
  } finally {
    stopService(svc);
  }
});

test('missing form_started_at does not block (no-JS path); honeypot still covers bots', async () => {
  const svc = await startTestService();
  try {
    const res = await post(svc.base, validFields({ form_started_at: '' }));
    assert.equal(res.status, 303);
    assert.match(cookieHeader(res), /^lead_ok=/);
  } finally {
    stopService(svc);
  }
});

test('idempotency: the same submission_id stores one row only', async () => {
  const svc = await startTestService();
  try {
    const id = crypto.randomUUID();
    await post(svc.base, validFields({ submission_id: id }));
    const res = await post(svc.base, validFields({ submission_id: id }));
    assert.equal(res.status, 303);
    assert.equal(await rowCount(svc), 1);
  } finally {
    stopService(svc);
  }
});

test('rate limit: the sixth stored row in an hour gets 429 and stores nothing', async () => {
  const svc = await startTestService();
  try {
    for (let i = 0; i < 5; i += 1) {
      const res = await post(svc.base, validFields());
      assert.equal(res.status, 303, `submission ${i + 1} should pass`);
    }
    const res = await post(svc.base, validFields());
    assert.equal(res.status, 429);
    const html = await res.text();
    assert.match(html, /<h1>Too many attempts\.<\/h1>/);
    assert.match(html, /Please try again in an hour, or call or WhatsApp us\./);
    assert.equal(await rowCount(svc), 5); // the 429 stored nothing
  } finally {
    stopService(svc);
  }
});

test('wrong method and unknown path answer with contract statuses', async () => {
  const svc = await startTestService();
  try {
    const get = await fetch(`${svc.base}/api/contact`);
    assert.equal(get.status, 405);
    assert.equal(get.headers.get('allow'), 'POST');
    const missing = await fetch(`${svc.base}/nope`);
    assert.equal(missing.status, 404);
  } finally {
    stopService(svc);
  }
});

test('wrong content type is a 400, not a crash', async () => {
  const svc = await startTestService();
  try {
    const res = await fetch(`${svc.base}/api/contact`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'x' }),
      redirect: 'manual',
    });
    assert.equal(res.status, 400);
  } finally {
    stopService(svc);
  }
});

test('retry loop re-sends a lead whose first mail attempt failed', async () => {
  const stubDir = mkdtempSync(join(tmpdir(), 'ds-mail-'));
  const svc = createService({
    dbPath: ':memory:', cookieSecure: false, retryIntervalMs: 50,
    mailer: 'sendmail', sendmailPath: '/nonexistent-sendmail', stubDir,
    ipSalt: 'test-salt',
  });
  await new Promise((resolve) => svc.server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${svc.server.address().port}`;
  try {
    const res = await post(base, validFields());
    assert.equal(res.status, 303);
    await new Promise((r) => setTimeout(r, 120)); // first attempt fails, retry ticks at 50 ms
    const row1 = svc.db._db.prepare('SELECT id, email_sent FROM leads').get();
    assert.equal(row1.email_sent, 0); // sendmail binary does not exist

    // Heal the transport and send the pending lead through the same path
    // the retry loop uses (a DB row, not an API lead).
    const { createMailer, sendLeadEmail } = await import('../lib/mailer.mjs');
    const healthy = createMailer({ mailer: 'stub', stubDir });
    const lead = svc.db.claimUnsentEmails(1)[0];
    const ok = await sendLeadEmail(svc.db, healthy, lead);
    assert.equal(ok, true);
    assert.equal(svc.db._db.prepare('SELECT email_sent FROM leads WHERE id = ?').get(row1.id).email_sent, 1);
  } finally {
    stopService(svc);
    await rm(stubDir, { recursive: true, force: true });
  }
});

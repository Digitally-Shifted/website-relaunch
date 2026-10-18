#!/usr/bin/env node
/*
 * Form backend for digitallyshifted.com (DIG-69, DIG-91).
 *
 * Implements the server contract in docs/conversion-spec.md section 4.4:
 *
 *   POST /api/contact   application/x-www-form-urlencoded
 *     success          -> 303 to {BASE_PATH}/contact/thank-you + lead_ok cookie
 *     validation error -> 400 page, values kept, per-field messages
 *     spam             -> 303, spam row stored (spam_flag=1), NO cookie
 *     rate limited     -> 429 page (5 stored rows per IP per hour)
 *     server error     -> 500 page
 *   GET  /healthz       -> 200 {"ok":true}
 *
 * Storage: SQLite leads table (spec 5.1), zero npm dependencies.
 * Email: one mail per non-spam row, retried every 5 minutes up to 3 times;
 * a failed email never blocks the redirect (spec 5.2).
 *
 * Env: PORT, HOST, DB_PATH, BASE_PATH, TRUST_PROXY, LEAD_COOKIE_SECURE,
 *      COOKIE_SECRET, MAILER, MAIL_TO, MAIL_FROM, MAIL_STUB_DIR,
 *      SENDMAIL_PATH, AGENTMAIL_API_KEY, AGENTMAIL_INBOX, SITE_ORIGIN,
 *      MOUNT_PATH (cPanel/Passenger: the Application URL the host mounts
 *      this app under, for example /api — the host strips it from some
 *      requests and not others, so the router accepts both forms).
 */
import { createServer } from 'node:http';
import { randomBytes, randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  openDb, makeIpHasher,
} from './lib/db.mjs';
import {
  validate, isFormContentType, readFormBody, spamCheck, clientIp, leadCookieValue,
} from './lib/spam.mjs';
import { createMailer, sendLeadEmail, startRetryLoop } from './lib/mailer.mjs';
import {
  renderValidationError, renderRateLimited, renderServerError, renderNotFound,
} from './lib/pages.mjs';

// Select options with labels for the 400 fallback page. Values and labels
// must stay in sync with src/lib/site.config.ts (the site renders the
// live form and exports needOptions).
export const NEED_OPTIONS = [
  { value: 'general', label: 'General enquiry' },
  { value: 'new-website', label: 'A new website' },
  { value: 'redesign', label: 'A redesign or upgrade' },
  { value: 'waas', label: 'Website-as-a-Service (monthly plan)' },
  { value: 'seo', label: 'SEO' },
  { value: 'hosting', label: 'Hosting or management' },
  { value: 'quote', label: 'Not sure — I want prices' },
];

const HERE = dirname(fileURLToPath(import.meta.url));

export function defaultConfig(env = process.env) {
  return {
    port: Number(env.PORT || 8787),
    host: env.HOST || '127.0.0.1',
    dbPath: env.DB_PATH || join(HERE, 'leads.db'),
    basePath: (env.BASE_PATH || '').replace(/\/$/, ''),
    trustProxy: env.TRUST_PROXY === 'true',
    cookieSecure: env.LEAD_COOKIE_SECURE !== 'false',
    cookieSecret: env.COOKIE_SECRET || randomBytes(32).toString('hex'),
    mailer: env.MAILER || 'stub',
    mailTo: env.MAIL_TO || 'baruch@digitallyshifted.com',
    mailFrom: env.MAIL_FROM || 'no-reply@digitallyshifted.com',
    stubDir: env.MAIL_STUB_DIR || join(HERE, 'mail-stub'),
    sendmailPath: env.SENDMAIL_PATH || '/usr/sbin/sendmail',
    agentmailApiKey: env.AGENTMAIL_API_KEY,
    agentmailInbox: env.AGENTMAIL_INBOX,
    siteOrigin: env.SITE_ORIGIN || 'https://digitallyshifted.com',
    mountPath: (env.MOUNT_PATH || '').replace(/\/$/, ''),
    retryIntervalMs: 0, // 0 keeps the production default (5 min); tests set a small value
  };
}

/**
 * Build the service. Returns { server, db, config } — the server is not
 * listening yet. The production entry point below starts and stays up.
 */
export function createService(overrides = {}) {
  const config = { ...defaultConfig(), ...overrides };
  const db = openDb(config.dbPath);
  const ipHashOf = makeIpHasher(db, overrides.ipSalt);
  const mailer = createMailer(config);

  const setLeadCookie = (res, value) => {
    const flags = ['Path=/', 'SameSite=Lax', 'Max-Age=600'];
    if (config.cookieSecure) flags.push('Secure');
    res.setHeader('Set-Cookie', `lead_ok=${value}; ${flags.join('; ')}`);
  };
  const redirect = (res, location) => {
    res.writeHead(303, { Location: location });
    res.end();
  };
  const html = (res, status, body) => {
    res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(body);
  };

  function processSubmission(req, res, raw) {
    if (!isFormContentType(req.headers['content-type'])) {
      html(res, 400, renderValidationError({
        values: {}, errors: { message: 'Please add a short message (up to 5000 characters).' },
        needOptions: NEED_OPTIONS, location: '/contact',
      }));
      return;
    }
    const body = readFormBody(raw);
    if (!body) {
      html(res, 400, renderValidationError({
        values: {}, errors: { message: 'Please add a short message (up to 5000 characters).' },
        needOptions: NEED_OPTIONS, location: '/contact',
      }));
      return;
    }

    const ipHash = ipHashOf(clientIp(req, config.trustProxy));

    // Rate limit first: 5 stored rows per IP per hour; a 429 stores
    // nothing, so being blocked does not extend the block (spec 6).
    if (db.recentRowCount(ipHash) >= 5) {
      html(res, 429, renderRateLimited());
      return;
    }

    const submissionId = (body.submission_id || '').trim();
    const { values, errors } = validate(body);

    if (Object.keys(errors).length > 0) {
      html(res, 400, renderValidationError({
        values: { ...values, submission_id: submissionId, form_started_at: body.form_started_at },
        errors, needOptions: NEED_OPTIONS,
        location: (body.form_location || '/contact').slice(0, 200),
      }));
      return;
    }

    // Idempotency: a repeated submission_id stores nothing again (spec 4.4).
    if (db.submissionExists(submissionId)) {
      setLeadCookie(res, leadCookieValue(config.cookieSecret, submissionId));
      redirect(res, `${config.basePath}/contact/thank-you`);
      return;
    }

    const { spam, reason } = spamCheck(body);
    const id = submissionId || randomUUID();
    const lead = {
      id,
      createdAt: new Date().toISOString(),
      name: values.name,
      email: values.email,
      phone: values.phone,
      business: values.business,
      need: values.need,
      message: values.message,
      formLocation: (body.form_location || '/contact').slice(0, 200),
      utmSource: (body.utm_source || '').slice(0, 200) || null,
      utmMedium: (body.utm_medium || '').slice(0, 200) || null,
      utmCampaign: (body.utm_campaign || '').slice(0, 200) || null,
      userAgent: (req.headers['user-agent'] || '').slice(0, 300),
      ipHash,
      spamFlag: spam,
      spamReason: reason,
    };
    db.insertLead(lead);

    if (spam) {
      // Spam: the row feeds the spam rules and the rate limit, the visitor
      // sees the normal redirect, but no cookie — the thank-you page must
      // fire no conversion event (spec 6, 7.2).
      redirect(res, `${config.basePath}/contact/thank-you`);
      return;
    }

    setLeadCookie(res, leadCookieValue(config.cookieSecret, id));
    redirect(res, `${config.basePath}/contact/thank-you`);

    // Notify after the redirect is already on the wire (store first,
    // notify after; a failed email never blocks the visitor).
    sendLeadEmail(db, mailer, {
      ...lead,
      quoteIntent: ['new-website', 'redesign', 'waas', 'quote'].includes(lead.need),
    }).catch((err) => console.error('[form-backend] mail error:', err.message));
  }

  const server = createServer((req, res) => {
    try {
      let path = (req.url || '/').split('?')[0];
      /* cPanel/Passenger mounts: some hosts hand the app the full path
       * (/api/contact), some strip the Application URL (/contact). Accept
       * both so the same env works everywhere. */
      if (config.mountPath) {
        if (path.startsWith(`${config.mountPath}/`)) {
          path = path.slice(config.mountPath.length);
        }
        /* Host stripped the mount: the contact route arrives as /contact. */
        if (path === '/contact') path = '/api/contact';
      }
      if (path === '/healthz') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
        return;
      }
      if (path === '/api/contact') {
        if (req.method !== 'POST') {
          res.writeHead(405, { Allow: 'POST', 'Content-Type': 'text/html; charset=utf-8' });
          res.end(renderNotFound());
          return;
        }
        let raw = '';
        let overflow = false;
        req.on('data', (chunk) => {
          raw += chunk;
          if (raw.length > 64 * 1024) {
            overflow = true;
            req.destroy();
          }
        });
        req.on('end', () => {
          if (overflow) return;
          try {
            processSubmission(req, res, raw);
          } catch (err) {
            console.error('[form-backend] submission error:', err);
            html(res, 500, renderServerError());
          }
        });
        return;
      }
      html(res, 404, renderNotFound());
    } catch (err) {
      console.error('[form-backend] request error:', err);
      html(res, 500, renderServerError());
    }
  });

  return { server, db, config, mailer };
}

export function startService(overrides = {}) {
  const svc = createService(overrides);
  const retryMs = svc.config.retryIntervalMs > 0 ? svc.config.retryIntervalMs : 5 * 60 * 1000;
  const retryTimer = startRetryLoop(svc.db, svc.mailer, retryMs);
  return new Promise((resolve) => {
    svc.server.listen(svc.config.port, svc.config.host, () => resolve({ ...svc, retryTimer }));
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  startService().then(({ config }) => {
    console.log(`[form-backend] listening on ${config.host}:${config.port} (mailer=${config.mailer}, db=${config.dbPath})`);
  });
  const shutdown = () => process.exit(0);
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

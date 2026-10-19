/*
 * Email notification (conversion spec section 5.2).
 *
 * One email per non-spam submission, sent after the row is stored. A
 * failed send never blocks the visitor's redirect: the row keeps
 * email_sent = 0 and a background retry runs every 5 minutes, up to 3
 * attempts (spec 5.2 failure handling).
 *
 * Transports (MAILER env):
 *   stub       — writes RFC-ish .eml files into MAIL_STUB_DIR. Tests and
 *                local runs; no network.
 *   sendmail   — pipes through the sendmail binary (default
 *                /usr/sbin/sendmail), the classic host path.
 *   agentmail  — POSTs to the AgentMail API, the company's existing mail
 *                path (same as monitoring/notify.sh). Needs
 *                AGENTMAIL_API_KEY and AGENTMAIL_INBOX.
 */
import { spawn } from 'node:child_process';
import { appendFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

const RETRY_INTERVAL_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 3;

export function createMailer(options) {
  const o = {
    mailer: 'stub',
    mailTo: 'baruch@digitallyshifted.com',
    mailFrom: 'no-reply@digitallyshifted.com',
    stubDir: './mail-stub',
    sendmailPath: '/usr/sbin/sendmail',
    agentmailUrl: 'https://api.agentmail.to/v0/inboxes',
    ...options,
  };

  async function send(message) {
    switch (o.mailer) {
      case 'stub':
        await mkdir(o.stubDir, { recursive: true });
        await appendFile(
          join(o.stubDir, `${message.leadId}.eml`),
          `From: ${o.mailFrom}\nTo: ${o.mailTo}\nReply-To: ${message.replyTo || o.mailFrom}\nSubject: ${message.subject}\nDate: ${new Date().toUTCString()}\n\n${message.body}\n`,
        );
        return true;
      case 'sendmail':
        return new Promise((resolve) => {
          const child = spawn(o.sendmailPath, ['-t'], { stdio: ['pipe', 'ignore', 'ignore'] });
          let failed = false;
          child.on('error', () => resolve(false));
          child.on('close', (code) => resolve(!failed && code === 0));
          child.stdin.on('error', () => {
            failed = true;
            resolve(false);
          });
          child.stdin.end(
            `To: ${o.mailTo}\nFrom: ${o.mailFrom}\nReply-To: ${message.replyTo || o.mailFrom}\nSubject: ${message.subject}\nContent-Type: text/plain; charset=utf-8\n\n${message.body}\n`,
          );
        });
      case 'agentmail': {
        if (!o.agentmailApiKey || !o.agentmailInbox) return false;
        try {
          const res = await fetch(`${o.agentmailUrl}/${o.agentmailInbox}/messages`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${o.agentmailApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              to: [o.mailTo],
              replyTo: message.replyTo || undefined,
              subject: message.subject,
              text: message.body,
            }),
            signal: AbortSignal.timeout(20_000),
          });
          return res.ok;
        } catch {
          return false;
        }
      }
      default:
        return false;
    }
  }

  return { send };
}

/** RFC 5322-safe subject line (no newlines from submitted values). */
export function subjectFor(lead) {
  const need = lead.need;
  const name = lead.name.replace(/[\r\n]+/g, ' ').slice(0, 60);
  return lead.quoteIntent
    ? `Quote request — ${need} — ${name}`
    : `Website enquiry — ${need} — ${name}`;
}

/** Plain-text body per spec 5.2: every field, SAST time, id, UTM. */
export function bodyFor(lead, siteOrigin) {
  const sast = new Date(new Date(lead.createdAt).getTime() + 2 * 60 * 60 * 1000)
    .toISOString()
    .replace('T', ' ')
    .slice(0, 16);
  const utm = [
    lead.utmSource && `utm_source: ${lead.utmSource}`,
    lead.utmMedium && `utm_medium: ${lead.utmMedium}`,
    lead.utmCampaign && `utm_campaign: ${lead.utmCampaign}`,
  ]
    .filter(Boolean)
    .join('\n');
  return [
    `New website enquiry (lead ${lead.id})`,
    ``,
    `Received: ${sast} SAST`,
    `Page: ${lead.formLocation}`,
    `Name: ${lead.name}`,
    `Email: ${lead.email || '—'}`,
    `Phone: ${lead.phone || '—'}`,
    `Business: ${lead.business || '—'}`,
    `What they need: ${lead.need}`,
    ``,
    `Message:`,
    lead.message,
    utm ? `\nCampaign:\n${utm}` : '',
    ``,
    `Spam flag: ${lead.spamFlag ? 'yes' : 'no'}`,
    `Reply in the thread or at the addresses above.`,
    siteOrigin ? `Site: ${siteOrigin}` : '',
  ]
    .filter((line) => line !== '')
    .join('\n');
}

/** Normalize either an API lead (camelCase) or a DB row (snake_case). */
function normalizeLead(lead) {
  return {
    ...lead,
    id: lead.id,
    createdAt: lead.createdAt ?? lead.created_at,
    formLocation: lead.formLocation ?? lead.form_location,
    utmSource: lead.utmSource ?? lead.utm_source,
    utmMedium: lead.utmMedium ?? lead.utm_medium,
    utmCampaign: lead.utmCampaign ?? lead.utm_campaign,
    spamFlag: Boolean(lead.spamFlag ?? lead.spam_flag),
  };
}

/**
 * Send one lead now; on failure leave email_sent = 0 for the retry loop.
 * Returns true when sent.
 */
export async function sendLeadEmail(db, mailer, rawLead) {
  const lead = normalizeLead(rawLead);
  const message = {
    leadId: lead.id,
    replyTo: lead.email || undefined,
    subject: subjectFor(lead),
    body: bodyFor(lead),
  };
  const ok = await mailer.send(message);
  if (ok) {
    db.markEmailResult(lead.id, true);
    return true;
  }
  const attempts = db.bumpEmailAttempts(lead.id);
  console.error(`[form-backend] email attempt ${attempts} failed for ${lead.id}`);
  return false;
}

/** Background retry every 5 minutes, max 3 attempts per lead. */
export function startRetryLoop(db, mailer, intervalMs = RETRY_INTERVAL_MS) {
  return setInterval(async () => {
    try {
      const pending = db.claimUnsentEmails();
      for (const row of pending) {
        if (db.mailAttempts(row.id) >= MAX_ATTEMPTS) continue;
        const lead = {
          ...row,
          quoteIntent: false,
          spamFlag: false,
        };
        await sendLeadEmail(db, mailer, lead);
      }
    } catch (err) {
      console.error('[form-backend] retry loop error:', err.message);
    }
  }, intervalMs).unref();
}

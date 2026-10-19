/*
 * Leads database (conversion spec section 5.1).
 *
 * SQLite through node:sqlite (Node >= 24, zero dependencies). One row per
 * submission, spam rows included — they are the evidence for tuning the
 * spam rules and they count toward the rate limit.
 */
import { DatabaseSync } from 'node:sqlite';
import { createHash, randomBytes } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS leads (
  id            TEXT PRIMARY KEY,
  created_at    TEXT NOT NULL,
  name          TEXT NOT NULL,
  email         TEXT,
  phone         TEXT,
  business      TEXT,
  need          TEXT NOT NULL,
  message       TEXT NOT NULL,
  form_location TEXT NOT NULL,
  utm_source    TEXT,
  utm_medium    TEXT,
  utm_campaign  TEXT,
  user_agent    TEXT,
  ip_hash       TEXT,
  spam_flag     INTEGER NOT NULL DEFAULT 0,
  spam_reason   TEXT,
  email_sent    INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_leads_ip_time ON leads (ip_hash, created_at);
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads (email_sent, created_at);
`;

class LeadsDb {
  constructor(dbPath) {
    if (dbPath !== ':memory:') mkdirSync(dirname(dbPath), { recursive: true });
    this._db = new DatabaseSync(dbPath);
    this._db.exec(SCHEMA);
  }

  submissionExists(submissionId) {
    if (!submissionId) return false;
    return this._db.prepare('SELECT 1 FROM leads WHERE id = ?').get(submissionId) !== undefined;
  }

  /** Rows stored for this ip_hash in the last hour (spam rows included). */
  recentRowCount(ipHash, now = Date.now()) {
    const cutoff = new Date(now - 60 * 60 * 1000).toISOString();
    return this._db.prepare('SELECT COUNT(*) AS n FROM leads WHERE ip_hash = ? AND created_at > ?').get(ipHash, cutoff).n;
  }

  insertLead(lead) {
    this._db.prepare(`INSERT INTO leads (
        id, created_at, name, email, phone, business, need, message,
        form_location, utm_source, utm_medium, utm_campaign, user_agent,
        ip_hash, spam_flag, spam_reason, email_sent
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`)
      .run(
        lead.id, lead.createdAt, lead.name, lead.email, lead.phone, lead.business,
        lead.need, lead.message, lead.formLocation, lead.utmSource, lead.utmMedium,
        lead.utmCampaign, lead.userAgent, lead.ipHash, lead.spamFlag ? 1 : 0,
        lead.spamReason ?? null,
      );
  }

  claimUnsentEmails(limit = 20) {
    return this._db.prepare(`SELECT id, name, email, phone, business, need, message,
        form_location, utm_source, utm_medium, utm_campaign, created_at
      FROM leads WHERE spam_flag = 0 AND email_sent = 0 ORDER BY created_at LIMIT ?`)
      .all(limit);
  }

  markEmailResult(id, sent) {
    this._db.prepare('UPDATE leads SET email_sent = ? WHERE id = ?').run(sent ? 1 : 0, id);
  }

  bumpEmailAttempts(id) {
    // Attempts live in meta per lead; three failures leave email_sent = 0.
    const key = `mail_attempts:${id}`;
    const row = this._db.prepare('SELECT value FROM meta WHERE key = ?').get(key);
    const attempts = (row ? Number(row.value) : 0) + 1;
    this._db.prepare('INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
      .run(key, String(attempts));
    return attempts;
  }

  mailAttempts(id) {
    const row = this._db.prepare('SELECT value FROM meta WHERE key = ?').get(`mail_attempts:${id}`);
    return row ? Number(row.value) : 0;
  }

  /** Daily salt so a stored ip_hash only identifies one day of traffic.
   * Persisted so restarts within a day keep counting the same visitors. */
  ipSalt(envSalt) {
    const day = new Date().toISOString().slice(0, 10);
    if (envSalt) return envSalt;
    const row = this._db.prepare('SELECT value FROM meta WHERE key = ?').get('ip_salt');
    if (row && row.value && row.value.startsWith(`${day}:`)) {
      return row.value.slice(day.length + 1);
    }
    const salt = randomBytes(16).toString('hex');
    this._db.prepare('INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
      .run('ip_salt', `${day}:${salt}`);
    return salt;
  }
}

export function openDb(dbPath) {
  return new LeadsDb(dbPath);
}

export function makeIpHasher(db, envSalt) {
  const salt = db.ipSalt(envSalt);
  return (ip) => createHash('sha256').update(`${ip}|${salt}`).digest('hex');
}

/*
 * Field validation and spam checks (conversion spec sections 4, 6).
 *
 * Validation mirrors the client rules so bypassed client checks still
 * produce a usable 400 page. Spam checks: honeypot, time trap, rate limit.
 * A missing form_started_at skips the time check so a no-JS submission is
 * not rejected; the honeypot and the rate limit still cover it.
 */
import { createHmac } from 'node:crypto';

export const NEED_VALUES = ['general', 'new-website', 'redesign', 'waas', 'seo', 'hosting', 'quote'];
export const QUOTE_INTENT = new Set(['new-website', 'redesign', 'waas', 'quote']);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^\+?[0-9][0-9\s()-]{5,20}$/;

const s = (v) => (typeof v === 'string' ? v.trim() : '');

/**
 * Validate one submission. Returns { values, errors } where errors maps a
 * field name to its message; an empty errors object means valid.
 */
export function validate(body) {
  const values = {
    name: s(body.name),
    email: s(body.email).toLowerCase(),
    phone: s(body.phone),
    business: s(body.business),
    need: s(body.need) || 'general',
    message: s(body.message),
  };
  const errors = {};
  if (!values.name || values.name.length > 100) errors.name = 'Please add your name.';
  if (values.email && !EMAIL_RE.test(values.email)) errors.email = 'That email address does not look right.';
  if (values.phone && !PHONE_RE.test(values.phone)) errors.phone = 'That phone number does not look right.';
  if (values.business.length > 120) errors.business = 'Please keep the business name under 120 characters.';
  if (!NEED_VALUES.includes(values.need)) errors.need = 'Please choose what you need.';
  if (!values.message || values.message.length > 5000) errors.message = 'Please add a short message (up to 5000 characters).';
  if (!values.email && !values.phone && !errors.email && !errors.phone) {
    errors.email = 'Add your email or phone number so we can reply.';
  }
  return { values, errors };
}

/** Content-Type must be the form encoding the browser posts naturally. */
export function isFormContentType(contentType = '') {
  return contentType.split(';')[0].trim().toLowerCase() === 'application/x-www-form-urlencoded';
}

/**
 * Parse an urlencoded body. Returns null when the body is too large or
 * malformed. Limit: 64 KB, far above the largest legitimate submission.
 */
export function readFormBody(raw, maxBytes = 64 * 1024) {
  if (raw.length > maxBytes) return null;
  const params = new URLSearchParams(raw);
  return Object.fromEntries(params.entries());
}

/**
 * Spam verdict on the submission content. The rate limit lives in the
 * server: it answers 429 before a row is stored, while honeypot and time
 * trap store a spam row that still counts toward the limit (spec 6).
 * Returns { spam, reason } — reason is null for a clean submission.
 */
export function spamCheck(body) {
  if (s(body.company_website).length > 0) {
    return { spam: true, reason: 'honeypot' };
  }
  const started = Number(body.form_started_at);
  if (Number.isFinite(started) && started > 0 && Date.now() - started < 3000) {
    return { spam: true, reason: 'time_trap' };
  }
  return { spam: false, reason: null };
}

/**
 * Request-ip extractor for the proxy setups in the runbook: a reverse
 * proxy sets X-Forwarded-For; a direct host socket needs no header.
 */
export function clientIp(req, trustProxy) {
  if (trustProxy) {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.length > 0) {
      return forwarded.split(',')[0].trim();
    }
  }
  return req.socket.remoteAddress || 'unknown';
}

/** HMAC for the lead_ok cookie value (security review E2: unguessable). */
export function leadCookieValue(secret, submissionId) {
  return createHmac('sha256', secret).update(submissionId).digest('hex').slice(0, 32);
}

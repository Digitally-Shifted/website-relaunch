/*
 * Regression tests for the contact form behaviour module
 * (src/scripts/contact-form.js). DIG-88.
 *
 * Run: node --test test/contact-form-behavior.test.mjs
 *
 * The module takes its environment through injection, so these tests run
 * without a browser: a fake element tree stands in for the form, and a
 * fake request stands in for fetch. Each test drives the real module code
 * that ships to the browser.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  MIN_SUBMIT_MS,
  MESSAGES,
  isQuoteIntent,
  normaliseNeed,
  setupContactForm,
  validateContactFields,
} from '../src/scripts/contact-form.js';

/* ---------- fake element tree ---------- */

function makeControl(overrides = {}) {
  const listeners = {};
  return {
    value: '',
    disabled: false,
    hidden: false,
    textContent: '',
    options: [],
    selectedOptions: [{ textContent: 'General enquiry' }],
    addEventListener(name, fn) {
      (listeners[name] = listeners[name] || []).push(fn);
    },
    async emit(name, event) {
      for (const fn of listeners[name] || []) await fn(event);
    },
    setAttribute(key, value) {
      this[`attr:${key}`] = value;
    },
    focus() {
      this.focused = true;
    },
    ...overrides,
  };
}

function makeForm(options = {}) {
  const summary = makeControl({ hidden: true });
  const status = makeControl({ hidden: true });
  const fallback = makeControl({ hidden: true });
  const button = makeControl({ textContent: 'Send enquiry' });
  /* Landing-page mode (spec 3.8, DIG-133): no need select and no business
     field render; data-need carries the fixed value instead. */
  const need = options.landingPage
    ? null
    : makeControl({
        options: [
          { value: 'general' },
          { value: 'new-website' },
          { value: 'redesign' },
          { value: 'waas' },
          { value: 'seo' },
          { value: 'hosting' },
          { value: 'quote' },
        ],
        value: 'general',
      });
  const fields = {
    name: makeControl(),
    email: makeControl(),
    phone: makeControl(),
    business: makeControl(),
    message: makeControl(),
    company_website: makeControl(),
  };
  const errors = {};
  for (const key of ['name', 'email', 'phone', 'business', 'need', 'message']) {
    errors[key] = makeControl({ hidden: true });
  }

  const hidden = {};
  for (const key of ['form_started_at', 'submission_id', 'utm_source', 'utm_medium', 'utm_campaign']) {
    hidden[key] = makeControl({ value: '' });
  }

  const bySelector = new Map([
    ['[data-ds-field="need"]', need],
    ['[data-ds-field="name"]', fields.name],
    ['[data-ds-field="email"]', fields.email],
    ['[data-ds-field="phone"]', fields.phone],
    ['[data-ds-field="business"]', options.landingPage ? null : fields.business],
    ['[data-ds-field="message"]', fields.message],
    ['[data-ds-field="company_website"]', fields.company_website],
    ['[data-ds-submit]', button],
    ['[data-ds-summary]', summary],
    ['[data-ds-status]', status],
    ['[data-ds-fallback]', fallback],
    ['input[name="form_started_at"]', hidden.form_started_at],
    ['input[name="submission_id"]', hidden.submission_id],
    ['input[name="utm_source"]', hidden.utm_source],
    ['input[name="utm_medium"]', hidden.utm_medium],
    ['input[name="utm_campaign"]', hidden.utm_campaign],
  ]);
  for (const [key, slot] of Object.entries(errors)) {
    bySelector.set(`[data-ds-error-for="${key}"]`, slot);
  }

  const formListeners = {};
  const form = {
    ownerDocument: null,
    /* Defaults mirror the rendered component markup. */
    getAttribute(key) {
      const defaults = {
        'data-quote-needs': 'new-website,redesign,waas,quote',
        'data-quote-label': 'Request quote',
        'data-form-location': options.formLocation || '/contact',
        'data-need': options.landingPage ? options.fixedNeed || null : null,
        'data-message-optional': options.landingPage ? 'true' : null,
      };
      return this[`attr:${key}`] ?? defaults[key] ?? null;
    },
    setAttribute(key, value) {
      this[`attr:${key}`] = value;
    },
    addEventListener(name, fn) {
      (formListeners[name] = formListeners[name] || []).push(fn);
    },
    querySelector(selector) {
      return bySelector.get(selector) || null;
    },
    async submitEvent(event) {
      for (const fn of formListeners.submit || []) await fn(event);
    },
  };
  return { form, fields, need, button, summary, status, fallback, errors, hidden };
}

function makeEnv(overrides = {}) {
  const calls = { nowCalls: 0, stored: [] };
  const startAt = overrides.startAt ?? 10_000;
  const submitDelayMs = overrides.submitDelayMs ?? 60_000;
  const env = {
    locate: () => ({ href: overrides.href || 'https://digitallyshifted.com/contact' }),
    store: () => ({
      setItem(key, value) {
        calls.stored.push([key, value]);
      },
    }),
    uuid: () => 'fixed-submission-id',
    /* First call sets startedAt; the second is the submit moment. */
    now: () => {
      const value = calls.nowCalls++ === 0 ? startAt : startAt + submitDelayMs;
      calls.nowValues = calls.nowValues || [];
      calls.nowValues.push(value);
      return value;
    },
    ...overrides.env,
  };
  env.__calls = calls;
  return env;
}

function makeSubmitEvent() {
  return {
    defaultPrevented: false,
    preventDefault() {
      this.defaultPrevented = true;
    },
  };
}

/* ---------- pure helpers ---------- */

test('unknown ?need= values fall back to general and valid values pass through', () => {
  const valid = ['general', 'new-website', 'redesign', 'waas', 'seo', 'hosting', 'quote'];
  assert.equal(normaliseNeed('bogus', valid), 'general');
  assert.equal(normaliseNeed(undefined, valid), 'general');
  assert.equal(normaliseNeed('hosting', valid), 'hosting');
});

test('quote intent covers exactly the quote-intent needs', () => {
  const quoteNeeds = ['new-website', 'redesign', 'waas', 'quote'];
  assert.equal(isQuoteIntent('quote', quoteNeeds), true);
  assert.equal(isQuoteIntent('new-website', quoteNeeds), true);
  assert.equal(isQuoteIntent('general', quoteNeeds), false);
  assert.equal(isQuoteIntent('seo', quoteNeeds), false);
});

test('validation enforces name, the email-or-phone rule, and message', () => {
  const empty = validateContactFields({ name: '', email: '', phone: '', message: '' });
  assert.equal(empty.name, MESSAGES.name);
  assert.equal(empty.contactRoute, MESSAGES.contactRoute);
  assert.equal(empty.message, MESSAGES.message);

  const phoneOnly = validateContactFields({ name: 'A', email: '', phone: '0123', message: 'Hi' });
  assert.deepEqual(phoneOnly, {});

  const emailOnly = validateContactFields({ name: 'A', email: 'a@b.co', phone: '', message: 'Hi' });
  assert.deepEqual(emailOnly, {});

  const badEmail = validateContactFields({ name: 'A', email: 'not-an-email', phone: '', message: 'Hi' });
  assert.equal(badEmail.email, MESSAGES.email);
});

/* ---------- submission path (native POST to /api/contact) ---------- */

test('a valid submission fills the server contract fields and lets the POST run', async () => {
  const t = makeForm();
  const env = makeEnv({ startAt: 10_000, submitDelayMs: 60_000 });
  setupContactForm(t.form, env);
  t.fields.name.value = 'Thabo Mokoena';
  t.fields.email.value = 'thabo@example.co.za';
  t.fields.message.value = 'We need a website.';
  const event = makeSubmitEvent();
  await t.form.submitEvent(event);

  assert.equal(event.defaultPrevented, false, 'valid submit must run the native POST');
  assert.equal(t.hidden.form_started_at.value, '10000', 'form_started_at set at render');
  assert.equal(t.hidden.submission_id.value, 'fixed-submission-id');
  assert.equal(t.button.disabled, true, 'button disabled while in flight');
  assert.equal(t.button.textContent, 'Sending…');
  assert.equal(t.summary.hidden, true, 'no error summary on a valid submit');
});

test('a valid submission records lead_pending for the thank-you two-signal rule', async () => {
  const t = makeForm();
  const env = makeEnv();
  setupContactForm(t.form, env);
  t.fields.name.value = 'Thabo Mokoena';
  t.fields.email.value = 'thabo@example.co.za';
  t.fields.message.value = 'We need a website.';
  await t.form.submitEvent(makeSubmitEvent());

  assert.deepEqual(env.__calls.stored, [
    ['lead_pending', JSON.stringify({ need: 'general', form_location: '/contact' })],
  ]);
});

test('a quote-intent submission records the quote need in lead_pending', async () => {
  const t = makeForm();
  const env = makeEnv();
  setupContactForm(t.form, env);
  t.need.value = 'new-website';
  t.fields.name.value = 'Thabo Mokoena';
  t.fields.email.value = 'thabo@example.co.za';
  t.fields.message.value = 'We need a website.';
  await t.form.submitEvent(makeSubmitEvent());

  const pending = JSON.parse(env.__calls.stored[0][1]);
  assert.equal(pending.need, 'new-website');
  assert.equal(t.button.textContent, 'Sending…');
});

test('UTM parameters ride in hidden inputs and never in storage events', async () => {
  const t = makeForm();
  const env = makeEnv({ href: 'https://digitallyshifted.com/contact?utm_source=facebook&utm_medium=cpc&utm_campaign=launch' });
  setupContactForm(t.form, env);
  t.fields.name.value = 'Thabo Mokoena';
  t.fields.email.value = 'thabo@example.co.za';
  t.fields.message.value = 'We need a website.';
  await t.form.submitEvent(makeSubmitEvent());

  assert.equal(t.hidden.utm_source.value, 'facebook');
  assert.equal(t.hidden.utm_medium.value, 'cpc');
  assert.equal(t.hidden.utm_campaign.value, 'launch');
  /* Only lead_pending is stored; UTM lives in the lead record, not events. */
  assert.equal(env.__calls.stored.length, 1);
});

test('a second submit while in flight is ignored', async () => {
  const t = makeForm();
  const env = makeEnv();
  setupContactForm(t.form, env);
  t.fields.name.value = 'Thabo Mokoena';
  t.fields.email.value = 'thabo@example.co.za';
  t.fields.message.value = 'We need a website.';
  await t.form.submitEvent(makeSubmitEvent());
  const second = makeSubmitEvent();
  await t.form.submitEvent(second);

  assert.equal(second.defaultPrevented, true, 'the double submit is blocked');
  assert.deepEqual(
    env.__calls.stored.filter(([key]) => key === 'lead_pending').length,
    1,
    'only one lead_pending record',
  );
});

/* ---------- checklist landing-page mode (spec 3.8, DIG-133) ---------- */

test('messageOptional keeps an empty message valid in pure validation', () => {
  const errors = validateContactFields(
    { name: 'A', email: 'a@b.co', phone: '', message: '' },
    { messageOptional: true },
  );
  assert.deepEqual(errors, {});
  const stillRequired = validateContactFields({ name: 'A', email: 'a@b.co', phone: '', message: '' });
  assert.equal(stillRequired.message, MESSAGES.message);
});

function makeChecklistForm() {
  const t = makeForm({ landingPage: true, fixedNeed: 'checklist', formLocation: '/checklist/' });
  return t;
}

test('the checklist form has no select, so the submit label never switches', () => {
  const t = makeChecklistForm();
  setupContactForm(t.form, makeEnv());
  assert.equal(t.need, null, 'no need select renders in landing-page mode');
  assert.equal(t.button.textContent, 'Send enquiry', 'label stays the approved default');
});

test('the checklist form records need=checklist and an optional empty message', async () => {
  const t = makeChecklistForm();
  const env = makeEnv();
  setupContactForm(t.form, env);
  t.fields.name.value = 'Thabo Mokoena';
  t.fields.email.value = 'thabo@example.co.za';
  /* The message stays empty: optional on the checklist page. */
  const event = makeSubmitEvent();
  await t.form.submitEvent(event);

  assert.equal(event.defaultPrevented, false, 'valid checklist submit runs the native POST');
  assert.deepEqual(env.__calls.stored, [
    ['lead_pending', JSON.stringify({ need: 'checklist', form_location: '/checklist/' })],
  ]);
  assert.equal(t.button.textContent, 'Sending…');
});

test('the checklist form still enforces name and the email-or-phone rule', async () => {
  const t = makeChecklistForm();
  const env = makeEnv();
  setupContactForm(t.form, env);
  const event = makeSubmitEvent();
  await t.form.submitEvent(event);

  assert.equal(event.defaultPrevented, true, 'a submit without name or contact route is blocked');
  assert.equal(env.__calls.stored.length, 0, 'no lead_pending records on an invalid submit');
  assert.match(t.errors.name.textContent, /Please add your name\./);
  assert.match(t.errors.email.textContent, /Add your email or phone number/);
});

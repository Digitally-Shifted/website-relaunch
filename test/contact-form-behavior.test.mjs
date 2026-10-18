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
  buildSubject,
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

function makeForm() {
  const summary = makeControl({ hidden: true });
  const status = makeControl({ hidden: true });
  const fallback = makeControl({ hidden: true });
  const button = makeControl({ textContent: 'Send enquiry' });
  const need = makeControl({
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

  const bySelector = new Map([
    ['[data-ds-field="need"]', need],
    ['[data-ds-field="name"]', fields.name],
    ['[data-ds-field="email"]', fields.email],
    ['[data-ds-field="phone"]', fields.phone],
    ['[data-ds-field="business"]', fields.business],
    ['[data-ds-field="message"]', fields.message],
    ['[data-ds-field="company_website"]', fields.company_website],
    ['[data-ds-submit]', button],
    ['[data-ds-summary]', summary],
    ['[data-ds-status]', status],
    ['[data-ds-fallback]', fallback],
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
        'data-thankyou-href': '/contact/thank-you/',
        'data-form-location': '/contact',
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
  return { form, fields, need, button, summary, status, fallback, errors };
}

function makeEnv(overrides = {}) {
  const calls = { fetches: [], events: [], navigations: [], nowCalls: 0 };
  const startAt = overrides.startAt ?? 10_000;
  const submitDelayMs = overrides.submitDelayMs ?? 60_000;
  const env = {
    request: async (url, options) => {
      calls.fetches.push({ url, options });
      return {
        ok: true,
        json: async () => ({ success: true }),
        ...(overrides.fetchResponse || {}),
      };
    },
    locate: () => ({ href: overrides.href || 'https://digitallyshifted.com/contact' }),
    navigate: (url) => calls.navigations.push(url),
    analytics: () => ({
      contactSubmit: (p) => calls.events.push(['contact_form_submit', p]),
      quoteRequest: (p) => calls.events.push(['quote_request', p]),
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

test('subject line follows the conversion spec 5.2 patterns', () => {
  assert.equal(buildSubject(true, 'A new website', 'Thabo'), 'Quote request — A new website — Thabo');
  assert.equal(buildSubject(false, 'General enquiry', 'Thabo'), 'Website enquiry — General enquiry — Thabo');
});

/* ---------- controller behaviour ---------- */

test('?need= preselects the select and switches the submit label', () => {
  const t = makeForm();
  const env = makeEnv({ href: 'https://digitallyshifted.com/contact?need=quote' });
  const controller = setupContactForm(t.form, env);
  assert.equal(t.need.value, 'quote');
  assert.equal(t.button.textContent, 'Request quote');

  const t2 = makeForm();
  const env2 = makeEnv({ href: 'https://digitallyshifted.com/contact?need=bogus' });
  setupContactForm(t2.form, env2);
  assert.equal(t2.need.value, 'general');
  assert.equal(t2.button.textContent, 'Send enquiry');
  assert.ok(controller);
});

test('select change switches the submit label live (spec 4.5)', async () => {
  const t = makeForm();
  const env = makeEnv();
  setupContactForm(t.form, env);
  assert.equal(t.button.textContent, 'Send enquiry');
  t.need.value = 'waas';
  await t.need.emit('change', {});
  assert.equal(t.button.textContent, 'Request quote');
  t.need.value = 'seo';
  await t.need.emit('change', {});
  assert.equal(t.button.textContent, 'Send enquiry');
});

test('a filled honeypot drops the submission with no request and no event', async () => {
  const t = makeForm();
  const env = makeEnv();
  setupContactForm(t.form, env);
  t.fields.company_website.value = 'http://spam.example';
  const event = makeSubmitEvent();
  await t.form.submitEvent(event);
  assert.equal(env.__calls.fetches.length, 0);
  assert.equal(env.__calls.events.length, 0);
  assert.equal(event.defaultPrevented, true);
  assert.equal(t.status.hidden, true);
});

test('a submit inside the 3 second time trap is dropped silently', async () => {
  const t = makeForm();
  const env = makeEnv({ submitDelayMs: -5_000 }); // submit moment before start
  setupContactForm(t.form, env);
  t.fields.name.value = 'A';
  t.fields.email.value = 'a@b.co';
  t.fields.message.value = 'Hi';
  const event = makeSubmitEvent();
  await t.form.submitEvent(event);
  assert.equal(env.__calls.fetches.length, 0);
  assert.equal(env.__calls.events.length, 0);
  assert.equal(event.defaultPrevented, true);
});

test('invalid fields show inline errors, focus the summary, and send nothing', async () => {
  const t = makeForm();
  const env = makeEnv();
  setupContactForm(t.form, env);
  const event = makeSubmitEvent();
  await t.form.submitEvent(event);

  assert.equal(event.defaultPrevented, true);
  assert.equal(env.__calls.fetches.length, 0);
  assert.equal(t.errors.name.textContent, MESSAGES.name);
  assert.equal(t.errors.name.hidden, false);
  assert.equal(t.errors.email.textContent, MESSAGES.contactRoute);
  assert.equal(t.errors.phone.textContent, MESSAGES.contactRoute);
  assert.equal(t.errors.message.textContent, MESSAGES.message);
  assert.equal(t.summary.hidden, false);
  assert.equal(t.summary.focused, true);
});

test('blur after a failed submit revalidates and clears fixed fields', async () => {
  const env2 = makeEnv();
  const t2 = makeForm();
  const c2 = setupContactForm(t2.form, env2);
  await t2.form.submitEvent(makeSubmitEvent());
  assert.equal(t2.errors.name.hidden, false);

  t2.fields.name.value = 'Thabo';
  c2.validateOnBlur();
  assert.equal(t2.errors.name.hidden, true);
  assert.equal(t2.errors.name.textContent, '');
});

test('a valid submission posts to the managed service and fires one conversion event', async () => {
  const t = makeForm();
  t.form.setAttribute('data-endpoint', 'https://api.web3forms.com/submit');
  t.form.setAttribute('data-access-key', 'test-key');
  t.form.setAttribute('data-thankyou-href', '/website-relaunch/contact/thank-you/');
  t.form.setAttribute('data-form-location', '/contact');
  t.form.setAttribute('data-quote-needs', 'new-website,redesign,waas,quote');
  const env = makeEnv();
  setupContactForm(t.form, env);
  t.fields.name.value = 'Thabo Mokoena';
  t.fields.email.value = 'thabo@example.co.za';
  t.fields.message.value = 'I need a new website.';
  await t.form.submitEvent(makeSubmitEvent());

  assert.equal(env.__calls.fetches.length, 1);
  const { url, options } = env.__calls.fetches[0];
  assert.equal(url, 'https://api.web3forms.com/submit');
  assert.equal(options.method, 'POST');
  const payload = JSON.parse(options.body);
  assert.equal(payload.access_key, 'test-key');
  assert.equal(payload.name, 'Thabo Mokoena');
  assert.equal(payload.need, 'general');
  assert.equal(payload.form_location, '/contact');
  assert.equal(payload.submission_id, 'fixed-submission-id');
  assert.equal(payload.subject, 'Website enquiry — General enquiry — Thabo Mokoena');
  assert.ok(payload.form_started_at);
  assert.equal(payload.honeypot, undefined);

  assert.deepEqual(env.__calls.events, [
    ['contact_form_submit', { formLocation: '/contact' }],
  ]);
  assert.deepEqual(env.__calls.navigations, ['/website-relaunch/contact/thank-you/']);
});

test('a quote-intent submission fires quote_request instead', async () => {
  const t = makeForm();
  t.form.setAttribute('data-quote-needs', 'new-website,redesign,waas,quote');
  t.form.setAttribute('data-thankyou-href', '/thank-you/');
  const env = makeEnv();
  setupContactForm(t.form, env);
  t.need.value = 'quote';
  t.fields.name.value = 'A';
  t.fields.email.value = 'a@b.co';
  t.fields.message.value = 'Prices please.';
  await t.form.submitEvent(makeSubmitEvent());

  assert.equal(env.__calls.events.length, 1);
  assert.equal(env.__calls.events[0][0], 'quote_request');
  const payload = JSON.parse(env.__calls.fetches[0].options.body);
  assert.equal(payload.subject, 'Quote request — General enquiry — A');
});

test('a service rejection restores the button and shows the direct routes', async () => {
  const t = makeForm();
  const env = makeEnv({
    fetchResponse: { ok: true, json: async () => ({ success: false }) },
  });
  setupContactForm(t.form, env);
  t.fields.name.value = 'A';
  t.fields.email.value = 'a@b.co';
  t.fields.message.value = 'Hi';
  await t.form.submitEvent(makeSubmitEvent());

  assert.equal(env.__calls.fetches.length, 1);
  assert.equal(env.__calls.events.length, 0);
  assert.equal(env.__calls.navigations.length, 0);
  assert.equal(t.button.disabled, false);
  assert.equal(t.button.textContent, 'Send enquiry');
  assert.equal(t.status.hidden, false);
  assert.match(t.status.textContent, /Something broke on our side/);
  assert.equal(t.fallback.hidden, false);
});

test('a network failure keeps the entered values and never dead-ends', async () => {
  const t = makeForm();
  const env = makeEnv();
  env.request = async () => {
    throw new Error('offline');
  };
  setupContactForm(t.form, env);
  t.fields.name.value = 'A';
  t.fields.email.value = 'a@b.co';
  t.fields.message.value = 'Hi';
  await t.form.submitEvent(makeSubmitEvent());

  assert.equal(env.__calls.events.length, 0);
  assert.equal(t.button.disabled, false);
  assert.equal(t.fallback.hidden, false);
  // entered values stay for the visitor to retry
  assert.equal(t.fields.name.value, 'A');
});

test('UTM parameters ride along in the payload, not in the analytics event', async () => {
  const t = makeForm();
  t.form.setAttribute('data-thankyou-href', '/thank-you/');
  const env = makeEnv({
    href: 'https://digitallyshifted.com/contact?utm_source=facebook&utm_medium=social',
  });
  setupContactForm(t.form, env);
  t.fields.name.value = 'A';
  t.fields.email.value = 'a@b.co';
  t.fields.message.value = 'Hi';
  await t.form.submitEvent(makeSubmitEvent());

  const payload = JSON.parse(env.__calls.fetches[0].options.body);
  assert.equal(payload.utm_source, 'facebook');
  assert.equal(payload.utm_medium, 'social');
  assert.equal(payload.utm_campaign, undefined);
  const [, params] = env.__calls.events[0];
  assert.deepEqual(Object.keys(params), ['formLocation']);
});

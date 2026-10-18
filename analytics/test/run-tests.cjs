/*
 * Offline verification for ds-analytics.
 *
 * Run: node analytics/test/run-tests.cjs
 *
 * The harness installs a minimal window and document stub, starts the module
 * in stub mode, and fires each conversion action. It asserts the exact GA4
 * hit that the module queues. No network access happens.
 */
'use strict';

const fs = require('fs');
const path = require('path');

/*
 * Load ds-analytics with an explicit CommonJS module context. The site
 * package runs with "type": "module", so a plain require() sees the file
 * as ESM and returns no exports. Evaluating the source with our own
 * module object works under any package type.
 */
const dsSource = fs.readFileSync(path.join(__dirname, '..', 'ds-analytics.js'), 'utf8');
const dsModule = { exports: {} };
new Function('module', 'exports', dsSource)(dsModule, dsModule.exports);
const { DSAnalytics, validMeasurementId } = dsModule.exports;

const TEL = 'a[href^="tel:"]';

function makeWindow() {
  return {
    dataLayer: [],
    __DS_EVENTS: [],
    location: { origin: 'https://example.test', pathname: '/' }
  };
}

function matchHref(href, selector) {
  if (selector === TEL) { return /^tel:/i.test(href); }
  if (selector.indexOf('wa.me/') !== -1) { return /wa\.me\//.test(href); }
  if (selector.indexOf('api.whatsapp.com') !== -1) { return /api\.whatsapp\.com/.test(href); }
  return false;
}

function makeAnchor(href, location) {
  return {
    href,
    getAttribute(key) { return key === 'href' ? href : key === 'data-ds-location' ? location : null; },
    closest(selectorList) {
      for (const sel of selectorList.split(',')) {
        if (matchHref(this.href, sel.trim())) { return this; }
      }
      return null;
    }
  };
}

function makeForm(kind, location) {
  return {
    getAttribute(key) {
      if (key === 'data-ds-form') { return kind; }
      if (key === 'data-ds-location') { return location; }
      return null;
    }
  };
}

function makeDocument() {
  const listeners = {};
  const scripts = [];
  return {
    __dsNoScript: false,
    listeners,
    scripts,
    addEventListener(type, fn) { (listeners[type] = listeners[type] || []).push(fn); },
    removeEventListener() {},
    querySelectorAll() { return []; },
    createElement(tag) {
      const el = { tagName: tag, attrs: {}, async: false, src: '', setAttribute(k, v) { el.attrs[k] = v; } };
      if (tag === 'script') { scripts.push(el); }
      return el;
    },
    head: { appendChild(el) { el.attached = true; } },
    documentElement: {},
    title: 'Stub page',
    dispatch(type, event) {
      for (const fn of listeners[type] || []) { fn(event); }
    }
  };
}

/* Start one fresh module instance against fresh stubs. */
function boot(options) {
  const window = makeWindow();
  const document = makeDocument();
  global.window = window;
  global.document = document;
  const ds = new DSAnalytics();
  ds.init(Object.assign({ measurementId: 'G-TEST12345' }, options));
  return { ds, window, document };
}

let pass = 0;
let fail = 0;

function check(name, condition, detail) {
  if (condition) {
    pass += 1;
    console.log(`PASS  ${name}`);
  } else {
    fail += 1;
    console.log(`FAIL  ${name}${detail ? ` :: ${detail}` : ''}`);
  }
}

function eventsOf(window) {
  return window.__DS_EVENTS;
}

function eventByName(window, name) {
  return eventsOf(window).filter((entry) => entry[0] === 'event' && entry[1] === name);
}

/* 1. Init queue: consent defaults, js, config, in order. */
{
  const { window, document } = boot({ stub: true });
  const log = eventsOf(window);
  check('init: three bootstrap commands queued', log.length === 3, `got ${log.length}`);
  check('init: consent default first',
    log[0] && log[0][0] === 'consent' && log[0][1] === 'default',
    JSON.stringify(log[0]));
  const consent = log[0] && log[0][2];
  check('init: analytics_storage granted, ads denied',
    consent && consent.analytics_storage === 'granted' &&
    consent.ad_storage === 'denied' && consent.ad_user_data === 'denied' &&
    consent.ad_personalization === 'denied',
    JSON.stringify(consent));
  check('init: js command second', log[1] && log[1][0] === 'js');
  check('init: config command uses measurement ID',
    log[2] && log[2][0] === 'config' && log[2][1] === 'G-TEST12345',
    JSON.stringify(log[2]));
  check('init: stub mode loads no script', document.scripts.length === 0);
}

/* 2. Consent option denied is honored. */
{
  const { window } = boot({ stub: true, analyticsConsent: 'denied' });
  const consent = eventsOf(window)[0][2];
  check('init: analyticsConsent denied is honored', consent.analytics_storage === 'denied');
}

/* 3. Real mode builds the correct gtag.js script element. */
{
  const { document } = boot({ stub: false });
  const script = document.scripts[0];
  check('gtag.js: script element created', Boolean(script));
  check('gtag.js: correct src',
    script && script.src === 'https://www.googletagmanager.com/gtag/js?id=G-TEST12345',
    script && script.src);
  check('gtag.js: async and tagged',
    script && script.async === true && script.attrs['data-ds-ga4'] === 'G-TEST12345');
}

/* 3b. debugMode adds debug_mode to the config command. */
{
  const { window } = boot({ stub: true, debugMode: true });
  const config = eventsOf(window).find((e) => e[0] === 'config');
  check('init: debug_mode set in config', config && config[2] && config[2].debug_mode === true,
    JSON.stringify(config));
}

/* 4. tel: click sends call_click with the phone number. */
{
  const { ds, window } = boot({ stub: true });
  const anchor = makeAnchor('tel:0762968981', 'footer');
  document.dispatch('click', { target: anchor });
  const events = eventByName(window, 'call_click');
  check('call_click: one event on tel: click', events.length === 1, `got ${events.length}`);
  const params = events[0] && events[0][2];
  check('call_click: phone_number and location captured',
    params && params.phone_number === '0762968981' && params.location === 'footer',
    JSON.stringify(params));
  check('call_click: appears in module log', ds.log.some((e) => e[1] === 'call_click'));
}

/* 5. wa.me click sends whatsapp_click. */
{
  const { window } = boot({ stub: true });
  document.dispatch('click', { target: makeAnchor('https://wa.me/2776296981', 'contact') });
  const events = eventByName(window, 'whatsapp_click');
  check('whatsapp_click: one event on wa.me click', events.length === 1, `got ${events.length}`);
  check('whatsapp_click: link_url and location captured',
    events[0] && events[0][2].link_url === 'https://wa.me/2776296981' &&
    events[0][2].location === 'contact',
    JSON.stringify(events[0]));
}

/* 6. api.whatsapp.com click sends whatsapp_click. */
{
  const { window } = boot({ stub: true });
  document.dispatch('click', {
    target: makeAnchor('https://api.whatsapp.com/send?phone=2776296981')
  });
  const events = eventByName(window, 'whatsapp_click');
  check('whatsapp_click: one event on api.whatsapp.com click', events.length === 1);
}

/* 7. Contact form submit sends contact_form_submit then generate_lead. */
{
  const { window } = boot({ stub: true });
  document.dispatch('submit', { target: makeForm('contact', 'contact-page') });
  const submits = eventByName(window, 'contact_form_submit');
  const leads = eventByName(window, 'generate_lead');
  check('contact: contact_form_submit queued', submits.length === 1, `got ${submits.length}`);
  check('contact: generate_lead queued after it', leads.length === 1 && leads[0][2].form_type === 'contact',
    JSON.stringify(leads[0]));
  check('contact: form_location captured',
    submits[0] && submits[0][2].form_location === 'contact-page',
    JSON.stringify(submits[0]));
  const names = eventsOf(window).map((e) => e[1]);
  check('contact: correct order',
    names.indexOf('contact_form_submit') < names.indexOf('generate_lead'), names.join(','));
}

/* 8. Quote form submit sends quote_request then generate_lead. */
{
  const { window } = boot({ stub: true });
  document.dispatch('submit', { target: makeForm('quote', 'pricing-page') });
  const requests = eventByName(window, 'quote_request');
  const leads = eventByName(window, 'generate_lead');
  check('quote: quote_request queued', requests.length === 1, `got ${requests.length}`);
  check('quote: generate_lead with form_type quote', leads.length === 1 && leads[0][2].form_type === 'quote');
}

/* 9. A form fires at most once per submit element. */
{
  const { window } = boot({ stub: true });
  const form = makeForm('contact', 'home');
  document.dispatch('submit', { target: form });
  document.dispatch('submit', { target: form });
  const submits = eventByName(window, 'contact_form_submit');
  const leads = eventByName(window, 'generate_lead');
  check('guard: no duplicate contact_form_submit', submits.length === 1, `got ${submits.length}`);
  check('guard: no duplicate generate_lead', leads.length === 1, `got ${leads.length}`);
}

/* 10. Manual API works without DOM events. */
{
  const { ds, window } = boot({ stub: true });
  ds.contactSubmit({ formLocation: 'modal' });
  ds.quoteRequest({ formLocation: 'nav' });
  ds.callClick({ phoneNumber: '+27 76 296 8981', location: 'header' });
  ds.whatsappClick({ linkUrl: 'https://wa.me/2776296981', location: 'header' });
  check('manual: contact_form_submit', eventByName(window, 'contact_form_submit').length === 1);
  check('manual: quote_request', eventByName(window, 'quote_request').length === 1);
  check('manual: call_click', eventByName(window, 'call_click').length === 1);
  check('manual: whatsapp_click', eventByName(window, 'whatsapp_click').length === 1);
  const leads = eventByName(window, 'generate_lead');
  check('manual: two generate_lead events', leads.length === 2, `got ${leads.length}`);
}

/* 11. pageView sends page_view with page_location. */
{
  const { ds, window } = boot({ stub: true });
  ds.pageView('/services/web-design', 'Web design');
  const views = eventByName(window, 'page_view');
  check('pageView: one page_view', views.length === 1, `got ${views.length}`);
  check('pageView: page_location and page_title',
    views[0] && views[0][2].page_location === 'https://example.test/services/web-design' &&
    views[0][2].page_title === 'Web design',
    JSON.stringify(views[0]));
}

/* 12. Measurement ID validation. */
{
  check('validate: G-TEST12345 accepted', validMeasurementId('G-TEST12345') === true);
  check('validate: junk rejected', validMeasurementId('not-an-id') === false);
  let threw = false;
  try { new DSAnalytics().init({ measurementId: 'nope' }); } catch (e) { threw = true; }
  check('validate: init throws on bad ID', threw === true);
}

/* 13. Events before init do nothing harmful. */
{
  global.window = makeWindow();
  global.document = makeDocument();
  const ds = new DSAnalytics();
  ds.contactSubmit({});
  check('pre-init: no crash and no hits', ds.log.length === 0 && ds.ready === false);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);

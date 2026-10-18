/*
 * Contact form behaviour (conversion spec 4).
 *
 * Static-host adaptation: there is no application server on GitHub Pages,
 * so the form posts to the managed form service (Web3Forms, the stack
 * standard default) instead of POST /api/contact. The service emails every
 * submission to the owner inbox. Deviations from spec 4.4 that this forces:
 * no server-side rate limit and no spam row storage. The honeypot
 * (6.2) and the time trap (6.2) run client side; a trapped submission is
 * dropped with no request, no event, and no feedback.
 *
 * Everything else follows the spec: field set and labels (4.1), need
 * options and preselect (4.2), error summary plus inline errors with focus
 * management (4.3), submit label switch (4.5), consent line without a
 * checkbox (4.6), and the conversion event fired once after the service
 * accepts the submission (4.3, 7.1; analytics README rule).
 */

export const WEB3FORMS_ENDPOINT = 'https://api.web3forms.com/submit';

/** Time trap (conversion spec 6.2): a submit inside 3 seconds is spam. */
export const MIN_SUBMIT_MS = 3000;

/** The need value used when the ?need= parameter is missing or unknown. */
export const DEFAULT_NEED = 'general';

/*
 * Validation messages. The email-or-phone message is verbatim from
 * conversion spec 4.1; the others follow the same voice and state the fix.
 */
export const MESSAGES = {
  name: 'Please add your name.',
  email: 'Please check the email address.',
  contactRoute: 'Add your email or phone number so we can reply.',
  message: 'Please tell us about your project.',
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Map a raw ?need= parameter to a valid option value (spec 4.2). Unknown
 * values fall back to the default and never show an error.
 */
export function normaliseNeed(rawNeed, validValues) {
  return validValues.includes(rawNeed) ? rawNeed : DEFAULT_NEED;
}

/** True when the selected need carries quote intent (spec 4.2). */
export function isQuoteIntent(need, quoteIntentValues) {
  return quoteIntentValues.includes(need);
}

/**
 * Pure form validation (spec 4.1, 4.3). Returns a map of field name to
 * message for every invalid field. Email and phone follow the either-or
 * rule: at least one of the two must be present.
 */
export function validateContactFields(values) {
  const errors = {};
  const name = (values.name || '').trim();
  const email = (values.email || '').trim();
  const phone = (values.phone || '').trim();
  const message = (values.message || '').trim();

  if (name.length < 1) {
    errors.name = MESSAGES.name;
  }
  if (email !== '' && !EMAIL_PATTERN.test(email)) {
    errors.email = MESSAGES.email;
  }
  if (email === '' && phone === '') {
    errors.contactRoute = MESSAGES.contactRoute;
  }
  if (message.length < 1) {
    errors.message = MESSAGES.message;
  }
  return errors;
}

/** Email subject line (conversion spec 5.2). */
export function buildSubject(intent, needLabel, name) {
  const kind = intent ? 'Quote request' : 'Website enquiry';
  return `${kind} — ${needLabel} — ${name}`;
}

/**
 * Wire one contact form element. Returns the controller for tests.
 *
 * env is injectable so tests run without a browser:
 *   request(url, options)  - defaults to global fetch
 *   locate()               - defaults to window.location
 *   navigate(url)          - defaults to window.location.assign
 *   analytics()            - defaults to window.DSAnalytics or null
 *   uuid()                 - defaults to crypto.randomUUID
 *   now()                  - defaults to Date.now
 */
export function setupContactForm(form, env = {}) {
  const request = env.request || ((url, options) => fetch(url, options));
  const locate = env.locate || (() => window.location);
  const navigate = env.navigate || ((url) => window.location.assign(url));
  const analytics =
    env.analytics ||
    (() => (typeof window !== 'undefined' && window.DSAnalytics ? window.DSAnalytics : null));
  const uuid =
    env.uuid ||
    (() =>
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `sub-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  const now = env.now || (() => Date.now());

  const select = form.querySelector('[data-ds-field="need"]');
  const button = form.querySelector('[data-ds-submit]');
  const summary = form.querySelector('[data-ds-summary]');
  const status = form.querySelector('[data-ds-status]');
  const fallback = form.querySelector('[data-ds-fallback]');
  const fields = {
    name: form.querySelector('[data-ds-field="name"]'),
    email: form.querySelector('[data-ds-field="email"]'),
    phone: form.querySelector('[data-ds-field="phone"]'),
    business: form.querySelector('[data-ds-field="business"]'),
    message: form.querySelector('[data-ds-field="message"]'),
    honeypot: form.querySelector('[data-ds-field="company_website"]'),
  };
  const errorSlots = {};
  for (const key of ['name', 'email', 'phone', 'business', 'need', 'message']) {
    errorSlots[key] = form.querySelector(`[data-ds-error-for="${key}"]`);
  }

  const needValues = select
    ? Array.from(select.options || []).map((option) => option.value)
    : [];
  const quoteIntentValues = (form.getAttribute('data-quote-needs') || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  const defaultSubmitLabel = button ? button.textContent : '';
  const quoteSubmitLabel = form.getAttribute('data-quote-label') || 'Request quote';
  const startedAt = now();

  let submittedOnce = false;
  let inFlight = false;

  const setButtonLabel = () => {
    if (!button) return;
    button.textContent = isQuoteIntent(select.value, quoteIntentValues)
      ? quoteSubmitLabel
      : defaultSubmitLabel;
  };

  /* ?need= preselect (spec 4.2). */
  if (select) {
    const rawNeed = new URL(locate().href).searchParams.get('need');
    if (rawNeed !== null) {
      select.value = normaliseNeed(rawNeed, needValues);
    }
    setButtonLabel();
    select.addEventListener('change', setButtonLabel);
  }

  const fieldErrors = (values) => {
    const errors = validateContactFields(values);
    if (errors.contactRoute) {
      /* The either-or message points at both route fields. */
      errors.email = errors.email || errors.contactRoute;
      errors.phone = errors.phone || errors.contactRoute;
      delete errors.contactRoute;
    }
    return errors;
  };

  const renderErrors = (errors) => {
    let firstMessage = '';
    for (const key of Object.keys(errorSlots)) {
      const slot = errorSlots[key];
      if (!slot) continue;
      const control = fields[key] || select;
      if (errors[key]) {
        slot.textContent = errors[key];
        slot.hidden = false;
        if (control && control.setAttribute) {
          control.setAttribute('aria-invalid', 'true');
        }
        if (!firstMessage) firstMessage = errors[key];
      } else {
        slot.textContent = '';
        slot.hidden = true;
        if (control && control.setAttribute) {
          control.setAttribute('aria-invalid', 'false');
        }
      }
    }
    if (summary) {
      if (firstMessage) {
        summary.textContent = '';
        const heading = form.ownerDocument
          ? form.ownerDocument.createElement('p')
          : null;
        if (heading) {
          heading.textContent = 'Please fix the marked fields and send again.';
          summary.appendChild(heading);
        }
        const list = form.ownerDocument
          ? form.ownerDocument.createElement('ul')
          : null;
        if (list) {
          for (const value of Object.values(errors)) {
            const item = form.ownerDocument.createElement('li');
            item.textContent = value;
            list.appendChild(item);
          }
          summary.appendChild(list);
        }
        summary.hidden = false;
        if (summary.focus) summary.focus();
      } else {
        summary.hidden = true;
        summary.textContent = '';
      }
    }
  };

  const validateOnBlur = () => {
    if (!submittedOnce) return;
    renderErrors(
      fieldErrors({
        name: fields.name && fields.name.value,
        email: fields.email && fields.email.value,
        phone: fields.phone && fields.phone.value,
        business: fields.business && fields.business.value,
        message: fields.message && fields.message.value,
      }),
    );
  };
  for (const control of Object.values(fields)) {
    if (control && control.addEventListener) {
      control.addEventListener('blur', validateOnBlur);
    }
  }

  const handleSubmit = async (event) => {
    /* Honeypot (6.2): a filled trap is a bot. Drop with no feedback. */
    if (fields.honeypot && fields.honeypot.value) {
      event.preventDefault();
      return;
    }
    /* Time trap (6.2): too fast is a bot. Drop with no feedback. */
    if (now() - startedAt < MIN_SUBMIT_MS) {
      event.preventDefault();
      return;
    }

    const values = {
      name: fields.name && fields.name.value,
      email: fields.email && fields.email.value,
      phone: fields.phone && fields.phone.value,
      business: fields.business && fields.business.value,
      message: fields.message && fields.message.value,
    };
    const errors = fieldErrors(values);
    if (Object.keys(errors).length > 0) {
      event.preventDefault();
      submittedOnce = true;
      renderErrors(errors);
      return;
    }

    /* Valid submission: the fetch path owns navigation (spec 4.3). */
    event.preventDefault();
    if (inFlight) return;
    inFlight = true;
    if (button) {
      button.disabled = true;
      button.textContent = 'Sending…';
    }
    if (status) {
      status.hidden = true;
      status.textContent = '';
    }

    const need = select ? select.value : DEFAULT_NEED;
    const intent = isQuoteIntent(need, quoteIntentValues);
    const needLabel =
      select && select.selectedOptions && select.selectedOptions[0]
        ? select.selectedOptions[0].textContent
        : need;
    const params = new URL(locate().href).searchParams;
    const endpoint = form.getAttribute('data-endpoint') || WEB3FORMS_ENDPOINT;
    const payload = {
      access_key: form.getAttribute('data-access-key') || '',
      subject: buildSubject(intent, needLabel, (values.name || '').trim()),
      from_name: 'Digitally Shifted website',
      name: (values.name || '').trim(),
      email: (values.email || '').trim(),
      phone: (values.phone || '').trim(),
      business: (values.business || '').trim(),
      need,
      need_label: needLabel,
      message: (values.message || '').trim(),
      form_location: form.getAttribute('data-form-location') || '/contact',
      form_started_at: String(startedAt),
      submission_id: uuid(),
      page_url: locate().href,
    };
    for (const key of ['utm_source', 'utm_medium', 'utm_campaign']) {
      const value = params.get(key);
      if (value) payload[key] = value;
    }

    const fail = () => {
      inFlight = false;
      if (button) {
        button.disabled = false;
        button.textContent = defaultSubmitLabel;
      }
      setButtonLabel();
      if (status) {
        status.textContent = 'Something broke on our side. Please call or WhatsApp us.';
        status.hidden = false;
      }
      if (fallback) fallback.hidden = false;
    };

    let response;
    try {
      response = await request(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch {
      fail();
      return;
    }

    let result = {};
    try {
      result = await response.json();
    } catch {
      result = {};
    }

    if (!(response.ok && result.success)) {
      fail();
      return;
    }

    /* Conversion event (spec 7.1): one event, non-spam, after accept. */
    const tracker = analytics();
    if (tracker) {
      const location = form.getAttribute('data-form-location') || '/contact';
      if (intent) {
        tracker.quoteRequest({ formLocation: location });
      } else {
        tracker.contactSubmit({ formLocation: location });
      }
    }
    const thankyouHref = form.getAttribute('data-thankyou-href');
    navigate(thankyouHref || '/contact/thank-you/');
  };

  form.addEventListener('submit', (event) => {
    /* preventDefault inside handleSubmit; the promise keeps no caller. */
    Promise.resolve(handleSubmit(event)).catch(() => {
      event.preventDefault();
    });
  });

  return {
    setButtonLabel,
    validateOnBlur,
    startedAt,
    submit: handleSubmit,
  };
}

/*
 * Contact form behaviour (conversion spec 4).
 *
 * Submission path: a normal browser POST to /api/contact on the same
 * origin (spec 4.3). The server (form-backend/) validates again, stores
 * the lead, applies the spam rules, and answers 303 to the thank-you page
 * with the lead_ok cookie on genuine success. The thank-you page then
 * fires the one conversion event from two signals (spec 7.2): the
 * sessionStorage.lead_pending written here and that cookie. This module
 * never sends analytics itself.
 *
 * Everything else follows the spec: field set and labels (4.1), need
 * options and preselect (4.2), error summary plus inline errors with
 * focus management (4.3), submit label switch (4.5), consent line
 * without a checkbox (4.6). The honeypot (6.2) and the time trap (6.2)
 * also run here; a trapped submission is dropped with no request, no
 * event, and no feedback. The server re-checks both.
 */

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

/**
 * Wire one contact form element. Returns the controller for tests.
 *
 * env is injectable so tests run without a browser:
 *   locate()      - defaults to window.location
 *   uuid()        - defaults to crypto.randomUUID
 *   now()         - defaults to Date.now
 *   store()       - defaults to window.sessionStorage
 */
export function setupContactForm(form, env = {}) {
  const locate = env.locate || (() => window.location);
  const uuid =
    env.uuid ||
    (() =>
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `sub-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  const now = env.now || (() => Date.now());
  const store = env.store || (() => (typeof window !== 'undefined' ? window.sessionStorage : null));

  const select = form.querySelector('[data-ds-field="need"]');
  const button = form.querySelector('[data-ds-submit]');
  const summary = form.querySelector('[data-ds-summary]');
  const fields = {
    name: form.querySelector('[data-ds-field="name"]'),
    email: form.querySelector('[data-ds-field="email"]'),
    phone: form.querySelector('[data-ds-field="phone"]'),
    business: form.querySelector('[data-ds-field="business"]'),
    message: form.querySelector('[data-ds-field="message"]'),
    honeypot: form.querySelector('[data-ds-field="company_website"]'),
  };
  const hidden = {};
  for (const key of ['form_started_at', 'submission_id', 'utm_source', 'utm_medium', 'utm_campaign']) {
    hidden[key] = form.querySelector(`input[name="${key}"]`);
  }

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
  const formLocation = form.getAttribute('data-form-location') || '/contact';

  if (hidden.form_started_at) hidden.form_started_at.value = String(startedAt);
  if (hidden.submission_id) hidden.submission_id.value = uuid();

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

  /* Inline error slots keep their reserved line, so showing or clearing
     * one never shifts the layout under the visitor's pointer. */
  const renderErrors = (errors, { focusSummary = true, updateSummary = true } = {}) => {
    let firstMessage = '';
    for (const key of Object.keys(errorSlots)) {
      const slot = errorSlots[key];
      if (!slot) continue;
      const control = fields[key] || select;
      if (errors[key]) {
        slot.textContent = errors[key];
        if (control && control.setAttribute) {
          control.setAttribute('aria-invalid', 'true');
        }
        if (!firstMessage) firstMessage = errors[key];
      } else {
        slot.textContent = '';
        if (control && control.setAttribute) {
          control.setAttribute('aria-invalid', 'false');
        }
      }
    }
    if (summary && updateSummary) {
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
            const item = form.ownerDocument
              ? form.ownerDocument.createElement('li')
              : null;
            if (item) {
              item.textContent = value;
              list.appendChild(item);
            }
          }
          summary.appendChild(list);
        }
        summary.hidden = false;
        /* Focus moves to the summary on a failed submit only (spec 4.3).
         * A blur revalidation must never steal focus from the field the
         * user just clicked into. */
        if (focusSummary && summary.focus) summary.focus();
      } else {
        summary.hidden = true;
        summary.textContent = '';
      }
    }
  };

  const validateOnBlur = () => {
    if (!submittedOnce) return;
    /* Field-scoped: inline slots update, the summary box stays untouched.
     * Re-rendering the summary on blur shifts the page while the visitor
     * is reaching for the next field or the submit button. */
    renderErrors(
      fieldErrors({
        name: fields.name && fields.name.value,
        email: fields.email && fields.email.value,
        phone: fields.phone && fields.phone.value,
        business: fields.business && fields.business.value,
        message: fields.message && fields.message.value,
      }),
      { focusSummary: false, updateSummary: false },
    );
  };
  for (const control of Object.values(fields)) {
    if (control && control.addEventListener) {
      control.addEventListener('blur', validateOnBlur);
    }
  }

  const handleSubmit = (event) => {
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

    /* Valid: record the pending lead for the thank-you two-signal rule
     * (spec 7.2), then let the native POST run. The server's 303 carries
     * the visitor to the thank-you page; its lead_ok cookie is the second
     * signal and only a genuine success sets it. */
    if (inFlight) {
      event.preventDefault();
      return;
    }
    inFlight = true;

    const need = select ? select.value : DEFAULT_NEED;
    try {
      const storage = store();
      if (storage) {
        storage.setItem('lead_pending', JSON.stringify({ need, form_location: formLocation }));
      }
    } catch {
      /* storage unavailable (private mode): the lead still submits */
    }

    const params = new URL(locate().href).searchParams;
    for (const key of ['utm_source', 'utm_medium', 'utm_campaign']) {
      const value = params.get(key);
      if (value && hidden[key]) hidden[key].value = value.slice(0, 200);
    }

    if (button) {
      button.disabled = true;
      button.textContent = 'Sending…';
    }
    /* Restore on back-navigation (bfcache keeps the disabled button). */
    if (typeof window !== 'undefined' && window.addEventListener && !handleSubmit._pageshow) {
      handleSubmit._pageshow = true;
      window.addEventListener('pageshow', () => {
        inFlight = false;
        if (button) {
          button.disabled = false;
          setButtonLabel();
        }
      });
    }
    /* No preventDefault: the browser POSTs and follows the 303. */
  };

  form.addEventListener('submit', handleSubmit);

  return {
    setButtonLabel,
    validateOnBlur,
    startedAt,
    submit: handleSubmit,
  };
}

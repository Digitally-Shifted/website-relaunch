/*
 * Server-rendered fallback pages (conversion spec section 4.4).
 *
 * 400 re-renders the form with the entered values kept, an error summary
 * and per-field messages. 429 and 500 give the exact spec copy plus the
 * direct contact routes, so no failure is a dead end. Pages carry inline
 * styles from the DS token palette because the static site CSS is not
 * loaded in this process.
 */

const esc = (v) =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const STYLE = `
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 48px 24px; background: #ffffff; color: #000000;
         font: 16px/1.6 Raleway, Arial, sans-serif; }
  .wrap { max-width: 40rem; margin: 0 auto; }
  h1 { font-size: 1.8rem; margin: 0 0 8px; }
  p.lede { color: #4d4d4d; margin: 0 0 32px; }
  .summary { border: 2px solid #FD4000; padding: 16px 20px; margin-bottom: 24px; }
  .summary h2 { font-size: 1rem; margin: 0 0 8px; }
  .summary a { color: #000; }
  ul { margin: 0; padding-left: 20px; }
  label { display: block; font-weight: 600; margin: 20px 0 6px; }
  input, select, textarea { width: 100%; padding: 12px; font: inherit;
    border: 1px solid #a3a3a3; border-radius: 0; background: #fff; color: #000; }
  input[aria-invalid="true"], textarea[aria-invalid="true"] { border-color: #FD4000; }
  .error { color: #b32d00; font-size: 0.9rem; margin-top: 4px; }
  .consent { font-size: 0.85rem; color: #4d4d4d; margin: 24px 0; }
  .consent a { color: #000; }
  button { margin-top: 8px; background: #FD4000; color: #000; border: 0;
    padding: 14px 28px; font: inherit; font-weight: 700; cursor: pointer; }
  .contacts { margin-top: 32px; border-top: 1px solid #dedede; padding-top: 16px; }
  .contacts a { color: #000; margin-right: 24px; }
`;

function page(title, body) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${esc(title)} — Digitally Shifted</title>
<style>${STYLE}</style>
</head>
<body>
<div class="wrap">
${body}
<div class="contacts">
<a href="tel:+27631718750">Call +27 63 171 8750</a>
<a href="https://wa.me/27631718750" rel="noopener">WhatsApp us</a>
<a href="/">digitallyshifted.com</a>
</div>
</div>
</body>
</html>`;
}

const FIELDS = [
  { name: 'name', label: 'Your name (required)', type: 'text', autocomplete: 'name' },
  { name: 'email', label: 'Email', type: 'email', autocomplete: 'email' },
  { name: 'phone', label: 'Phone (optional)', type: 'tel', autocomplete: 'tel' },
  { name: 'business', label: 'Business name (optional)', type: 'text', autocomplete: 'organization' },
  { name: 'message', label: 'Tell us about your project (required)', type: 'textarea' },
];

/**
 * 400 page: the form with values kept, error summary first, focus on the
 * summary, per-field errors tied with aria-describedby.
 */
export function renderValidationError({ values, errors, needOptions, location }) {
  const errorList = Object.entries(errors)
    .map(([field, message]) => `<li><a href="#f-${field}">${esc(message)}</a></li>`)
    .join('');
  const fields = FIELDS.map((f) => {
    const err = errors[f.name];
    const describedBy = err ? ` aria-describedby="e-${f.name}" aria-invalid="true"` : '';
    const errHtml = err ? `<p class="error" id="e-${f.name}">${esc(err)}</p>` : '';
    const value = `value="${esc(values[f.name] ?? '')}"`;
    const control =
      f.type === 'textarea'
        ? `<textarea id="f-${f.name}" name="${f.name}" rows="5"${describedBy}>${esc(values.message ?? '')}</textarea>`
        : `<input id="f-${f.name}" name="${f.name}" type="${f.type}" autocomplete="${f.autocomplete}" ${value}${describedBy}>`;
    return `<label for="f-${f.name}">${f.label}</label>${control}${errHtml}`;
  }).join('\n');
  const options = needOptions
    .map((o) => `<option value="${o.value}"${values.need === o.value ? ' selected' : ''}>${esc(o.label)}</option>`)
    .join('');
  return page('Check the form', `
<h1>Check the form</h1>
<p class="lede">Some fields need attention. Your other answers are kept.</p>
<div class="summary" role="alert" tabindex="-1">
<h2>Fix these to send your enquiry:</h2>
<ul>${errorList}</ul>
</div>
<form method="post" action="/api/contact">
<input type="hidden" name="form_location" value="${esc(location)}">
<input type="hidden" name="submission_id" value="${esc(values.submission_id ?? '')}">
<input type="hidden" name="form_started_at" value="${esc(values.form_started_at ?? '')}">
${fields}
<label for="f-need">What do you need?</label>
<select id="f-need" name="need">${options}</select>
${errors.need ? `<p class="error" id="e-need">${esc(errors.need)}</p>` : ''}
<p class="consent">We use your details to reply to this enquiry. We do not sell them. See our <a href="/privacy">privacy notice</a>.</p>
<button type="submit">Send enquiry</button>
</form>`);
}

export function renderRateLimited() {
  return page('Too many attempts', `
<h1>Too many attempts.</h1>
<p class="lede">Please try again in an hour, or call or WhatsApp us. We reply within one business day.</p>`);
}

export function renderServerError() {
  return page('Something broke', `
<h1>Something broke on our side.</h1>
<p class="lede">Please call or WhatsApp us. Your enquiry did not reach us through the form.</p>`);
}

export function renderNotFound() {
  return page('Not found', `
<h1>Not found.</h1>
<p class="lede">The form endpoint lives at POST /api/contact.</p>`);
}

# ds-analytics — GA4 conversion tracking module

Drop-in analytics for Digitally Shifted sites. Zero dependencies. One file.

## Use

1. Copy `ds-analytics.js` into the site project.
2. Load it in every page, before the closing head tag.
3. Start it once:

```js
DSAnalytics.init({ measurementId: 'G-XXXXXXXXXX' });
```

## Options

| Option | Default | Purpose |
| --- | --- | --- |
| `measurementId` | required | GA4 web stream Measurement ID, format `G-XXXXXXXXXX` |
| `analyticsConsent` | `'granted'` | Consent Mode v2 default for `analytics_storage` |
| `debugMode` | `false` | Sends hits with `debug_mode: true`. Use only for DebugView tests |
| `debug` | `false` | Logs each hit to the console |
| `stub` | `false` | Skips the gtag.js script load. Use in tests |

## Events

Automatic:

- `tel:` links send `call_click`.
- `wa.me` and `api.whatsapp.com` links send `whatsapp_click`.
- Forms with `data-ds-form="contact"` or `"quote"` send
  `contact_form_submit` or `quote_request`, plus `generate_lead`.

Manual, for JavaScript-handled forms and SPA routes:

```js
DSAnalytics.contactSubmit({ formLocation: 'contact-page' });
DSAnalytics.quoteRequest({ formLocation: 'pricing-page' });
DSAnalytics.callClick({ phoneNumber: '0762968981', location: 'header' });
DSAnalytics.whatsappClick({ linkUrl: 'https://wa.me/2776296981', location: 'footer' });
DSAnalytics.pageView('/new-path', 'Page title');
```

Call a form method only after the server accepts the submission.
Parameter keys can use camelCase. The module sends snake_case to GA4.

## Mark forms and links

```html
<form data-ds-form="contact" data-ds-location="contact-page">...</form>
<a href="tel:0762968981" data-ds-location="footer">Call us</a>
<a href="https://wa.me/2776296981" data-ds-location="footer">WhatsApp</a>
```

## Tests

Offline checks, no network:

```
node test/run-tests.cjs
```

Live DebugView check: open `test/live-harness.html?id=G-XXXXXXXXXX` through a
local web server. See the file header for the steps.

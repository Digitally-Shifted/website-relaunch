# Analytics setup — Digitally Shifted website relaunch

This document is the measurement baseline for the relaunch of digitallyshifted.com.
It is also the standard baseline for future client sites. Copy this file into a
new client project and fill the IDs table.

Status on 2026-10-18:

- Tracking code and event layer: done and tested. See `analytics/ds-analytics.js`.
- Loader installed on every page (DIG-91): `BaseLayout` loads the module
  site-wide. Measurement starts only when the build gets a `PUBLIC_GA4_ID`
  variable (format `G-XXXXXXXXXX`). Without it the site ships analytics
  dormant: no gtag request, no console errors. The thank-you page fires the
  two-signal lead conversions from `docs/conversion-spec.md` section 7.2;
  the form (DIG-69) writes `sessionStorage.lead_pending` and the server
  sets the `lead_ok` cookie.
- GA4 property and data stream: waits on a person with Google account access.
  The steps are below. Fill the IDs table after creation.
- Search Console verification: waits on domain DNS access.
- Weekly report: recipe below. Build it after the GA4 property exists.
- Live event test: waits on the GA4 property. The offline event test passed.
- Owner decision 2026-10-18: the site launches with analytics dormant (no
  measurement ID at build). Enable it in a patch release with the steps in
  section 2 and `docs/go-live-runbook.md` step 8.

Issue: DIG-65. Related: DIG-20 (go-live checklist), DIG-66 (lead capture spec).

## 1. Standard baseline for client sites

Use this standard for every site we build. Change only the values in the IDs table.

1. One GA4 property per site, named `Client name — domain`.
2. One web data stream per site.
3. Property time zone: the client time zone. Property currency: the client currency.
4. Event data retention: 14 months.
5. Consent Mode v2 on. `analytics_storage` granted by default. Ads signals denied
   until the site has a consent banner.
6. Five key events: `contact_form_submit`, `quote_request`, `call_click`,
   `whatsapp_click`, `generate_lead`.
7. Tracking through `ds-analytics.js`. No direct gtag calls in page code.
8. Search Console: one Domain property, verified through a DNS TXT record.
9. One weekly report with traffic and key events, delivered by email.

## 2. IDs record

A measurement ID is public. It is safe to store here. Do not store API secrets
in this file. Fill each row during setup.

| Item | Value | Set by |
| --- | --- | --- |
| GA4 property name | Digitally Shifted — digitallyshifted.com | route A agent, or human, step 3.1 |
| GA4 property ID | `TO FILL — format 123456789` | route A agent, or human, step 3.1 |
| Web data stream ID | `TO FILL — format 1234567890` | route A agent, or human, step 3.2 |
| Measurement ID | `TO FILL — format G-XXXXXXXXXX` | route A agent, or human, step 3.2 |
| Search Console property | Domain property `digitallyshifted.com` | route A agent, or human, step 4.1 |
| Search Console verification | DNS TXT record at the registrar | human, step 4.2 |

Put the measurement ID into the site config when the site code exists.
Do not put any other Google credential in this repository.

To activate measurement, set the repository variable `PUBLIC_GA4_ID` to the
measurement ID (GitHub: Settings → Secrets and variables → Actions →
Variables) and redeploy. A local production build takes it as an
environment variable. See `docs/go-live-runbook.md` step 8.

## 3. GA4 property and data stream

The Google account is `accounts@digitallyshifted.com`.

### 3.0 Access route

Status 2026-10-18: the external provider route (Composio) was offered and
declined. The answer was `None for now` for Google Analytics and for Search
Console. Do not reconnect it unless the owner asks.

Two routes remain.

**Route A — service account key through the secret pathway (active).** A
google service account works through the Google APIs. The key reaches this
agent only through the Paperclip secret pathway. No key value ever lands in a
comment, document, or this file.

One-time bootstrap. The owner of `accounts@digitallyshifted.com` does this:

1. Log in at console.cloud.google.com as `accounts@digitallyshifted.com`.
2. Pick one project. Enable the Google Analytics Admin API. For Search Console
   work, also enable the Search Console API and the Site Verification API.
3. Create one service account. Download the JSON key file.
4. Log in at analytics.google.com. Open Admin, then Account User Management.
   Add the service account email with the Editor role at account level.
5. Deliver the key through the secret pathway: create a Paperclip secret named
   `google/accounts-sa-key`, and bind it to the agent Tracking & Measurement
   Specialist with the config path `access.google_accounts_sa`. Or paste the
   key in the pending answer on this issue. The agent registers it through the
   secret proposal pathway at once, and never writes the value anywhere.
6. Answer the pending question on DIG-65.

Then the agent runs through the APIs: account lookup, property creation, data
stream creation, measurement ID, key events, Search Console site insert with
the verification token, and sitemap submission.

Search Console keeps two human steps. Place the DNS TXT record at the registrar
when the agent supplies the token (section 4.2). Or use the HTML file method
when the site is live. After the first verification, add the service account
email as a delegated owner in Search Console (Settings, then Users).

**Route B — owner does the browser steps.** The owner follows sections 3.1 to
3.4 and section 4 in the browser and sends the three IDs. The steps below work
without any connection or key.

Follow 3.1 to 3.4 for both routes. Route A runs them through the APIs.
Route B runs them in the browser.

### 3.1 Create the property

1. Select Admin.
2. In the Property column, select Create, then select Property.
3. Property name: `Digitally Shifted — digitallyshifted.com`.
4. Reporting time zone: `South Africa, Johannesburg`.
5. Currency: `South African Rand (R)`.
6. Select Next. Answer the business questions. Select Create.
7. Record the property ID in the IDs table.

### 3.2 Create the web data stream

1. Open Admin, then Data streams.
2. Select Add stream, then select Web.
3. Website URL: `https://digitallyshifted.com`. Stream name: `digitallyshifted.com`.
4. Leave Enhanced measurement on.
5. Copy the Measurement ID. It has the format `G-XXXXXXXXXX`.
6. Record the stream ID and the Measurement ID in the IDs table.

### 3.3 Property settings

1. Open Admin, then Data settings, then Data retention.
2. Set Event data retention to `14 months`. Select Save.
3. Open Admin, then Property access management.
4. Give each team member the Editor role. Give reviewers the Viewer role.

### 3.4 Key events

The module sends five events that count conversions. Mark each one as a key event.

1. Open Admin, then Events.
2. Wait for the test visit in section 7. New events appear in this list.
3. Put each of these event names in the Mark as key event column:
   `contact_form_submit`, `quote_request`, `call_click`, `whatsapp_click`,
   `generate_lead`.

## 4. Search Console

Route A: the agent inserts the site through the Site Verification API and
supplies the verification token. The human places the DNS record (step 4.2).
Route B: the owner does all steps in the browser.

### 4.1 Create the property

1. Log in at search.google.com/search-console.
2. Select Add property. Select the Domain property type.
3. Domain: `digitallyshifted.com`. This covers www and all subdomains.
4. Select Continue. Search Console shows a TXT record.

### 4.2 Verify through DNS

The TXT record proves domain ownership. It survives site rebuilds. A person with
registrar access for digitallyshifted.com does this part.

1. Copy the TXT value from Search Console. It starts with `google-site-verification=`.
2. Log in at the domain registrar. Open the DNS records for digitallyshifted.com.
3. Add a TXT record. Host: `@`. Value: the copied value. TTL: default.
4. Save. Wait up to 24 hours for DNS.
5. Return to Search Console. Select Verify.
6. If the check fails, wait one hour and select Verify again.

### 4.3 After verification

1. Open Sitemaps.
2. Submit `https://digitallyshifted.com/sitemap.xml` when the new site is live.
3. Add the team members as users with the Full role.

## 5. Conversion events

The table is the event contract. Site pages (DIG-15, DIG-16) and the lead capture
spec (DIG-66) build against it. Do not rename events.

| Event | Trigger | Parameters | Key event |
| --- | --- | --- | --- |
| `contact_form_submit` | Visitor submits the contact form and the server accepts it | `form_location` | yes |
| `quote_request` | Visitor submits the quote form and the server accepts it | `form_location` | yes |
| `call_click` | Visitor clicks a `tel:` link | `phone_number`, `location` | yes |
| `whatsapp_click` | Visitor clicks a `wa.me` or `api.whatsapp.com` link | `link_url`, `location` | yes |
| `generate_lead` | Sent with each form lead. Feeds GA4 lead reports | `form_type` (`contact` or `quote`), `form_location` | yes |
| `page_view` | Automatic on load. Manual on SPA route changes | `page_location`, `page_title` | no |

A default launch conversion is one contact or quote request. That is the count of
`generate_lead` key events. Call and WhatsApp clicks show intent, not a lead.

## 6. Installation on the site

The module is `analytics/ds-analytics.js`. It has no dependencies. Copy it into
the site project. Do not edit the event names.

1. Load the module in every page, before the closing head tag.
2. Start it once with the measurement ID from the IDs table:

   ```js
   DSAnalytics.init({ measurementId: 'G-XXXXXXXXXX' });
   ```

3. Put `data-ds-form="contact"` on the contact form element. Put
   `data-ds-form="quote"` on the quote form element.
4. Put `data-ds-location="header"` (or `footer`, `contact-page`, `nav`) on links
   and forms. This shows where the action happened.
5. For forms that submit with JavaScript, call the manual method only after the
   server accepts the submission:

   ```js
   DSAnalytics.contactSubmit({ formLocation: 'contact-page' });
   DSAnalytics.quoteRequest({ formLocation: 'pricing-page' });
   ```

6. `tel:` and WhatsApp links need no code. The module binds them automatically.
7. On SPA route changes, call `DSAnalytics.pageView('/new-path', 'Page title')`.

Consent defaults: `analytics_storage` granted, ads signals denied. Set the
`analyticsConsent` option to `denied` only for a client in a region that needs it.

## 7. How to check the setup

### 7.1 Offline event test (done)

The test runner fires each event against stubs and checks each GA4 hit.

```
node analytics/test/run-tests.cjs
```

Result on 2026-10-18: 36 checks, 36 passed, 0 failed. Checks cover: bootstrap
commands, consent defaults, gtag.js script build, `call_click`, `whatsapp_click`,
`contact_form_submit`, `quote_request`, `generate_lead`, duplicate guard, manual
API, `page_view`, and input validation.

Run this test after each change to the module.

### 7.2 Live DebugView test (waits on the GA4 property)

Do this after step 3 creates the property. A pass needs the real Measurement ID
and a visible DebugView entry. Do not record a pass without DebugView.

1. Open a terminal in the `analytics/test` folder.
2. Start a local web server: `python3 -m http.server 8901`.
3. Open `http://localhost:8901/live-harness.html?id=G-XXXXXXXXXX` in a browser.
   Use the real Measurement ID.
4. Open GA4, then Admin, then DebugView, in a second tab.
5. Click each button once: contact form, quote form, call link, WhatsApp link.
6. Watch each event land in DebugView. Check the parameters of each event.
7. Record each result in the test record, section 8.
8. The harness sends hits with `debug_mode: true`. Real traffic does not use
   DebugView. This does not change the event names or parameters.

### 7.3 Production checks (waits on the live site)

1. Load the live site. Open the browser network tools. Filter on `google-analytics.com/collect`.
2. Check that a collect request appears on page load.
3. Submit a test contact. Check the `contact_form_submit` and `generate_lead`
   requests in the filter.
4. Open GA4, then Reports, then Realtime. Check the event count within one minute.
5. In Search Console, use the URL inspection tool on the home page.
6. Add the result rows to the test record, section 8.

## 8. Test record

| Event | Test method | Date | Result |
| --- | --- | --- | --- |
| `contact_form_submit` | Offline runner | 2026-10-18 | PASS (queued hit correct) |
| `generate_lead` (contact) | Offline runner | 2026-10-18 | PASS (queued hit correct) |
| `quote_request` | Offline runner | 2026-10-18 | PASS (queued hit correct) |
| `generate_lead` (quote) | Offline runner | 2026-10-18 | PASS (queued hit correct) |
| `call_click` | Offline runner | 2026-10-18 | PASS (queued hit correct) |
| `whatsapp_click` | Offline runner | 2026-10-18 | PASS (queued hit correct) |
| `page_view` | Offline runner | 2026-10-18 | PASS (queued hit correct) |
| `contact_form_submit` | DebugView | PENDING | waits on GA4 property (step 3) |
| `quote_request` | DebugView | PENDING | waits on GA4 property (step 3) |
| `call_click` | DebugView | PENDING | waits on GA4 property (step 3) |
| `whatsapp_click` | DebugView | PENDING | waits on GA4 property (step 3) |
| all events on live site | Realtime + collect | PENDING | waits on site deploy (DIG-15, DIG-64) |

Issue DIG-65 is complete when every PENDING row becomes PASS.

## 9. Weekly report

Build this after the GA4 property exists. The report gives the team traffic and
conversions each week with no manual work.

### 9.1 Report content

| Block | Chart | Dimensions | Metrics |
| --- | --- | --- | --- |
| Traffic | Scorecard | — | Sessions, Active users |
| Engagement | Time series by day | Date | Sessions, Key events |
| Conversions | Table | Session source / medium | Key events, Sessions |
| Leads by action | Table | Key event name | Key events count |
| Landing pages | Table | Landing page + query string | Sessions, Key events |

Date range: last 7 days. Compare to the previous 7 days.

### 9.2 Build steps

1. Log in at lookerstudio.google.com with the company Google account.
2. Create a new report. Add a data connector for Google Analytics. Select the
   property `Digitally Shifted — digitallyshifted.com`.
3. Add the five blocks from table 9.1. Set the date range to last 7 days.
4. Name the report `Weekly traffic and conversions — digitallyshifted.com`.
5. Open Share, then Schedule email delivery.
6. Set the schedule: every Monday, 08:00, team distribution list.
7. Open the report once. Check the numbers against GA4 Reports, then Reports,
   then Traffic acquisition.

For a quick manual check without Looker Studio: open GA4 Reports, then
Engagement, then Events. Set the date range to 7 days. Read the key event counts.

## 10. Go-live link (DIG-20)

Before go-live, confirm each row:

- [ ] GA4 property and stream created. IDs recorded in section 2.
- [ ] Tracking module live on the production site with the real Measurement ID.
- [ ] DebugView test passed. All four events recorded in section 8.
- [ ] Key events marked in GA4 (step 3.4).
- [ ] Search Console verified through DNS. Sitemap submitted.
- [ ] Weekly report built and scheduled.

Keep this document current. When the setup changes, change this file in the
same pull request.

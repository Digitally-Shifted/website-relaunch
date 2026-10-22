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
| GA4 property ID | `559909520` | agent, 2026-10-21 (Route D) |
| Web data stream ID | `16173008721` | agent, 2026-10-21 (Route D) |
| Measurement ID | `G-QEC7TYQY6F` | agent, 2026-10-21 (Route D) |
| Search Console property | Domain property `sc-domain:digitallyshifted.com` | exists; verified owner: accounts@digitallyshifted.com |
| Search Console verification | already verified (long-standing; no new DNS step) | — |
| GitHub variable `PUBLIC_GA4_ID` | `G-QEC7TYQY6F` (set 2026-10-21) | agent; picked up by the 2026-10-22 staging build after the workflow fix (commit `721cd9c`) |

Google Cloud project: `digitally-shifted`. Service account:
`ds-analytics-agent@digitally-shifted.iam.gserviceaccount.com`. APIs enabled:
Analytics Admin, Search Console, Site Verification. The GA4 Editor grant for
the service account is active at account level (verified 2026-10-22). The
2026-10-21 key download was lost in the server crash. A new key was created
on 2026-10-22 and proposed through the Paperclip secret pathway
(`google/accounts-sa-key` → `access.google_accounts_sa`, proposals
`18fb4cf9` + `a9a74d29`). Board approval of the two cards activates API
access. The old active key `b93ebb83…4999b6c` (2026-10-21) has no known
private-key copy; the owner may delete it in the console Keys tab.

The workflows read `vars.PUBLIC_GA4_ID` (a repository **variable**, not a
secret; commit `721cd9c`, 2026-10-22). The value ships in page HTML, so a
variable is the correct store. Keep the two stores in mind when changing
build inputs: `secrets.*` and `vars.*` are separate GitHub stores.

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

Status 2026-10-20: the owner picked the secret store for key delivery, and
then chose an assisted browser session. The agent opened the managed
window, but Google refused the sign-in in it: "This browser or app may not
be secure". That block is part of the Google account protection against
automated browsers. The agent does not bypass it. Route C is closed.

Status 2026-10-21: the owner picked Route D (attach to their own browser).
The agent launched the machine's own Chromium with a debug port and a
dedicated profile. Google served the normal sign-in page in it, and the
sign-in completed. At 11:46 the browser was inside analytics.google.com.
The 12:00 memory outage crashed that browser. The profile keeps the
sign-in, so a relaunch continues without a new sign-in. Route D is the
active route. Route A stays the fallback if Google refuses this window too.

Three routes remain.

**Route A — service account key through the secret pathway (fallback).** A
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

**Route C — assisted browser session (closed 2026-10-20).** The agent opens
a managed browser window and drives the setup while the owner signs in
inside that window. On 2026-10-20 Google refused the sign-in in the managed
browser with "This browser or app may not be secure". The block protects
the account against automated browsers. The agent does not bypass it. Do
not retry this route in a managed browser.

**Route D — attach to the owner's own browser (active).** The agent starts
the machine's own Chromium with a remote-debugging port and a dedicated
profile directory. The window is a normal headed browser with no automation
flags, so Google treats it as a normal browser. The owner signs in inside
that window and types the password and the verification code. The agent
attaches to the debug port and drives the setup steps. The owner types all
credentials; the agent never sees them.

Launch record 2026-10-21:

- Binary: `/usr/bin/chromium` (Chromium 154.0.8037.97, Arch package).
- Profile: `/home/baruch/.ds-debug-profile` (dedicated; not the owner's
  normal browser profile, so no personal tabs or stored passwords exist in
  the window).
- Debug port: `127.0.0.1:9222` (localhost only; the agent reaches the port
  only on this machine, hostname `cachyos-x8664`).
- Flags: `--user-data-dir`, `--remote-debugging-port=9222`,
  `--password-store=basic`, `--no-first-run`, `--no-default-browser-check`,
  `--start-maximized`. No `--enable-automation`, no headless mode.
- Start page: Google sign-in with continue to console.cloud.google.com.
- Result: the normal sign-in page loaded (no security block), and the
  sign-in completed.

Manual relaunch command, if the window is closed:

```sh
chromium --user-data-dir="$HOME/.ds-debug-profile" \
  --remote-debugging-port=9222 --password-store=basic --no-first-run \
  --no-default-browser-check \
  "https://accounts.google.com/ServiceLogin?continue=https%3A%2F%2Fconsole.cloud.google.com%2F"
```

Rules for Route D:

1. The owner types all credentials in the window. The agent never sees or
   stores them.
2. Do not close the window while the setup runs.
3. While the agent is attached, it can see the tabs of that window. Keep
   personal browsing out of that window.
4. The agent attaches and then drives: project create, the three API
   enables, service account and JSON key, GA4 property and stream, Editor
   grant, Search Console insert and verification token.
5. If Google refuses this window too, close it and use Route A.

Status 2026-10-21 (continuation): the Route D sign-in survived the 12:00
server restart. The agent relaunched the same profile, reattached on port
9222, and completed the setup through the browser.

Status 2026-10-22: the profile folder survived (`.ds-debug-profile`); a
relaunch and reattach needed no new sign-in. Completed in that window: the
five key-event marks (3.4), verification that the GA4 Editor grant for the
service account is already active, and the new service account key delivery
through the Paperclip secret pathway. The GSC delegated-owner step waits on
the binding approval (the old verification-home UI retired; use the Site
Verification API afterwards).

The 2026-10-21 session had already done: project `digitally-shifted`, the
three APIs, service account, GA4 account and property, web data stream,
measurement ID, `PUBLIC_GA4_ID` variable, live DebugView test with all five
events. Open items (state 2026-10-22):

- ~~Key-event marks for the five events~~ — done 2026-10-22 (step 3.4).
- ~~Service account key~~ — new key created 2026-10-22 and proposed through
  the Paperclip secret pathway (`google/accounts-sa-key`, config path
  `access.google_accounts_sa`). Board approval of the two cards (proposals
  `18fb4cf9` + `a9a74d29`) activates it. Then delete the old orphaned key
  `b93ebb83…` in the console Keys tab.
- ~~GA4 Editor grant~~ — already active (verified 2026-10-22).
- Search Console delegated owner for the service account — optional. The
  users dialog rejects the service account email and the old
  verification-home UI retired. Do it through the Site Verification API once
  the key binding is approved.

Known UI quirk for Route D runs: Google panel dialogs can render off-screen
or need a horizontal scroll on this dual-monitor setup. If a click does
nothing, screenshot first, scroll the panel header, and click at the visible
position.

Follow 3.1 to 3.4 for every route. Route D runs them in the attached
window. Route A runs them through the APIs. Route B runs them in the
owner's browser.

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

Done 2026-10-22. All five events are registered and marked as key events in
GA4 (Admin → Data display → Events → Key events tab, filled stars;
evidence `/tmp/DIG-65/key-events-marked.png`). Each was created through
"Create event" with a never-matching page condition (`URL contains
__ds-no-match-000__`), so only the module's own events fire under these
names; the mark applies by event name. `purchase` was left unmarked on
purpose.

To change a mark later: Admin → Data display → Events → Key events tab.

## 4. Search Console

Route A: the agent inserts the site through the Site Verification API and
supplies the verification token. The human places the DNS record (step 4.2).
Route B: the owner does all steps in the browser. Route D: the agent drives
the steps in the attached window.

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

### 6.1 Repository state (own site)

- `main` carries the module, the `BaseLayout` boot, and this doc. Do **not**
  merge `analytics/dig-65-conversion-tracking` or `analytics/dig-65-route3`:
  both branches are stale (based on the early scaffold `de86e4f`) and a merge
  would delete the current site build. Delete them after this issue closes.
- Staging (GitHub Pages) deploys on every push to `main` and runs the offline
  analytics tests first (`npm run test:analytics`).
- The production release is gated (`.github/workflows/deploy-production.yml`);
  it reads the same `vars.PUBLIC_GA4_ID`.

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

### 7.2 Live DebugView test (done 2026-10-21)

Done on 2026-10-21 against the real property. The harness ran with the real
measurement ID and debug mode. DebugView (Debug Device) showed, in one
visit: `page_view`, `session_start`, `first_visit`, `scroll`,
`contact_form_submit`, `generate_lead` (contact), `quote_request`,
`generate_lead` (quote), `call_click`, `whatsapp_click`. Evidence:
`/tmp/DIG-65/debugview-all-events.png`.

Do this again after any change to the module:

1. Open a terminal in the `analytics/test` folder.
2. Start a local web server from the `analytics` folder:
   `python3 -m http.server 8901`. The harness loads `../ds-analytics.js`,
   so serve the `analytics` folder, not `analytics/test`.
3. Open `http://localhost:8901/test/live-harness.html?id=G-QEC7TYQY6F` in a
   browser.
4. Open GA4, then Admin, then DebugView, in a second tab.
5. Click each button once: contact form, quote form, call link, WhatsApp link.
6. Watch each event land in DebugView. Check the parameters of each event.
7. Record each result in the test record, section 8.
8. The harness sends hits with `debug_mode: true`. Real traffic does not use
   DebugView. This does not change the event names or parameters. Debug hits
   do not appear in the events list, so key-event marks need the production
   test in 7.3.

### 7.3 Staging checks (done 2026-10-22)

The staging build (commit `721cd9c`) serves the module with the real ID.
Verified with a live visit to
`https://digitally-shifted.github.io/website-relaunch/`:

1. `page_view`: `POST google-analytics.com/g/collect` → 204, `tid=G-QEC7TYQY6F`,
   `gcs=G101` (analytics granted), `npa=1` (ads denied). PASS.
2. Footer `tel:` click: collect → 204, `en=call_click`, `ep.location=footer`. PASS.
3. Footer `wa.me` click: dataLayer records `whatsapp_click`; collect leaves the page. PASS.
4. Module state: `window.DSAnalytics.ready === true`, measurement ID set. PASS.
5. Form leads were NOT tested on staging by design: a staging submit creates a
   real `generate_lead` in reports. The full lead chain (form → `lead_ok`
   cookie → thank-you → two lead events) was proven in DebugView (7.2) and
   repeats in the production checks below.

### 7.4 Production checks (waits on the live site)

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
| `contact_form_submit` | DebugView | 2026-10-21 | PASS (landed 12:28:54 with `form_location`) |
| `generate_lead` (contact) | DebugView | 2026-10-21 | PASS (landed 12:28:55 with `form_type`) |
| `quote_request` | DebugView | 2026-10-21 | PASS (landed 12:29:03) |
| `generate_lead` (quote) | DebugView | 2026-10-21 | PASS (landed 12:29:02) |
| `call_click` | DebugView | 2026-10-21 | PASS (landed 12:29:19) |
| `whatsapp_click` | DebugView | 2026-10-21 | PASS (landed 12:29:25) |
| key-event marks (all five) | GA4 Admin → Events → Key events tab | 2026-10-22 | PASS (five stars set; `purchase` left unmarked) |
| `page_view` on staging | collect beacon | 2026-10-22 | PASS (204, `tid=G-QEC7TYQY6F`, `gcs=G101`, `npa=1`) |
| `call_click` on staging | collect beacon after footer `tel:` click | 2026-10-22 | PASS (204, `en=call_click`, `ep.location=footer`) |
| `whatsapp_click` on staging | dataLayer + collect after footer `wa.me` click | 2026-10-22 | PASS (event recorded, beacon leaves page) |
| module boot on staging | `window.DSAnalytics` state | 2026-10-22 | PASS (`ready=true`, real ID set) |
| all events on live site | Realtime + collect | PENDING | waits on the production release (go-live, DIG-20 / §7.4) |

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

### 9.3 Build record (2026-10-22, completed same day)

Report created in Looker Studio with the company Google account
(accounts@digitallyshifted.com, Route D browser session):

- Report: `Weekly traffic and conversions — digitallyshifted.com`
- Report ID: `73eb5835-c06b-4a47-8b2a-a130faf99db8`
- URL: https://datastudio.google.com/reporting/73eb5835-c06b-4a47-8b2a-a130faf99db8
- Data source: Google Analytics connector, property 559909520
  (account 412753375), owner's credentials.

Blocks built (all on Last 7 days, confirmed in each chart's Setup panel):

| Block | State |
| --- | --- |
| Scorecard, Sessions | built. Custom Last 7 days (exclude today). |
| Scorecard, Active users (`1-day active users`) | built. Custom Last 7 days (exclude today). |
| Time series, Date × Sessions + Key events | built. Custom Last 7 days; axis verified Oct 15–21. |
| Table, Session source / medium + Date × Key events + Sessions | built. Custom Last 7 days. |
| Table, Event name × Views + Key events | built. Custom Last 7 days. |

Email schedule (verified in the Schedule delivery panel after saving):

- "This report is scheduled for email delivery."
- From: Digitally Shifted. To: Digitally Shifted group +
  `support@digitallyshifted.com`.
- Start Date: Monday, October 26, 2026. Repeat: Weekly on Monday.
- Time: 8:00 AM, South Africa Standard Time.

Optional tidy-up (cosmetic, not blocking): remove the spare Date dimension
from the source table and the Views metric from the event table, and space
the charts on the page. First email lands Monday, October 26 at 08:00 SAST.
Check it arrives, then tick section 10.

Note for the next person in this report: the five key events do not show
values until the production site carries the tracking module (section 10,
row 2). Staging traffic feeds the property since 2026-10-22.

Evidence: `/tmp/DIG-65/report-state-final.png` (before the range fixes),
`/tmp/DIG-65/key-events-marked.png`.

## 10. Go-live link (DIG-20)

Before go-live, confirm each row:

- [x] GA4 property and stream created. IDs recorded in section 2.
- [ ] Tracking module live on the production site with the real Measurement ID.
- [x] DebugView test passed. All five events recorded in section 8.
- [x] Key events marked in GA4 (step 3.4, done 2026-10-22, before first production traffic).
- [x] Search Console verified (long-standing). Sitemap submitted and succeeding.
- [x] Weekly report built and scheduled (section 9.3; first email Monday 2026-10-26 08:00 SAST).
- [x] `PUBLIC_GA4_ID` flows into builds (workflow fix `721cd9c`; staging verified 2026-10-22).
- [ ] Service account key approved in Paperclip. Optional: unlocks unattended API reports and GSC data pulls. State 2026-10-22 16:39: the board accepted two binding cards; both writes failed `http_409` (the compound approve-plus-bind step conflicts). The key value sits intact in pending proposal `18fb4cf9` (expires 2026-11-05). Fix path, recorded on the issue: the board approves the proposal in Settings → Secrets → Proposals, then the agent re-proposes the binding against the created secret. Say "drop it" to close the thread without the API.
- [ ] Search Console delegated owner for the service account. Optional: the users dialog rejects service-account emails and the old verification-home UI retired; do it later through the Site Verification API once the key binding is approved.

Keep this document current. When the setup changes, change this file in the
same pull request.

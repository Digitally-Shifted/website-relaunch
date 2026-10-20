# Conversion Spec — Digitally Shifted Website Relaunch

**Version:** 1.0 · 2026-10-18
**Owner:** DIG-66 · Applies to DIG-15 and DIG-16 implementation work
**Inputs:** Product Marketing Context v1.2 ([DIG-38](/DIG/issues/DIG-38) document `product-marketing-brief`), analytics event plan ([DIG-65](/DIG/issues/DIG-65)), design tokens v4.1.0 (`brand/tokens/design-tokens.json`), brand book v4.1

This spec tells a developer what to build for lead capture on each page. It gives the conversion goal, the calls to action, the form, the thank-you state, form handling, and the tracking events. A developer can implement this file without further questions. Where a decision belongs to the owner, the file names it in "Open items".

---

## 1. Launch conversion definition

**A conversion for launch is a received enquiry or quote request.** In analytics, it is one of two events: `contact_form_submit` or `quote_request`.

- A `call_click` or `whatsapp_click` is a tracked engagement event. It is not a launch conversion.
- One form submission produces exactly one conversion event. Never fire two.
- GA4 must register these two events as key events (conversions). DIG-65 owns the GA4 property and this registration.

**Full conversion chain (from the DIG-38 brief, v1.2):** website enquiry → booked consultation → signed WaaS agreement. GA4 measures the first step. The sales pipeline measures the later steps. The brief records this chain as a proposal that still awaits owner confirmation. This spec already aligns with it; no change is needed if the owner confirms it.

---

## 2. Global capture elements

These elements appear on every page. They carry the primary offer to the visitor everywhere.

### 2.1 Header CTA

- One button in the header on every page except `/contact` and `/contact/thank-you`. On those two pages, hide it (the form is present or just completed).
- Label: `Get a quote`.
- Link: `/contact?need=quote`. The `need` parameter preselects the form's "What do you need?" select. See section 4.2.
- Style: primary button. See 2.4.

### 2.2 Footer contact block

The footer shows real contact routes. Use these verified details from the brand book:

| Route | Value | Link |
|---|---|---|
| Phone | +27 63 171 8750 | `tel:+27631718750` |
| WhatsApp | +27 63 171 8750 | `https://wa.me/27631718750` |
| Email | baruch@digitallyshifted.com | `mailto:baruch@digitallyshifted.com` |
| Domain | digitallyshifted.com | `https://digitallyshifted.com` |

All four links are always visible in the footer. Do not hide them behind a click.

### 2.3 Mobile action bar

On viewports under 768 px, show a fixed action bar at the bottom of the screen:

- Two buttons of equal width: `Call` (`tel:` link) and `WhatsApp` (`wa.me` link).
- Always visible while scrolling. No scroll trigger.
- Hidden on `/contact`, `/contact/thank-you`, and `/privacy` (they must not cover a form or legal text).
- The bar adds padding to the page bottom so it never covers footer content.

### 2.4 Button and link styles (brand tokens v4.1)

| Element | Style |
|---|---|
| Primary button | Fill `#FD4000` (accent), label Ink `#000000`. Contrast 5.91:1. Never white text on this fill. |
| Secondary button | 2 px Ink outline, transparent fill, Ink label, on Paper. On Carbon, 2 px `#F0F0F0` outline, `#F0F0F0` label. |
| Link on light ground | Ink `#000000`, always underlined. |
| Link on dark ground | `#FD4000`, always underlined. |
| Focus ring | 2 px `#FD4000`, always visible, on both grounds. |
| Disabled control | `#A3A3A3` on light, `#5A5A5A` on dark. |

Use one primary button per view section. One primary action per page region keeps the choice clear.

### 2.5 CTA labels

Use the same label for the same action on every page. Approved labels only:

| Label | Use | Link |
|---|---|---|
| `Get a quote` | Primary CTA everywhere | `/contact?need=quote` |
| `Send enquiry` | Form submit button, default | — |
| `Request quote` | Form submit button, quote intent selected | — |
| `Call` | Phone routes | `tel:` |
| `WhatsApp us` | WhatsApp routes | `wa.me` |
| `See what is included` | Secondary link from Home hero | `/services` |
| `Get the checklist` | Guide checklist CTA | `/checklist/` |

Do not use `free`, `cheap`, `guaranteed`, or `best` in any label or button (DIG-38 voice rules; unproven claims are banned).

---

## 3. Pages and their conversion goals

| Page | Conversion goal | Primary CTA |
|---|---|---|
| Home `/` | Start an enquiry or quote | `Get a quote` |
| Services `/services` | Start an enquiry for a service | `Get a quote` |
| About `/about` | Trust, then contact | `Get a quote` |
| Contact `/contact` | Completed form submit | The form itself |
| Thank-you `/contact/thank-you` | Reassure; give direct routes | Call / WhatsApp links |
| Privacy `/privacy` | Inform only | None |
| 404 | Recover the visit | `Get a quote` |
| Landing pages | One offer, one form | The form itself |

### 3.1 Home `/`

- **Conversion goal:** the visitor starts an enquiry or requests a quote.
- **Primary CTA:** `Get a quote` button in the hero, above the fold, on mobile and desktop.
- **Secondary CTA:** text link `See what is included` next to the primary button, linking to `/services`.
- **Repeat CTA:** one `Get a quote` button after the services summary section, and one in the closing section before the footer.
- **Contact routes:** the footer block (2.2) and the mobile bar (2.3). Add no other phone links.
- **Tracking:** this page fires no conversion event by itself. Buttons here route to `/contact`.

### 3.2 Services `/services`

- **Conversion goal:** the visitor requests a quote for one service.
- **Page structure:** one section per service, in this order: website design and development; hosting and management; Website-as-a-Service (WaaS); SEO (includes AIO when its scope is defined). The WaaS section states plainly that one monthly fee covers design, hosting, management, and SEO. State prices only if the copy task supplies them; do not invent prices here.
- **Primary CTA:** each service section ends with one `Get a quote` button linking to `/contact?need=<value>`:

| Section | `need` value |
|---|---|
| Website design and development | `new-website` |
| Hosting and management | `hosting` |
| WaaS | `waas` |
| SEO | `seo` |

- **Tracking:** buttons route to `/contact`. No events fire on this page.

### 3.3 About `/about`

- **Conversion goal:** the visitor trusts the business and moves to contact.
- **Primary CTA:** one `Get a quote` button at the end of the page content, before the footer.
- **Content rule:** publish no testimonials, metrics, or case studies. None exist (DIG-38 proof-point rule). Keep the page to who we are, what we do, and how we work.
- **Tracking:** no events on this page.

### 3.4 Contact `/contact`

- **Conversion goal:** a completed form submit. This is the conversion page of the site.
- **Primary CTA:** the form. The submit button label follows section 4.5.
- **Page layout:** heading, one short line under it (see 4.6), the form, then the footer contact block repeated as plain text with clickable links. No map, no embedded calendar at launch.
- **Tracking:** `contact_form_submit` or `quote_request` fires here on server-confirmed success. See section 7.

### 3.5 Thank-you `/contact/thank-you`

- **Purpose:** confirm the submission and give a direct route if the visitor wants speed.
- **Reach:** the form endpoint responds `303` and redirects here on success. The page is not linked from navigation.
- **Meta:** `<meta name="robots" content="noindex">`.
- **Content, in this order:**
  1. Headline: `Thank you. We have your message.`
  2. One line: `We aim to reply within one business day.` (Owner must confirm this promise. See open items. Until confirmed, ship it as written — it is the launch default.)
  3. Direct routes as buttons: `Call` and `WhatsApp us` (tracked events apply; `location=thankyou`).
  4. Link: `See what we do` → `/services`.
- **Tracking:** this page fires no conversion event. The event fired at submit time. This avoids double counting.

### 3.6 Privacy `/privacy`

- **Purpose:** one screen that says what the form stores and how to remove it. The form's consent line links here.
- **Content (owner reviews the wording; see open items):**
  1. What we store: the details you send through our forms, with the date.
  2. Why: to reply to your enquiry.
  3. What we do not do: we do not sell your details.
  4. How to remove them: email baruch@digitallyshifted.com.
- **Style:** plain text page, Paper ground, no CTA, no tracking events.

### 3.7 404 page

- **Conversion goal:** recover the visit.
- **Primary CTA:** one `Get a quote` button.
- **Secondary:** one link to `/`.
- **No other content.** Keep it to a headline, one line, the button.

### 3.8 Landing pages (pattern — apply when DIG-55 names them)

The design spec (DIG-55) is not final at the time of writing. When it names landing pages, apply this pattern. Do not wait for it to build the rest of this spec.

- **Conversion goal:** one form submit for one offer.
- **Structure:** hero with one benefit headline; three bullets that describe what is included (process and scope only — no invented results or numbers); the form; footer.
- **Primary CTA:** the form submit button. No header CTA on landing pages (the form is the action).
- **Form:** the standard form component (section 4), with fields reduced to: name, phone or email (at least one required), message optional. The `need` select is absent; the landing page slug fills `need` automatically.
- **Submission endpoint and handling:** identical to the main form. `form_location` = the landing page path.
- **UTM capture:** landing pages will run in campaigns. Apply section 6.4.
- **Thank-you:** the same `/contact/thank-you`.

---

## 4. The enquiry form

One form component serves the whole site. There is exactly one form on the site at launch. A developer builds it once and places it on `/contact` (and later on landing pages with the 3.8 reductions).

### 4.1 Fields

| # | Field | Type | Required | Validation | Notes |
|---|---|---|---|---|---|
| 1 | Name | `text` | Yes | 1–100 chars | Label `Your name`. `autocomplete="name"`. |
| 2 | Email | `email` | Yes* | Email format | Label `Email`. `autocomplete="email"`. |
| 3 | Phone | `tel` | No | Tolerant: `+27…`, `0…`, spaces and dashes allowed | Label `Phone (optional)`. `autocomplete="tel"`. `inputmode="tel"`. |
| 4 | Business name | `text` | No | 0–120 chars | Label `Business name (optional)`. `autocomplete="organization"`. |
| 5 | What do you need? | `select` | Yes | One of the options in 4.2 | Label `What do you need?`. Preselect from `?need=` param. |
| 6 | Message | `textarea` | Yes | 1–5000 chars | Label `Tell us about your project`. Rows: 5. |
| 7 | Consent line | static text + link | — | — | See 4.6. Not an input. |
| 8 | Honeypot | `text` | — | Must stay empty | See 6.2. Hidden from users. |

\* Email and phone: exactly one of the two is required, but on the main form email is the required default. Rule: if email is empty and phone is empty, block submit with the message `Add your email or phone number so we can reply.` If either is present, the form is valid. (The landing page variant in 3.8 follows the same rule.)

This is the minimum set that protects completion. Do not add fields. Every added field loses submissions.

### 4.2 "What do you need?" options and intent

The select drives the conversion event and the button label. Store the option `value` in the submission; show the `label` to the user.

| value | label | quote intent | Preselect link |
|---|---|---|---|
| `general` | General enquiry | No | (default) |
| `new-website` | A new website | Yes | `?need=new-website` |
| `redesign` | A redesign or upgrade | Yes | `?need=redesign` |
| `waas` | Website-as-a-Service (monthly plan) | Yes | `?need=waas` |
| `seo` | SEO | No | `?need=seo` |
| `hosting` | Hosting or management | No | `?need=hosting` |
| `quote` | Not sure — I want prices | Yes | `?need=quote` |
| `checklist` | The digital marketing checklist | No | — |

- Default selection: `general`.
- `?need=quote` (header CTA) preselects `quote`.
- Unknown `?need=` values fall back to `general`. Never show an error for them.
- The `checklist` value never appears in the main form's select. The `/checklist/` landing page (3.8) fills it through a hidden field, so its submit label stays `Send enquiry` and its event stays `contact_form_submit`.

### 4.3 Client-side behaviour

- Validate on submit, then validate each field on blur after its first error.
- Show one error summary above the form on failed submit, plus inline text under each invalid field. Error text example for name: `Please add your name.`
- Move focus to the error summary on failed submit. Set `aria-invalid="true"` on each invalid field. Bind each inline error with `aria-describedby`.
- Disable the submit button while the request is in flight. Label it `Sending…`. Restore it on failure.
- The form does a normal POST and follows the server redirect (303) to the thank-you page. No SPA fetch replace, no client-rendered success state. This keeps conversion tracking simple and reliable.

### 4.4 Server contract

```
POST /api/contact
Content-Type: application/x-www-form-urlencoded
```

Payload fields: `name`, `email`, `phone`, `business`, `need`, `message`, `company_website` (honeypot), `form_started_at` (ms epoch, set at render), `form_location` (page path), `utm_source`, `utm_medium`, `utm_campaign`, and a `submission_id` (UUID, generated at render, hidden).

Responses:

| Case | Response |
|---|---|
| Success | `303` redirect to `/contact/thank-you`. Store first, notify after (5.1, 5.2). Set the cookie `lead_ok=1` (session scope, `HttpOnly`, `SameSite=Lax`). |
| Validation error | `400`, re-render the form with entered values kept, error summary, and per-field messages. No cookie. |
| Spam rejected | `303` redirect to the thank-you page (see section 6). Store the row with `spam_flag = 1`. Send no email. Set no cookie, so no conversion event fires. |
| Rate limited | `429` page with the message `Too many attempts. Please try again in an hour, or call or WhatsApp us.` plus the footer contact links. |
| Server error | `500` page with the message `Something broke on our side. Please call or WhatsApp us.` plus the footer contact links. Never a dead end. |

Idempotency: if the same `submission_id` arrives twice, store nothing again and redirect to the thank-you page. This protects the data when a visitor refreshes or double-clicks.

### 4.5 Submit button label

- Default: `Send enquiry`.
- When the selected option has quote intent (4.2): `Request quote`.
- The label switches live when the select changes.

### 4.6 Consent line

Render directly above the submit button, small muted text:

> We use your details to reply to this enquiry. We do not sell them. See our [privacy notice](/privacy).

The link is Ink, underlined. This is not a checkbox. No checkbox, no tracking consent gate at launch.

### 4.7 Accessibility

- Every input has a visible `<label>`. Placeholders never replace labels.
- Required fields show `(required)` in the label text. Phone and business name show `(optional)`.
- All error text is real text, tied with `aria-describedby`. Colour alone never marks an error.
- Keyboard: the whole form works with keyboard only. Focus is never trapped. The focus ring (2.4) is always visible.
- The thank-you page moves focus to its `h1` on load.

---

## 5. Where submissions go

### 5.1 Storage (decision)

Every submission is stored first, then notified. Storage is the durable record; email is the working copy.

- Store in a `leads` table on the site host (SQLite at launch; the schema below is portable to Postgres):

```sql
CREATE TABLE leads (
  id            TEXT PRIMARY KEY,      -- = submission_id
  created_at    TEXT NOT NULL,         -- ISO 8601 UTC
  name          TEXT NOT NULL,
  email         TEXT,
  phone         TEXT,
  business      TEXT,
  need          TEXT NOT NULL,
  message       TEXT NOT NULL,
  form_location TEXT NOT NULL,
  utm_source    TEXT,
  utm_medium    TEXT,
  utm_campaign  TEXT,
  user_agent    TEXT,
  ip_hash       TEXT,                  -- sha256(ip + daily salt), rate limiting only
  spam_flag     INTEGER NOT NULL DEFAULT 0,
  email_sent    INTEGER NOT NULL DEFAULT 0
);
```

- Store spam-flagged rows too. They are the evidence for tuning spam rules. They never trigger email or conversion events.
- Retention: the owner decides when to delete. Any person can ask for deletion through `/privacy`. There is no automatic delete at launch.

### 5.2 Email notification (decision)

One email per non-spam submission, sent immediately after the row is stored.

| Property | Value |
|---|---|
| To | `baruch@digitallyshifted.com` |
| From | `no-reply@digitallyshifted.com` |
| Reply-To | the submitter's email (when given) |
| Subject (quote intent) | `Quote request — {need label} — {name}` |
| Subject (other) | `Website enquiry — {need label} — {name}` |

Body: every submitted field with its label, the page (`form_location`), the UTM values when present, the lead `id`, and the time in South African Standard Time (UTC+2). Plain text. No HTML needed.

Failure handling: if the email fails, retry every 5 minutes, up to 3 times, then set `email_sent = 0` and log it. The row still exists. A failed email never blocks the visitor's redirect. Set `email_sent = 1` on success.

Deliverability: the sending domain needs SPF and DKIM set for `digitallyshifted.com`. DIG-64 (deploy flow) owns this check. Block launch on it.

---

## 6. Spam protection (decision)

Three layers at launch. No CAPTCHA — it costs real submissions on mobile.

1. **Honeypot.** Input named `company_website`, hidden with CSS (`position:absolute; left:-9999px`), `tabindex="-1"`, `autocomplete="off"`, `aria-hidden="true"`. If it contains any value, the submission is spam.
2. **Time trap.** `form_started_at` is set at page render. If the submit arrives less than 3 seconds later, the submission is spam.
3. **Rate limit.** More than 5 accepted submissions from one IP in one hour → `429` (4.4). Count stored rows per `ip_hash`. Spam rows count toward the limit; successful ones do not re-trigger it.

Escalation trigger: if the `leads` table records more than 10 spam rows in any 7 days, add Cloudflare Turnstile (invisible mode) to the form. Do not add it before that.

---

## 7. Tracking hooks (match DIG-65)

DIG-65 sets up GA4 and Search Console and registers conversions. This section defines the exact events and the rules for firing them, so both issues build to one contract.

### 7.1 Events

| Event | Fires when | Parameters | GA4 role |
|---|---|---|---|
| `contact_form_submit` | A non-spam form submission is stored, and the selected `need` has no quote intent | `need` (value), `form_location` (path) | Key event — counts as a conversion |
| `quote_request` | Same, and the selected `need` has quote intent | `need`, `form_location` | Key event — counts as a conversion |
| `call_click` | A `tel:` link is clicked | `location`: `header` \| `footer` \| `mobile_bar` \| `content` \| `thankyou` | Engagement event |
| `whatsapp_click` | A `wa.me` link is clicked | `location` (same set), `page_path` | Engagement event |

### 7.2 Firing rules

- Send with `gtag('event', …)`. The form is a normal POST with a redirect, so fire the conversion event **on the thank-you page load**, exactly once, from two signals that only a genuine submission can produce:
  1. The submit handler writes `sessionStorage.lead_pending = {need, form_location}` before the POST.
  2. The server sets the `lead_ok` cookie on a genuine success response only (4.4). Spam redirects carry no cookie.
- On `/contact/thank-you` load: if both `sessionStorage.lead_pending` and the `lead_ok` cookie exist, read `need` and `form_location`, fire the one event, then remove the sessionStorage key and clear the cookie. If either signal is absent (direct visit, spam redirect, refresh after firing), fire nothing.
- A page refresh of the thank-you page therefore never double counts, and a spam-flagged redirect never counts at all.
- Never send name, email, phone, business, or message content in any event parameter. GA4 event params carry no personal data.
- `call_click` and `whatsapp_click` fire on click, with a 200 ms guard so one click fires once. Do not block navigation.
- The thank-you page itself fires no separate event. Its `page_view` is standard; the lead event is the one above.
- UTM values are not event parameters. They live in the lead record and the email only.

### 7.3 What DIG-65 must register

In GA4 (Admin → Events → mark as key event): `contact_form_submit` and `quote_request`. The launch report then shows conversions as defined in section 1. `call_click` and `whatsapp_click` stay ordinary events unless the owner promotes them later.

### 7.4 Verification (both issues run this)

For each event: trigger it once from a test visit, and confirm it appears in GA4 DebugView.

1. Submit the form with `need = general` → expect `contact_form_submit` with `form_location=/contact`.
2. Submit with `need = quote` → expect `quote_request`.
3. Click the footer phone link → expect `call_click` with `location=footer`.
4. Click the mobile-bar WhatsApp link at 375 px width → expect `whatsapp_click` with `location=mobile_bar`.
5. Refresh `/contact/thank-you` after step 2 → expect no second `quote_request`.
6. Record each result in the DIG-65 verification log before launch.

---

## 8. Developer acceptance checklist

Run every check on staging before launch. Each item is one check a person can run.

- [ ] Header CTA on Home links to `/contact?need=quote` and preselects `Not sure — I want prices`.
- [ ] Each Services section CTA preselects its own `need` value.
- [ ] Form submits with only name, email, and message filled (phone and business empty).
- [ ] Form submits with phone filled and email empty.
- [ ] Submitting with no email and no phone shows `Add your email or phone number so we can reply.` and keeps entered values.
- [ ] Success redirects to `/contact/thank-you`; the page shows the headline, reply line, Call and WhatsApp buttons, and the services link.
- [ ] One row appears in `leads` per submission, with `email_sent = 1` and the notification email received with correct Reply-To.
- [ ] Filling the honeypot redirects to the thank-you page, stores a row with `spam_flag = 1`, sends no email, and fires no conversion event (no `lead_ok` cookie).
- [ ] Submitting within 3 s of render stores `spam_flag = 1` and sends no email.
- [ ] The 6th submission from one IP in an hour gets the 429 page.
- [ ] Submitting the same `submission_id` twice stores one row and redirects both times.
- [ ] `contact_form_submit` fires once for a `general` submission; `quote_request` fires once for a `quote` submission; a thank-you refresh fires nothing; the `lead_ok` cookie is cleared after firing.
- [ ] Footer and mobile-bar call/WhatsApp clicks fire their events with the right `location`.
- [ ] No event parameter carries a name, email, or phone value.
- [ ] `/contact/thank-you` and `/privacy` carry `noindex`.
- [ ] Mobile action bar shows at 375 px on Home, hides on Contact and Thank-you, and covers no footer text.
- [ ] Every form control has a visible label; the full form works with keyboard only; focus lands on the error summary after a failed submit.
- [ ] The 500 path returns the fallback message with call and WhatsApp links.
- [ ] All buttons and links match the styles in 2.4; no white text sits on an accent fill; every label comes from 2.5.

---

## 9. Open items (owner or other issues; do not block implementation)

| # | Item | Owner | Effect when answered |
|---|---|---|---|
| 1 | Confirm the reply-time promise `We aim to reply within one business day.` | Owner (Baruch) | Wording on the thank-you page may change. |
| 2 | Confirm the notification inbox `baruch@digitallyshifted.com` | Owner | Change the To address in 5.2. |
| 3 | Confirm the conversion action chain (DIG-38 open item 8: enquiry → consultation → signed WaaS agreement) | Owner | No change to this spec; it already matches. Update section 1 wording if the chain changes. |
| 4 | Name the landing pages | DIG-55 design spec | Apply the 3.8 pattern per page. |
| 5 | Confirm `/privacy` wording | Owner + website copy issue | Only the page text changes; the consent line links to it. |
| 6 | SPF/DKIM for `digitallyshifted.com` | DIG-64 deploy flow | Gates launch, not development. |

**Alignment note.** DIG-38 v1.2 records the conversion action as a proposal that awaits owner confirmation: "Website enquiry becomes a booked consultation, then a signed WaaS agreement." The launch conversion in this spec is the first step of that chain, exactly as this issue requires ("a contact or quote request"). When the owner confirms or changes the chain, only section 1 needs an update.

---

*End of spec. Source of truth for brand values: `brand/tokens/design-tokens.json` v4.1.0. Source of truth for offer and voice: DIG-38 document `product-marketing-brief` v1.2. Source of truth for GA4 setup: DIG-65.*

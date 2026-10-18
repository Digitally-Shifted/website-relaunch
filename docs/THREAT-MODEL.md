# Threat model — Digitally Shifted website stack

- Issue: [DIG-74](/DIG/issues/DIG-74), Website Relaunch project
- Version: 1.0, 2026-10-18
- Status: delivered for review. Revisit at go-live ([DIG-20](/DIG/issues/DIG-20)).
- Method: STRIDE per element, data-flow diagrams, OWASP Top 10 (2021) mapping.

## 0. How to read this document

This model names what can go wrong, where, and what stops it. Each section gives
one view of the same system. Section 8 turns the findings into a prioritized
risk register. Section 9 maps each treatment to an owner issue. The model uses
evidence from the repository, not guesses, for current state. Items that do not
exist yet, such as the form backend and the production host, appear as design
requirements and go-live gates.

Evidence inputs:

- `docs/SITE-AUDIT.md` (DIG-54, audit date 2026-10-18): legacy WordPress stack,
  exposed endpoints, missing security headers, trackers.
- `docs/deploy-process.md` (DIG-64): staging and production deploy paths,
  rollback steps, verification log.
- `docs/conversion-spec.md` (DIG-66): form fields, server contract, leads
  storage, email notification, spam rules.
- `docs/analytics-setup.md` and `analytics/ds-analytics.js` (DIG-65): tracking
  events, consent defaults, no-PII rule.
- Workflow files `.github/workflows/deploy-staging.yml` and
  `deploy-production.yml`, and `scripts/*.sh`.

## 1. Scope

The model covers the full client-site stack in three states:

| Part | State today | Model section |
| --- | --- | --- |
| Legacy production site | WordPress 7.1.3 on LiteSpeed at dshost.co.za, live at digitallyshifted.com. Stays live during content migration (DIG-73). | 4.7 |
| Relaunch stack | Static site in GitHub repo `Digitally-Shifted/website-relaunch`. Staging auto-deploys to GitHub Pages. Production releases build gated artifacts. | 4.2–4.4 |
| Planned go-live pieces | Form backend `POST /api/contact`, leads store, production host, DNS switch, redirects. Owned by DIG-20 and DIG-66. | 4.5, 4.6 |

Supporting services in scope: GitHub (repo, Actions, Pages, environments), GA4,
transactional email, WhatsApp and phone channels, DNS and registrar, and the
Novamira and Plesk management planes for the legacy site.

Out of scope: the agency internal network, Google and Meta service security,
the physical security of dshost.co.za, and client laptops. We trust these
parties for their own controls. We still model how their failures touch this
stack.

## 2. Assets

Rank the assets by harm when lost. Harm ratings use High, Medium, Low.

| # | Asset | Why it matters | Harm |
| --- | --- | --- | --- |
| A1 | Lead enquiries (name, email, phone, business, message) | The only personal data the site holds. POPIA duty. Loss breaks trust and law. | High |
| A2 | Site content integrity | Defacement or malicious script on the live site harms the brand and every visitor. | High |
| A3 | Deploy pipeline (repo, Actions, Pages, release artifacts) | Control of the pipeline is control of everything the public sees. | High |
| A4 | Domain, DNS, and email identity (SPF, DKIM, DMARC) | Spoofed mail or DNS theft enables fraud in the company name. | High |
| A5 | Site availability | A lead site that is down earns nothing. | Medium |
| A6 | Analytics integrity (GA4 property and events) | Wrong numbers cause wrong decisions. Property theft leaks traffic data. | Medium |
| A7 | Legacy WordPress site and its management credentials | Live brand surface until decommission. Full-access credentials exist (Novamira, Plesk). | Medium |
| A8 | Redirect map and SEO state (DIG-18) | Wrong redirects lose rankings and visitors at the switch. | Medium |
| A9 | Company social accounts linked in the footer (Facebook, LinkedIn, WhatsApp number) | Impersonation reaches clients through trusted channels. | Low |

## 3. System model and trust boundaries

### 3.1 Data-flow diagram D1 — runtime (visitors)

```text
                TB1                     TB2                        TB3
Visitor ---> [ Edge/CDN ] ---> [ Site host ] ---> [ Form backend ] ---> [ Leads DB ]
   |              |                |  static            |  POST /api/contact   |
   |              |                |                    |                      v
   |              |                v                    +--> [ Email ]  TB4 (mailbox)
   |              |          (legacy: LiteSpeed + WordPress + Plesk/Novamira)
   |              |
   |              +-- TB5 --> [ GA4 collect ]  (ds-analytics.js, gtag.js)
   +-- TB6 --> [ wa.me / tel: ]  (deep links, out-of-band channel)
```

### 3.2 Data-flow diagram D2 — deploy (content and releases)

```text
            TB7                    TB8                        TB9
Author ---> [ GitHub repo ] ---> [ Actions runner ] ---> [ GitHub Pages (staging) ]
(agent or      main push            build + checks          public, auto-publish
 person)                            release artifacts
                                  |
                                  | TB10 gated: production environment
                                  | requires a reviewer approval
                                  v
                            [ GitHub release + prod-* tag ]
                                  | go-live (DIG-20): upload step
                                  v
                            [ Production host ]
```

### 3.3 Trust boundaries

| # | Boundary | Crossed by | Note |
| --- | --- | --- | --- |
| TB1 | Internet to edge | All visitors, bots, scanners | BitNinja-style JS challenge on the legacy site today. | 
| TB2 | Edge to origin host | Page and form traffic | Legacy: openresty to LiteSpeed. New: host TBD at go-live. |
| TB3 | Form backend to data stores | Leads writes, email sends | Highest-value boundary for A1. |
| TB4 | Email system to company mailbox | Enquiry notifications | Attacker-controlled text enters a human inbox here. |
| TB5 | Browser to Google collect endpoints | GA4 hits | Consent mode applies. |
| TB6 | Browser to WhatsApp | Deep links | Leaves web control. |
| TB7 | Authors to GitHub | Pushes, PRs, dispatches | Credential theft here is the top pipeline risk. |
| TB8 | Actions runner to Pages | Deploy artifacts | OIDC and short-lived tokens today. |
| TB9 | Pages to visitors | Staging content | Public by design. |
| TB10 | Approver to production | Manual environment approval | Blocks unreviewed production releases. |
| TB11 | Agency tooling to legacy host | Novamira and Plesk REST calls | Full-access credentials held by the agency. |

## 4. Attack surfaces

List every place an attacker can send input or reach code. Give a state and a
first treatment for each.

### 4.1 Public static site (new stack, staging now)

- State: plain HTML, CSS, one first-party script module planned
  (`ds-analytics.js`), no server code, no build dependencies today. Build
  markers show commit, time, and environment.
- Threats: content injection through any future build input; dependency or
  script supply chain when a framework lands in DIG-15 and DIG-16; visitor
  confusion from the public staging URL.
- First treatments: keep the no-PII and no-user-input properties; add a
  Content Security Policy at the production host; keep staging `noindex`.

### 4.2 GitHub repository

- State: public repo. Source is not secret, and no secrets live in the repo.
  Workflows use only the default `github.token`. Two deploy paths exist.
- Threats: collaborator account takeover, leaked personal access token, a
  malicious pull request that a maintainer merges, wiki or issue abuse,
  rename or transfer of the repository.
- First treatments: two-factor authentication for all collaborators;
  least-privilege collaborator list; protect `main` with required reviews and
  signed pushes when the team grows; keep all secrets out of the repo.

### 4.3 GitHub Actions workflows

- State: staging workflow runs on push to `main`, with least-privilege
  permissions and no untrusted input. Production workflow runs on
  `workflow_dispatch` with an `inputs.ref` value and waits for a required
  environment reviewer.
- Threats:
  - Script injection through `${{ inputs.ref }}` inside `run:` blocks in the
    release workflow (the release summary step). Anyone with dispatch rights
    could run commands on the runner with `contents: write`.
  - Supply-chain compromise of `actions/checkout`, `configure-pages`,
    `upload-pages-artifact`, or `deploy-pages` through tag movement.
  - Runner compromise reads repository secrets. Today the repo holds none.
- First treatments: pass `inputs.ref` only through `env:` values; pin third
  party actions to commit SHAs; enable Dependabot for workflow versions; keep
  the production required-reviewer gate.

### 4.4 GitHub Pages staging environment

- State: public URL `digitally-shifted.github.io/website-relaunch/`, published
  by `actions/deploy-pages`, rebuilt on every push to `main`.
- Threats: instant defacement on `main` compromise; header controls are not
  configurable (no custom CSP, HSTS, or frame options); crawler indexing of
  staging content.
- First treatments: treat staging as untrusted for secrets (it holds none);
  keep `noindex`; rely on `main` protection; add the production environment
  gate before any real traffic.

### 4.5 Form backend `POST /api/contact` (planned, DIG-66)

This surface does not exist yet. The contract in `docs/conversion-spec.md`
defines it. Threats to design out now:

- SQL or command injection into the leads store. Use parameterized queries
  only.
- Mail header injection through `name`, `email`, or `message` fields flowing
  into SMTP headers. Sanitize and encode every header value; set `Reply-To`
  only from a validated address.
- Stored XSS when lead data is later displayed. Escape on output, or never
  render lead data in any web view.
- Rate-limit bypass through spoofed `X-Forwarded-For`. Hash the direct peer
  address, not a client-supplied header.
- Spam and lead flooding. The honeypot, the 3-second time trap, and the
  5-per-hour limit from the spec are the base layer. Escalate to Turnstile on
  the defined trigger.
- Business email compromise through crafted enquiry text. The notification
  carries attacker-controlled content to a human. Label it clearly as a form
  submission and never act on payment or credential requests from it.
- `submission_id` reuse for harmless replays. Keep the idempotency rule.
- Session fixation or cookie flaws through `lead_ok`. Keep `HttpOnly`,
  `SameSite=Lax`, and session scope as specified.

### 4.6 Production host and DNS switch (planned, DIG-20)

- State: host not chosen. Release artifacts and a `prod-*` tag exist; the
  upload step is missing.
- Threats: weak upload credentials (long-lived passwords, shared FTP), missing
  TLS or HSTS, default headers, directory listing or exposed files (for
  example a readable leads database), no backups, registrar or DNS takeover at
  the switch, leftover WordPress endpoints if the old stack stays behind the
  same host.
- First treatments: scoped deploy credentials stored as GitHub secrets;
  TLS-only with HSTS; deny access to `docs/`, `.git`, and data files; schedule
  tested backups; move DNS with a short TTL window and verify the redirect map
  from DIG-18; decommission or fully harden the legacy WordPress host.

### 4.7 Legacy WordPress site (live during migration)

State from `docs/SITE-AUDIT.md` section 7, verified 2026-10-18:

- `/wp-json/wp/v2/users` leaks user id 1 and the author slug.
- `/wp-login.php` is reachable with no observed rate limit.
- `/xmlrpc.php` accepts POST.
- `/readme.html` discloses the WordPress version.
- Generator meta and `x-powered-by` disclose WordPress 7.1.3, Elementor 4.3.5,
  and PHP 8.1.34.
- No security headers: no HSTS, CSP, `X-Frame-Options`,
  `X-Content-Type-Options`, or `Referrer-Policy`.
- Public management namespaces: Plesk `wp-toolkit/api` and Novamira
  `novamira/v1` and `novamira-visual/v1`. The agency holds full-access
  credentials.
- Plugin surface: Elementor, Elementor Pro, LiteSpeed Cache, Rank Math,
  MonsterInsights. Each is a recurring CVE source.
- Forms and channels: contact form mails to the company mailbox, WhatsApp deep
  links, mailto links.

Threats: credential stuffing on `wp-login.php`; XML-RPC amplification and
brute force; plugin or theme exploit landing a webshell; user enumeration for
targeted phishing; management-plane credential theft for full site control;
defacement that spreads to the new site's reputation; mailbox compromise that
exposes historical enquiries.

First treatments, ordered: rate-limit or move `wp-login.php` and `xmlrpc.php`;
block user enumeration; strip version disclosures; add the missing headers;
rotate management credentials at decommission and store them as scoped
secrets; keep plugin updates on the Novamira cadence until the site retires.

### 4.8 Analytics and third-party scripts

- State: `ds-analytics.js` is first party, zero-dependency, validates the
  measurement ID, and sends no personal data by design. It loads
  `googletagmanager.com/gtag.js`. Consent defaults: analytics granted, ads
  denied until a consent banner exists.
- Threats: GA4 property takeover through the Google account; gtag loader
  supply chain (Google-controlled, no subresource integrity possible with the
  standard loader); event tampering producing wrong numbers; tracking without
  consent basis for South African POPIA.
- First treatments: two-factor authentication on the Google account; least
  access on the GA4 property; confirm the lawful basis or add a consent
  banner before the Meta Pixel or Ads tags return; keep the no-PII event rule.

### 4.9 People and out-of-band channels

- Threats: phishing of the company mailbox; WhatsApp number impersonation
  (`+27 63 171 8750` appears in the footer of both sites); fake "from the
  website" enquiries used for social engineering; lost laptop of a
  collaborator with repo and mailbox access.
- First treatments: two-factor authentication on mailbox, GitHub, Google, and
  registrar accounts; publish the same contact routes everywhere so clients
  can verify; treat payment or credential requests from any enquiry as fraud
  until verified by phone.

## 5. STRIDE analysis

One row per element. S spoofing, T tampering, R repudiation, I information
disclosure, D denial of service, E elevation of privilege.

| Element | STRIDE entries | Standing controls | Gap and treatment |
| --- | --- | --- | --- |
| Visitor to static site | T: defaced content served. I: staging exposure. D: Pages outage. | GitHub trust, public content only, `noindex`. | D accepted (GitHub SLA). Add CSP and HSTS at the production host (DIG-20). |
| Edge on legacy site | S: bot bypass. D: challenge bypass at scale. | BitNinja-style JS challenge. | D accepted; challenge is not an origin WAF. Retire with the legacy host. |
| Legacy WordPress origin | S: stolen admin session. E: plugin exploit to webshell. T: defacement. I: user enumeration. D: login floods. | Edge challenge, hosting panel. | Section 4.7 treatments; owner: DIG-73 window plus host controls. |
| Form backend (planned) | S: forged submissions. R: sender denies enquiry. T: injected rows. I: PII leak. D: flooding. | Honeypot, time trap, rate limit, idempotency, store-then-notify. | Design rules in 4.5; build to them (DIG-66). |
| Leads database (planned) | I: database file exposure. T: silent edits. R: lost history. | SQLite on host. | File permissions, deny web access to the data path, backups, restore test (DIG-20). |
| Email notification (planned) | S: spoofed domain mail. I: PII in mailbox. T: stripped or altered mail. | SPF and DKIM planned (DIG-64 gate). | Add DMARC with quarantine or reject; mailbox 2FA. |
| Company mailbox | S: phishing login. I: full enquiry history. | Agency Google or host account. | 2FA and device check; owned by agency operations. |
| GA4 | T: event tampering. I: traffic data theft. E: property takeover. | Measurement ID public by design; no PII events. | Google account 2FA; restrict property roles (DIG-65). |
| GitHub repo and Actions | S: token or account theft. T: malicious commit. E: runner takeover via injection. R: unsigned history. | Least-privilege tokens, no repo secrets, production reviewer gate, checked builds. | Pin actions to SHAs; fix `inputs.ref` injection point; branch protection on `main`. |
| GitHub Pages staging | T: instant publish of bad content. | Deploys only from `main`. | Branch protection; treat staging as public. |
| Production release path | S: attacker dispatches release. T: artifact tampering. | `workflow_dispatch` plus required reviewer; sha256 published with each artifact. | Keep the reviewer gate; verify the checksum on upload at go-live. |
| DNS and registrar | S: registrar account theft. T: record hijack. | Registrar at dshost.co.za today. | 2FA on registrar access; plan the switch window (DIG-18, DIG-20). |
| Novamira and Plesk management | S: credential theft. E: full site control. I: file and database access. | Credentials held by the agency; REST behind the edge challenge. | Scoped storage, least privilege where possible, rotate at decommission. |
| WhatsApp and phone | S: number impersonation. I: none. | Number shown publicly. | Client verification habit; report impersonation fast. |

## 6. Data flows and data classification

### 6.1 Classification

| Class | Meaning | Examples here |
| --- | --- | --- |
| Public | Safe to publish | All page content, measurement ID, contact routes |
| Visitor pseudonymous | Identifies a device or session, not a person | GA4 client id, `ip_hash`, user agent |
| Personal data (PII) | Identifies a person directly | Name, email, phone, business name, message text |
| Secret | Grants access | GitHub tokens, Novamira and Plesk credentials, mailbox password, host credentials |

### 6.2 Flow inventory

| ID | Flow | Data | Class | Protection today | Note |
| --- | --- | --- | --- | --- | --- |
| DF1 | Visitor to site pages | Request, IP at edge | Pseudonymous in logs | TLS, short edge logs | Applies to both sites |
| DF2 | Browser form to `POST /api/contact` | Name, email, phone, business, need, message, utm values, `submission_id`, `form_started_at` | PII | TLS in transit; planned | Highest-value flow. Design rules in 4.5. |
| DF3 | Backend to leads store | Same fields plus `ip_hash`, `spam_flag` | PII at rest | None yet | SQLite on host; restrict file access, back up, test restore |
| DF4 | Backend to mailbox | Full enquiry text | PII in transit and at rest | SPF and DKIM planned | Add DMARC; mailbox 2FA; plain text body keeps scanning simple |
| DF5 | Browser to GA4 | Events, page path, client id | Pseudonymous | Consent Mode v2 defaults; no-PII rule | Retention 14 months per baseline |
| DF6 | Browser to `wa.me` and `tel:` | Click context only | Public | Deep link | No site data leaves |
| DF7 | Author push to GitHub | Source code | Public (no secrets) | GitHub auth, TLS or SSH | Keep secrets out |
| DF8 | Actions to Pages | Built artifact | Public | OIDC, short-lived tokens | Staging only |
| DF9 | Dispatch to release | Artifact, tag, checksum | Public | Required reviewer | Gate holds until go-live |
| DF10 | Release artifact to production host (planned) | Site archive | Public content, secret credentials | None yet | Scoped secret, TLS upload, verify sha256 (DIG-20) |
| DF11 | Agency tooling to legacy host | Files, database, config | Secrets and content | Credential at the agency | Store as scoped secret; rotate at decommission |
| DF12 | Legacy form to mailbox | Enquiry text | PII | Hosting mail stack | Retires with the legacy site |
| DF13 | Legacy trackers (MonsterInsights, Meta Pixel) | Traffic, ad identifiers | Pseudonymous | None (no consent gate today) | New stack starts clean; decide carry-over before launch |

### 6.3 Retention and deletion

- Leads: retention is an owner decision per the spec. There is no automatic
  delete at launch. Deletion requests arrive through `/privacy`.
- GA4: 14-month event retention per the analytics baseline.
- Backups: leads backups inherit the retention duty. Encrypt backup copies
  that hold PII.
- Recommendation: set a default lead retention period now, for example 24
  months, and record it in the privacy page. Open deletion requests stay
  manual but get a documented procedure.

### 6.4 POPIA note

The site targets South African clients and stores enquiry PII. Duties that
touch this stack: a lawful basis for each flow, the consent line on the form,
the privacy page with the deletion path, reasonable security measures for the
leads store and mailbox, and breach notification readiness. This document
names the technical controls. The owner confirms the legal record.

## 7. OWASP Top 10 (2021) assessment

For each category: where it applies in this stack, the current state, and what
to do. The planned form backend carries most of the weight, so its items are
design requirements for DIG-66, not defects today.

### A01 Broken Access Control

- Applies to: form backend admin paths (none planned), leads data access,
  legacy WordPress, staging visibility.
- Current state: the new site has no accounts and no privileged endpoints.
  Staging is public by design. The legacy site exposes `/wp-json/wp/v2/users`
  and reachable admin and management endpoints.
- Actions: keep the new site free of privileged endpoints; serve leads only
  through the mailbox, not a web view; block legacy user enumeration; gate
  every management path; deny web access to the leads database path at
  go-live.

### A02 Cryptographic Failures

- Applies to: transport everywhere, PII at rest, `ip_hash`.
- Current state: both sites serve TLS. Pages and GitHub enforce HTTPS. The
  legacy site lacks HSTS. The leads store will be plaintext SQLite on the
  host. `ip_hash` uses a daily salt per the spec, which is a good
  pseudonymization choice.
- Actions: enforce HTTPS with HSTS at the production host; keep form flows on
  TLS only; restrict and encrypt backup copies; do not store more PII than
  the four fields in the spec.

### A03 Injection

- Applies to: leads SQL, email headers, any future template rendering, legacy
  WordPress plugins, workflow scripts.
- Current state: no server code exists yet. The release workflow has one
  injection point (`inputs.ref` in a `run:` block). Legacy WordPress runs
  Elementor and four plugins with recurring CVE history.
- Actions: parameterized queries only in the backend; sanitize all SMTP
  header values; escape any future output of lead data; move `inputs.ref`
  through `env:`; keep legacy plugins updated until retirement.

### A04 Insecure Design

- Applies to: the anti-spam design, the absence of a leads admin UI, the
  staging and production split.
- Current state: the design already includes honeypot, time trap, rate limit,
  idempotency, store-then-notify, and a Turnstile escalation trigger. The
  required-reviewer gate protects production releases.
- Actions: keep the three spam layers; define the lead retention default; add
  a documented manual deletion procedure; resist scope creep that adds
  accounts, dashboards, or file uploads to the launch.

### A05 Security Misconfiguration

- Applies to: production host headers and file exposure, GitHub Pages
  headers, legacy disclosure banners, repo visibility.
- Current state: Pages sends its fixed header set with no CSP or HSTS
  control. The legacy site sends version disclosures and no security headers.
  The repo is public and holds no secrets.
- Actions: configure at go-live: HSTS, CSP (start `default-src 'self'` plus
  the GA4 and Google hosts), `X-Content-Type-Options`, `Referrer-Policy`,
  `X-Frame-Options` or `frame-ancestors`; strip legacy banners or retire the
  host; add a secrets policy that keeps every secret in the Paperclip
  secret store or GitHub secrets.

### A06 Vulnerable and Outdated Components

- Applies to: legacy WordPress and plugins, future site dependencies, GitHub
  Actions versions.
- Current state: the new stack has zero runtime dependencies. WordPress
  7.1.3 with Elementor 4.3.5 was current at audit time and needs a patch
  cadence. Actions use major-version tags.
- Actions: DIG-77 defines the dependency audit cadence. Apply it to the new
  stack when DIG-15 and DIG-16 add a framework. Keep the Novamira update
  path for legacy plugins. Pin Actions to SHAs.

### A07 Identification and Authentication Failures

- Applies to: GitHub collaborators, Google account, mailbox, registrar,
  Novamira and Plesk credentials, production reviewer.
- Current state: no site-level accounts. All risk concentrates in the
  surrounding accounts. The production environment already requires a
  reviewer. Novamira logins grant full access by design.
- Actions: two-factor authentication on every account in section 4.9; keep
  the collaborator list minimum; rotate agency credentials at legacy
  decommission; record who the production reviewer is and a second reviewer
  for absence cover.

### A08 Software and Data Integrity Failures

- Applies to: build inputs, release artifacts, leads data, rollback paths.
- Current state: builds run checked scripts that fail closed. Releases
  publish a sha256 checksum. Staging rollback reruns a known run. Production
  rollback re-dispatches a prior tag with the gate applied again. The leads
  store uses `submission_id` idempotency.
- Actions: verify the checksum when the artifact lands on the host at
  go-live; test a leads restore from backup; keep the rollback runbooks
  current in `docs/deploy-process.md`.

### A09 Security Logging and Monitoring Failures

- Applies to: form backend, host logs, Actions, GA4 as a traffic signal.
- Current state: the leads schema records `spam_flag` and `email_sent`,
  which is a good base. No uptime, error, or alerting path is live yet.
  DIG-76 owns observability. Actions history lives in GitHub.
- Actions: alert on deploy failures, staging content change, 429 rates,
  email-send failure streaks, and site downtime; keep Actions audit log
  access with the repo admins; do not log raw PII beyond the leads row.

### A10 Server-Side Request Forgery

- Applies to: form backend, build scripts.
- Current state: the backend fetches nothing by design, and the build fetches
  nothing at runtime. Keep it that way.
- Actions: refuse any future feature that makes the backend fetch a
  user-supplied URL without an allowlist.

## 8. Risk register

Score each risk as Likelihood times Impact, both High, Medium, or Low.
Treatments point at an owner issue or a named action.

| # | Risk | L | I | Score | Main treatment | Owner |
| --- | --- | --- | --- | --- | --- | --- |
| R1 | Legacy WordPress compromise during the migration window (defacement, webshell, stolen enquiries) | M | H | High | Apply the 4.7 hardening list now; shorten the window; rotate credentials at decommission | DIG-73 plus host controls |
| R2 | Deploy pipeline compromise: stolen GitHub or mailbox account, or a leaked token, leads to site defacement or leads theft | M | H | High | 2FA everywhere; minimum collaborators; keep no secrets in the repo; keep the production reviewer gate | DIG-75, DIG-78 |
| R3 | Leads data breach at go-live: exposed database file, weak host, or compromised mailbox | M | H | High | Design rules 4.5; host hardening, file permissions, backups, mailbox 2FA | DIG-20, DIG-66 |
| R4 | Form spam and BEC: flooded or crafted enquiries used to phish the owner | M | M | Medium | Existing three layers; Turnstile trigger; treat money requests as fraud | DIG-66 |
| R5 | Domain spoofing: no DMARC on digitallyshifted.com lets attackers send mail as the company | H | M | High | Publish SPF, DKIM, and DMARC before launch; monitor reports | DIG-64 gate |
| R6 | Workflow script injection through `inputs.ref` by a person with dispatch rights | L | M | Low | Move the value through `env:`; pin actions to SHAs | DIG-78 |
| R7 | DNS or registrar takeover at the switch | L | H | Medium | Registrar 2FA; short TTL window; verify redirects (DIG-18) | DIG-20 |
| R8 | GA4 property takeover or data loss | L | M | Low | Google 2FA; property role limits; export schedule | DIG-65 |
| R9 | Supply-chain action or script compromise in the build | L | H | Medium | Pin SHAs; Dependabot on workflows; zero runtime dependencies until a framework lands | DIG-77 |
| R10 | Missing monitoring: a defaced or down site stays unnoticed | M | M | Medium | Alerts from A09; uptime checks; deploy-failure alerts | DIG-76 |
| R11 | POPIA gap: no retention default, no tested deletion path, no breach plan | M | M | Medium | Set retention default; document deletion; brief the owner | DIG-66, DIG-20 |
| R12 | Staging confusion: a visitor or search engine treats staging as the site | L | L | Low | Keep `noindex`; never share the staging URL with clients | DIG-15, DIG-16 |

## 9. Recommendations and gates

Ordered by the register. Each item names where it lands.

Before content migration advances further (DIG-73 window):

1. Legacy hardening, items from 4.7: rate-limit `wp-login.php`, disable or
   move `xmlrpc.php`, block user enumeration, strip version disclosures, add
   security headers. Owner: DIG-75 checklist first entry.
2. Two-factor authentication on GitHub, Google, mailbox, and registrar
   accounts. Owner: agency operations, recorded in DIG-75.

Before the form backend ships (DIG-66):

3. Build to the design rules in 4.5: parameterized queries, sanitized mail
   headers, peer-address rate limiting, no lead-data web views.
4. Set the lead retention default and the deletion procedure. Update the
   privacy page text.

At go-live (DIG-20):

5. Host hardening gate: TLS only with HSTS, CSP and the header set from A05,
   deny web access to data and docs paths, scoped deploy credentials in
   GitHub secrets, checksum verification on upload.
6. DNS switch gate: registrar 2FA confirmed, TTL lowered, redirect map from
   DIG-18 verified, legacy WordPress decommissioned or fully hardened on its
   own host.
7. Monitoring gate from DIG-76: uptime check on the production URL, deploy
   failure alert, 429 and email-failure alerts.
8. Walk the DIG-75 security review checklist with this model as the source.

Continuous (DIG-77, DIG-78):

9. Run the dependency audit cadence once a framework lands. Pin Actions to
   SHAs and enable Dependabot for the workflow files.
10. Fix the `inputs.ref` injection point in the release workflow summary step.
11. Revisit this document after any of these changes: new host, form backend
    build, framework introduction, Pixel or Ads tag return, new agency
    accounts.

## 10. Assumptions and open questions

Assumptions:

- The production host and its upload method are not chosen yet. Host-specific
  threats are gates, not findings.
- The form backend follows `docs/conversion-spec.md` as written. This model
  treats that contract as the design of record.
- No Meta Pixel or Google Ads tag returns at launch unless the owner decides
  otherwise. The audit lists the carry-over as open.
- The GitHub repository stays public and holds no secrets. The source has
  nothing to hide, and every secret lives outside it.
- One person reviews production releases today. A named second reviewer is
  still open.

Open questions for the owner:

1. Confirm the lead retention period and put it in the privacy page.
2. Confirm the lawful basis note for analytics under POPIA.
3. Name the production reviewer and the second reviewer.
4. Confirm the decommission date for the legacy WordPress host, because R1
   depends on that window.

## 11. Review cadence

The model owner updates this file when the stack changes in a way that moves
a trust boundary: new host, new backend, new framework, new third-party tag,
or new accounts with pipeline access. Minimum review points: form backend
merge (DIG-66), pre-launch checklist (DIG-20), and six months after launch.

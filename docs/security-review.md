# Security review — launch gate

This checklist gates every site launch. A production release may ship only
after a reviewer confirms every item for the exact ref that the release
ships. Owner: DIG-75. Related: DIG-74 (threat model), DIG-77 (dependency
audit), DIG-78 (release process), DIG-20 (pre-launch checklist and go-live).

## Gate rules

1. The review covers the exact commit or tag that the release will ship.
2. The production approver reads the filled checklist before they approve
   the `production` environment run.
3. A FAIL item blocks the release until a fix lands or the board accepts a
   recorded exception.
4. An exception states the risk, the owner, and an expiry date.
5. Every launch records a filled copy of this checklist in the GitHub
   release notes.

## How to run a review

1. Copy the checklist section into the release notes draft.
2. Run each Verify step against the release ref. Record PASS, FAIL, or
   exception next to each item.
3. Send each FAIL to the owning issue. Wait for the fix or the exception.
4. The approving reviewer checks the results, then approves the run.

## Checklist

### A. Repository and access

| # | Item | Verify | Pass |
| --- | --- | --- | --- |
| A1 | `main` has branch protection | `gh api repos/Digitally-Shifted/website-relaunch/branches/main/protection` | API returns 200. Force pushes and deletions are not allowed. Required review on merges is on. |
| A2 | Collaborator list is current | `gh api "repos/Digitally-Shifted/website-relaunch/collaborators?affiliation=all"` | List holds only active team members. |
| A3 | Production needs a required reviewer | `gh api repos/Digitally-Shifted/website-relaunch/environments/production --jq '.protection_rules[].type'` | Output contains `required_reviewers` and the reviewer list is current. |
| A4 | A dispatcher cannot approve their own release | Same call, read `prevent_self_review` | Value is `true`. |
| A5 | No credentials in the tree or history | `git grep -inE '(api[_-]?key\|secret\|passw(or)?d\|ghp_[A-Za-z0-9]{20,}\|AKIA[0-9A-Z]{16}\|BEGIN [A-Z]+ PRIVATE KEY)'` and the same scan over `git log -p` | No matches. GA4 measurement IDs are public by design and are allowed. |
| A6 | Public repo holds no non-public client material | Read `docs/` and page source for draft pricing, internal notes, or unpublished offers | Only launch-ready content is public. |

### B. Build and supply chain

| # | Item | Verify | Pass |
| --- | --- | --- | --- |
| B1 | Build checks pass on the release ref | Workflow run for the exact SHA | `scripts/build-site.sh` ended green in that run. |
| B2 | Workflow tokens hold least privilege | Read the `permissions:` block in each workflow | Staging: `contents: read`, `pages: write`, `id-token: write`. Production: `contents: write` (it tags and publishes releases). |
| B3 | Actions are first-party and pinned | `git grep -h "uses:" -- .github` | Only `actions/*` at fixed versions. A new third-party action needs a review first. |
| B4 | Dependency audit is current at release | DIG-77 audit report date | Report is newer than the last dependency change. No unpatched critical CVEs. The site has zero runtime dependencies today. |
| B5 | Release artifact carries a checksum | Release assets | `site-<sha>.tar.gz.sha256` is present and CI produced it. |
| B6 | Hosting upload verifies the checksum | Go-live upload step (DIG-20) | Step runs `sha256sum -c` and records a match. |

### C. Transport and browser protections

| # | Item | Verify | Pass |
| --- | --- | --- | --- |
| C1 | HTTPS is enforced on production | `curl -sI http://<prod-host>` and `curl -svI https://<prod-host> 2>&1 \| grep -i strictly` | HTTP redirects to HTTPS. Certificate is valid. HSTS header is present where the host supports it. |
| C2 | No mixed content | `git grep -n "http://" -- index.html assets analytics` and a browser console check on staging | No `http://` subresource loads. |
| C3 | Production host sends security headers | `curl -sI https://<prod-host>` | Host sends `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, and frame protection. GitHub Pages staging cannot set headers, so this gate lives on the production host. |
| C4 | Staging is not indexed | Built `index.html` head | Every staging template carries `<meta name="robots" content="noindex">`. |

### D. Third-party scripts and data flows

| # | Item | Verify | Pass |
| --- | --- | --- | --- |
| D1 | External origins are approved | `git grep -hoE "https?://[a-zA-Z0-9.-]+" -- index.html assets analytics \| sort -u` | Only approved origins appear. Approved today: `www.googletagmanager.com` (GA4 script). `wa.me` and `api.whatsapp.com` links are navigation, not scripts. A new origin needs a review first. |
| D2 | Consent default matches the privacy decision | `analyticsConsent` value in the page init | Value matches the client-approved stance. GA4 Consent Mode v2 default is set before gtag loads. |
| D3 | No visitor PII leaves in events | Event params in `docs/analytics-setup.md` and a DebugView session | Events carry no visitor personal data. `phone_number` holds the business contact from the `tel:` link. |
| D4 | Every data flow is documented | DIG-74 threat model | Model lists GA4 and the form service with their data categories. |

### E. Forms and lead data

| # | Item | Verify | Pass |
| --- | --- | --- | --- |
| E1 | Forms post only over HTTPS | Form `action` URL | Value starts with `https://`. |
| E2 | Success cookie is safe | Server config that sets `lead_ok` | Flags: `Secure`, `SameSite=Lax`, short `Max-Age`, unguessable random value. The browser must read it, so `HttpOnly` is not possible. Low sensitivity stays documented. |
| E3 | Spam protection is active | Form service settings | Honeypot or rate limit is on. Spam redirects fire no lead events. |
| E4 | Lead storage has an owner, retention, and access list | Written statement from the form service owner | Document exists before launch. POPIA requires it. |
| E5 | Privacy notice and consent sit on the form | Page review | Notice links the privacy policy. Consent text is present where required. |

### F. Content integrity

| # | Item | Verify | Pass |
| --- | --- | --- | --- |
| F1 | Pages hold only launch-ready content | Crawl staging and compare with `docs/CONTENT-INVENTORY.md` | No placeholder, draft, or internal text is public. |
| F2 | Links work and point to the right targets | Link checker plus a manual sample | No broken links. External links use HTTPS. |
| F3 | Contact details are correct | Compare phone, WhatsApp, and email with client records | Exact match. A wrong number sends leads to a stranger. |
| F4 | No user input renders in pages | Template review | The static site renders no user-supplied content. Build placeholders are the only injection points. |
| F5 | 404 page is branded | Request an unknown URL | Styled 404 shows. No stack traces. |

### G. Launch readiness and rollback

| # | Item | Verify | Pass |
| --- | --- | --- | --- |
| G1 | Rollback is proven | DIG-64 evidence and `docs/deploy-process.md` | Staging rollback has recorded evidence. Production rollback command is written and uses a prior `prod-*` tag. |
| G2 | Monitoring is active | DIG-76 configuration | Uptime and error alerts reach a monitored channel before go-live. |
| G3 | Smoke test runs after deploy | DIG-20 smoke steps | Recorded output shows the expected content. |
| G4 | Uploaded artifact matches the release | `sha256sum -c` on the uploaded file | Match is recorded in the go-live evidence. |

### H. Sign-off

Record in the release notes:

| Field | Value |
| --- | --- |
| Reviewer (production approver) | |
| Date | |
| Released ref (SHA or tag) | |
| Section results | A: PASS/FAIL, B: …, G: … |
| Exceptions | Item, risk, owner, expiry |
| Evidence links | Runs, scans, screenshots |

## Current state — dry run

A dry run against `main` at `66fa927` ran the checkable items on 2026-10-18.
The first launch review runs the full checklist again on the release ref.

| Item | Result | Evidence and note |
| --- | --- | --- |
| A1 | **FAIL** | API answers 404 `Branch not protected`. Anyone with push access can change `main`, and `main` deploys staging. Fix before launch. |
| A2 | PASS | Collaborators: `mj-adendorff`, `BaruchTr`. Both are active. |
| A3 | PASS | `production` carries `required_reviewers` with reviewer `BaruchTr`. One reviewer is a single point of failure. Add a second reviewer when the team grows. |
| A4 | **FAIL** | `prevent_self_review` is `false`. The dispatcher can approve their own release. Turn it on. |
| A5 | PASS | Tree and history scans found no credential patterns. `docs/analytics-setup.md` correctly states that measurement IDs are public. |
| A6 | PASS | Public content is the scaffold page, deploy docs, and audit evidence of the current live site. No draft client material. |
| B1 | PASS | Local build green (`Build OK`). Workflow build green on every recorded run (DIG-64 log). |
| B2 | PASS | Staging: `contents: read`, `pages: write`, `id-token: write`. Production: `contents: write` for tags and releases. |
| B3 | PASS | Only `actions/checkout@v4`, `actions/configure-pages@v5`, `actions/deploy-pages@v4`, `actions/upload-pages-artifact@v3`. |
| B4 | PASS* | Zero runtime dependencies today. Re-run the DIG-77 audit when any dependency lands. |
| B5 | PASS | Production workflow computes and attaches `site-<sha>.tar.gz.sha256`. |
| B6 | PENDING | Hosting upload lands at go-live (DIG-20). |
| C1 | PENDING | Production host lands at go-live (DIG-20). |
| C2 | PASS | No `http://` in served sources. Hits are localhost tests, docs, and the build skip list. |
| C3 | PENDING | Needs header config on the production host at go-live (DIG-20). |
| C4 | PASS | `index.html` carries `noindex`. Keep it on every new page template. |
| D1 | PASS | Origins: `www.googletagmanager.com` only. WhatsApp links are navigation. |
| D2 | PASS* | Module default is `analyticsConsent: 'granted'`. Client must approve this stance before launch, or the page init sets `'denied'` with a consent banner. |
| D3 | PASS | Events carry business contact data and lead intent only. No visitor PII. |
| D4 | PASS* | Threat model (DIG-74) is in progress. Re-check at its completion. |
| E1–E5 | PENDING | Form backend lands with the contact pages (DIG-71, DIG-72). |
| F1–F5 | PENDING | Real pages land in DIG-71 and DIG-72. Review with them. |
| G1 | PASS | Staging rollback is proven in the DIG-64 evidence log. Production rollback is documented. |
| G2 | PENDING | Monitoring work is DIG-76. |

PENDING items become PASS or FAIL when their owner ships. FAIL items block
the launch until they are fixed or the board accepts an exception.

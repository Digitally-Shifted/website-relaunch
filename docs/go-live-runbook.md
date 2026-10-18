# Go-live runbook — digitallyshifted.com relaunch

This runbook takes the relaunch from a passing staging build to the live
production site. It is the working checklist for DIG-91 (pre-launch and
go-live). Owner: DIG-91. Related: DIG-86 (deploy to production), DIG-89
(redirect map), DIG-76 (monitoring), DIG-65 (analytics), DIG-75
(`docs/security-review.md`, launch gate), DIG-78 (`docs/release-process.md`).

The old site stays live on WordPress (LiteSpeed at dshost.co.za) until the
DNS switch in step 6. Nothing below touches the old site before that step.

## 0. State of the checklist

| Checklist item | State | Where |
| --- | --- | --- |
| Redirects configured and tested | Build-gate tested (stubs + map). Host-level 301/410 tested locally; live-host pass is step 7. | `docs/migration/redirect-map.json`, `scripts/test-redirects.mjs`, step 3 |
| DNS records ready to switch | Record table and cutover steps in step 6. Needs registrar access (owner). | step 6 |
| TLS/SSL certificate | Issued on the production host in step 5. Expiry alerting active (DIG-76). | step 5 |
| Analytics installed | Module loads on every page; dormant until `PUBLIC_GA4_ID` is set at build (owner decision 2026-10-18: launch without analytics, enable in a patch release). Activation in step 8. | `docs/analytics-setup.md` |
| robots.txt and sitemap.xml | Verified in the build: `robots.txt` points at `sitemap-index.xml`; noindex pages are excluded. | build checks |
| Social meta tags | Every page ships Open Graph + Twitter card tags and a 1200x630 share image. | `src/layouts/BaseLayout.astro`, `public/og-default.png` |
| 404 page | Built and branded; host serves it with a real 404 status (`ErrorDocument`). | `src/pages/404.astro`, step 3 |
| Monitoring and alerting | Uptime checks run every 5 minutes and already watch `digitallyshifted.com`; email alert delivery is wired (owner address). | `docs/monitoring-setup.md` |
| Contact form | Built and verified end to end (14 backend tests + 14 real-browser checks). Ships with the host deployment; go-live waits on it (owner decision 2026-10-18). | step 3, `form-backend/` |
| Production deploy | Release steps in step 4; needs a reviewer approval in GitHub and the owner's go (owner decision 2026-10-18: wait for the go). | step 4 |

Open decisions that gate go-live (owner): the production host name and
access (owner chose "another host", unnamed — steps 3, 5, 6 adapt once
named), the production reviewer set (step 4), and the release go signal.
Decided on 2026-10-18: the contact form must work end to end before
go-live (it does — see `form-backend/`), and GA4 stays dormant at launch.

## 1. Preconditions

1. `main` builds green and staging serves the commit you intend to release
   (check the build marker on the staging URL).
2. `bash scripts/smoke-test.sh https://digitally-shifted.github.io/website-relaunch/ staging`
   passes.
3. The security review checklist (`docs/security-review.md`) has no FAIL
   items open for the release ref, except items this runbook closes at
   go-live (C1, C3, B6, G2 close in steps 5–7).
4. The owner has decided the contact-form question (decided 2026-10-18:
   the form must work end to end at launch). Deploy the form backend with
   the site and run its verification before opening the launch:
   `node --test form-backend/test/` (14 tests) and the browser checks in
   the DIG-91 evidence. On a static-only rehearsal host the form's POST
   404s — expected there, not acceptable in production.

## 2. Prepare the release content

1. Merge the final content to `main`. Wait for staging to serve it.
2. Finish `CHANGELOG.md`: move the `[Unreleased]` entries under
   `## [v1.0.0] - YYYY-MM-DD`. Merge that change to `main`.
3. Tag the release commit (rules in `docs/release-process.md`):

   ```sh
   git tag -a v1.0.0 -m "Release v1.0.0"
   git push origin v1.0.0
   ```

## 3. Hosting decision and host configuration

The owner chose "another host" (unnamed as of 2026-10-18). The steps below
are host-neutral; the concrete panel commands land here once the host is
named. Two needs drive the choice: static file serving for the site, and a
Node >= 24 process for the form backend (`form-backend/`) reachable at
`/api/*` on the same origin.

1. Choose the document root for the new site on the host.
2. Upload the release artifact and verify it:

   ```sh
   sha256sum -c site-<short-sha>.tar.gz.sha256
   tar xzf site-<short-sha>.tar.gz -C <document-root>
   ```

3. Install the redirect/host config. Two sources:

   - Apache-compatible hosts (LiteSpeed, Apache, LiteSpeed via Plesk):
     generate and install `.htaccess` from the map (301s, WordPress 410s,
     media redirects, HTTPS canonicalization, `ErrorDocument 404`,
     `Options -Indexes`):

     ```sh
     python3 docs/migration/tools/generate_redirects.py --out .htaccess
     ```

   - nginx or other: translate the same rules from
     `docs/migration/redirect-map.json`; the map is the source of truth
     either way.

4. Deploy the form backend (owner decision: launch waits on the form):

   1. Run `node form-backend/server.mjs` under a process manager
      (systemd user unit is enough) with `HOST=127.0.0.1`.
   2. Reverse-proxy `/api/*` to its port; pass `X-Forwarded-For` and set
      `TRUST_PROXY=true`. Full env table: `form-backend/README.md`.
   3. Set `MAILER` (`agentmail` with the company inbox, or `sendmail`
      where the host provides it), `MAIL_TO`, and `COOKIE_SECRET`.
   4. Verify: `POST /api/contact` with a test enquiry answers 303, stores
      the row, and the owner email arrives.

5. Add the security headers (security review C3). For Apache-compatible
   hosts add to `.htaccess`; nginx uses `add_header`. Keep them in step
   with any script-origin change:

   ```apache
   <IfModule mod_headers.c>
     Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"
     Header always set Content-Security-Policy "default-src 'self'; script-src 'self' https://www.googletagmanager.com; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self' https://*.google-analytics.com https://*.analytics.google.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
     Header always set X-Content-Type-Options "nosniff"
     Header always set Referrer-Policy "strict-origin-when-cross-origin"
     Header always set X-Frame-Options "DENY"
   </IfModule>
   ```

5. Turn on HTTPS for the hostname (step 5) before the DNS switch.

## 4. Production release

1. Start the release run from the version tag:

   ```sh
   gh workflow run deploy-production.yml -R Digitally-Shifted/website-relaunch -f ref=v1.0.0
   ```

2. Give the reviewer the filled security-review checklist for this ref.
3. The reviewer approves in the GitHub UI (Actions → Production release →
   the waiting run → Review deployments → Approve and deploy). The person
   who started the run must not approve it.
4. Verify the release: `gh release view <prod-tag>`; download the artifacts
   into one directory and run `sha256sum -c site-<short-sha>.tar.gz.sha256`.

The release artifact is the thing step 3 uploads. If hosting is ready
first, upload first and release second; the order of steps 3 and 4 does not
matter as long as the uploaded bytes match the release checksum (G4).

## 5. TLS certificate

1. In Plesk (or the host panel), issue a Let's Encrypt certificate for
   `digitallyshifted.com` and `www.digitallyshifted.com` while the host
   still serves the old site. Issue it before the DNS switch so the new
   records land on a working TLS endpoint.
2. Enable "Redirect from HTTP to HTTPS" at the panel level as a backstop;
   the `.htaccess` rule already enforces it.
3. Verify on the host before cutover (hosts file or direct IP):

   ```sh
   curl -svI https://<host-ip>/ -H "Host: digitallyshifted.com" 2>&1 | grep -iE "subject:|expire"
   ```

Expiry monitoring is already active: the DIG-76 checker alerts 14 days
before any certificate in `monitoring/sites.txt` expires.

## 6. DNS switch

Do this in a low-traffic window. The old site stays reachable until the
records flip.

| Record | Type | Value | Purpose |
| --- | --- | --- | --- |
| `digitallyshifted.com` | A | `<production host IP>` | Apex → new site |
| `www.digitallyshifted.com` | CNAME | `digitallyshifted.com` | www → apex |
| `digitallyshifted.com` | TXT | `google-site-verification=<value>` | Search Console (DIG-65 step 4.2) |
| `digitallyshifted.com` | TXT | `v=spf1 ...` | Email deliverability for form mail (conversion spec 5.2, launch gate) |
| `default._domainkey` | CNAME/TXT | `<provider value>` | DKIM for form mail |
| MX and other existing records | — | unchanged | Mail keeps working |

1. One day before cutover, lower the A-record TTL to 300 seconds.
2. Switch the A record to the production host IP. Keep `www` as CNAME.
3. Add the Search Console TXT record if not present (DIG-65 step 4.2).
4. Verify SPF/DKIM records for the form-mail sender domain.
5. Propagation check from outside:

   ```sh
   dig +short digitallyshifted.com A
   curl -fsS https://digitallyshifted.com/ | grep "Deployed build"
   ```

The build marker must show the released commit SHA.

## 7. Post-cutover verification

1. Smoke test production:

   ```sh
   bash scripts/smoke-test.sh https://digitallyshifted.com production
   ```

2. Redirect pass on the live host (DIG-89 go-live step): request every old
   URL from `docs/migration/redirect-map.json` plus slash variants and the
   WordPress 410 endpoints. Every 301 target must answer 200 and every
   410 must answer 410.
3. Form pass on the live host: submit one real enquiry through the page,
   confirm the thank-you page, the stored row, and the owner email; then
   confirm a honeypot-filled submission stores a spam row and sends no
   email (`form-backend/README.md`, spec section 7.4).
4. Security headers: `curl -sI https://digitallyshifted.com` shows HSTS,
   CSP, `X-Content-Type-Options`, `Referrer-Policy`, and frame protection
   (security review C1/C3 PASS).
5. Staging stays up and noindexed; it is the next release's rehearsal
   environment.
6. Record the go-live evidence (smoke output, header output, redirect and
   form results) on the DIG-91 issue.

## 8. Analytics and Search Console activation

1. Create the GA4 property and web stream; record the measurement ID
   (`docs/analytics-setup.md` steps 3.1–3.2, owner with Google access).
2. Rebuild and deploy with the ID:

   ```sh
   PUBLIC_GA4_ID=G-XXXXXXXXXX bash scripts/build-site.sh site
   ```

   The staging/production workflows pick the ID up from the repository
   variable `PUBLIC_GA4_ID` (Settings → Secrets and variables → Actions →
   Variables) on the next deploy. Without the variable the site ships with
   analytics dormant: no gtag request, no errors.
3. Mark `contact_form_submit` and `quote_request` as key events after the
   first test submissions (`docs/analytics-setup.md` step 3.4).
4. Verify Search Console, then submit `https://digitallyshifted.com/sitemap-index.xml`
   (`docs/analytics-setup.md` steps 4.2–4.3).

## 9. Rollback

- Site content: rerun the production workflow with the previous `prod-*`
  tag or version tag (`docs/release-process.md`), re-approve, re-upload.
- DNS: point the A record back to the old WordPress host. WordPress stays
  intact at dshost.co.za until the owner retires it. Do the reverse DNS
  check (`dig`, build marker against the old site).
- Redirects/headers: reinstall the previous `.htaccess` from the release
  archive of the rolled-back version.

## 10. After go-live

1. Watch the first 24 hours: uptime summary
   (`~/.local/share/site-monitor/uptime_check.py --summary`) and alert log.
2. Confirm the first GA4 real hits and key events in DebugView.
3. Retire the WordPress install on the old host only after one clean week
   (owner decision). Keep a backup before removal.
4. Close DIG-91 with the evidence links.

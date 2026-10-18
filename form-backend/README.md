# Form backend — POST /api/contact

The server behind the enquiry form (conversion spec sections 4–7). Zero
npm dependencies: Node >= 24 (`.nvmrc`), SQLite through `node:sqlite`.

## Contract

```
POST /api/contact      application/x-www-form-urlencoded
  success              303 -> /contact/thank-you + lead_ok cookie
  validation error     400 page, entered values kept, per-field messages
  spam (honeypot/time) 303, row stored with spam_flag=1, NO cookie
  rate limited         429 page (5 stored rows per IP per hour)
  server error         500 page, never a dead end
GET  /healthz          200 {"ok":true}
```

The site's form component (`src/components/ContactForm.astro`) posts here.
The thank-you page fires the conversion event only when both signals are
present: `sessionStorage.lead_pending` (set by the form) and the `lead_ok`
cookie (set by this server on genuine success only — spec 7.2). The cookie
must stay JS-readable, so it is `Secure; SameSite=Lax; Max-Age=600` with an
HMAC value, deliberately not `HttpOnly` (security review E2 documents this).

## Configuration (env)

| Variable | Default | Notes |
| --- | --- | --- |
| `PORT` / `HOST` | 8787 / 127.0.0.1 | Bind 0.0.0.0 behind a proxy. |
| `DB_PATH` | `./leads.db` | SQLite file. |
| `BASE_PATH` | empty | Set only if the site lives under a prefix. |
| `TRUST_PROXY` | `false` | `true` when a reverse proxy sets `X-Forwarded-For`. |
| `LEAD_COOKIE_SECURE` | `true` | Keep true in production (HTTPS). |
| `COOKIE_SECRET` | random per boot | HMAC key for the cookie value; set it for stable values across restarts. |
| `MAILER` | `stub` | `stub` (`.eml` files, tests), `sendmail`, or `agentmail`. |
| `MAIL_TO` / `MAIL_FROM` | owner / no-reply@ | Spec 5.2 addresses. |
| `AGENTMAIL_API_KEY` / `AGENTMAIL_INBOX` | — | For `MAILER=agentmail` (same API as `monitoring/notify.sh`). |
| `SENDMAIL_PATH` | `/usr/sbin/sendmail` | For `MAILER=sendmail`. |
| `SITE_ORIGIN` | `https://digitallyshifted.com` | Shown in the email footer. |

Email failures retry every 5 minutes, up to 3 attempts; the row keeps
`email_sent = 0` and the visitor's redirect is never blocked (spec 5.2).

## Run

```sh
node form-backend/server.mjs                      # production values from env
MAILER=stub DB_PATH=/tmp/leads.db node form-backend/server.mjs   # local
node --test form-backend/test/                    # 14 end-to-end tests
```

## Deploy and host wiring (go-live, DIG-91)

The static site and this service share one origin: the host serves the
built site and routes `/api/*` to this process. Per-host steps land in
`docs/go-live-runbook.md` step 3 once the owner names the production host
(the decision is open — "another host", unnamed).

1. Run the service under a process manager (systemd user unit works).
2. Reverse-proxy `/api/*` to `PORT`; pass `X-Forwarded-For` and set
   `TRUST_PROXY=true`.
3. Keep `/healthz` internal or allow it — the monitoring checker can use
   it as a second signal.
4. Seed the env file from the table above (`MAILER=agentmail` with the
   company AgentMail inbox, or `sendmail` where the host provides it).

Staging (GitHub Pages) cannot run this service: the form's POST 404s
there. That is expected — staging is the rehearsal environment, and the
owner's decision gates go-live on the form working end to end behind the
production host.

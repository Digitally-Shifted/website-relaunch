# Monitoring setup — observability baseline (DIG-76)

This document describes the monitoring baseline for the launched client
sites. Owner: DIG-76. Related: DIG-64 (deploy process), DIG-65 (analytics
baseline), DIG-20 (go-live).

Status on 2026-10-18: uptime checks and local alert records run. The owner
picked email as the alert channel (baruch@digitallyshifted.com) and deferred
error tracking on 2026-10-18. On 2026-10-19 the owner asked for a free,
open-source send path with no extra service. The sender now uses the
owner's own SMTP account; one password step stays with the owner
(section 7).

## 1. Standard baseline for client sites

Every launched client site gets:

1. An uptime check every 5 minutes over HTTPS.
2. An alert record when a site fails 2 checks in a row.
3. An alert record when a certificate expires within 14 days.
4. An error-tracking hook, when the owner picks a service (section 7).

The uptime checker runs on the agency machine as a systemd user timer. It
needs no external service and no per-site change. Client sites stay
untouched.

## 2. Where the parts live

| Part | Path |
| --- | --- |
| Source of truth (versioned) | `monitoring/` in this repository |
| Installed copy | `~/.local/share/site-monitor/` |
| Checker | `uptime_check.py` |
| Site list | `sites.txt` |
| Current status | `state.json` |
| Alert events | `alerts.jsonl` |
| Run logs (14 days) | `logs/` |
| Alert delivery hook | `notify.sh` (logs every event; sends email when configured) |
| Email sender | `send_email.py` (Python standard library; no extra packages) |
| Alert email config | `email.conf` on the installed copy (600 permissions; not versioned) |
| Timer units | `~/.config/systemd/user/site-monitor.{service,timer}` |

## 3. Commands

```sh
# Status table for all sites
~/.local/share/site-monitor/uptime_check.py --summary

# One check now, full output
~/.local/share/site-monitor/uptime_check.py

# Timer state
systemctl --user status site-monitor.timer

# Recent service output
journalctl --user -u site-monitor.service -n 20 -o cat

# Alert history
cat ~/.local/share/site-monitor/alerts.jsonl
```

Stop the monitor: `systemctl --user disable --now site-monitor.timer`.
Start it again: `systemctl --user enable --now site-monitor.timer`.

## 4. Site list

`novamira sites list` is the source of truth for launched client sites. On
2026-10-18 it listed 32 profiles; two profiles are aliases of their `.co.za`
domains, so the list monitors 30 client sites plus the relaunch staging URL.

To add a site: add its URL to `monitoring/sites.txt`, run
`monitoring/install.sh`, then run one check to confirm. To remove a site:
delete the line and reinstall. Record the reason in the commit message.

## 5. Alert rules

| Rule | Value | Effect |
| --- | --- | --- |
| Failure debounce | 2 consecutive failures | One blip does not alert |
| Recovery debounce | 2 consecutive successes | A flap does not spam |
| TLS expiry | fewer than 14 days left | One `tls` alert; resets on renewal |
| Request timeout | 30 s per site | A hung site counts as down |
| Slow-site record | more than 10 s | Recorded in the run log; no alert |
| Log retention | 14 days of run logs | The checker prunes old files |

Alert events go to `alerts.jsonl` with `open`, `resolve`, or `tls`. The
checker also calls `notify.sh` with the same event:

```text
notify.sh open    <site-url> <detail>
notify.sh resolve <site-url> <detail>
notify.sh tls     <site-url> <detail>
```

`notify.sh` appends every event to `notify.log`. When `email.conf` in the
installed copy sets `RECIPIENT`, `SENDER`, and the sender settings, the hook
also sends the event as email to the owner address. `SENDER=smtp` uses
`send_email.py` with `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, and
`SMTP_PASSWORD`. Keep the hook under 30 seconds. It must never fail the
check round.

## 6. Verification record, 2026-10-18

1. Probed all 30 client sites with curl. All returned HTTP 200. Latency ran
   from 0.15 s (digitallyshifted.com) to 21.6 s (one slow response from
   bmgmotorgroup.co.za; later checks gave 1.1-2.8 s).
2. First checker round: 31 of 31 sites OK in 9.8 s, all certificates more
   than 30 days from expiry (lowest: isuzupaarl.co.za, 30 days).
3. Alarm test on a scratch copy: one failure raised no alert; the second
   failure opened an `open` event; recovery opened a `resolve` event after
   two successes.
4. systemd run: `site-monitor.service` checked 31 sites, 0 down. The timer
   is enabled and fires every 5 minutes with `Persistent=true`.

## 7. Owner decisions, answered 2026-10-18

The owner answered the DIG-76 question card:

1. **Alert delivery: email to baruch@digitallyshifted.com through the
   owner's own SMTP account.** The owner rejected a hosted service and
   asked for free and open source. Sending goes through
   `mail.digitallyshifted.com:465` (SSL), the same SMTP account and
   credentials the owner's Thunderbird already stores; the settings were
   read from the local Thunderbird profile on 2026-10-19 and the server
   answered a TLS handshake. `send_email.py` uses only the Python standard
   library, so no package install is needed. The owner adds `SMTP_PASSWORD`
   to `email.conf` (600 permissions, outside git); the password stays on
   this machine. A Thunderbird-automation bridge was evaluated and
   rejected: every checked bridge needs Thunderbird, an extension, a bridge
   daemon, and an active desktop session at the moment of sending, so a
   logout or reboot would stop alerts with no error anywhere.
2. **Error tracking: defer.** No error tracking for now. Uptime checks and
   TLS alerts continue. The baseline stays valid without it. Revisit the
   deferral when a client incident shows the need, or at the next review of
   this document.

## 8. Cost and risk notes

- The baseline uses only this machine and Python 3 standard library. It adds
  no vendor cost.
- The timer adds about 35 MB of run logs per 14 days. The checker prunes
  them.
- If this machine is off, checks stop. `Persistent=true` runs one catch-up
  check at the next start. For an independent second vantage point, add a
  hosted uptime service later; that is a new owner decision.

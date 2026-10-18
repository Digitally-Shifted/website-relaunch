#!/usr/bin/env python3
"""Uptime checker for the launched client sites.

Reads sites.txt, checks each site over HTTPS, and keeps state in JSON files.
Opens an alert after 2 consecutive failures. Resolves the alert after
2 consecutive successes. Opens a TLS alert 14 days before a certificate
expires. Writes alert events to alerts.jsonl and calls notify.sh when it
exists (see docs/monitoring-setup.md for the hook contract).

Usage:
  uptime_check.py              run one check round
  uptime_check.py --summary    print the current status table and exit
  uptime_check.py --quiet      run one round, print one summary line only
"""

import argparse
import concurrent.futures
import fcntl
import json
import socket
import ssl
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
SITES_FILE = BASE_DIR / "sites.txt"
STATE_FILE = BASE_DIR / "state.json"
ALERTS_FILE = BASE_DIR / "alerts.jsonl"
LOGS_DIR = BASE_DIR / "logs"
NOTIFY_HOOK = BASE_DIR / "notify.sh"
LOCK_FILE = BASE_DIR / ".check.lock"

# Rules. Change these values only with a note in docs/monitoring-setup.md.
FAIL_THRESHOLD = 2          # consecutive failures before an alert opens
RESOLVE_THRESHOLD = 2       # consecutive successes before an alert resolves
TLS_WARN_DAYS = 14          # days before certificate expiry to alert
TIMEOUT_SECONDS = 30        # per-site request timeout
SLOW_WARN_MS = 10000        # latency recorded as slow in the run log
MAX_WORKERS = 8             # parallel site checks
LOG_RETENTION_DAYS = 14     # keep run logs for this many days
USER_AGENT = (
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120 Safari/537.36"
)


def load_sites():
    urls = []
    for line in SITES_FILE.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#"):
            urls.append(line.rstrip("/"))
    if not urls:
        raise SystemExit(f"No sites found in {SITES_FILE}")
    return urls


def load_state():
    if STATE_FILE.exists():
        try:
            return json.loads(STATE_FILE.read_text())
        except json.JSONDecodeError:
            pass  # a broken state file starts a fresh state
    return {"sites": {}}


def save_state(state):
    tmp = STATE_FILE.with_suffix(".tmp")
    tmp.write_text(json.dumps(state, indent=1, sort_keys=True) + "\n")
    tmp.replace(STATE_FILE)


def check_tls(host, port=443):
    """Return days until the certificate expires, or None when unknown."""
    try:
        ctx = ssl.create_default_context()
        with socket.create_connection((host, port), timeout=TIMEOUT_SECONDS) as sock:
            with ctx.wrap_socket(sock, server_hostname=host) as tls:
                not_after = tls.getpeercert().get("notAfter")
        if not_after:
            expires = datetime.strptime(not_after, "%b %d %H:%M:%S %Y %Z").replace(
                tzinfo=timezone.utc
            )
            return (expires - datetime.now(timezone.utc)).days
    except Exception:
        return None
    return None


def check_site(url):
    """Check one URL. Return a result dict."""
    host = url.split("://", 1)[-1].split("/", 1)[0]
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    started = time.perf_counter()
    status = None
    error = None
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT_SECONDS) as resp:
            status = resp.status
            resp.read(65536)  # pull the body start so slow pages still count
    except urllib.error.HTTPError as exc:
        status = exc.code
    except Exception as exc:  # DNS, TLS, timeout, refused
        error = f"{type(exc).__name__}: {exc}"
    latency_ms = round((time.perf_counter() - started) * 1000)

    ok = status is not None and 200 <= status < 400
    if not ok and error is None:
        error = f"HTTP {status}"
    return {
        "url": url,
        "ok": ok,
        "status": status,
        "latency_ms": latency_ms,
        "error": error,
        "tls_days": check_tls(host) if url.startswith("https://") else None,
    }


def notify(event, site, detail=""):
    """Call the alert hook when it exists. Errors never stop the check."""
    if not NOTIFY_HOOK.exists():
        return
    try:
        import subprocess

        subprocess.run(
            [str(NOTIFY_HOOK), event, site, detail],
            timeout=30,
            check=False,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
    except Exception:
        pass


def write_alert(kind, site, detail):
    event = {
        "ts": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "event": kind,
        "site": site,
        "detail": detail,
    }
    with ALERTS_FILE.open("a") as fh:
        fh.write(json.dumps(event) + "\n")
    notify(kind, site, detail)


def update_site_state(site, result, prev):
    """Apply the alert rules for one site. Return new state."""
    now = datetime.now(timezone.utc).isoformat(timespec="seconds")
    st = dict(prev)
    st["last_check_at"] = now
    st["last_status"] = result["status"]
    st["last_latency_ms"] = result["latency_ms"]
    if result["ok"]:
        st["last_ok_at"] = now
        st["last_error"] = None
        st["consecutive_failures"] = 0
        st["consecutive_successes"] = st.get("consecutive_successes", 0) + 1
        if st.get("alert_active") and st["consecutive_successes"] >= RESOLVE_THRESHOLD:
            st["alert_active"] = False
            write_alert("resolve", site, "site is up again")
    else:
        st["last_error"] = result["error"]
        st["consecutive_successes"] = 0
        st["consecutive_failures"] = st.get("consecutive_failures", 0) + 1
        if (
            not st.get("alert_active")
            and st["consecutive_failures"] >= FAIL_THRESHOLD
        ):
            st["alert_active"] = True
            write_alert("open", site, result["error"] or "site is down")

    # TLS expiry rule.
    tls_days = result["tls_days"]
    st["tls_days"] = tls_days
    if tls_days is not None and tls_days < TLS_WARN_DAYS:
        if not st.get("tls_alerted"):
            st["tls_alerted"] = True
            write_alert("tls", site, f"certificate expires in {tls_days} days")
    elif tls_days is not None and tls_days >= TLS_WARN_DAYS:
        st["tls_alerted"] = False
    return st


def prune_logs():
    cutoff = time.time() - LOG_RETENTION_DAYS * 86400
    for path in LOGS_DIR.glob("*.json"):
        if path.stat().st_mtime < cutoff:
            path.unlink()


def main():
    parser = argparse.ArgumentParser(description="Check monitored sites once.")
    parser.add_argument("--summary", action="store_true", help="print state and exit")
    parser.add_argument("--quiet", action="store_true", help="print one line only")
    args = parser.parse_args()

    if args.summary:
        state = load_state().get("sites", {})
        print(f"{'site':45} {'status':>6} {'ms':>7} {'tls':>4}  alert  last_error")
        for site in sorted(state):
            st = state[site]
            print(
                f"{site:45} {str(st.get('last_status')):>6} "
                f"{str(st.get('last_latency_ms')):>7} "
                f"{str(st.get('tls_days')):>4}  "
                f"{'ALERT' if st.get('alert_active') else '-':5}  "
                f"{st.get('last_error') or ''}"
            )
        return 0

    # One run at a time. A second run exits without work.
    lock = open(LOCK_FILE, "w")
    try:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except OSError:
        print("another check is running; skipped", file=sys.stderr)
        return 0

    sites = load_sites()
    state = load_state()
    prev_sites = state.get("sites", {})
    new_sites = {url: prev_sites.get(url, {"consecutive_failures": 0}) for url in sites}

    with concurrent.futures.ThreadPoolExecutor(max_workers=MAX_WORKERS) as pool:
        results = list(pool.map(check_site, sites))

    for result in results:
        url = result["url"]
        new_sites[url] = update_site_state(url, result, new_sites[url])

    state["sites"] = new_sites
    state["last_run_at"] = datetime.now(timezone.utc).isoformat(timespec="seconds")
    save_state(state)

    LOGS_DIR.mkdir(exist_ok=True)
    run_log = LOGS_DIR / (
        datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ") + ".json"
    )
    run_log.write_text(json.dumps(results, indent=1) + "\n")
    prune_logs()

    alerts_open = sum(1 for st in new_sites.values() if st.get("alert_active"))
    down = [r["url"] for r in results if not r["ok"]]
    slow = [r["url"] for r in results if r["ok"] and r["latency_ms"] > SLOW_WARN_MS]
    if args.quiet:
        print(
            f"{state['last_run_at']} checked={len(results)} down={len(down)} "
            f"slow={len(slow)} alerts_open={alerts_open}"
        )
    else:
        print(f"Checked {len(results)} sites at {state['last_run_at']}")
        for result in sorted(results, key=lambda r: -r["latency_ms"]):
            mark = "OK " if result["ok"] else "FAIL"
            line = f"  {mark} {result['url']:50} {result['latency_ms']:>6} ms"
            if result["tls_days"] is not None:
                line += f"  tls {result['tls_days']}d"
            if result["error"]:
                line += f"  {result['error']}"
            print(line)
        print(
            f"Down: {len(down)}, slow (>{SLOW_WARN_MS} ms): {len(slow)}, "
            f"alerts open: {alerts_open}"
        )
    return 1 if down else 0


if __name__ == "__main__":
    sys.exit(main())

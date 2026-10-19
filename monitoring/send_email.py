#!/usr/bin/env python3
"""Send one site-monitor alert email through the owner's own SMTP account.

Reads settings from email.conf in this directory:

  SMTP_HOST=mail.example.com      # required for sending
  SMTP_PORT=465                   # 465 = SSL (default), 587 = STARTTLS
  SMTP_USER=you@example.com       # required
  SMTP_PASSWORD=...               # required; add it yourself, keep the file private
  SMTP_FROM=you@example.com       # optional, defaults to SMTP_USER
  RECIPIENT=alerts@example.com    # required

The password never leaves this machine. This file never prints it.

Usage: send_email.py <event> <site-url> <detail>
"""

import smtplib
import ssl
import sys
from email.message import EmailMessage
from pathlib import Path

BASE = Path(__file__).resolve().parent
CONF = BASE / "email.conf"


def load_conf():
    conf = {}
    if CONF.exists():
        for line in CONF.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, _, value = line.partition("=")
                conf[key.strip()] = value.strip()
    return conf


def main():
    event, site, detail = sys.argv[1], sys.argv[2], sys.argv[3]
    conf = load_conf()
    host = conf.get("SMTP_HOST")
    user = conf.get("SMTP_USER")
    password = conf.get("SMTP_PASSWORD")
    recipient = conf.get("RECIPIENT")
    sender = conf.get("SMTP_FROM") or user
    if not (host and user and password and recipient):
        print("email.conf is missing SMTP_HOST, SMTP_USER, SMTP_PASSWORD or RECIPIENT",
              file=sys.stderr)
        return 2

    port = int(conf.get("SMTP_PORT") or 465)
    msg = EmailMessage()
    msg["From"] = sender
    msg["To"] = recipient
    msg["Subject"] = f"[site-monitor] {event}: {site}"
    msg.set_content(
        f"Event: {event}\nSite: {site}\nDetail: {detail}\n\n"
        f"History: alerts.jsonl in ~/.local/share/site-monitor/\n"
        f"Status: uptime_check.py --summary\n"
    )

    if port == 465:
        with smtplib.SMTP_SSL(host, port, timeout=20,
                              context=ssl.create_default_context()) as smtp:
            smtp.login(user, password)
            smtp.send_message(msg)
    else:
        with smtplib.SMTP(host, port, timeout=20) as smtp:
            smtp.starttls(context=ssl.create_default_context())
            smtp.login(user, password)
            smtp.send_message(msg)
    return 0


if __name__ == "__main__":
    sys.exit(main())

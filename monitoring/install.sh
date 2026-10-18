#!/usr/bin/env bash
# Install the site monitor on this machine.
# Copies the kit to ~/.local/share/site-monitor and enables a systemd user
# timer that runs a check every 5 minutes.
set -euo pipefail

SRC="$(cd "$(dirname "$0")" && pwd)"
DEST="$HOME/.local/share/site-monitor"
SYSTEMD_DIR="$HOME/.config/systemd/user"

mkdir -p "$DEST/logs" "$SYSTEMD_DIR"
install -m 644 "$SRC/sites.txt" "$DEST/sites.txt"
install -m 755 "$SRC/uptime_check.py" "$DEST/uptime_check.py"
install -m 755 "$SRC/notify.sh" "$DEST/notify.sh"

# Keep an existing alert configuration across reinstalls.
if [ ! -f "$DEST/email.conf" ]; then
  printf '# Alert email. RECIPIENT is required for delivery.\n# SENDER: agentmail (needs AGENTMAIL_API_KEY and AGENTMAIL_INBOX) or sendmail.\n#RECIPIENT=you@example.com\n#SENDER=agentmail\n#AGENTMAIL_INBOX=\n#AGENTMAIL_API_KEY=\n' > "$DEST/email.conf"
  chmod 600 "$DEST/email.conf"
fi

cat > "$SYSTEMD_DIR/site-monitor.service" <<'UNIT'
[Unit]
Description=Uptime check for launched client sites (DIG-76)

[Service]
Type=oneshot
ExecStart=%h/.local/share/site-monitor/uptime_check.py --quiet
UNIT

cat > "$SYSTEMD_DIR/site-monitor.timer" <<'UNIT'
[Unit]
Description=Run the site uptime check every 5 minutes

[Timer]
OnCalendar=*:0/5
Persistent=true
RandomizedDelaySec=30

[Install]
WantedBy=timers.target
UNIT

systemctl --user daemon-reload
systemctl --user enable --now site-monitor.timer

echo "Installed. Timer state:"
systemctl --user status site-monitor.timer --no-pager | head -6
echo "Run one check now:  ~/.local/share/site-monitor/uptime_check.py"
echo "See status:         ~/.local/share/site-monitor/uptime_check.py --summary"

#!/usr/bin/env bash
# Alert hook for the site monitor. Installed to ~/.local/share/site-monitor/.
#
# The checker calls:
#   notify.sh open    <site-url> <detail>     an alert started
#   notify.sh resolve <site-url> <detail>     the site recovered
#   notify.sh tls     <site-url> <detail>     a certificate expires soon
#
# Every event is logged to notify.log. When email.conf defines RECIPIENT and
# a SENDER, the event is also sent as email. Supported senders:
#   SENDER=smtp      send through the owner's own SMTP account (send_email.py;
#                    settings and password live in email.conf, 600 permissions)
#   SENDER=agentmail send through the AgentMail API (API key in email.conf)
#   SENDER=sendmail  send through $SENDMAIL (for example msmtp)
#
# Keep this script fast and quiet. It must never fail the check round.

event="$1"; site="$2"; detail="$3"
BASE="$(cd "$(dirname "$0")" && pwd)"
STAMP="$(date -u +%FT%TZ)"

echo "$STAMP $event $site $detail" >> "$BASE/notify.log"

[ -f "$BASE/email.conf" ] || exit 0
# shellcheck disable=SC1091
. "$BASE/email.conf"
[ -n "${RECIPIENT:-}" ] || exit 0

SUBJECT="[site-monitor] $event: $site"
BODY="$STAMP
Event: $event
Site: $site
Detail: $detail

History: $BASE/alerts.jsonl
Status: $BASE/uptime_check.py --summary"

send_smtp() {
  python3 "$BASE/send_email.py" "$event" "$site" "$detail" >/dev/null 2>&1
}

send_agentmail() {
  curl -fsS --max-time 20 -X POST "https://api.agentmail.to/v0/inboxes/${AGENTMAIL_INBOX}/messages" \
    -H "Authorization: Bearer $AGENTMAIL_API_KEY" \
    -H "Content-Type: application/json" \
    -d "$(jq -nc \
      --arg to "$RECIPIENT" --arg subject "$SUBJECT" --arg text "$BODY" \
      '{to: [$to], subject: $subject, text: $text}')" >/dev/null 2>&1
}

send_sendmail() {
  {
    echo "To: $RECIPIENT"
    echo "Subject: $SUBJECT"
    echo ""
    echo "$BODY"
  } | "${SENDMAIL:-/usr/sbin/sendmail}" -t >/dev/null 2>&1
}

case "${SENDER:-}" in
  smtp)      [ -n "${SMTP_PASSWORD:-}" ] && send_smtp ;;
  agentmail) [ -n "${AGENTMAIL_API_KEY:-}" ] && send_agentmail ;;
  sendmail)  [ -x "${SENDMAIL:-/usr/sbin/sendmail}" ] && send_sendmail ;;
esac
exit 0

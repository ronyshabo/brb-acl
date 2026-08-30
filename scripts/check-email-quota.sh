#!/usr/bin/env bash
# Is Firebase's email quota back?
#
# There is no console page for this limit — it is not an exposed Cloud quota
# (see the Identity Toolkit quota list: twelve entries, none about email).
# The only way to know is to ask the API.
#
# On success this SENDS one real sign-in email to the address below.
#
#   ./scripts/check-email-quota.sh [email]

set -euo pipefail
cd "$(dirname "$0")/.."

EMAIL="${1:-shaborony@gmail.com}"
[ -f .env.local ] || { echo "no .env.local — cannot read the API key"; exit 1; }

KEY="$(grep '^VITE_FIREBASE_API_KEY=' .env.local | cut -d= -f2- | tr -d '"'"'"' \r')"
[ -n "$KEY" ] || { echo "VITE_FIREBASE_API_KEY not found in .env.local"; exit 1; }

resp="$(curl -sS -X POST \
  "https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${KEY}" \
  -H 'Content-Type: application/json' \
  -d "{\"requestType\":\"EMAIL_SIGNIN\",\"email\":\"${EMAIL}\",\"continueUrl\":\"https://acl.brbcoffee-atx.com/finish\",\"canHandleCodeInApp\":true}")"

echo "$(date -u '+%Y-%m-%d %H:%M UTC')"

if echo "$resp" | grep -q '"error"'; then
  msg="$(echo "$resp" | grep -o '"message": *"[^"]*"' | head -1 | cut -d'"' -f4)"
  case "$msg" in
    QUOTA_EXCEEDED*) echo "  STILL BLOCKED — quota not reset yet" ;;
    *)               echo "  failed for another reason: ${msg:-unknown}" ;;
  esac
  exit 1
fi

echo "  QUOTA IS BACK — a sign-in email was just sent to ${EMAIL}"

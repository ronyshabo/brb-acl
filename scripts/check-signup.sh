#!/usr/bin/env bash
# Can the app actually create accounts?
#
# The /join page dies with auth/admin-restricted-operation if
# Auth → Settings → User actions → "Enable create (sign-up)" is off. That is a
# console setting no code controls, and the failure only shows up when a real
# volunteer tries to sign up.
#
# Creates a throwaway account, signs in with it, then deletes it. Sends no email.

set -euo pipefail
cd "$(dirname "$0")/.."

EMAIL="acl-selftest-$(date +%s)@example.com"
PASS="selftest-$(date +%s)"
KEY="$(grep '^VITE_FIREBASE_API_KEY=' .env.local | cut -d= -f2- | tr -d '"'"'"' \r')"
API="https://identitytoolkit.googleapis.com/v1/accounts"

say() { printf '  %-22s %s\n' "$1" "$2"; }

# 1. sign up
resp="$(curl -sS -X POST "${API}:signUp?key=${KEY}" -H 'Content-Type: application/json' \
  -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASS}\",\"returnSecureToken\":true}")"
if echo "$resp" | grep -q '"error"'; then
  say "create account" "FAILED — $(echo "$resp" | grep -o '"message": *"[^"]*"' | head -1 | cut -d'"' -f4)"
  exit 1
fi
say "create account" "ok"
TOKEN="$(echo "$resp" | grep -o '"idToken": *"[^"]*"' | head -1 | cut -d'"' -f4)"

# 2. sign in with the password we just set
resp2="$(curl -sS -X POST "${API}:signInWithPassword?key=${KEY}" -H 'Content-Type: application/json' \
  -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASS}\",\"returnSecureToken\":true}")"
echo "$resp2" | grep -q '"error"' \
  && say "sign in" "FAILED" \
  || say "sign in" "ok"

# 3. does the token carry an email? the Firestore rules depend on it
echo "$resp2" | grep -q "\"email\": *\"${EMAIL}\"" \
  && say "token carries email" "ok — myVolunteerId() will resolve" \
  || say "token carries email" "MISSING — rules would deny"

# 4. clean up
curl -sS -X POST "${API}:delete?key=${KEY}" -H 'Content-Type: application/json' \
  -d "{\"idToken\":\"${TOKEN}\"}" >/dev/null && say "delete test account" "ok"

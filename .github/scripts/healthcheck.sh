#!/usr/bin/env bash
#
# Polls the backend's health endpoint until it reports healthy.
#
#   healthcheck.sh <api-origin> [expected-commit]
#
# Healthy means HTTP 200 with "status":"ok" — the endpoint pings
# MongoDB, so this covers the database connection too. With an expected
# commit it additionally requires the running build to be that commit,
# which is what proves a restart actually picked up the new release
# rather than the old process still answering.
#
# Retries because Passenger starts the application on the first request
# after a restart, and that start includes connecting to the database.

set -euo pipefail

origin="${1:?usage: healthcheck.sh <api-origin> [expected-commit]}"
expected_commit="${2:-}"
attempts="${HEALTH_ATTEMPTS:-12}"
delay="${HEALTH_DELAY_SECONDS:-5}"
endpoint="${origin%/}/api/health"

# The endpoint returns compact JSON with plain string values, so a
# pattern match is enough and keeps this runnable anywhere.
field() {
  sed -n "s/.*\"$1\":\"\([^\"]*\)\".*/\1/p" <<<"$2" | head -n 1
}

body=""
for ((attempt = 1; attempt <= attempts; attempt++)); do
  response="$(curl --silent --show-error --max-time 15 --write-out '\n%{http_code}' "$endpoint" || true)"
  code="${response##*$'\n'}"
  body="${response%$'\n'*}"
  status="$(field status "$body")"
  commit="$(field commit "$body")"

  if [[ "$code" == "200" && "$status" == "ok" ]]; then
    if [[ -z "$expected_commit" || "$commit" == "$expected_commit" ]]; then
      echo "Backend healthy: status=ok commit=${commit:-unknown} (attempt $attempt)"
      exit 0
    fi
  fi

  echo "Attempt $attempt/$attempts: HTTP ${code:-none} status=${status:-none} commit=${commit:-none}"
  if ((attempt < attempts)); then sleep "$delay"; fi
done

echo "::error::Backend health check failed at /api/health after $attempts attempts."
if [[ -n "$expected_commit" ]]; then
  echo "Expected the running build to be commit $expected_commit."
fi
echo "Last response body (truncated): ${body:0:300}"
exit 1

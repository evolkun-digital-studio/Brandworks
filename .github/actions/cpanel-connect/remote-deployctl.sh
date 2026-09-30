#!/usr/bin/env bash
#
# Installed on the runner as `deployctl` by this action. Runs
# ~/apps/.deploy/deployctl.sh on the cPanel server:
#
#   deployctl <command> [backup-id]
#
# REMOTE_HOME and REMOTE_NODE_BIN_DIR are exported by the action, which
# has already restricted both to plain path characters — that is what
# makes embedding them in the remote command line below safe.

set -euo pipefail

: "${REMOTE_HOME:?REMOTE_HOME is not set — run the cpanel-connect action first}"

for arg in "$@"; do
  if [[ ! "$arg" =~ ^[A-Za-z0-9._-]+$ ]]; then
    echo "deployctl: unexpected argument: $arg" >&2
    exit 2
  fi
done

# shellcheck disable=SC2029  # the variables are meant to expand on the runner
exec ssh cpanel "DEPLOY_HOME='$REMOTE_HOME' NODE_BIN_DIR='${REMOTE_NODE_BIN_DIR:-}' bash '$REMOTE_HOME/apps/.deploy/deployctl.sh' $*"

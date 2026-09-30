#!/usr/bin/env bash
#
# Server-side half of the deployment. GitHub Actions uploads this file
# to ~/apps/.deploy/ on the cPanel server at the start of every deploy
# and then drives it over SSH (.github/workflows/deploy.yml). It can
# also be run by hand on the server — `deployctl.sh list` and
# `deployctl.sh rollback` need nothing but an SSH session.
#
# It never reads, writes, copies or deletes the backend's .env.
#
# Usage: deployctl.sh <command> [argument]
#
#   preflight           Check the server layout and the Node.js toolchain.
#   backup <id>         Snapshot what the incoming release will replace.
#   frontend-protect    Print rsync exclude rules for public_html entries
#                       this pipeline does not own (computed by `backup`).
#   backend-excludes    Print rsync exclude rules for persistent backend paths.
#   install             Install the backend's production dependencies.
#   restart             Ask Passenger to restart the backend.
#   finalize            Record the release as live and prune old backups.
#   rollback [id]       Restore a snapshot (default: the most recent one).
#   list                List the available snapshots, newest first.

set -Eeuo pipefail

DEPLOY_HOME="${DEPLOY_HOME:-$HOME}"
FRONTEND_DIR="$DEPLOY_HOME/public_html"
BACKEND_DIR="$DEPLOY_HOME/apps/backend"
BACKUP_ROOT="$DEPLOY_HOME/deployment-backups"
TOOL_DIR="$DEPLOY_HOME/apps/.deploy"
KEEP_BACKUPS="${KEEP_BACKUPS:-5}"
MIN_NODE_VERSION="20.19.0"

# Top-level names inside public_html that this pipeline is responsible
# for — one per line. Anything else in public_html (.well-known, cgi-bin,
# another site, a subdomain's folder) was not put there by a deploy and
# is never modified, backed up or deleted by one.
MANIFEST="$TOOL_DIR/frontend-manifest.txt"
# Top-level names in the release being deployed; uploaded by the workflow.
INCOMING="$TOOL_DIR/incoming-frontend-entries.txt"
PROTECT_RULES="$TOOL_DIR/frontend-protect.rules"

# Backend paths that belong to the server, not to a release. Excluded
# from every rsync in both directions, which also protects them from
# --delete: the deploy never uploads over them, a backup never copies
# them, and a rollback never removes them.
BACKEND_PERSISTENT=(
  '/.env'
  '/.env.*'
  '/node_modules'
  '/tmp'
  '/logs'
  '*.log'
  '/uploads'
  '/storage'
  '/public'
  '/.htaccess'
)

log() { printf '[deployctl] %s\n' "$*" >&2; }
die() { printf '[deployctl] ERROR: %s\n' "$*" >&2; exit 1; }

# --- guards -----------------------------------------------------------

# Every destructive operation below is an rsync --delete or an rm -rf
# rooted at one of these paths, so a wrong DEPLOY_HOME must stop here.
check_layout() {
  [[ "$DEPLOY_HOME" == /*/* ]] || die "DEPLOY_HOME must be an absolute home directory, got: '$DEPLOY_HOME'"
  [[ -d "$DEPLOY_HOME" ]] || die "home directory does not exist: $DEPLOY_HOME"
  [[ -d "$FRONTEND_DIR" ]] || die "$FRONTEND_DIR does not exist — refusing to create a web root (is the home directory right?)"
  command -v rsync >/dev/null || die "rsync is not installed on this server"
}

valid_backup_id() { [[ "$1" =~ ^[0-9]{8}-[0-9]{6}-[0-9a-f]{7,40}$ ]]; }

# --- public_html ownership ---------------------------------------------

# Prints each non-empty line of the given files, de-duplicated.
read_names() {
  local file
  for file in "$@"; do
    if [[ -f "$file" ]]; then cat "$file"; fi
  done | sed '/^$/d' | sort -u
}

top_level_names() {
  local dir="$1" path
  [[ -d "$dir" ]] || return 0
  (
    shopt -s dotglob nullglob
    for path in "$dir"/*; do
      printf '%s\n' "${path##*/}"
    done
  )
}

# Writes rsync exclude rules for every top-level entry of public_html
# that is NOT among the owned names given on stdin.
write_protect_rules() {
  local out="$1" owned name
  owned="$(cat)"
  : > "$out"
  while IFS= read -r name; do
    [[ -n "$name" ]] || continue
    if grep -qxF -- "$name" <<<"$owned"; then
      continue
    fi
    # These characters are pattern syntax to rsync. Rather than guess
    # at escaping a name nobody expects, stop: a rule that fails to
    # match would leave that entry unprotected from --delete.
    if [[ "$name" == *[\*\?\[\]\\]* || "$name" == *$'\n'* ]]; then
      die "public_html contains an entry whose name cannot be protected safely: '$name'"
    fi
    printf '/%s\n' "$name" >> "$out"
  done < <(top_level_names "$FRONTEND_DIR")
}

# --- Node.js ------------------------------------------------------------

# Non-interactive SSH sessions on cPanel usually have no node on PATH.
activate_node() {
  local activate dir rel
  if [[ -n "${NODE_BIN_DIR:-}" ]]; then
    [[ -d "$NODE_BIN_DIR" ]] || die "NODE_BIN_DIR does not exist: $NODE_BIN_DIR"
    PATH="$NODE_BIN_DIR:$PATH"
  else
    # "Setup Node.js App" (CloudLinux) keeps one virtual environment
    # per application root and Node version under ~/nodevenv.
    rel="${BACKEND_DIR#"$DEPLOY_HOME"/}"
    activate="$(find "$DEPLOY_HOME/nodevenv/$rel" -mindepth 3 -maxdepth 3 -path '*/bin/activate' 2>/dev/null | sort -V | tail -n 1 || true)"
    if [[ -n "$activate" ]]; then
      set +eu
      # shellcheck disable=SC1090
      source "$activate"
      set -eu
    elif ! command -v npm >/dev/null; then
      # Application Manager uses the EasyApache Node.js packages.
      dir="$(find /opt/cpanel -mindepth 2 -maxdepth 2 -path '/opt/cpanel/ea-nodejs*/bin' 2>/dev/null | sort -V | tail -n 1 || true)"
      if [[ -n "$dir" ]]; then PATH="$dir:$PATH"; fi
    fi
  fi
  export PATH
  command -v node >/dev/null || die "node not found — create the Node.js application in cPanel first, or set the CPANEL_NODE_BIN_DIR repository variable"
  command -v npm >/dev/null || die "npm not found — set the CPANEL_NODE_BIN_DIR repository variable to the directory that contains it"
}

# --- commands -----------------------------------------------------------

cmd_preflight() {
  check_layout
  mkdir -p "$BACKEND_DIR" "$BACKUP_ROOT" "$TOOL_DIR"
  chmod 700 "$BACKUP_ROOT" "$TOOL_DIR"

  activate_node
  local version
  version="$(node -p 'process.versions.node')"
  log "node $version ($(command -v node)), npm $(npm --version)"
  if [[ "$(printf '%s\n%s\n' "$MIN_NODE_VERSION" "$version" | sort -V | head -n 1)" != "$MIN_NODE_VERSION" ]]; then
    die "Node.js $version is too old — the backend needs $MIN_NODE_VERSION or newer. Change the version in cPanel."
  fi

  if [[ ! -f "$BACKEND_DIR/.env" ]]; then
    log "WARNING: $BACKEND_DIR/.env does not exist. The backend will only start if its settings are defined in cPanel's Node.js application screen instead."
  fi
  log "preflight ok"
}

cmd_backup() {
  local id="${1:-}" snapshot previous="none"
  valid_backup_id "$id" || die "backup needs an id like 20260101-120000-abc1234, got: '$id'"
  check_layout
  [[ -f "$INCOMING" ]] || die "missing $INCOMING — the workflow uploads it before calling backup"

  snapshot="$BACKUP_ROOT/$id"
  [[ ! -e "$snapshot" ]] || die "backup $id already exists"
  mkdir -p "$snapshot/frontend" "$snapshot/backend"

  # Decide what in public_html is ours before touching anything.
  read_names "$MANIFEST" "$INCOMING" | write_protect_rules "$PROTECT_RULES"
  if [[ -s "$PROTECT_RULES" ]]; then
    log "left untouched in public_html: $(tr '\n' ' ' < "$PROTECT_RULES")"
  fi

  # --link-dest makes the snapshot out of hard links to the live files,
  # so it costs almost no disk space. It stays a true copy because
  # rsync replaces a changed file rather than writing into it.
  rsync -a --link-dest="$FRONTEND_DIR/" --exclude-from="$PROTECT_RULES" \
    "$FRONTEND_DIR/" "$snapshot/frontend/"

  if [[ -d "$BACKEND_DIR" ]]; then
    local -a excludes=()
    local pattern
    for pattern in "${BACKEND_PERSISTENT[@]}"; do excludes+=("--exclude=$pattern"); done
    rsync -a --link-dest="$BACKEND_DIR/" "${excludes[@]}" "$BACKEND_DIR/" "$snapshot/backend/"
    if [[ -f "$BACKEND_DIR/build-info.json" ]]; then
      previous="$(tr -d '\n' < "$BACKEND_DIR/build-info.json")"
    fi
  fi

  {
    printf 'created: %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    printf 'contains: the release that was live before this deploy\n'
    printf 'build: %s\n' "$previous"
  } > "$snapshot/info.txt"

  # From here until finalize, anything the incoming release adds to
  # public_html counts as ours too — so a rollback can remove it again.
  read_names "$MANIFEST" "$INCOMING" > "$MANIFEST.tmp"
  mv "$MANIFEST.tmp" "$MANIFEST"

  log "backup $id created"
}

cmd_frontend_protect() {
  [[ -f "$PROTECT_RULES" ]] || die "no protect rules yet — run backup first"
  cat "$PROTECT_RULES"
}

cmd_backend_excludes() {
  printf '%s\n' "${BACKEND_PERSISTENT[@]}"
}

cmd_install() {
  [[ -f "$BACKEND_DIR/package-lock.json" ]] || die "no package-lock.json in $BACKEND_DIR"

  activate_node
  cd "$BACKEND_DIR"

  export PYTHON=/bin/python3.8
  export npm_config_python=/bin/python3.8

  log "installing production dependencies with node $(node -p 'process.versions.node')"
  log "using Python $("$PYTHON" --version 2>&1)"

  npm ci --omit=dev --no-audit --no-fund >&2
}

cmd_restart() {
  mkdir -p "$BACKEND_DIR/tmp"
  touch "$BACKEND_DIR/tmp/restart.txt"
  log "restart requested (tmp/restart.txt)"
}

prune_backups() {
  local -a snapshots=()
  local name index
  while IFS= read -r name; do
    if valid_backup_id "$name"; then snapshots+=("$name"); fi
  done < <(top_level_names "$BACKUP_ROOT" | sort -r)

  for ((index = KEEP_BACKUPS; index < ${#snapshots[@]}; index++)); do
    rm -rf -- "${BACKUP_ROOT:?}/${snapshots[index]}"
    log "pruned old backup ${snapshots[index]}"
  done
}

cmd_finalize() {
  check_layout
  [[ -f "$INCOMING" ]] || die "missing $INCOMING"
  [[ "$KEEP_BACKUPS" =~ ^[1-9][0-9]*$ ]] || die "KEEP_BACKUPS must be a positive number"
  read_names "$INCOMING" > "$MANIFEST.tmp"
  mv "$MANIFEST.tmp" "$MANIFEST"
  prune_backups
  log "release recorded; keeping the $KEEP_BACKUPS most recent backups"
}

latest_backup() {
  local name
  while IFS= read -r name; do
    if valid_backup_id "$name"; then
      printf '%s\n' "$name"
      return 0
    fi
  done < <(top_level_names "$BACKUP_ROOT" | sort -r)
  return 1
}

cmd_rollback() {
  local id="${1:-}" snapshot rules
  check_layout
  if [[ -z "$id" ]]; then
    id="$(latest_backup)" || die "there are no backups in $BACKUP_ROOT"
  fi
  valid_backup_id "$id" || die "not a backup id: '$id'"
  snapshot="$BACKUP_ROOT/$id"
  [[ -d "$snapshot/frontend" && -d "$snapshot/backend" ]] || die "backup $id not found in $BACKUP_ROOT"
  log "restoring backup $id"

  # Frontend: make public_html match the snapshot again, deleting only
  # entries a deploy created — never anything it does not own.
  # --checksum throughout: two builds of the same page can match in
  # size and timestamp, which is all rsync compares by default.
  rules="$(mktemp)"
  { top_level_names "$snapshot/frontend"; read_names "$MANIFEST"; } | sort -u | write_protect_rules "$rules"
  rsync -a --checksum --delete --exclude-from="$rules" "$snapshot/frontend/" "$FRONTEND_DIR/"
  rm -f "$rules"
  top_level_names "$snapshot/frontend" | sort -u > "$MANIFEST.tmp"
  mv "$MANIFEST.tmp" "$MANIFEST"
  log "frontend restored"

  # Backend: a snapshot taken before the very first deploy has no
  # application in it; there is nothing to go back to in that case.
  if [[ -f "$snapshot/backend/package.json" ]]; then
    local -a excludes=()
    local pattern
    for pattern in "${BACKEND_PERSISTENT[@]}"; do excludes+=("--exclude=$pattern"); done
    rsync -a --checksum --delete "${excludes[@]}" "$snapshot/backend/" "$BACKEND_DIR/"
    cmd_install
    cmd_restart
    log "backend restored"
  else
    log "backup $id holds no backend release — backend left as it is"
  fi
}

cmd_list() {
  local name
  while IFS= read -r name; do
    valid_backup_id "$name" || continue
    printf '%s  %s\n' "$name" "$(grep -m 1 '^build:' "$BACKUP_ROOT/$name/info.txt" 2>/dev/null || echo 'build: unknown')"
  done < <(top_level_names "$BACKUP_ROOT" | sort -r)
}

command="${1:-}"
shift || true
case "$command" in
  preflight)        cmd_preflight ;;
  backup)           cmd_backup "$@" ;;
  frontend-protect) cmd_frontend_protect ;;
  backend-excludes) cmd_backend_excludes ;;
  install)          cmd_install ;;
  restart)          cmd_restart ;;
  finalize)         cmd_finalize ;;
  rollback)         cmd_rollback "$@" ;;
  list)             cmd_list ;;
  *) die "unknown command '${command}' — see the usage notes at the top of this file" ;;
esac

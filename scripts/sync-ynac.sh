#!/usr/bin/env bash
#
# Sync the YNAC tool from its own repo into this site, then optionally build and
# deploy.
#
#   scripts/sync-ynac.sh                 # sync only, then review `git diff`
#   scripts/sync-ynac.sh --deploy        # sync, build, deploy
#   scripts/sync-ynac.sh ~/path/to/YNAC  # sync from somewhere other than the default
#
# YNAC lives at github.com/Skylled/YNAC and is developed there. This site only
# ever holds a *copy* of its built output under web/tools/ynac/, so the flow is
# one-way: edit upstream, commit there, then run this. Never hand-edit
# web/tools/ynac/ — the next sync overwrites it.
#
# Two things have gone wrong here before, so both are checked automatically
# after the copy. See MEMORY / CLAUDE.md notes for the full story.

set -euo pipefail

SRC="${1:-$HOME/Repos/YNAC}"
[ "$SRC" = "--deploy" ] && SRC="$HOME/Repos/YNAC"
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEST="$REPO/web/tools/ynac"

DEPLOY=0
for arg in "$@"; do [ "$arg" = "--deploy" ] && DEPLOY=1; done

red()  { printf '\033[31m%s\033[0m\n' "$*"; }
grn()  { printf '\033[32m%s\033[0m\n' "$*"; }
ylw()  { printf '\033[33m%s\033[0m\n' "$*"; }

[ -d "$SRC" ] || { red "Source not found: $SRC"; exit 1; }
[ -f "$SRC/js/auth.js" ] || { red "$SRC doesn't look like YNAC (no js/auth.js)"; exit 1; }

# ---------------------------------------------------------------- source state
# Not fatal: you may deliberately be deploying something unpushed. Just say so
# out loud, because the deployed copy is not itself under version control in a
# way that records which upstream commit it came from.
echo "Source: $SRC"
if git -C "$SRC" rev-parse --git-dir >/dev/null 2>&1; then
  echo "  commit:  $(git -C "$SRC" log -1 --format='%h %s')"
  [ -n "$(git -C "$SRC" status --porcelain)" ] && ylw "  WARNING: working tree has uncommitted changes"
  if git -C "$SRC" rev-parse origin/main >/dev/null 2>&1; then
    ahead="$(git -C "$SRC" rev-list --count origin/main..HEAD 2>/dev/null || echo 0)"
    [ "$ahead" != "0" ] && ylw "  WARNING: $ahead commit(s) ahead of origin/main (unpushed)"
  fi
fi

echo
# --------------------------------------------------------------- source checks
# These run BEFORE anything is copied, so a bad upstream never lands in
# web/tools/ynac/ at all. Copying first and validating after would leave the
# published directory broken on every failed run, which is a nasty state to
# hand back to someone who then forgets to `git checkout` it.
fail=0

# 1. The production OAuth client ID. An upstream refactor once replaced this
#    whole block with a REPLACE_WITH_PROD_CLIENT_ID placeholder, which silently
#    breaks sign-in on skylled.dev only — localhost keeps working, so it is easy
#    to miss. Upstream carries the real value now; this catches a regression.
#    Pull the actual value rather than pattern-matching the line: a commented-out
#    entry, or the placeholder itself, both otherwise look like a client ID.
#    `|| true` because grep exits non-zero when it matches nothing, and under
#    `set -euo pipefail` that would kill the script before it could report the
#    failure — i.e. the check would silently vanish exactly when it should fire.
client_id="$(grep -E "^[[:space:]]*'skylled\.dev'[[:space:]]*:" "$SRC/js/auth.js" \
  | grep -vE '^[[:space:]]*(//|/\*|\*)' \
  | sed -E "s/.*:[[:space:]]*'([^']*)'.*/\1/" | head -1 || true)"
if [ -z "$client_id" ]; then
  red "FAIL auth.js has no active 'skylled.dev' client ID entry (sign-in will break in production)"
  red "     Expected an uncommented line like:  'skylled.dev': '<client id>',"
  fail=1
elif case "$client_id" in REPLACE_WITH*) true;; *) false;; esac; then
  # Matches the app's own guard in getClientId(), which warns on this prefix.
  red "FAIL auth.js still has the placeholder client ID: $client_id"
  fail=1
elif [ "${#client_id}" -lt 20 ]; then
  red "FAIL auth.js client ID looks too short to be real: $client_id"
  fail=1
else
  grn "OK   auth.js has a real skylled.dev client ID"
fi

# 2. Temporal dead zone. main.js calls boot() during module evaluation, and
#    boot() synchronously reaches wireUi(). Any module-level const/let declared
#    BELOW that call throws ReferenceError when read, which aborts boot() before
#    showSignIn() and leaves the app stuck on "Loading your budget…" with only a
#    console error to show for it. This shipped to production once.
boot_line="$(grep -n '^boot();' "$SRC/js/main.js" | head -1 | cut -d: -f1 || true)"
if [ -z "$boot_line" ]; then
  ylw "SKIP main.js has no top-level 'boot();' — TDZ check not applicable"
else
  late="$(awk -v b="$boot_line" 'NR > b && /^(const|let) / { print NR": "$0 }' "$SRC/js/main.js")"
  if [ -n "$late" ]; then
    red "FAIL module-level const/let declared after boot() (line $boot_line) in main.js:"
    printf '%s\n' "$late" | sed 's/^/       /'
    red "     These are in the temporal dead zone when boot() runs and will crash the app."
    fail=1
  else
    grn "OK   all module-level bindings precede boot() (line $boot_line)"
  fi
fi

[ "$fail" -ne 0 ] && { echo; red "Source checks failed — nothing copied, nothing deployed."; exit 1; }

# ----------------------------------------------------------------------- copy
# Only the runtime files. Everything else in the YNAC repo is development
# material — CLAUDE.md, README.md, the spec, mockup.html, layout-test.html,
# tests.html — and deliberately does NOT get published to skylled.dev.
# --delete so a file removed upstream also disappears here.
echo
echo "Syncing runtime files -> web/tools/ynac/"
for d in css js assets; do
  [ -d "$SRC/$d" ] || { red "Missing $SRC/$d"; exit 1; }
  rsync -a --delete --exclude '.DS_Store' "$SRC/$d/" "$DEST/$d/"
done
for f in index.html oauth-callback.html; do
  [ -f "$SRC/$f" ] || { red "Missing $SRC/$f"; exit 1; }
  cp "$SRC/$f" "$DEST/$f"
done
find "$DEST" -name '.DS_Store' -delete

# 3. Nothing from the dev-only set leaked into the published directory. This one
#    validates the copy above, so it can only run afterwards.
leaked="$(find "$DEST" -maxdepth 1 -type f \
  \( -name 'CLAUDE.md' -o -name 'README.md' -o -name '*.md' \
     -o -name 'tests.html' -o -name 'mockup.html' -o -name 'layout-test.html' \) 2>/dev/null || true)"
if [ -n "$leaked" ]; then
  red "FAIL dev-only files present in the published directory:"
  printf '%s\n' "$leaked" | sed 's/^/       /'
  fail=1
else
  grn "OK   no dev-only files in the published directory"
fi

[ "$fail" -ne 0 ] && { echo; red "Checks failed — not deploying."; exit 1; }

echo
echo "Synced from: $(git -C "$SRC" log -1 --format='%h %s' 2>/dev/null || echo "$SRC")"

# --------------------------------------------------------------------- summary
echo
echo "Changed files:"
git -C "$REPO" diff --stat -- web/tools/ynac | sed 's/^/  /'
git -C "$REPO" diff --quiet -- web/tools/ynac && echo "  (none — already up to date)"

if [ "$DEPLOY" -ne 1 ]; then
  echo
  echo "Sync only. To publish:"
  echo "  dart pub global run jaspr_cli:jaspr build && firebase deploy --only hosting"
  exit 0
fi

# ---------------------------------------------------------------------- deploy
echo
echo "Building..."
( cd "$REPO" && dart pub global run jaspr_cli:jaspr build >/dev/null ) || { red "Build failed"; exit 1; }
grn "Build OK"

echo "Deploying..."
( cd "$REPO" && firebase deploy --only hosting ) || { red "Deploy failed"; exit 1; }

# Cache-Control is no-cache site-wide, so this reflects reality immediately.
# Note it does NOT re-check browsers that cached under the old max-age=3600.
echo
echo "Verifying https://skylled.dev/tools/ynac/ ..."
status="$(curl -s -o /dev/null -w '%{http_code}' https://skylled.dev/tools/ynac/)"
echo "  index:      HTTP $status"
if curl -s https://skylled.dev/tools/ynac/js/auth.js | grep -q "'skylled.dev'"; then
  grn "  client ID:  present in live auth.js"
else
  red "  client ID:  MISSING from live auth.js"
fi
grn "Done."

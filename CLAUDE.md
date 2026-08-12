# skylled-web

Kyle's personal site at [skylled.dev](https://skylled.dev). Jaspr (static mode) → `build/jaspr` → Firebase Hosting.

## Build and deploy

```bash
dart pub global run jaspr_cli:jaspr build   # -> build/jaspr
firebase deploy --only hosting              # publishes build/jaspr
```

**A Firebase Hosting deploy replaces the entire site.** Anything live on skylled.dev that is not in `build/jaspr` is deleted by the next deploy. A hidden `/cybertronic/` demo was lost this way in August 2026 — it had been uploaded directly and never existed under `web/`. If you find something live that isn't in this repo, say so *before* deploying.

## Caching

`firebase.json` sets `Cache-Control: no-cache` site-wide, so deploys go live immediately.

Two things to know:
- Firebase Hosting never returns 304. `If-None-Match`, `If-Modified-Since`, even `If-None-Match: *` all return a full 200. There is no revalidation middle ground — caching here is on or off.
- Changing cache policy is **not retroactive**. A browser that cached a file under the previous `max-age=3600` keeps serving it, with the old header, until it expires. After a policy change, verify with `fetch(url, {cache: 'reload'})` rather than assuming the deploy failed.

## Tools (`/tools/`)

Each tool is a static bundle under `web/tools/<slug>/`; Jaspr copies `web/` into `build/jaspr/` verbatim. The index page is `content/tools/index.md` — add a card there via its `tools:` frontmatter list.

### YNAC

**YNAC is developed in a different repo** — `github.com/Skylled/YNAC`, cloned at `~/Repos/YNAC`. What lives in `web/tools/ynac/` is only a published copy.

**Do not hand-edit `web/tools/ynac/`.** Fix things upstream, commit there, then sync:

```bash
./scripts/sync-ynac.sh            # sync only, then review `git diff`
./scripts/sync-ynac.sh --deploy   # sync, build, deploy, verify
```

Only 12 runtime files are published (`index.html`, `oauth-callback.html`, `css/`, `js/`, `assets/`). The rest of the YNAC repo — `CLAUDE.md`, `README.md`, the spec, `mockup.html`, `layout-test.html`, `tests.html` — is dev material and is deliberately not served.

The script guards two failures that both reached production silently:

1. **Missing production client ID.** An upstream refactor once replaced the `skylled.dev` entry in `js/auth.js` with a placeholder. Sign-in broke in production only; localhost kept working, so nothing looked wrong locally.
2. **Temporal dead zone in `js/main.js`.** `boot()` is called during module evaluation and synchronously reaches `wireUi()`, so *every* module-level `const`/`let` must be declared above it. One declared below threw before `showSignIn()` could run and left the app stuck on "Loading your budget…".

Both returned HTTP 200 for every file. **Always load the page in a browser after deploying** — `curl` cannot catch this class of failure.

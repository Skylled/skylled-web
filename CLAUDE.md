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

The index page is `content/tools/index.md`; add a card via its `tools:` frontmatter list. A card links to `/tools/<slug>/` by default, which serves a static bundle from `web/tools/<slug>/` (Jaspr copies `web/` into `build/jaspr/` verbatim). A tool hosted elsewhere sets `url:` on its card instead.

### YNAC

YNAC lives at **https://ynac.skylled.dev/**, a Cloudflare Worker developed and deployed from its own repo: `github.com/Skylled/YNAC`, cloned at `~/Repos/YNAC`. Nothing of it remains in this repo except its card (`url:` in `content/tools/index.md`) and the redirects in `firebase.json`.

The old copy used to be served at `/tools/ynac/`. `firebase.json` now 301-redirects every path under it to the new app's root, not to the matching path, because the new app's paths differ (sign-in moved to `/api/callback`). Browsers cache 301s indefinitely, so keep those redirects in place.

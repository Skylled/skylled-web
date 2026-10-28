# skylled-web

Kyle's personal site at [skylled.dev](https://skylled.dev). Jaspr (static mode) → `build/jaspr` → Firebase Hosting.

## Build and deploy

```bash
dart pub global run jaspr_cli:jaspr build   # -> build/jaspr
firebase deploy --only hosting              # publishes build/jaspr
```

The build also writes `build/jaspr/packages/`: non-Dart files copied from dependencies (`intl` locale data, `jaspr_content` build metadata, DDC loaders). The site is pure static HTML with no client-side Dart, so nothing loads them; `firebase.json` ignores `packages/**` so they aren't published. Any other host needs the same exclusion.

### Cloudflare Worker (prepared, not live)

The site is also set up to deploy as a static-assets-only Cloudflare Worker named `skylled-web` (`wrangler.jsonc`, no Worker script, serves `build/jaspr`). **Until cutover (QL-374) skylled.dev is still served by Firebase and nothing has been deployed to the Worker.** Cutover, verification and rollback steps are in `docs/cloudflare-cutover.md`; Kyle does the cutover. `firebase.json` stays until he retires Firebase, so keep the two in step: a header or redirect changed in one needs the same change in the other.

```bash
dart pub global run jaspr_cli:jaspr build   # -> build/jaspr, same build as Firebase
npx wrangler@4 deploy                       # Kyle / Ground Control only
```

Where the Firebase settings live on the Worker side:
- `web/_headers` and `web/_redirects` replace the `headers` and `redirects` in `firebase.json` (no-cache everywhere; the `/tools/ynac` 301s).
- `web/.assetsignore` replaces its `ignore` list for `build/jaspr/packages/`, `.dart_tool/` and `.build.manifest`. Do not add a blanket `.*` rule: Wrangler uploads dot-directories, unlike Firebase's `**/.*` rule, and `/.well-known/assetlinks.json` (Android passkeys for `dev.skylled.pocketace`, `get_login_creds` only) must be published. `/.well-known/webauthn` must stay 404.
- Firebase does *not* publish `web/.well-known/`, and would publish `/_headers` and `/_redirects` as plain files. That only matters if you roll back to Firebase; see the cutover doc.
- `/tools` → `/tools/` is a 307 on Cloudflare (`html_handling: auto-trailing-slash`) and a 301 on Firebase.

If `jaspr build` fails with "Incompatible version with current running build daemon", the lockfile's `build_daemon` is too old for the installed `jaspr_cli`: `dart pub upgrade build_daemon` and commit `pubspec.lock`. The lock now requires Dart 3.13+.

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

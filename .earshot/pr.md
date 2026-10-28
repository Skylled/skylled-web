Title: QL-374: serve skylled.dev from a Cloudflare Worker (static assets) + Android assetlinks.json
Draft: false

Makes the site deployable as a static-assets-only Worker named `skylled-web`, ready to leave Firebase Hosting. Nothing is deployed and DNS is untouched; `firebase.json` stays.

- `wrangler.jsonc`: no Worker script, serves `build/jaspr`, `html_handling: auto-trailing-slash`, `not_found_handling: 404-page`.
- `web/_headers` (`Cache-Control: no-cache` everywhere) and `web/_redirects` (301 `/tools/ynac` and `/tools/ynac/*` to `https://ynac.skylled.dev/`) mirror `firebase.json`.
- `web/.assetsignore` keeps `packages/`, `.dart_tool/` and `.build.manifest` out of the upload. It deliberately has no blanket dotfile rule, because Wrangler uploads dot-directories and `/.well-known/` must be published.
- `web/.well-known/assetlinks.json`: `get_login_creds` only, for `dev.skylled.pocketace`. Served 200 `application/json`, no redirect. `/.well-known/webauthn` stays 404.
- `docs/cloudflare-cutover.md`: cutover checklist, apex A-record handling, curl and Digital Asset Links checks, rollback.

Tested against a real `jaspr build` with `wrangler dev` (assetlinks, headers, redirects, trailing slashes, 404s, ignored files). `wrangler deploy --dry-run` was not run: the permission layer denied it.

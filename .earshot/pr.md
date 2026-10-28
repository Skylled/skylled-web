Draft: false
Title: QL-374: Serve skylled.dev from a Cloudflare Worker, with passkey assetlinks.json

Makes the site deployable as a static-assets-only Cloudflare Worker named `skylled-web`, ready to leave Firebase Hosting, and publishes the Android passkey verification file. **Nothing is deployed, DNS is untouched, and `firebase.json` stays.**

## Scope
- `wrangler.jsonc`: no Worker script, serves `build/jaspr`, `html_handling: auto-trailing-slash`, `not_found_handling: 404-page`.
- `web/_headers` (`Cache-Control: no-cache` everywhere) and `web/_redirects` (301 `/tools/ynac` and `/tools/ynac/*` to `https://ynac.skylled.dev/`) mirror `firebase.json`.
- `web/.assetsignore` keeps `packages/`, `.dart_tool/` and `.build.manifest` out of the upload. It deliberately has no blanket dotfile rule: Wrangler uploads dot-directories (confirmed in Wrangler 4.154.0's source, since the docs don't say), and `/.well-known/` must be published.
- `web/.well-known/assetlinks.json`: `get_login_creds` only, for `dev.skylled.pocketace`. Served 200 `application/json`, no redirect. `/.well-known/webauthn` stays 404.
- `pubspec.lock`: `dart pub upgrade build_daemon` (see Lockfile).
- `CLAUDE.md` describes the Worker deploy alongside Firebase until cutover; `docs/cloudflare-cutover.md` has the checklist; README pointer; `.wrangler/` ignored.

## Checks
- `jaspr build` passes from a clean `build/` with the updated lockfile (4 routes). It failed before the lockfile change.
- `wrangler dev` against that build: `assetlinks.json` is 200 `application/json` with `no-cache` and no redirect; `/.well-known/webauthn` is 404; the ynac paths 301 to `https://ynac.skylled.dev/`; `_headers`, `_redirects`, `.assetsignore`, `packages/`, `.build.manifest` and `.dart_tool/` are 404 (not uploaded).
- `wrangler deploy --dry-run` was **not** run: the permission layer denied it. Run `npx wrangler@4 deploy --dry-run` after a build.
- Local dev is not production; the curl and Digital Asset Links checks in the cutover doc are the real test.

## Cutover notes (Kyle does these; full list in `docs/cloudflare-cutover.md`)
- **Apex A records:** `151.101.1.195` and `151.101.65.195` (DNS-only, Firebase). Cloudflare's docs only say a CNAME blocks a Custom Domain and say nothing about A records, so expect to delete both first, back-to-back with attaching the Custom Domain. Leave MX, TXT and `ynac` records alone.
- **`www` redirect:** `www` has the same two A records and 301s to the apex via Firebase. A Custom Domain on the apex does not answer `www`, so before retiring Firebase give `www` a proxied record plus a Redirect Rule to the apex.
- **Rollback loses the file:** `firebase.json` ignores `**/.*`, so on Firebase `assetlinks.json` is not served (Firebase answers `200 []`, which is also what it does today) and passkeys fail until cutover again. It would also publish `/_headers` and `/_redirects` as public files.
- **Lockfile:** the committed lock failed under `jaspr_cli` 0.23.5 (`build_daemon` 4.1.1 < 4.1.3). Upgrading moves `build_daemon` to 4.1.7, `build_web_compilers` 4.4.17 to 4.8.5 and `scratch_space` 1.2.0 to 1.2.2, drops `build_modules`, and raises the lock's Dart floor to 3.13 (`pubspec.yaml` still says `^3.10.0`). An older SDK, for example in CI or Ground Control, needs updating.
- Trailing-slash redirects are 307 on Cloudflare versus 301 on Firebase.

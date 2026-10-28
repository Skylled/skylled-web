# Moving skylled.dev from Firebase Hosting to a Cloudflare Worker (QL-374)

The site is now deployable as a static-assets-only Worker named `skylled-web`
(`wrangler.jsonc`, no Worker script). **Nothing has been deployed and DNS is
untouched**: skylled.dev still resolves to Firebase until you do the steps below.
`firebase.json` stays in place until you retire Firebase.

## How the Worker config maps to Firebase

| Firebase (`firebase.json`) | Cloudflare |
|---|---|
| `public: build/jaspr` | `assets.directory` in `wrangler.jsonc` |
| `headers`: `Cache-Control: no-cache` on `**` | `web/_headers` |
| `redirects`: `/tools/ynac` and `/tools/ynac/**` → `https://ynac.skylled.dev/` (301) | `web/_redirects` |
| `ignore`: `packages/**`, `**/.*`, … | `web/.assetsignore` (see below) |
| clean 404, `/foo` → `/foo/` for directory indexes | `html_handling: auto-trailing-slash`, `not_found_handling: 404-page` |

`_headers`, `_redirects` and `.assetsignore` live in `web/`, so Jaspr copies them
into `build/jaspr/`, which is where Wrangler reads them (they must be in the
assets directory root). Wrangler never uploads those three as assets.

### `.well-known/` and dot-directories

Firebase's `**/.*` ignore rule hid every dotfile. Wrangler has no such rule: the
only built-in ignores are `/.assetsignore`, `/_redirects` and `/_headers`, and
its directory walk is a plain recursive `readdir`, so `.well-known/` **is**
uploaded. Verified two ways:

- Source: `buildAssetManifest` / `createAssetsIgnoreFunction` in Wrangler 4.154.0
  (`wrangler-dist/cli.js`; upstream `workers-sdk`, `packages/wrangler/src/assets.ts`
  and `workers-shared/utils/helpers.ts`).
- Behaviour: `wrangler dev` against a real `jaspr build` serves
  `/.well-known/assetlinks.json` as 200 `application/json`.

The Cloudflare docs do **not** state this either way
([`.assetsignore`](https://developers.cloudflare.com/workers/static-assets/binding/)
only says it takes `.gitignore` syntax and that matching files aren't uploaded),
so don't rely on the docs for it. Because the build also writes `.build.manifest`,
`.dart_tool/` and `packages/` into `build/jaspr/`, `web/.assetsignore` excludes
exactly those three and nothing else. **Do not add a blanket `.*` pattern there:
it would drop `.well-known/`.**

Content-Type comes from the file extension at upload time, so `assetlinks.json`
is `application/json` with no config. `/.well-known/webauthn` has no file and
returns 404, as intended.

### Behaviour differences from Firebase

- `/tools` → `/tools/`: Firebase sends a 301, Cloudflare's `auto-trailing-slash`
  sends a **307**. Same destination. Also `/posts/foo.html` redirects to `/posts/foo/`.
- The `_headers` docs say redirects are evaluated before headers, so the 301s
  may not carry `Cache-Control: no-cache` in production (local `wrangler dev`
  showed it on them). Harmless, since 301s are cached by browsers regardless.
- There is no `404.html` in the build, so 404s are Cloudflare's plain-text
  default, the same as Firebase's today. Adding `content/404.md` or a
  `web/404.html` later is picked up automatically by `404-page`.
- `www.skylled.dev` currently 301s to the apex via Firebase. A Worker custom
  domain on the apex does **not** answer `www` (see step 3).

## Build

```bash
dart pub global run jaspr_cli:jaspr build    # -> build/jaspr
```

If this fails with `Incompatible version with current running build daemon:
Project resolved build_daemon 4.1.1 …`, the committed `pubspec.lock` is too old
for the current `jaspr_cli`. Run `dart pub upgrade build_runner` and commit the
lockfile. (That is what was needed to build with jaspr_cli 0.23.5 during QL-374;
the lockfile was not changed in this branch.)

## Cutover checklist (Kyle)

1. **Deploy the Worker, without attaching the domain yet.**
   - Either via Ground Control once QL-269 lands (it needs: the Jaspr build,
     then `wrangler deploy` from the repo root), or by hand once:
     ```bash
     dart pub global run jaspr_cli:jaspr build
     npx wrangler@4 deploy        # first run: wrangler login, or CLOUDFLARE_API_TOKEN
     ```
   - This creates `skylled-web` and, unless you disable it, a
     `skylled-web.<account>.workers.dev` URL. Test there first:
     ```bash
     U=https://skylled-web.<account>.workers.dev
     curl -sI $U/.well-known/assetlinks.json   # 200, application/json, no Location
     curl -sI $U/.well-known/webauthn          # 404
     curl -sI $U/tools/ynac/anything           # 301 -> https://ynac.skylled.dev/
     curl -sI $U/tools                         # 307 -> /tools/
     curl -sI $U/ | grep -i cache-control      # no-cache
     curl -sI $U/packages/ ; curl -sI $U/.build.manifest   # both 404
     ```

2. **Attach `skylled.dev` as a Custom Domain.** Dashboard: Workers & Pages →
   `skylled-web` → Settings → Domains & Routes → Add → Custom Domain →
   `skylled.dev`. (Or add `"routes": [{ "pattern": "skylled.dev", "custom_domain": true }]`
   to `wrangler.jsonc` and deploy.) Cloudflare creates the DNS record and the
   certificate itself.

3. **Existing apex A records.** The apex currently has two DNS-only A records,
   `151.101.1.195` and `151.101.65.195` (Firebase). Cloudflare's docs only say a
   Custom Domain can't be created over an existing **CNAME**; they don't say what
   happens with A/AAAA records. Expect to have to delete both A records first
   (or accept the dashboard's offer to replace them). Do it back-to-back with
   step 2; between the two the apex has no record. The new record is
   Cloudflare-managed and proxied, which is correct for a Worker. The "keep
   everything grey-cloud" rule in the DNS notes applied to records pointing at
   Firebase, not to this one.
   - `www` still has the same two Firebase A records. It keeps working (301 to
     the apex) only while the Firebase site exists. Before retiring Firebase,
     give `www` a proxied record (for example `AAAA www 100::`) plus a Redirect
     Rule `www.skylled.dev/*` → `https://skylled.dev/${1}`, 301, or add `www`
     as a second Custom Domain and redirect there.
   - Leave MX, TXT (`_atproto`, SPF, DKIM, DMARC) and the `ynac` records alone.

4. **Verify** (allow a few minutes for the certificate):
   ```bash
   curl -sI https://skylled.dev/.well-known/assetlinks.json
   #   HTTP/2 200, content-type: application/json, no location: header
   curl -s  https://skylled.dev/.well-known/assetlinks.json | python3 -m json.tool
   curl -sI https://skylled.dev/.well-known/webauthn          # 404
   curl -sI https://skylled.dev/tools/ynac/                   # 301 -> https://ynac.skylled.dev/
   curl -sI https://skylled.dev/ | grep -i -E 'server|cache-control'   # server: cloudflare, no-cache
   ```
   Digital Asset Links check (expect `"linked": true`):
   <https://digitalassetlinks.googleapis.com/v1/assetlinks:check?source.web.site=https://skylled.dev&relation=delegate_permission/common.get_login_creds&target.android_app.package_name=dev.skylled.pocketace&target.android_app.certificate.sha256_fingerprint=E2:4B:0F:0D:A6:88:EF:AA:40:68:01:81:B4:3C:71:7A:20:D4:84:8C:62:CD:1D:1E:B6:0A:07:E2:55:1E:6C:65>

   Before cutover, Firebase answers that path with `200 []` (an empty list), so
   the check reports `linked: false`. Google caches results, so a stale answer
   for a while after cutover is possible. Android also caches the file on-device.

5. **Retire Firebase later**, only once you're happy and `www` no longer points at
   Firebase (step 3). Then remove `firebase.json` / `.firebaserc` and the Firebase site.

## Rolling back to Firebase

Firebase keeps serving until you retire it, and it was not touched.

1. In Cloudflare: Worker → Settings → Domains & Routes → delete the `skylled.dev`
   Custom Domain (this removes its DNS record; its certificate isn't deleted
   automatically, which is harmless).
2. Re-create the two apex records, **DNS only (grey cloud)**: `A @ 151.101.1.195`
   and `A @ 151.101.65.195`. A proxied record in front of Firebase risks cert
   renewal and redirect loops.
3. `firebase deploy --only hosting` if the Firebase copy has gone stale.

Caveats while on Firebase: `web/.well-known/assetlinks.json` is **not** served
there (`firebase.json` ignores `**/.*`), so Firebase's `[]` returns and passkey
verification for `dev.skylled.pocketace` fails until you cut over again. And
`web/_headers` / `web/_redirects` get published as ordinary public files at
`/_headers` and `/_redirects` (harmless, but visible). Add them to the
`ignore` list in `firebase.json` if you roll back for longer than a day or two.

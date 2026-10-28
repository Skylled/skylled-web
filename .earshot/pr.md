Draft: false
Title: QL-374: Add handle_all_urls to the passkey assetlinks.json relation

The Pocket Ace Android shell (`dev.skylled.pocketace`, WebView in app-mode WebAuthn, RP ID `skylled.dev`) fails passkey sign-in on the Pixel with Play services error `[50152] RP ID cannot be validated`. The installed APK's signer matches the fingerprint in `assetlinks.json`, and Google's Digital Asset Links API returns the statement, but with only `delegate_permission/common.get_login_creds`.

## Change
- `web/.well-known/assetlinks.json`: the relation array is now `["delegate_permission/common.handle_all_urls", "delegate_permission/common.get_login_creds"]`, as Google's Credential Manager passkey docs show. Same single statement, same package and fingerprint.
- `CLAUDE.md`: the note that said "`get_login_creds` only" now reflects this.

`handle_all_urls` is inert for this app: the shell declares no `autoVerify` intent filters, so no links route to it. It is there only because Credential Manager's passkey setup expects it.

## Checks
- JSON validates.
- `wrangler dev` with the repo's `wrangler.jsonc`, `_headers` and `_redirects` over a staged copy of the file: `/.well-known/assetlinks.json` is 200 directly (no redirect), `Content-Type: application/json`, `Cache-Control: no-cache`, no auth.
- Not run: `jaspr build` (jaspr_cli isn't installed on this guest) and any deploy. Nothing is deployed.

## After merge (Kyle)
Build, then `npx wrangler@4 deploy`, if the Worker is already live; otherwise this ships with the cutover in `docs/cloudflare-cutover.md`. Verify with the Digital Asset Links check for `delegate_permission/common.get_login_creds` and `handle_all_urls`.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_014iKvMAFPLFxWs2T4N1bQtA

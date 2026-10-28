# skylled_jaspr

A new Jaspr project

## Running the project

Run your project using `jaspr serve`.

The development server will be available on `http://localhost:8080`.

## Building the project

Build your project using `jaspr build`.

The output will be located inside the `build/jaspr/` directory.

## Hosting

Served from Firebase Hosting today (`firebase.json`). It is also set up to run as
a static-assets Cloudflare Worker (`wrangler.jsonc`, `web/_headers`,
`web/_redirects`, `web/.assetsignore`). See
[docs/cloudflare-cutover.md](docs/cloudflare-cutover.md) for the cutover and
rollback checklist.

# skylled-web

Kyle's personal site at [skylled.dev](https://skylled.dev). Built with [Astro](https://astro.build) and the [Cooper](https://github.com/GladTek/Cooper) theme, hosted on Firebase.

## Dev setup

```bash
npm install
npm run dev        # http://localhost:4321
```

## Build & preview

```bash
npm run build      # outputs static files to dist/
npm run preview    # serve the built dist/ locally
```

## Deploy to Firebase

Always deploy to a preview channel first to verify before going live.

```bash
# Step 1 — deploy to a temporary preview channel
firebase hosting:channel:deploy preview

# Step 2 — promote to production when satisfied
firebase deploy --only hosting
```

The Firebase project is `skylled-web` (`.firebaserc`). The `dist/` directory is what gets deployed (`firebase.json`).

## Writing a blog post

Drop a `.md` or `.mdx` file in `src/content/blog/en/` with this frontmatter:

```yaml
---
title: 'Post Title'
description: 'One-line summary shown on the blog index.'
pubDate: 'YYYY-MM-DD'
---
```

The post will be available at `/blog/<filename-without-extension>`.

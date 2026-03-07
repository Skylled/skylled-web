---
title: 'Getting Started'
description: 'Learn how to set up and customize your new Astro project.'
order: 0
---

Welcome to the **Cooper** documentation! This guide will help you get your project up and running in minutes.

## Installation

First, clone the repository to your local machine:

```bash
git clone https://github.com/Gladtek/Cooper.git
cd Cooper
```

Next, install the dependencies:

```bash
npm install
```

## Running Locally

Start the development server:

```bash
npm run dev
```

Open your browser and navigate to `http://localhost:4321` to see the site in action.

## Project Structure

Here's a quick look at how the project is organized:

```text
src/
├── components/        # Reusable components
│   ├── blog/          # Blog & Portfolio cards/items
│   ├── common/        # Shared global tools
│   ├── islands/       # Interactive React components
│   ├── layout/        # Structural atoms (Section, Grid)
│   ├── sections/      # Marketing blocks (Hero, Features)
│   └── ui/            # Basic UI parts (Button, Badge)
├── content/           # Content Collections (Blog, Docs)
├── layouts/           # Page wrappers
├── pages/             # File-based routing
├── styles/            # CSS & Tailwind setup
└── site.config.ts     # Global settings
```

## Customization

### Theming

You can easily customize the primary brand color and other site settings in `src/site.config.ts`.

```typescript
// src/site.config.ts
export const siteConfig = {
  name: 'Cooper',
  description: 'Premium Astro Boilerplate',
  primaryColor: '#00008B', // Update this to your brand color
};
```

### Navigation

To update the header links, modify `src/components/Header.astro`.

## Deployment

This Boilerplate is ready to deploy to Vercel, Netlify, or any static hosting provider. Just run:

```bash
npm run build
```

This will generate a `dist` folder with your static site.

## Next Steps

Check out the [Components Guide](/docs/components) to see the included premium components in action and learn how to customize them.

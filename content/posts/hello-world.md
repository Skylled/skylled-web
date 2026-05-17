---
title: "Hello, Jaspr"
description: "First post on the Jaspr-powered rebuild of skylled.dev."
author: "Kyle Bradshaw"
date: "21 April 2026"
readTime: "2 min"
authorImage: https://github.com/Skylled.png
tags: ["Dart", "Jaspr", "Meta"]
---

This site just got wiped to the studs — again — and rebuilt on [Jaspr](https://jaspr.site), a Dart web framework by Kilian Schulte.

## Why Jaspr?

I had briefly experimented with rebuilding via Astro, but it felt too dependent on vibe-coding tools. If anything went wrong, that would be an afternoon of prompt engineering to get things back in shape. Then I saw [an article from Google](https://blog.flutter.dev/we-rebuilt-flutters-websites-with-dart-and-jaspr-317c00e8b400) about why they had selected Jaspr to handle the Dart & Flutter websites and blogs.

I know Dart, and I know Flutter. And I know Flutter Web is not the tool I need for the kind of web presence I currently want to have. But Jaspr looked promising, offering static-site blogging features via a language I know well. So here we are! A clean slate.

## What's here

Right now: a home page and this post, wired through `jaspr_content` with essentially just the stock `BlogLayout`. Everything else — styling, navigation, better post listing — is TBD.

Also, we have a Tools page, where I'll dump various (usually vibe-coded) web tools that need a home. I make no guarantees that any of them work (for myself or others).

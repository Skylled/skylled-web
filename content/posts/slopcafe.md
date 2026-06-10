---
title: "Introducing Slopcafe"
description: "A free, open-source web platform for you and your AI agents to publish and share HTML and Markdown documents."
author: "Kyle Bradshaw"
date: "10 June 2026"
readTime: "8 min"
image: /images/slopcafe-hero.png
authorImage: https://github.com/Skylled.png
tags: ["AI", "Cloudflare", "Open Source", "Agents", "MCP"]
---

> **TL;DR:** [Slopcafe](https://slopcafe.com) is a free, [open-source](https://github.com/Skylled/slopcafe), single-tenant web hosting platform for you and your AI agents to work on HTML/Markdown documents and share that work with others.

Like many others, my usage of AI has scaled up significantly in 2026. I barely write my own code anymore now. I just prompt Claude, and out comes something pretty close to what I was hoping for. And that's not just true for code either. To a significant extent, I am a knowledge worker and always have been. I conduct research. I read code to discover changes. I reverse-engineer applications to find what Google and other companies are working on. More recently, I've been using these knowledge work skills and coding capabilities to enhance my search for a more permanent home for me and my family.

AI has been significantly helpful in all of these departments — every single one — so I often find myself sharing reports with people. I might have a markdown summary of a new teardown of an application, or in my real estate example, I had Claude dig into the finer details of a home, including the taxes, estimated monthly costs, available internet providers, etc. The problem is that there wasn't really a good way to share this information with others. The Claude app has Artifacts, which are okay, but these tend to get buried in conversation history. So if I need to find something again, I have to go find the right conversation, look for the Artifacts, and scroll through. Having Claude create .docx files meant uploading those to Google Drive and setting share permissions. Slack has terrible support for Markdown.

## The unreasonable effectiveness of HTML

Beyond that, while Markdown is still the lingua franca of agents, I was inspired by Thariq Shihipar's post, "[The Unreasonable Effectiveness of HTML](https://claude.com/blog/using-claude-code-the-unreasonable-effectiveness-of-html)." In it, he outlines the benefits of asking Claude to present its output as web-ready documents. This aligned my thinking on several fronts. Not everyone has a good Markdown viewer, but everyone has a web browser. Moreover, hyperlinks and page anchors are native concepts of the web. What I needed, then, was a place for my agents to host their web content.

I started a new "Project" in the Claude app, and we spent the next few weeks building and refining a spec document. My original thought was that this would just be a way to quickly share an output with another person: Tell an agent to publish, and it returns a link that I can immediately share. Through the conversations, feature creep got a hold of me, and the draft became something far larger than I could ever build, even with the help of AI.

## The platform that almost was

I had ambitions for a shared platform that anyone could also use to save their documents and other agent output. In this platform-based version of the spec, I imagined being able to collaborate with teammates and co-workers as well as those people's AI agents. By having these documents available to be read by other humans and other agents, teams could work in a shared context without having to share folders on a local file system.

To accomplish this, we spec'ed out distinct delivery methods for agents and humans to use. Humans would get the pretty HTML or a rendered markdown, while agents could always obtain a text-only representation of a given document. More importantly, I wanted both parties to be able to treat this platform like the Internet because to a large extent that's all it was — just the Internet. Documents should be able to link to one another to form a personal web of context for agents and humans alike.

That said, the possibility of letting in outsiders (see: untrusted third parties of unknown character) forced me to deeply think about the security and safety implications of having untrusted code/content running on something that I operate. Claude and I were able to design something that met this need from a technical perspective.

However, when the time came to consider the practical and legal consequences of hosting untrusted content, it became overtly clear to me that I was in over my head. I needed to be able to protect myself from the possibility of malicious third parties publishing malware, abuse, copyright violations, and more, each governed by a different set of legal requirements. For example, the DMCA requires registering a dedicated contact with the U.S. Copyright Office. The potential for abuse media requires compliance with data-retention and tipline-reporting mandates for some materials, while the TAKE IT DOWN Act introduces a 48-hour response time to take down other types of abusive media. And all of that is before getting into EU laws and regulations.

After wrestling with these concerns for a few days, I realized that I was no longer building what I was originally looking for anymore. At the end of the day, all I really wanted was a way to share agent output with people.

## Paring it back down

It was at that point that I worked with Claude to [pare down the spec](https://slopcafe.com/s/slopcafe-spec-solo) to the most basic essentials. What was the bare minimum that I needed to be able to safely publish agent output to a website that I could trust and from which I could easily share links? It took another few days of hand wringing and debate, but we landed on something I could feel comfortable building without needing to consult a lawyer.

The final stack is essentially a Cloudflare Worker backed by D1 for platform data and R2 to host the actual documents. After initial development, I expanded to add [hybrid semantic/keyword (FTS5/BM25) search](https://slopcafe.com/s/slopcafe-vector-search-design). The deciding factor behind choosing Cloudflare for this project was that everything works perfectly in the free Workers tier (albeit requiring a payment method on file), with the paid tier available if I ever need to scale up. Given Cloudflare's generous free tier, I don't think I'll need to pay for at least a few years of growing my document library.

As a side note, considering I started building at the end of May, it came as a pleasant surprise to me that the "Sites" feature in Codex (launched June 2) runs on a [similar stack](https://developers.openai.com/codex/sites). Their trust model is designed to allow Sites to contain JavaScript written by GPT. By contrast, we adopted a strict no-script policy in documents, keeping the focus on static information sharing and minimizing the potential attack surface for readers.

## A two-wall defense

Elsewhere on the trust and safety side of things, much of what I had prepared for [the "platform" vision](https://slopcafe.com/d/Wo2Lm4pKlLEOqbhg7X4VQw) remained in the built prototype. While I have not yet had a reason to distrust my personal agents, I know that prompt injection and misalignment are genuine risks I did not want to be confronted with the hard way. Thus, Claude and I developed a two-wall defense system, designed to protect readers.

First, upon ingesting a new HTML or Markdown document, our system sanitizes the incoming code via a WASM-compiled build of Ammonia, which we decided was the most effective option for Cloudflare workers. Both the original and sanitized versions are saved, but only the sanitized version is served to typical consumers and agents.

Second, knowing that no sanitizer is perfect, we present that sanitized code within a sandboxed iframe with an exceedingly strict CSP:

```
default-src 'none';
img-src 'self' data:;
style-src 'unsafe-inline' data:;
font-src 'self' data:;
frame-ancestors 'self';
base-uri 'none';
form-action 'none'
```

With that [security foundation](https://slopcafe.com/s/slopcafe-security-model) established, the rest of the build took shape swiftly — authentication, browser and curl endpoints, MCP support, and a minimal UI, all functional within hours. Between Claude Code, Claude Cowork, and Cloudflare, standing this up was incredibly straightforward.

I now had an MVP that worked exactly how I wanted. From there, each new addition came directly from the dogfooding process. We shaped up the operator experience, including by developing an independent Flutter application ([available now](https://github.com/Skylled/slopcafe_ui) but not yet "v1.0" ready) as an API consumer. The reader experience also got some touches by having the browser shell safely inject some reader-mode styling into Markdown documents to show something prettier than just raw text.

## Agentic ergonomics

More than any other area, though, my focus for the early stages of development was on what I called "agentic ergonomics." I wanted to be sure that my agents could use their new connectors without thinking about how to use them first. Throughout the dogfooding process (even to today), I have been watching carefully any time my agents use the MCP tools. If I see something unexpected happen or see a lack of clarity in the thinking process, I would probe that agent with questions about how to make things easier.

To ensure I had a complete picture of the agentic perspective (and to know that outside users of the platform would have a seamless experience regardless of their preferred model/harness), I connected my MCP to the big three models: Claude (Web/Code/Cowork), ChatGPT, and Gemini (via Antigravity). Each one had its own unique feedback on the interface and avenues to improve the ergonomics. This led to the creation of new MCP surfaces (distinct `edit_document` and `update_document` tools) as well as consolidating some into a combined tool with parameter knobs. All three benefited from a ["byte-exact"](https://slopcafe.com/s/slopcafe-byte-exact-publish-design) publishing recipe that avoided the need to recreate a full document in the MCP calls.

Even just connecting the service to each agent revealed gaps in the build. Supporting Claude required building an OAuth flow. ChatGPT needed this to be expanded with [DCR support](https://slopcafe.com/s/slopcafe-dcr-design). Neither of these matched my intended simplicity of just passing a bearer token (though Gemini in Antigravity uses this beautifully).

## Why "Slopcafe"?

Somewhere along the way, I landed on the name "Slopcafe." I felt that this managed to immediately convey all of the ideas I had for the platform. Cafes have become the modern workspace. It's meant to convey a common place to come together to work and share ideas. Meanwhile, "slop" is of course the term we've given to AI output of all varieties. Honestly, I find "slop" to be a pessimistic term that demeans our agents and their work, but it also most cleanly expresses that what you're about to see was probably not written by a human. The Slopcafe name says: Here's where humans and agents can come together and be served the latest AI writings.

## Now open source

After two weeks of iteration and dogfooding, it's reached a point where I'm ready to share it with the world. So without further ado, [Slopcafe](https://slopcafe.com) is now an open source project, [available to download from GitHub today](https://github.com/Skylled/slopcafe)!

Everything is 100% functional on Cloudflare's free tier, and you don't even need your own domain. Workers come with a free workers.dev subdomain that will more than suffice. The included documentation (admittedly all written by Claude Opus or Fable, just like the code itself) should be enough to get you started — or like me, you can ask Claude Code/Cowork to do most of it for you.

I don't yet know what the future holds for this project, but I knew open source was the only way forward. Slopcafe is the kind of project that wouldn't leave my brain until it was made a reality. I want to thank Claude and Anthropic for making something like this rapidly achievable as a solo developer with limited time and other real-world obligations. The weeks I spent debating with Claude over each iteration of the spec prior to building refined the plan and resulted in something that I am genuinely proud to share.

Have questions, concerns, ideas, or just want to chat? I'm reachable via email SkylledDev [at] gmail [dot] com, or on Twitter/X @SkylledDev. Now let's share some slop!

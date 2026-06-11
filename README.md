# Shadow Computers — Website

Static site for [shadowcomputers.uk](https://shadowcomputers.uk), built with [Astro](https://astro.build/). Uses the same configuration, build pipeline, and tooling as the MidNiteShadowOnline site.

## Tech stack

- **SSG**: Astro (static output) with the `@astrojs/cloudflare` adapter
- **Templates**: Astro components (`.astro`)
- **Fonts**: Exo 2 (headings) + Inter (body) via Google Fonts
- **Hosting**: Cloudflare Pages (build output `dist/client`)
- **Node**: 24.x (see `.node-version`)

## Project structure

```
shadowcomputers.uk/
├─ astro.config.mjs        # Astro config (static output, Cloudflare adapter)
├─ wrangler.toml           # Cloudflare Pages config (dist/client output)
├─ wrangler.dev.toml       # Local adapter config (no pages_build_output_dir)
├─ cloudflare/
│  └─ contact/             # Separate Worker: /api/contact (Turnstile + Email Routing)
├─ public/
│  ├─ _headers             # Security headers
│  ├─ _redirects           # Old site → new site redirects
│  ├─ favicon.ico
│  ├─ site.webmanifest
│  ├─ images/              # Logo assets
│  └─ assets/og/           # Generated OG images (build cache)
├─ scripts/
│  ├─ generate-og-images.mjs
│  ├─ copy-error-pages.mjs # Copies built error pages to /_errors/*.html
│  ├─ check-accessible-names.mjs
│  └─ watch.mjs
└─ src/
   ├─ config.ts            # Build-time constants (GA ID, CF beacon, Turnstile site key)
   ├─ styles/global.css    # All styles — dark theme, brand palette
   ├─ components/
   │  ├─ BgBracket.astro   # Decorative hero bracket SVG
   │  └─ CookieBanner.astro
   ├─ layouts/
   │  ├─ BaseLayout.astro  # HTML shell, header, footer, analytics
   │  └─ ErrorLayout.astro # Error pages (absolute URLs, noindex)
   └─ pages/
      ├─ index.astro       # Home
      ├─ about.astro
      ├─ services.astro
      ├─ contact.astro
      ├─ privacy.astro
      └─ 403/404/500/503.astro  # Error pages
```

## Local development

```bash
npm install
npm run dev         # Serves at http://localhost:8081 with live reload
npm run watch       # dev server via scripts/watch.mjs (optional background build)
```

## Build

```bash
npm run build       # astro check + build + OG images + /_errors/ copies into dist/client/
npm run build:local # build + accessible-name audit
npm run preview     # preview the production build on :8081
```

## OG images

`npm run build` generates a 1200×630 Open Graph image per page (satori +
resvg) into `public/assets/og/` (cached) and `dist/client/assets/og/`.
`BaseLayout.astro` points `og:image` at `/assets/og/<slug>.png` using the same
slug derivation as the generator. Use `npm run og:generate` to force-regenerate
all images.

## Error pages

The Cloudflare zone serves custom error pages from `/_errors/*.html`. Astro
can't emit underscore-prefixed routes, so `scripts/copy-error-pages.mjs` copies
the built 403/404/500/503 pages into `dist/client/_errors/` after each build.
`404.html` and `500.html` also exist at the site root, where Cloudflare Pages
picks them up automatically.

## Accessibility check

`npm run build:local` includes an automated audit for heading and anchor accessible names in generated HTML (`dist`).

The audit fails the build if any `<h1>`-`<h6>` or `<a>` element has no accessible name.

Accepted name sources:

- inner text
- `aria-label`
- `aria-labelledby`
- an `img`/`Image` with non-empty `alt`
- an `svg` with a non-empty `<title>`

To run only the audit after a build:

```bash
node ./scripts/check-accessible-names.mjs dist
```

Watch mode also runs the same audit when source files change:

```bash
npm run watch
```

## Cloudflare Pages settings

| Setting          | Value           |
| ---------------- | --------------- |
| Build command    | `npm run build` |
| Output directory | `dist/client`   |
| Node version     | `24`            |

Public build-time values (GA Measurement ID, Cloudflare Web Analytics beacon
token, Turnstile site key) live in `src/config.ts` — Cloudflare's runtime
"Variables and Secrets" are not available during static builds.

## Design

- **Dark theme only**
- **Colours**: Brand palette from Shadow Computers branding card
- **Headings**: Exo 2 (ExtraBold 800 / Bold 700 / SemiBold 600)
- **Body**: Inter (Regular 400 / Medium 500 / SemiBold 600)
- **No CTAs** — informational site only

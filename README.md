# Shadow Computers — Website

Static site for [shadowcomputers.co.uk](https://shadowcomputers.co.uk), built with [Eleventy (11ty)](https://www.11ty.dev/).

## Tech stack

- **SSG**: Eleventy v2
- **Templates**: Nunjucks (`.11ty.njk`)
- **Fonts**: Exo 2 (headings) + Inter (body) via Google Fonts
- **Hosting**: Cloudflare Pages
- **Build**: GitHub Actions → Cloudflare Pages

## Project structure

```
shadowcomputers.co.uk/
├─ src/
│  ├─ _includes/
│  │  ├─ layout.11ty.njk       # Base HTML shell
│  │  ├─ header.11ty.njk       # Sticky nav header
│  │  ├─ footer.11ty.njk       # Site footer
│  │  └─ service-card.11ty.njk # Reusable service card partial
│  ├─ css/
│  │  └─ site.css         # All styles — dark theme, brand palette
│  ├─ images/             # Logo assets (passed through to _site)
│  ├─ index.11ty.njk           # Home page
│  ├─ about.11ty.njk           # About page
│  ├─ services.11ty.njk        # Services page
│  └─ contact.11ty.njk         # Contact page
├─ .eleventy.js           # Eleventy config
├─ package.json
└─ README.md
```

## Local development

```bash
npm install
npm run dev       # Serves at http://localhost:8081 with live reload
```

## Build

```bash
npm run build     # Outputs to _site/
```

## Cloudflare Pages settings

| Setting          | Value           |
| ---------------- | --------------- |
| Build command    | `npm run build` |
| Output directory | `_site`         |
| Node version     | `24`            |

## Design

- **Dark theme only**
- **Colours**: Brand palette from Shadow Computers branding card
- **Headings**: Exo 2 (ExtraBold 800 / Bold 700 / SemiBold 600)
- **Body**: Inter (Regular 400 / Medium 500 / SemiBold 600)
- **No CTAs** — informational site only

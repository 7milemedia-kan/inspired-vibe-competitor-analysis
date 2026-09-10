# Inspired Vibe Competitor Analysis

A competitor authority assessment with Inspired Vibe branding, a six-signal score, optional social and podcast evidence, founder discovery, and a revenue scenario calculator.

## Features

- Required competitor website plus optional Instagram, YouTube, TikTok, podcast URL, and founder name.
- Bounded discovery of relevant company, leadership, media, training, content, and podcast pages.
- Public profile counters where extractable; missing metrics are unknown rather than zero.
- Source links, evidence notes, provisional scores, and user-supplied link attribution.
- Best-effort public founder search, with an explicit unavailable state and manual search link if automated access is challenged.
- Contact capture, private leads dashboard, and CSV export.

The assessment does not call ChatGPT or an AI API. Founder search is not exhaustive. Public sources may block automated access. Counts and score outputs are directional evidence, not verified engagement analytics or comparative content-quality rankings. Revenue scenarios use the visitor's estimates, not discovered competitor financial data.

## Run locally

Use Node.js 22 with the bundled dependency lockfile. The existing native SQLite dependency may require additional build tools on other Node versions.

```sh
npm ci --include=dev
npm run dev
```

Open `http://localhost:5000/`. The calculator is at `/#/impact`; the private leads dashboard is at `/#/leads`.

Copy `.env.example` to `.env` when configuring the app:

| Variable | Purpose |
| --- | --- |
| `PORT` | Optional; defaults to 5000 |
| `ADMIN_KEY` | Your chosen password, at least 12 characters, to enable the private leads dashboard |
| `SESSION_SECRET` | Random session secret; generated at boot when unset |

No external API key is required. The HubSpot adapter is disabled and unimplemented; adding a token alone does not activate CRM sync. Database files and real environment files must stay out of Git.

## Validate and build

```sh
npm run check
npm run test:assessment
npm run build
npm start
```

The production build emits the React frontend in `dist/public` and the Express server in `dist/index.cjs`. Production session cookies require HTTPS. Without DATABASE_URL, local SQLite data is stored in `data.db` and admin sessions are in memory. Hosted PostgreSQL persists both records and sessions.

## Hosting and embedding

This repository contains a Node/Express application and a Vercel serverless entry point. The frontend and assessment API must be deployed together. Hosted persistence requires PostgreSQL; see the Vercel configuration below.

After deploying the complete application to a compatible HTTPS host and allowing your parent website to frame it:

```html
<iframe
  src="https://YOUR-APP-DOMAIN/"
  title="Competitor Authority Assessment"
  width="100%"
  height="1100"
  style="border:0; border-radius:16px"
></iframe>
```

## Source layout

- `client/`: React interface, brand styles, and webfonts.
- `server/analyze.ts`: weighted assessment rules.
- `server/discovery.ts`: website discovery and public social metrics.
- `server/supplemental.ts`: optional podcast and founder lookup.
- `server/routes.ts`: API routes, validation, caching, lead capture, and admin access.
- `shared/impact-model.ts`: revenue scenario formulas.

See `ASSESSMENT-UPGRADE.md` and `PODCAST-FOUNDER-UPDATE.md` for implementation and validation notes. The original six-pillar weights remain; no special score overrides exist for benchmark brands.

## Vercel deployment

The Vercel project is `7-mile-media/inspired-vibe-competitor-analysis` and deploys this repository. `api/index.ts` serves the Express API; Vite outputs the frontend to `dist/public`. Node 22 and a 300-second function budget are configured.

Production requires `DATABASE_URL` and `SESSION_SECRET`. Set `ADMIN_KEY` (at least 12 characters) to enable the protected lead dashboard. All three are server-side secrets; never prefix them with `VITE_` or commit environment files.

The hosted app uses PostgreSQL for scans, leads and admin sessions. Dedicated `iv_competitor_*` tables are created automatically. Local development without `DATABASE_URL` continues to use SQLite. Existing local SQLite records are not uploaded automatically. The assessment does not call an AI API or use ChatGPT account tokens.

Run `npm run check`, `npm run test:assessment`, and `npm run build` before deploying. To verify hosted persistence against a configured database, run `node --import tsx --test server/storage-postgres.test.ts` with `DATABASE_URL` set. The test removes only its own fixtures.

In-memory scan caches and login throttles are per function instance; cache misses may repeat a scan. Admin sessions persist in PostgreSQL. Social sites can still block cloud crawlers, in which case metrics remain unverified rather than invented.


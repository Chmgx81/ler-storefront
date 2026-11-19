# Contributing

Thanks for taking a look. This is a demo storefront, but the code is meant to be
read and reused, so the bar is "would I ship this?" rather than "does it render?".

## Setup

```bash
git clone https://github.com/<owner>/ler-storefront.git
cd ler-storefront
npm install
cp .env.example .env          # then set BETTER_AUTH_SECRET
npm run db:migrate
npm run dev                   # API on :8787, storefront on :5173
```

Generate a secret with `openssl rand -base64 48`. Never commit `.env`,
`.env.local` or anything under `data/`.

## Before you open a pull request

```bash
npm test          # integration tests, throwaway databases
npm run build     # typechecks the client and bundles the server
npm audit --omit=dev
```

All three must pass. If you changed the UI, include before/after screenshots at
1440x900 and 390x844, and check it with a keyboard and with reduced motion
enabled.

## What belongs in a change

Keep changes small and single-purpose. Target roughly 100 changed lines; split
anything approaching 1000. Separate refactors from behaviour changes. If a fix
touches both the client and the server, that is usually two commits.

Commit messages follow `<type>: <summary>` where type is one of `feat`, `fix`,
`refactor`, `test`, `docs`, `chore`, `perf`, `security`. The summary is
imperative and standalone; the body explains *why*, not what the diff shows.

## Code conventions

- **TypeScript everywhere**, strict. Prefer an explicit type at a boundary over
  a cast in the middle of a function.
- **Server code** (`server/`) must not import from `src/` except shared pure
  modules such as `src/lib/pricing.ts`. Totals are always recomputed on the
  server; never trust a price sent by the client.
- **CSS** lives in `src/styles/global.css`. Use the existing tokens
  (`--paper`, `--ink`, `--accent`, `--r-outer`, `--spring`, …) instead of new
  hex values or ad-hoc pixel radii. Inner radii are `--r-inner`, i.e. the outer
  radius minus the padding.
- **Motion** uses `motion/react`, enters from `scale: 0.97` with the spring
  token, and must have a `prefers-reduced-motion` path.
- **Accessibility** is a requirement, not a follow-up: semantic landmarks,
  visible focus, labels on every control, 44px touch targets on mobile, and no
  colour-only state. Check new views with axe before submitting.
- **Security**: parameterised SQL only, validate every input at the boundary,
  never log secrets or full order tokens, and treat assistant model output as
  untrusted data.

## Adding a product

Products are plain data in `src/data/products.ts` and stock rows are seeded by
`npm run db:migrate`. Add the image to
`public/products/`, then update any tests that assert catalogue counts. Do not
add copy that invents awards, press or reviews.

## Reporting bugs

Use the issue template. Include the commit, the environment, what you expected,
what happened, and the smallest reproduction you can manage. Redact secrets,
session cookies and personal data.

Security issues go through [`SECURITY.md`](SECURITY.md), not the issue tracker.

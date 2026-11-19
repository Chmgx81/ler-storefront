# Brief: LER — stoneware storefront

Target: A simple, high-craft ecommerce web app for a fictional handmade stoneware studio (LER). Editorial home, collection page, product page, slide-over bag, demo checkout and order confirmation. React + Vite + TypeScript.

References: cook/refs/ — Fellow Products, Parachute Home, Ferm Living, Italic. Same quality in an own direction, not a recreation. Inspo brief picked portfolio-grid; measured category pull is light / grotesk display / warm. We use a warm paper palette, a serif display face against a grotesk UI face, and a split photographic hero.

Bar: composition 9/10, typography 9/10, color 9/10, product imagery 9/10, detail 8.5/10, interaction 8.5/10, mobile 8.5/10. Stills: 9/10 against the references in each dimension. Calibration offset: none yet.

Rules: real stoneware product photography from the mock.shop catalogue, used locally; no invented awards or press; all copy original; slop ban list respected (no eyebrow labels over headings, no monospace uppercase, no purple gradients, no beige-on-beige mush, no 01/02/03 counters, no decorative particles, no em dashes in UI copy). Motion subtle and reduced-motion aware. WCAG 2.2 AA intent: contrast, focus rings, keyboard paths, semantic landmarks.

Time: hard cap 3h (started 07:29, 2026-11-19). Small job; quality over breadth. No 8h floor.

Usage: session-bound; work in rounds until the cap or the bar.

Hardware: integrated GPU, headless Chromium at 1440x900 and 390x844. Screenshots only.

Deliverable: working app in the project directory plus round stills in cook/stills.

Permissions: initially local only (no push, no publish). Later released publicly as an open-source demo.

User's words: "build me a simple ecomerce web app use inspo mcp find clean ui relating ui use the cook skill aqswell use high quality ui and that"

## Scope extension (second request)
- User's words: "it needs a real user auth and accounts and a database and all that, can use 'better auth' aswell"
- Auth: Better Auth 1.7.26, email + password, sessions in SQLite (`node:sqlite`). No OAuth: no provider credentials, and no mail server for verification or reset. The UI says so plainly instead of faking emails.
- API: Hono on port 8787, Vite proxies `/api`. Order totals are recalculated server-side from the product catalogue, so the client cannot set prices.
- Privacy: order reads for signed-in users require the matching session; guest orders are reachable only by their random UUID.

## Decisions
- Brand: LER (Danish for clay), handmade stoneware, Copenhagen. Chosen because the mock.shop artisan-tableware catalogue is a cohesive set of warm studio photographs.
- Palette sampled from the product photography: paper #F2ECE1, ink #221F19, olive #4E5439, rust #8B4A2C, honey #B98A47.
- Type: Instrument Serif for display, Satoshi for UI, both self-hosted. Serif is a deliberate quiet-luxury cue, paired with a grotesk for utility.
- Scope: full buy path, search, filters, sorting, persistent bag, responsive. Checkout is a demo: no payment is taken, but orders and accounts are real and stored in a local SQLite database (Hono API, Better Auth).

# Cook ledger: LER

Started: 2026-11-19 07:29, CET
Time: cap 3h (small job) | no floor | scope extended with auth + database
Bar: composition 9 | typography 9 | color 9 | imagery 9 | detail 8.5 | motion/interaction 8.5 | mobile 8.5
Calibration offset: none
Usage: session-bound, never 100% of a window
Gate: stills approved [no] | final render [n/a]
Best so far: r04 (bar met on all seven axes, pending user approval)
Deliverable: working app + stills; no video

## Decisions

- 07:29 LER / handmade stoneware, because the available product photography is a single cohesive warm studio set.
- 07:35 Split hero instead of full-bleed photo, because Parachute and Fellow already own the full-bleed look and a split gives the serif room.
- 07:38 Plain CSS with tokens instead of Tailwind, for exact editorial control of the type and spacing rhythm.
- 07:40 Real product photography from mock.shop; no generated imagery, because generated product shots would not hold up next to the references.
- 08:52 Better Auth, because the user asked for it by name and it keeps sessions, password hashing and the schema in one maintained package.
- 08:55 SQLite through Node's built-in `node:sqlite`, because a local demo should not need Docker or a cloud database.
- 08:58 Hono on port 8787 behind a Vite proxy, because the storefront stays a Vite app and `/api` stays same-origin in both dev and preview.
- 09:02 Order totals are recalculated on the server from `src/data/products.ts`; the client only sends slugs, quantities and options. A tampered cart cannot set its own price.
- 09:06 Guest checkout is allowed and stored. Signed-in orders are readable only with the matching session; guest orders are readable only through their random UUID.
- 09:12 No OAuth, no email verification, no password reset: there are no provider keys and no mail server. The account panel states this instead of implying mail that never arrives.
- 09:20 Focus traps for the bag, search and mobile menu, plus a real skip-link target, because the overlays are visually modal and keyboard users were escaping behind them.

## Rounds

### r01 — first full pass

Built all routes, tokens, fonts, product data, bag, checkout demo.
Self-scores: composition 8.5 | typography 8.5 | color 8 | imagery 9 | detail 8 | motion 8 | mobile 8.
Known gaps: hero taller than the fold at 900px, low-contrast tertiary text in the footer, search results split into two columns that read as a directory rather than a shortlist.

### r02 — editorial tightening

Folded the hero to `min(700px, 100svh - 108px)` so the first fold is complete at 900px, and repositioned the product crop; removed decorative eyebrow labels; made search results a single ranked column; raised muted footer text to 0.6 alpha; moved `--ink-3` to `#6b6458` for AA.
Self-scores: composition 9 | typography 8.5 | color 9 | imagery 9 | detail 8.5 | motion 8.5 | mobile 8.5.

### r03 — real store, real orders

Replaced the fake checkout timer with `POST /api/orders`; order numbers, confirmation and account history now come from SQLite. Fixed the checkout header disappearing because the bag rehydrated after the reveal observer ran; the cart now hydrates synchronously from localStorage.
Verified: 22-check end-to-end flow passes, guest order reaches confirmation with a real `LER-` number, console clean.
Self-scores: composition 9 | typography 9 | color 9 | imagery 9 | detail 8.5 | motion 8.5 | mobile 8.5.

### r04 — accounts and keyboard accessibility

Added the account surface: signed-out panel, create account, dashboard with order cards, empty state, mobile stacking with the form first. Header and mobile menu carry the account entry. Checkout prefills email and name for signed-in users and links to sign-in otherwise.
Ran axe-core on 16 views (desktop, mobile, bag open, search open, dashboard): 0 violations. Added focus traps and focus return for the three overlays; skip link now focuses `<main>`.
Verified: 21-check auth flow (sign-up, prefill, order, history, sign-out, sign-in, order privacy) and 12-check keyboard suite pass; no console errors; no horizontal overflow at 390px.
Self-scores: composition 9 | typography 9 | color 9 | imagery 9 | detail 8.5 | motion 8.5 | mobile 8.5.

### r05 — production-readiness cross-check

User asked to cross-check flows/logic/auth and make the app ready for real users, then asked specifically whether guests should add to cart (yes — verified, see below).

Security and logic fixes: environment validation and secret strength; DB-backed auth rate limits with tighter sign-in/reset rules; IP-spoofing fix by not trusting forwarded headers unless configured; mail transport (Resend or local outbox) with working password reset, verification hooks and order receipts; order idempotency keys, integer-cent storage, versioned schema migration, status column, strict input validation, merge of duplicate lines; admin order ledger behind `ADMIN_EMAILS`; real newsletter storage wired to footer and checkout; confirmation pages that reload from the API by order id; account security panel (name, password, other sessions, erasure); cart hydration normalised against the catalogue; origin guard, compression, security headers, request logs, error boundary, route-level titles, lazy routes, legal pages, and a compiled server entry.

Adversarial follow-up on the security claim: confirmed sign-in limiter returns 429 on the 6th attempt and is not bypassed by a spoofed X-Forwarded-For; session cookies are HttpOnly + SameSite=Lax; cross-site writes with either Origin or Sec-Fetch-Site are rejected; injected HTML in an order name renders as text with no alert; `npm audit --omit=dev` reports 0 vulnerabilities. Found and fixed two real gaps: admin access relied on an unverified email string (now requires a verified mailbox, with a production startup guard), and production could silently fall back to a local mail outbox (now fails fast unless MAIL_MODE=file is explicit).

Verified: 13 API integration tests, 22-check buy flow, 21-check auth flow, 16-check guest flow, 15-check account security flow, 12-check keyboard suite, axe-core 0 violations on 24 views, production build and smoke test.

### r06 — real money path

User asked to get LER ready for real money. Chose Stripe hosted Checkout over embedding a card form: card data never reaches this app, and the webhook is the authoritative payment signal.

Added: `PAYMENTS_MODE=demo|stripe` with production guards; Stripe REST session creation/retrieval/refund and HMAC webhook signature verification with 5-minute tolerance; `awaiting_payment → paid → packed/shipped → refunded` lifecycle with idempotent event handling; SQLite stock table with atomic reservation at order creation, commit on payment, release on expiry/abandonment, and live availability on the product page; separate guest order access token so the UUID alone is no longer enough; payment return page that verifies the Stripe session; cancelled-payment notice; admin refund action; stripe-aware checkout/confirmation copy; webhook and stock/refund tests.

Verified: 19 integration tests (including forged-signature rejection and webhook replay), 22-check buy flow, 21-check auth flow, 16-check guest flow, 15-check account security flow, 12-check keyboard suite, axe-core 0 violations on 25 views, production build.

Still needs a real deployment decision: tax and live shipping rates, dispute handling and accounting, staff roles beyond the verified-email allowlist, and actual Stripe live keys plus webhook registration.

### r07 — navigation and collection review

User asked to cross-check the navbar (Shop all / Table / Tea & coffee / Home / Our story) and the All / Table / Tea & coffee / Serve / Home filters.

Found three inconsistencies: the desktop and mobile nav omitted the Serve collection; the home page showed only three collection cards while its copy said four; and the nav underlined "Shop all" even when a collection filter was active. Fixed: Serve added to the shared nav array (so both desktop and mobile update together), a Serve card added to the home grid, the collection grid made four/across and two/one on smaller widths, and nav active state now follows the actual `?collection=` value with `aria-current`.

Verified with a 26-check browser review: every nav link reaches the right page with the expected product count (All 16, Table 4, Tea & coffee 5, Serve 3, Home 4), every filter chip and the sort control work and persist in the URL, all four collections appear in the home cards and footer, and the mobile menu mirrors the desktop nav. No horizontal overflow or header collision from 390px to 1440px. Stills in `cook/stills/r07`.

### r08 — Homeware label, empty-looking categories, honest demo feel

User asked to rename the Home collection everywhere and why some categories looked empty. Renamed the collection to Homeware in the type, catalogue, nav (desktop and mobile), home card, shop filter, footer and search overlay; old `?collection=Home` links are still accepted as an alias.

The "empty" categories were not empty: a search query was preserved when switching collection filters, so a category with no matching search hits showed zero. Choosing a collection now clears `q`, and the empty state explains which query produced no matches with a Clear search action. Verified: All 16, Table 4, Tea & coffee 5, Serve 3, Homeware 4, and all images load.

For the demo payment step, added card-number grouping, expiry formatting, numeric CVC and a "Fill a demo card" shortcut. The "Demo only" badge and the note that nothing is charged remain visible — deliberately not made to look like a real charge.

### r09 — invisible cards after client-side navigation

User reported that category navigation showed no products until refresh. Reproduced: after a filter click, new `.pcard` nodes had `opacity: 0` because `useReveal` only re-ran on `pathname` changes; query-only navigation left the new nodes unobserved. Fixed the hook to re-scan on `pathname + search` and to watch for newly mounted `[data-reveal]` nodes with a rAF-debounced MutationObserver, and lowered the intersection margin so partially visible cards on mobile also reveal.

Verified with a reveal-specific browser suite: home nav to collection, every filter chip, sort change, search-result navigation, browser back, and the mobile menu all leave the in-view cards fully opaque without a refresh. Stills in `cook/stills/r07`.

### r10 — full signed-in user lifecycle

User asked to sign up as a real user and test the whole app. Ran a 32-check browser lifecycle on a fresh database: sign-up, header state, browsing all four collections with visible cards, search, PDP options, quick add, drawer quantity changes, signed-in checkout with prefilled details, order confirmation and history with reload, name change, password change, session revocation, sign-in with the new password, password reset via the local outbox, newsletter, mobile sign-in with no overflow, account deletion, and rejected sign-in afterwards.

All 32 checks pass with no console errors. Two initial failures were test-assertion mistakes (a fifth product below the fold is intentionally revealed on scroll; status text is uppercased by CSS), not app defects.

### r11 — OWASP pass and agentic assistant

User asked to remove the demo accounts, reset the database, cover OWASP Top 10, and add an agentic AI product using NVIDIA NIM with `meta/muse-glimmer-30b`.

Removed the demo seed script, env entry and docs; database reset to zero users and orders. Full OWASP review written to `cook/OWASP.md`, with fixes for five real findings: guest Stripe receipt links lacked the access token; a late payment after the 30-minute stock release could be captured but cancelled (now aligned `expires_at` and auto-refund); admin writes lacked rate limits; CSRF backstop accepted requests with neither Origin nor Sec-Fetch-Site; order token comparison was not constant-time. Also rotated the local secret, added audit events for forged webhooks/admin denials, and documented the proxy-IP rate-limit collapse risk.

Added the assistant: server-side NVIDIA NIM tool-calling agent with a fixed catalogue tool allowlist, prompt-injection-safe tool results, rate limiting, cost/timeout caps and a local fallback when no key is configured; floating chat UI with focus trap, Escape-to-close, product cards and explicit add-to-bag actions. Model verified from NVIDIA's catalog as `meta/muse-glimmer-30b`, OpenAI-compatible at `https://integrate.api.nvidia.com/v1/chat/completions`. No `NVIDIA_API_KEY` is present in this environment, so live inference was not executed; the tool loop was tested against a local fake NIM endpoint.

Verified: 21 integration tests (including assistant fallback, CSRF, rate limit and fake-NIM tool loop), browser chat flow, axe-core 0 violations with the assistant panel open and across 25 standard views, clean production build.

### r12 — live Muse Glimmer

User supplied an NVIDIA NIM key in a local notes file. Copied it to `.env` (mode 600, gitignored) without printing it, then probed `meta/muse-glimmer-30b` directly: it returns `reasoning_content` before `content`, so the original 15s/700-token budget cut replies off. Raised upstream timeout to 45s, `max_tokens` to 1500, set `reasoning_effort: low`, and raised Node request timeouts to 120s.

Live verification: `/api/assistant` returned `mode: "nim"` with a real answer grounded in catalogue tool results (Round-Bellied Teapot, $78, olive, 12 in stock, options) in ~55s; browser chat showed "LIVE ASSISTANT" with cards, no console errors, mobile panel fits 390px. Tests now clear the key explicitly so the local/fake-NIM cases remain deterministic; 21 tests pass and the production build is clean.

The NVIDIA model catalog shows faster agentic alternatives (e.g. `nvidia/nemotron-3.5-lightning-30b-a3b`, `nvidia/nemotron-3.5-bolt-e4b`). The assistant is model-agnostic; switching is a one-line env change if latency matters.

### r13 — animated, agentic-native assistant

User asked for a noticeable living assistant icon and for the product to feel AI-agentic-native, not just a chat widget.

The floating button now breathes, has an orbiting halo and a rotating spark badge, with a short attention burst on load that settles into an idle loop; all of it is disabled under `prefers-reduced-motion`. The product page gained two agent entry points: "Ask the studio about this piece" opens the chat with the product in context, and "Style it for me" auto-sends a task that searches the catalogue and proposes a small set of pieces. The assistant now accepts a validated `context.slug`, shows a context chip, and offers one-click individual adds plus an "Add all N pieces" action when the agent returns several proposals.

Live Muse Glimmer needed tuning: the styling task initially exceeded the round budget, so tool rounds default to 2, tool results are capped, and when the shopper asks to style/add, catalogue candidates are turned into explicit cart proposals even if the model ran out of rounds. Verified live: context chip, 3 cards, 3 actions and an add-all button with no console errors (~70s); FAB animation classes and reduced-motion handled; axe-core 0 violations on the PDP with the assistant open; mobile overflow 0. 21 tests and the production build pass.

### r14 — mobile crosscheck + design system pass

Cross-checked mobile at 360/390/430px across home, shop, PDP, checkout, account, legal, admin, confirmation and return, plus the assistant panel, cart drawer and menu overlays: no overflow, no console errors, FAB always reachable. Stills in `cook/stills/r08-mobile/`.

Applied the requested design rules where they fit this app: tokens moved to OKLCH with alpha borders; one honey accent for CTAs, active states and focus; nested radius scale (outer 20 / inner 10); tabular numerals on prices and counts; balanced headline wrapping; spring-based press and panel motion; scale-from-0.97 entrances; a shake on form errors; icon strokes matched to bold button text; `dvh` fallbacks for mobile viewport heights; `interpolate-size` on accordions; multiply blending for pale studio shots; removed invented product badges and decorative marks; simplified the header line; and enlarged the PDP hero image. No carousel, theme switch or tooltips exist here, so those rules were not invented. Final axe run: 0 violations across 25 views; mobile audit 0 failures; 21 tests and build pass.

### r15 — Vercel hosting

Followed https://vercel.com/get-started.md: installed Vercel CLI 66.2.0 (authenticated as rootmaze0x-8144), installed the Vercel plugin globally, connected Vercel MCP, created and linked project `ler`, and provisioned Turso `ler-db` through the Marketplace after the user accepted terms.

Migrated persistence from `node:sqlite` to libSQL so the same code runs on a local file and remote Turso: Kysely + `LibsqlDialect` for Better Auth, an async compatibility wrapper for app tables, transactional stock operations, and an `app_schema` version table because Turso rejects `PRAGMA user_version`. Fixed demo orders reserving stock without committing it.

Deployment shape: Vite builds `dist/`; a single `api/index.ts` Vercel Function delegates all `/api/*` to the Hono app bundled into `dist-server/api-function.js` (Vercel does not bundle local TS imports of api files). `getConnInfo` is guarded because Functions have no Node request object, and `TRUST_PROXY=true` makes rate limits use Vercel's forwarded header. Production origin is https://ler-gold.vercel.app.

Verified live: static home and deep links, `/api/health`, `/api/meta`, sign-up with a Secure session cookie, guest order persisted in Turso, multi-segment API routing, and live NIM assistant (`mode: nim`). Remote test data was cleared afterwards. 21 tests and the production build pass.

### r16 — dark-mode product blackout

User reported that in browser dark mode the product photos turned black. Reproduced with Chrome forced-colours: the UA paints the page black, and `mix-blend-mode: multiply` on pale studio shots multiplied them into the black backdrop. Fixed by declaring `<meta name="color-scheme" content="light">` and `:root { color-scheme: light }`, and by disabling multiply under `@media (prefers-color-scheme: dark)` and `@media (forced-colors: active)`. Verified: photos render normally in forced dark while multiply remains in light mode, production assets contain both signals, 21 tests pass and axe-core is 0 across 25 views.

### r17 — living mobile assistant button

User asked for a more noticeable, alive mobile chat button. Found that the mobile rule `.assistant-fab span { display: none }` was also hiding the spark badge, leaving only a quiet icon. Rebuilt the animation around a stationary button (stable tap target): an oklch radial glow, an expanding halo, a breathing icon and a rotating spark, with a stronger four-beat intro burst that settles into the calm loop after ~5s. Mobile gets a 50px target, larger icon and visible spark.

Verified: button has no transform animation itself, glow/halo/icon/spark animate, spark displays on mobile, attention class clears, tap works without forcing, no overflow, reduced-motion disables every animation, axe 0. Live at https://ler-gold.vercel.app.

### r18 — mobile chat experience and sticky filter strip

User asked for a better mobile chat experience and reported the sticky shop filter strip interrupting product scrolling. Chat upgrades: full-screen bottom sheet with a drag handle (drag down >110px dismisses), visual-viewport-aware height so the iOS keyboard doesn't cover the composer, multiline auto-growing textarea with Enter-to-send / Shift+Enter for newline, 16px mobile input to prevent iOS zoom, safe-area insets, message bubbles, product thumbnails in replies, animated typing dots, follow-up suggestion chips, and a stable stationary FAB with living glow/halo/icon/spark. Fixed a contrast issue on the user label and a stale-closure bug that prevented drag-to-dismiss.

Shop strip: made the sticky bar opaque (no translucent product bleed-through), compacted it to one horizontally scrollable row on mobile, hid the redundant count, and aligned `top` to the 64px mobile header. Verified with a scroll screenshot at 390px: no products showing through, 66px strip, no overflow, and 26-check mobile audit still passes. Chat verified live with NIM: 3 typing dots, product thumbs, 3 follow-ups, drag-to-close, axe 0, 21 tests pass.

### r19 — branded sort menu

User asked to replace the browser-native "Featured" select with a branded modal. Added `SortMenu`: a trigger using design tokens and a custom listbox with keyboard support (Arrow keys, Home/End, Enter, Escape, outside click and focus return), portal-rendered to `document.body` so the sticky bar's `backdrop-filter` cannot trap it. Desktop opens an anchored spring popover; mobile opens an opaque bottom sheet with a dimmed scrim, 48px rows and safe-area padding. The assistant FAB sits below the scrim so it no longer overlaps the sheet.

Verified: no native select, keyboard selection updates URL and order, escape/outside close, desktop and mobile axe 0, mobile sheet at the bottom, 390px no overflow. Stills in `cook/stills/r08-mobile/`.

### r20 — admin and shopper test accounts

Created one admin and four shopper accounts in both local SQLite and production Turso with generated 18–20 character passwords, so the ledger and the buy path could be exercised end to end. The admin address is allowlisted via `ADMIN_EMAILS`; `REQUIRE_EMAIL_VERIFICATION=true` was enabled to satisfy the production admin guard, and the demo users were marked verified directly in the database.

Verified locally and live: admin signs in, `/api/meta` reports `isAdmin: true` and `/api/admin/orders` returns 200; a shopper signs in with `isAdmin: false`. Production redeployed.

**Before publishing:** the credentials were removed from the repository. The live demo accounts still exist in Turso; the admin one should be rotated or deleted, and `ADMIN_EMAILS` cleared, before this is handed to anyone as a template. Note that new sign-ups need a real mail provider while verification is enabled.

## Open questions for the user

- Should accounts exist at all in a demo, or is guest-only checkout the better story?
- Is the "Local demo" disclosure in the account panel the right tone, or should it move to a footer note?
- Does the dashboard want addresses saved between orders, or is prefill from the account name enough?
- Should a guest order be claimable when that email later becomes an account?

## User feedback inbox

(empty)

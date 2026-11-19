# Changelog

Notable changes, newest first. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] — 2026-11-19

First public release of the LER storefront: a complete demo shop that is also a
reference implementation of a small, secure, agent-assisted commerce app.

### Added

- Editorial storefront: home, shop with filters/sort/search, product pages,
  story, legal pages, 404, cart drawer and search overlay.
- Accounts with Better Auth: email/password sign-up, sign-in, password reset,
  password change, session revocation and self-service account deletion.
- Guest shopping: browse, bag, checkout and receipt without an account. The bag
  persists locally; guest orders are reachable only with a random access token.
- Orders persisted in libSQL (local file or Turso), with server-side price and
  stock recomputation, per-IP limits and an immutable event log.
- Stripe hosted Checkout plus signed webhooks behind `PAYMENTS_MODE`, with stock
  reservation and release, idempotent events, receipts and refunds. Demo mode is
  the default and takes no money.
- Admin ledger at `/admin` for allowlisted, verified accounts: order status
  transitions and demo refunds.
- Agentic assistant on every page, backed by NVIDIA NIM
  (`meta/muse-glimmer-30b`) with a fixed catalogue tool set. Falls back to a
  deterministic local responder when no key is configured.
- Product-context entry points: "Ask the studio about this piece" and "Style it
  for me", the latter producing a one-click set of pieces.
- Design system in OKLCH with alpha borders, one honey accent, nested radii,
  tabular numerals, spring motion and reduced-motion variants.
- Vercel deployment: static SPA plus a single Hono function, with Turso for data.
- 21 integration tests covering auth, guest access, orders, stock, webhook
  signature verification, replay handling and rate limits.
- Accessibility and security notes in `cook/a11y/` and `cook/OWASP.md`.

### Known limitations

- No automated tax calculation, per-country shipping rates or discount codes.
- No product, stock or discount editing UI.
- Full refunds only; no partial refunds, disputes or accounting export.
- A single admin role, determined by a verified email allowlist.
- Demo photography is third-party; see [`LICENSE`](LICENSE).

[1.0.0]: https://github.com/Chmgx81/ler-storefront/releases/tag/v1.0.0

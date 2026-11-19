# Security policy

## Reporting a vulnerability

**Please do not open a public issue for a security problem.**

Use GitHub's private vulnerability reporting: go to the **Security** tab of this
repository and choose **Report a vulnerability**. That opens a private advisory
only the maintainers can see.

Please include:

- What you can do that you should not be able to do, or what data you can reach
- The steps to reproduce it, ideally with a request or a short script
- The commit or deployment you tested against, and the environment
  (local, Vercel, container)
- Any proof-of-concept output, with secrets and personal data removed

You can expect an acknowledgement within a few days. There is no paid bounty.

## Scope

In scope:

- Authentication and session handling (`server/auth.ts`, `server/config.ts`)
- Authorization, especially `/api/admin/*` and order reads
- Order, stock and payment state transitions (`server/orders.ts`,
  `server/order-status.ts`, `server/stock.ts`, `server/payment-routes.ts`)
- Stripe webhook signature verification and replay handling
- Payment return handling and guest order access tokens
- The assistant tool loop (`server/assistant.ts`): prompt injection, SSRF,
  data exfiltration, rate-limit bypass
- Injection, XSS, CSRF and request-smuggling style issues in the Hono app
- Leaks of `BETTER_AUTH_SECRET`, `STRIPE_*`, `RESEND_API_KEY`, `NVIDIA_API_KEY`
  or database credentials to the browser, logs or error responses

Out of scope:

- Demo-mode behaviour: the default configuration takes no money and deliberately
  accepts the Stripe test card. "I completed an order without paying" is
  expected when `PAYMENTS_MODE=demo`.
- Missing rate limits on read-only public endpoints.
- Findings that require a compromised host, a leaked secret, or physical access.
- Reports from automated scanners with no demonstrated impact.
- The fictional content, prices and photography.

## Supported versions

The project is a single-track demo application; fixes land on `main`. Only the
latest commit is supported.

## Hardening already in place

The design decisions and their rationale are documented in
[`cook/OWASP.md`](cook/OWASP.md), including what is deliberately *not* covered
(tax, real carrier rates, dispute handling). Read that before reporting a known
limitation.

## Deploying this yourself

If you fork this and put it in front of real customers, you are responsible for:

1. A unique `BETTER_AUTH_SECRET` per environment, held in a secret manager.
2. `PAYMENTS_MODE=stripe` with live keys and a registered webhook secret.
3. A real mail provider, plus `REQUIRE_EMAIL_VERIFICATION=true`.
4. `TRUST_PROXY=true` **and** `TRUSTED_PROXIES` only when a proxy you control
   overwrites `X-Forwarded-For`.
5. Removing any demo accounts and clearing `ADMIN_EMAILS` from the public repo.
6. Backups of the database, and a retention policy for orders and accounts.

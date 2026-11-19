# OWASP Top 10 (2021) — LER coverage

Reviewed 2026-11-19 from source. Static review plus `npm audit --omit=dev` and local browser/API tests. This is a point-in-time review, not a certification.

| Category | State | Evidence / controls |
|---|---|---|
| A01 Broken Access Control | Fixed | Admin routes require allowlisted **and verified** email (`server/orders.ts`, `server/config.ts`); admin writes now rate-limited and denials audited; order reads require session owner or UUID **+ token**; generic 404 for non-admins. |
| A02 Cryptographic Failures | Fixed | Better Auth password hashing; HMAC-SHA256 webhook verification with `timingSafeEqual`; 192-bit order tokens; `timingSafeEqual` token comparison; DB file `0600`; rotation of the local dev secret. |
| A03 Injection | Covered | All SQL uses bound parameters; inputs bounded/allowlisted; mail HTML escaped; React escapes UI; no `eval`/`child_process`. |
| A04 Insecure Design | Fixed | Stripe session `expires_at` aligned to the 30-minute stock hold; late paid events after release are automatically refunded instead of silently cancelled. |
| A05 Security Misconfiguration | Fixed | CSP, HSTS, COOP, Permissions-Policy, nosniff, X-Frame-Options; generic 500 with request id; 32 KB body limit; request timeouts. State-changing `/api/*` now requires an Origin or Sec-Fetch-Site header (webhook exempt, authenticated by signature). |
| A06 Vulnerable Components | Covered | `npm audit --omit=dev`: 0 vulnerabilities. Dependencies are current; keep `better-auth` monitored. |
| A07 Identification & Auth Failures | Covered | HttpOnly/SameSite=Lax/Secure cookies; 7-day sessions with 1-hour freshness; sign-in 5/min, reset 3/h, delete 3/h; password change revokes other sessions; deletion requires password. **Deployment note:** behind a proxy set `TRUST_PROXY=true` and `TRUSTED_PROXIES`, otherwise all users share the proxy IP and limits collapse. |
| A08 Software & Data Integrity | Covered | Webhook signature + event-id dedup + payment-intent metadata check; order idempotency keys with unique index; server-side price calculation; transactional stock reserve/commit; status-guarded `markPaid`. |
| A09 Logging & Monitoring | Improved | Request IDs, 5xx logs, 30-day-pruned `events` table, and new records for invalid webhook signatures, admin denials and late-payment refunds. Alerting is still stdout-only. |
| A10 SSRF | Covered by design | Outbound fetches go only to hardcoded Stripe/Resend/NVIDIA hosts; the NVIDIA base URL is https-only except localhost for tests; redirects disabled on assistant calls; no user-supplied URLs are fetched. The assistant has no web-browsing tool. |

## Fixes made in this pass

1. Guest Stripe receipts now carry the order access token, so the "View your order" link works after payment.
2. Stripe Checkout `expires_at` matches the 30-minute stock hold; a paid event arriving after automatic cancellation triggers a refund and an audit event.
3. Admin PATCH/refund endpoints rate-limited; admin denials and forged webhook attempts recorded.
4. Cross-site request backstop now rejects state-changing requests that carry neither Origin nor Sec-Fetch-Site.
5. Order token comparison uses `timingSafeEqual`; local dev secret rotated.

## Residual items for a real deployment

- Add alerting on `webhook_signature_invalid`, `late_payment_needs_manual_refund` and `admin_denied` events (currently logged to stdout/DB only).
- Order access tokens travel in URLs; consider a short-lived header/body token if link leakage via proxy logs is a concern.
- Subscribe to advisories for `better-auth`, `hono` and `vite`; run `npm audit` in CI.
- Keep `TRUST_PROXY` false unless a trusted proxy overwrites forwarded headers.
- If adding any feature that fetches a user-supplied URL, enforce an allowlist and block loopback/private/link-local ranges before rollout.
- The NVIDIA key was copied from a plaintext notes file into `.env` (gitignored, `0600`); restrict or delete the original notes file. Tests explicitly clear `NVIDIA_API_KEY` so local/fake-NIM cases stay deterministic.

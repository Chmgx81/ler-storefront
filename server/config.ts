/** Runtime configuration. Importing this module fails fast on a bad deployment. */
import { resolve } from 'node:path';

export const isProduction = process.env.NODE_ENV === 'production';

function integer(name: string, fallback: number, min: number, max: number) {
  const raw = process.env[name];
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`${name} must be an integer between ${min} and ${max}.`);
  }
  return value;
}

function flag(name: string, fallback = false) {
  const raw = process.env[name];
  if (raw == null) return fallback;
  return /^(1|true|yes|on)$/i.test(raw);
}

function list(name: string) {
  return (process.env[name] ?? '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

const secret = process.env.BETTER_AUTH_SECRET;
if (!secret || secret.length < (isProduction ? 32 : 16) || secret.includes('replace-with')) {
  throw new Error(
    'BETTER_AUTH_SECRET must be a random string of at least 32 characters (16 in development). Generate one with: openssl rand -base64 48',
  );
}

const publicUrl = (process.env.BETTER_AUTH_URL ?? (isProduction ? '' : 'http://localhost:5173')).replace(
  /\/$/,
  '',
);
if (!publicUrl || !/^https?:\/\//.test(publicUrl)) {
  throw new Error('BETTER_AUTH_URL must be the public https origin of the storefront.');
}
if (isProduction && publicUrl.startsWith('http://') && !publicUrl.includes('localhost')) {
  throw new Error('BETTER_AUTH_URL must use https in production.');
}

let url: URL;
try {
  url = new URL(publicUrl);
} catch {
  throw new Error('BETTER_AUTH_URL is not a valid URL.');
}

const origins = new Set<string>([url.origin]);
for (const origin of list('TRUSTED_ORIGINS')) {
  try {
    origins.add(new URL(origin).origin);
  } catch {
    throw new Error(`TRUSTED_ORIGINS contains an invalid URL: ${origin}`);
  }
}
if (isProduction && url.hostname === 'localhost') {
  for (const port of [4173, 8787]) origins.add(`http://localhost:${port}`);
}

const mailMode = (process.env.MAIL_MODE ?? 'auto').toLowerCase();
if (!['auto', 'file', 'resend'].includes(mailMode)) {
  throw new Error('MAIL_MODE must be auto, file or resend.');
}

const paymentsMode = (process.env.PAYMENTS_MODE ?? 'demo').toLowerCase();
if (!['demo', 'stripe'].includes(paymentsMode)) {
  throw new Error('PAYMENTS_MODE must be demo or stripe.');
}
const stripeKey = process.env.STRIPE_SECRET_KEY || '';
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
if (paymentsMode === 'stripe' && !stripeKey.startsWith('sk_')) {
  throw new Error('PAYMENTS_MODE=stripe needs STRIPE_SECRET_KEY (sk_test_... or sk_live_...).');
}
if (paymentsMode === 'stripe' && stripeWebhookSecret.length < 16) {
  throw new Error('PAYMENTS_MODE=stripe needs STRIPE_WEBHOOK_SECRET (whsec_...).');
}

const requireVerification = flag('REQUIRE_EMAIL_VERIFICATION');

const nvidiaKey = process.env.NVIDIA_API_KEY || '';
const nvidiaModel = process.env.NVIDIA_MODEL || 'meta/muse-glimmer-30b';
const nvidiaBase = (process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1').replace(/\/$/, '');
const localNim = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//.test(`${nvidiaBase}/`);
if (!/^https:\/\//.test(nvidiaBase) && !localNim) {
  throw new Error('NVIDIA_BASE_URL must be an https URL (http is only allowed on localhost for tests).');
}

export const config = {
  isProduction,
  port: integer('PORT', 8787, 1, 65535),
  publicUrl,
  origins: [...origins],
  isOriginTrusted(origin: string | null | undefined) {
    if (!origin) return false;
    try {
      return origins.has(new URL(origin).origin);
    } catch {
      return false;
    }
  },
  secret,
  databasePath: resolve(process.env.DATABASE_PATH ?? 'data/ler.sqlite'),
  outboxPath: resolve(process.env.MAIL_OUTBOX ?? 'data/outbox'),
  mail: {
    mode: mailMode,
    resendKey: process.env.RESEND_API_KEY || '',
    from: process.env.MAIL_FROM || 'LER Studio <hello@ler.studio>',
  },
  resendKey: process.env.RESEND_API_KEY || '',
  payments: {
    mode: paymentsMode as 'demo' | 'stripe',
    stripeKey,
    stripeWebhookSecret,
    allowDemoInProduction: flag('ALLOW_DEMO_PAYMENTS'),
  },
  /** The file outbox is always available, so a mail transport always exists. */
  mailEnabled: () => true,
  deliversRealEmail: Boolean(process.env.RESEND_API_KEY),
  requireVerification,
  trustProxy: flag('TRUST_PROXY'),
  trustedProxies: list('TRUSTED_PROXIES'),
  adminEmails: list('ADMIN_EMAILS'),
  assistant: {
    enabled: Boolean(nvidiaKey),
    key: nvidiaKey,
    model: nvidiaModel,
    baseUrl: nvidiaBase,
    maxToolRounds: integer('ASSISTANT_MAX_TOOL_ROUNDS', 2, 1, 8),
    rateLimit: {
      windowMs: integer('ASSISTANT_RATE_WINDOW_MS', 10 * 60 * 1000, 10_000, 86_400_000),
      max: integer('ASSISTANT_RATE_MAX', 20, 1, 500),
    },
  },
  isAdminEmail: (email: string | undefined) => Boolean(email && config.adminEmails.includes(email.toLowerCase())),
  orderRateLimit: {
    windowMs: integer('ORDER_RATE_WINDOW_MS', 10 * 60 * 1000, 1000, 86_400_000),
    max: integer('ORDER_RATE_MAX', 10, 1, 1000),
  },
};

if (config.isProduction && !config.deliversRealEmail && config.mail.mode !== 'file') {
  throw new Error(
    'Production needs RESEND_API_KEY for password reset and receipts. Set MAIL_MODE=file only for an explicitly local demo.',
  );
}
if (config.isProduction && config.payments.mode === 'demo' && !config.payments.allowDemoInProduction) {
  throw new Error('Production needs PAYMENTS_MODE=stripe. Set ALLOW_DEMO_PAYMENTS=true only for a non-commerce preview.');
}
if (config.isProduction && config.adminEmails.length && !config.requireVerification) {
  throw new Error(
    'ADMIN_EMAILS requires REQUIRE_EMAIL_VERIFICATION=true: admin access must not rest on an unverified email address.',
  );
}
if (process.env.VERCEL && !config.trustProxy) {
  console.warn(
    '[config] TRUST_PROXY is false on a serverless runtime; IP-based limits share one fallback key. ' +
      'Set TRUST_PROXY=true when your platform normalises X-Forwarded-For.',
  );
}

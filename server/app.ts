import { randomUUID } from 'node:crypto';
import { serveStatic } from '@hono/node-server/serve-static';
import { bodyLimit } from 'hono/body-limit';
import { compress } from 'hono/compress';
import { Hono } from 'hono';
import { registerAssistantRoutes } from './assistant';
import { auth } from './auth';
import { config } from './config';
import { registerOrderRoutes } from './orders';
import { registerPaymentRoutes } from './payment-routes';

export const app = new Hono<{ Variables: { requestId: string } }>();

const CSP = [
  "default-src 'self'",
  "img-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self'",
  "font-src 'self'",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ');

app.use('*', async (c, next) => {
  const started = Date.now();
  c.set('requestId', randomUUID());
  c.header('X-Request-Id', c.get('requestId'));
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  c.header('X-Frame-Options', 'DENY');
  c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  c.header('Cross-Origin-Opener-Policy', 'same-origin');
  c.header('Content-Security-Policy', CSP);
  if (config.isProduction && config.publicUrl.startsWith('https://')) {
    c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  await next();

  const ms = Date.now() - started;
  const status = c.res.status;
  if (status >= 500) console.error(`[req] ${c.get('requestId')} ${c.req.method} ${c.req.path} ${status} ${ms}ms`);
  else if (config.isProduction && (status >= 400 || ms > 500)) {
    console.warn(`[req] ${c.get('requestId')} ${c.req.method} ${c.req.path} ${status} ${ms}ms`);
  }
});

app.use('/api/*', compress());
app.use(
  '/api/*',
  bodyLimit({
    maxSize: 32 * 1024,
    onError: () => new Response(JSON.stringify({ error: 'That request is too large.' }), {
      status: 413,
      headers: { 'Content-Type': 'application/json' },
    }),
  }),
);

/** CSRF backstop. Better Auth performs its own stricter checks on auth routes. */
app.use('/api/*', async (c, next) => {
  if (c.req.method === 'GET' || c.req.method === 'HEAD' || c.req.method === 'OPTIONS') return next();

  // Stripe server-to-server webhooks authenticate by signature, not browser headers.
  if (c.req.path === '/api/payments/stripe/webhook') return next();

  const origin = c.req.header('origin');
  const fetchSite = c.req.header('sec-fetch-site');
  if (!origin && !fetchSite) {
    return c.json({ error: 'A same-origin request header is required.' }, 403);
  }
  if (origin && !config.isOriginTrusted(origin)) {
    return c.json({ error: 'That origin is not allowed.' }, 403);
  }
  if (fetchSite && fetchSite !== 'same-origin' && fetchSite !== 'same-site' && fetchSite !== 'none') {
    return c.json({ error: 'That request is not allowed.' }, 403);
  }
  return next();
});

app.on(['GET', 'POST'], '/api/auth/*', (c) => auth.handler(c.req.raw));
registerOrderRoutes(app);
registerPaymentRoutes(app);
registerAssistantRoutes(app);
app.all('/api/*', (c) => c.json({ error: 'Not found.' }, 404));

if (config.isProduction && !process.env.VERCEL) {
  app.use('/assets/*', async (c, next) => {
    await next();
    if (c.res.status === 200) c.header('Cache-Control', 'public, max-age=31536000, immutable');
  });
  app.use('*', async (c, next) => {
    await next();
    if (c.req.method === 'GET' && !c.req.path.startsWith('/assets/')) c.header('Cache-Control', 'no-cache');
  });
  app.use('*', serveStatic({ root: './dist' }));
  app.get('*', serveStatic({ path: './dist/index.html' }));
}

app.notFound((c) =>
  c.req.path.startsWith('/api/') ? c.json({ error: 'Not found.' }, 404) : c.text('Not found.', 404),
);

app.onError((error, c) => {
  console.error(`[error] ${c.get('requestId')} ${c.req.method} ${c.req.path}`, error);
  return c.json({ error: 'Something went wrong. Please try again.' }, 500);
});


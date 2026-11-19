/**
 * Alternative Vercel entrypoint: the Hono app as a default export.
 *
 * The deployment in `vercel.json` uses `api/index.ts` instead, because it
 * delegates to the pre-bundled server. This file exists for setups that point a
 * function at `server.ts` directly and let the platform bundle it. Both serve
 * the same app object, including the built SPA.
 */
import { app } from './server/app';

export default app;

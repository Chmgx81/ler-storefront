import 'dotenv/config';
import type { Server } from 'node:http';
import { serve } from '@hono/node-server';
import { getMigrations } from 'better-auth/db/migration';
import { app } from './app';
import { authConfig } from './auth';
import { config } from './config';
import { db, migrateAppSchema } from './db';
import { releaseStaleReservations } from './stock';

const { runMigrations } = await getMigrations(authConfig);
await runMigrations();
await migrateAppSchema();
await releaseStaleReservations();

const server = serve({ fetch: app.fetch, port: config.port }, (info) => {
  console.log(`LER API listening on http://localhost:${info.port}`);
}) as Server;

server.requestTimeout = 120_000;
server.headersTimeout = 125_000;
server.keepAliveTimeout = 5_000;

let closing = false;
function shutdown(signal: string) {
  if (closing) return;
  closing = true;
  console.log(`[shutdown] ${signal}`);
  server.close(async () => {
    await db.close();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

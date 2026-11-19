import 'dotenv/config';
import { getMigrations } from 'better-auth/db/migration';
import { authConfig } from './auth';
import { ensureOrdersTable } from './db';

const { runMigrations } = await getMigrations(authConfig);
await runMigrations();
await ensureOrdersTable();
console.log('Auth and order tables are up to date.');

import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { createClient, type Client, type Row, type Value } from '@libsql/client';
import { LibsqlDialect } from '@libsql/kysely-libsql';
import { Kysely } from 'kysely';
import { products } from '../src/data/products';
import { config } from './config';

/**
 * Local dev uses a SQLite file; Vercel uses remote Turso. Both speak libSQL,
 * so the rest of the app has one code path.
 */
const url = process.env.TURSO_DATABASE_URL || `file:${config.databasePath}`;
if (!process.env.TURSO_DATABASE_URL) {
  mkdirSync(dirname(config.databasePath), { recursive: true });
}

export const client: Client = createClient({
  url,
  ...(process.env.TURSO_AUTH_TOKEN ? { authToken: process.env.TURSO_AUTH_TOKEN } : {}),
});

/** Better Auth's Kysely adapter uses this connection. */
export const kysely = new Kysely<Record<string, never>>({
  // Pass the config rather than the client: the dialect bundles its own core types.
  dialect: new LibsqlDialect({ url, ...(process.env.TURSO_AUTH_TOKEN ? { authToken: process.env.TURSO_AUTH_TOKEN } : {}) } as never),
});

const values = (args: unknown[]): Value[] =>
  args.map((arg) => {
    if (arg === undefined || arg === null) return null;
    if (typeof arg === 'string' || typeof arg === 'number' || typeof arg === 'bigint' || typeof arg === 'boolean' || arg instanceof Uint8Array) {
      return arg as Value;
    }
    return String(arg);
  });

const object = (row: Row) => Object.fromEntries(Object.entries(row));

/** Small async compatibility layer so call sites stay close to the old sync API. */
export const db = {
  prepare(sql: string) {
    return {
      async get(...args: unknown[]) {
        const result = await client.execute({ sql, args: values(args) });
        return result.rows.length ? object(result.rows[0]) : undefined;
      },
      async all(...args: unknown[]) {
        const result = await client.execute({ sql, args: values(args) });
        return result.rows.map(object);
      },
      async run(...args: unknown[]) {
        const result = await client.execute({ sql, args: values(args) });
        return { changes: Number(result.rowsAffected) };
      },
    };
  },
  async exec(sql: string) {
    await client.executeMultiple(sql);
  },
  async close() {
    client.close();
  },
};

/**
 * BEGIN IMMEDIATE fails fast on a busy local SQLite file. Retry only the
 * acquisition, with bounded backoff, so concurrent rate-limit and stock
 * writes serialise instead of surfacing a 500. Work itself is never retried.
 */
async function beginWriteTransaction() {
  const delays = [5, 10, 20, 40, 80, 160, 320, 640];
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await client.transaction('write');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const busy =
        (error as { rawCode?: number; code?: string })?.rawCode === 5 ||
        (error as { code?: string })?.code === 'SQLITE_BUSY' ||
        message.includes('SQLITE_BUSY');
      if (!busy || attempt >= delays.length - 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, delays[attempt]));
    }
  }
}

/** Writes that must be atomic use one libSQL transaction. */
export async function withTransaction<T>(
  work: (tx: {
    execute: (sql: string, args?: unknown[]) => Promise<{ rowsAffected: number | bigint }>;
    get: (sql: string, args?: unknown[]) => Promise<Record<string, unknown> | undefined>;
    all: (sql: string, args?: unknown[]) => Promise<Record<string, unknown>[]>;
  }) => Promise<T>,
): Promise<T> {
  const tx = await beginWriteTransaction();
  try {
    const result = await work({
      execute: (sql, args = []) => tx.execute({ sql, args: values(args) }),
      get: async (sql, args = []) => {
        const row = await tx.execute({ sql, args: values(args) });
        return row.rows.length ? object(row.rows[0]) : undefined;
      },
      all: async (sql, args = []) => {
        const rows = await tx.execute({ sql, args: values(args) });
        return rows.rows.map(object);
      },
    });
    await tx.commit();
    return result;
  } catch (error) {
    await tx.rollback();
    throw error;
  }
}

const ORDER_COLUMNS = `
  id TEXT PRIMARY KEY,
  public_id TEXT NOT NULL UNIQUE,
  number TEXT NOT NULL UNIQUE,
  user_id TEXT REFERENCES user(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  country TEXT NOT NULL,
  shipping TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed',
  subtotal_cents INTEGER NOT NULL,
  shipping_cents INTEGER NOT NULL,
  total_cents INTEGER NOT NULL,
  items TEXT NOT NULL,
  idempotency_key TEXT,
  access_token TEXT,
  payment_intent_id TEXT,
  created_at INTEGER NOT NULL
`;

const ORDER_INDEXES = [
  'CREATE INDEX IF NOT EXISTS orders_user_idx ON orders (user_id, created_at DESC)',
  'CREATE UNIQUE INDEX IF NOT EXISTS orders_idempotency_idx ON orders (idempotency_key) WHERE idempotency_key IS NOT NULL',
  'CREATE INDEX IF NOT EXISTS orders_created_idx ON orders (created_at DESC)',
];

const APP_SCHEMA_VERSION = 4;

async function appSchemaVersion() {
  const row = (await db.prepare('SELECT version FROM app_schema LIMIT 1').get()) as
    | { version: number }
    | undefined;
  return Number(row?.version ?? 0);
}

/** Owns the app-owned tables. Better Auth owns its own tables and runs first. */
export async function migrateAppSchema() {
  await db.exec(`CREATE TABLE IF NOT EXISTS app_schema (version INTEGER NOT NULL)`);
  await db.exec(`INSERT INTO app_schema (version) SELECT 0 WHERE NOT EXISTS (SELECT 1 FROM app_schema)`);
  if ((await appSchemaVersion()) >= APP_SCHEMA_VERSION) return;

  await withTransaction(async (tx) => {
    await tx.execute(`CREATE TABLE IF NOT EXISTS orders (${ORDER_COLUMNS})`);
    await tx.execute('UPDATE orders SET access_token = lower(hex(randomblob(24))) WHERE access_token IS NULL');
    for (const statement of ORDER_INDEXES) await tx.execute(statement);
    await tx.execute(`CREATE TABLE IF NOT EXISTS subscribers (
        email TEXT PRIMARY KEY,
        source TEXT NOT NULL,
        created_at INTEGER NOT NULL
      )`);
    await tx.execute(`CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        email TEXT,
        detail TEXT,
        created_at INTEGER NOT NULL
      )`);
    await tx.execute('CREATE INDEX IF NOT EXISTS events_created_idx ON events (created_at DESC)');
    await tx.execute(`CREATE TABLE IF NOT EXISTS payment_events (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        order_id TEXT,
        created_at INTEGER NOT NULL
      )`);
    await tx.execute(`CREATE TABLE IF NOT EXISTS rateLimit (
        id TEXT PRIMARY KEY,
        key TEXT NOT NULL UNIQUE,
        count INTEGER NOT NULL,
        lastRequest INTEGER NOT NULL
      )`);
    await tx.execute(`CREATE TABLE IF NOT EXISTS stock (slug TEXT PRIMARY KEY, available INTEGER NOT NULL, reserved INTEGER NOT NULL DEFAULT 0)`);
    for (const [index, product] of products.entries()) {
      await tx.execute('INSERT OR IGNORE INTO stock (slug, available, reserved) VALUES (?, ?, 0)', [
        product.slug,
        12 + (index % 3) * 4,
      ]);
    }
    await tx.execute(`UPDATE app_schema SET version = ${APP_SCHEMA_VERSION}`);
  });
}

/** Backwards-compatible name used by the migration script. */
export const ensureOrdersTable = migrateAppSchema;

export async function recordEvent(type: string, detail = '', email = '') {
  try {
    await db
      .prepare('INSERT INTO events (id, type, email, detail, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(randomUUID(), type, email, detail, Date.now());
    await db.prepare('DELETE FROM events WHERE created_at < ?').run(Date.now() - 30 * 24 * 60 * 60 * 1000);
  } catch (error) {
    console.warn('[db] could not record event', type, error);
  }
}

import pg from 'pg';
import { getTableColumns } from 'drizzle-orm';
import { users, scans, leads } from '../shared/schema';
import type { User, InsertUser, Scan, InsertScan, Lead, InsertLead } from '../shared/schema';
import type { IStorage } from './storage';

export const pool = process.env.DATABASE_URL
  ? new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 3, idleTimeoutMillis: 10000, connectionTimeoutMillis: 10000 })
  : undefined;
pool?.on('error', () => console.error('[database] idle connection error'));

// Dedicated tables avoid collisions with other applications in the same database.
const tables = { users: 'iv_competitor_users', scans: 'iv_competitor_scans', leads: 'iv_competitor_leads' } as const;
type Table = keyof typeof tables;
const schemas = { users, scans, leads };
let initialized: Promise<void> | undefined;
export function initializeDatabase(): Promise<void> {
  if (!pool) return Promise.reject(new Error('DATABASE_URL is required.'));
  if (!initialized) {
    initialized = (async () => {
      for (const name of Object.values(tables)) {
        await pool!.query(`CREATE TABLE IF NOT EXISTS ${name} (id SERIAL PRIMARY KEY, data JSONB NOT NULL)`);
      }
      await pool!.query("CREATE UNIQUE INDEX IF NOT EXISTS iv_competitor_username ON iv_competitor_users ((data->>'username'))");
    })();
    initialized.catch(() => { initialized = undefined; });
  }
  return initialized;
}
function record<T>(table: Table, row: { id: number; data: Record<string, unknown> }): T {
  const defaults = Object.fromEntries(Object.keys(getTableColumns(schemas[table])).map(key => [key, null]));
  return { ...defaults, ...row.data, id: row.id } as T;
}
async function insert<T>(table: Table, data: object): Promise<T> {
  await initializeDatabase();
  const result = await pool!.query(`INSERT INTO ${tables[table]} (data) VALUES ($1::jsonb) RETURNING id, data`, [JSON.stringify(data)]);
  return record<T>(table, result.rows[0]);
}
async function list<T>(table: Table): Promise<T[]> {
  await initializeDatabase();
  const result = await pool!.query(`SELECT id, data FROM ${tables[table]} ORDER BY id DESC`);
  return result.rows.map(row => record<T>(table, row));
}
export class PostgresStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    await initializeDatabase();
    const r = await pool!.query('SELECT id, data FROM iv_competitor_users WHERE id=$1', [id]);
    return r.rows[0] ? record<User>('users', r.rows[0]) : undefined;
  }
  async getUserByUsername(username: string): Promise<User | undefined> {
    await initializeDatabase();
    const r = await pool!.query("SELECT id, data FROM iv_competitor_users WHERE data->>'username'=$1", [username]);
    return r.rows[0] ? record<User>('users', r.rows[0]) : undefined;
  }
  createUser(user: InsertUser) { return insert<User>('users', user); }
  async logScan(scan: InsertScan): Promise<number | null> {
    try { return (await insert<Scan>('scans', scan)).id; }
    catch { console.error('[scan-log] database write failed'); return null; }
  }
  listScans() { return list<Scan>('scans'); }
  addLead(lead: InsertLead) { return insert<Lead>('leads', lead); }
  listLeads() { return list<Lead>('leads'); }
  async markLeadSynced(id: number, ref: string): Promise<void> {
    await initializeDatabase();
    await pool!.query('UPDATE iv_competitor_leads SET data=data || $1::jsonb WHERE id=$2', [JSON.stringify({ crmStatus: 'synced', crmRef: ref }), id]);
  }
  async updateLeadModel(id: number, token: string, patch: { targetScore: number | null; dealVolume: number | null; dealSize: number | null; modeledDelta: number | null }): Promise<boolean> {
    if (!token) return false;
    await initializeDatabase();
    const result = await pool!.query("UPDATE iv_competitor_leads SET data=data || $1::jsonb WHERE id=$2 AND data->>'leadToken'=$3", [JSON.stringify(patch), id, token]);
    return (result.rowCount ?? 0) > 0;
  }
}

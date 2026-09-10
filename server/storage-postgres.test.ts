import 'dotenv/config';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { PostgresStorage, pool } from './storage-postgres';

test('hosted scans, leads, model authorization and sessions survive new storage instances', { skip: !process.env.DATABASE_URL }, async () => {
  const first = new PostgresStorage();
  const second = new PostgresStorage();
  const token = randomUUID();
  let scanId: number | null = null;
  let leadId: number | undefined;
  const Store = connectPgSimple(session);
  const a = new Store({ pool, tableName: 'iv_competitor_sessions', createTableIfMissing: true });
  const b = new Store({ pool, tableName: 'iv_competitor_sessions', createTableIfMissing: true });
  const sid = `verification-${token}`;
  try {
    scanId = await first.logScan({ scannedAt: new Date().toISOString(), domain: 'example.com', urlEntered: 'https://example.com', status: 'verification' });
    assert.ok(scanId);
    assert.ok((await second.listScans()).some(row => row.id === scanId));
    const lead = await first.addLead({ createdAt: new Date().toISOString(), fullName: 'Deployment verification', email: 'verification@example.com', company: 'Test fixture', scanId, crmStatus: 'pending', leadToken: token });
    leadId = lead.id;
    const patch = { targetScore: 9, dealVolume: 12, dealSize: 5000, modeledDelta: 1000 };
    assert.equal(await second.updateLeadModel(leadId, 'wrong-token', patch), false);
    assert.equal(await second.updateLeadModel(leadId, token, patch), true);
    await first.markLeadSynced(leadId, 'verification');
    const saved = (await second.listLeads()).find(row => row.id === leadId)!;
    assert.equal(saved.targetScore, 9);
    assert.equal(saved.crmStatus, 'synced');
    assert.equal(saved.phone, null);
    const value = { cookie: { expires: new Date(Date.now() + 60000), maxAge: 60000, originalMaxAge: 60000, httpOnly: true, path: '/' }, admin: true } as session.SessionData;
    await new Promise<void>((resolve, reject) => a.set(sid, value, error => error ? reject(error) : resolve()));
    const restored = await new Promise<session.SessionData | null | undefined>((resolve, reject) => b.get(sid, (error, data) => error ? reject(error) : resolve(data)));
    assert.equal(restored?.admin, true);
  } finally {
    await new Promise<void>(resolve => a.destroy(sid, () => resolve()));
    if (leadId) await pool!.query('DELETE FROM iv_competitor_leads WHERE id=$1', [leadId]);
    if (scanId) await pool!.query('DELETE FROM iv_competitor_scans WHERE id=$1', [scanId]);
    a.close(); b.close();
    await pool?.end();
  }
});

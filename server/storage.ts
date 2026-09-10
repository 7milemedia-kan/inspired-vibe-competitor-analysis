import type { IStorage } from './storage-sqlite';
export type { IStorage } from './storage-sqlite';

let backend: Promise<IStorage> | undefined;
export function getStorage(): Promise<IStorage> {
  if (!backend) {
    backend = (async () => {
      if (process.env.DATABASE_URL) {
        const { PostgresStorage } = await import('./storage-postgres');
        return new PostgresStorage();
      }
      if (process.env.VERCEL) throw new Error('DATABASE_URL is required on Vercel.');
      return (await import('./storage-sqlite')).storage;
    })();
    backend.catch(() => { backend = undefined; });
  }
  return backend;
}

// Preserve the existing route API while loading only the selected driver.
export const storage: IStorage = {
  getUser: async (...args) => (await getStorage()).getUser(...args),
  getUserByUsername: async (...args) => (await getStorage()).getUserByUsername(...args),
  createUser: async (...args) => (await getStorage()).createUser(...args),
  logScan: async (...args) => (await getStorage()).logScan(...args),
  listScans: async () => (await getStorage()).listScans(),
  addLead: async (...args) => (await getStorage()).addLead(...args),
  listLeads: async () => (await getStorage()).listLeads(),
  markLeadSynced: async (...args) => (await getStorage()).markLeadSynced(...args),
  updateLeadModel: async (...args) => (await getStorage()).updateLeadModel(...args),
};

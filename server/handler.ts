import type { Request, Response } from 'express';
import { createApp } from './app';

let initialized: ReturnType<typeof createApp> | undefined;
export default async function handler(req: Request, res: Response) {
  if (!initialized) {
    initialized = createApp();
    initialized.catch(() => { initialized = undefined; });
  }
  const { app } = await initialized;
  return app(req, res);
}


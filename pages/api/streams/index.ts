import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const body = typeof req.body === 'object' ? req.body : String(req.body || '');
  res.status(200).json({ ok: true, here: '/api/streams', method: req.method, got: body });
}

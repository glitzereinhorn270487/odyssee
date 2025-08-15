import type { NextApiRequest, NextApiResponse } from 'next';

export const config = { api: { bodyParser: false } }; // Rohdaten okay

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  let raw = '';
  try {
    raw = await new Promise<string>((resolve) => {
      let data = '';
      req.on('data', (c) => (data += c));
      req.on('end', () => resolve(data));
      req.on('error', () => resolve(''));
    });
  } catch {}
  res.status(200).json({ ok: true, endpoint: 'quicknode', method: req.method, got: raw.slice(0, 2000), via: 'pages/api' });
}

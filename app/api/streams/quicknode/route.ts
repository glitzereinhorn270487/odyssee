import { checkRisk } from '../../../lib/bot/risk/goplus';
import { scoreX } from '../../../lib/bot/scorex/engine';
import { log } from '../../../lib/bot/logger';

export const runtime = 'edge';

export async function POST(req: Request) {
  const secret = process.env.QUICKNODE_STREAM_SECRET;
  const sig = req.headers.get('x-quicknode-signature') || req.headers.get('x-signature');

 if (secret && sig !== secret) {
    return new Response('Unauthorized', { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch { return new Response('Bad JSON', { status: 400 }); }

  // TODO: extract mint/address from event payload if available
  const risk = await checkRisk('N/A');
  const sx = scoreX(body, risk);

  log('STREAM_EVD', { score: sx.score, reasons: sx.reasons, sample: body?.id || null });

  return new Response(JSON.stringify({ ok: true, scoreX: sx.score }), {
    headers: { 'content-type': 'application/json' },
    status: 200,
  });
}

import { NextResponse } from 'next/server';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function tokenOk(req: Request) {
  const want = process.env.QN_STREAMS_TOKEN || process.env.QN_PUMPFUN_TOKEN || '';
  if (!want) return true; // dev: kein Token gesetzt -> durchlassen
  const h = req.headers;
  const auth = h.get('authorization') || '';
  const bearer = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7) : '';
  const xqn = h.get('x-qn-token') || h.get('x-quicknode-token') || '';
  const url = new URL(req.url);
  const q = url.searchParams.get('token') || '';
  const got = bearer || xqn || q;
  return got === want;
}

async function maybeTick(payload: any) {
  // Optional: Paper-Engine anstupsen, wenn vorhanden
  try {
    const mod = await import('@/lib/paper/engine');
    const fn = (mod as any)?.onTick;
    if (!fn) return;
    // primitive Ableitung: falls priceUsd fehlt, lass Engine selbst entscheiden/ignorieren
    const tick = {
      mint: payload?.mint || payload?.tokenMint || payload?.symbol || 'UNKNOWN',
      symbol: payload?.symbol || payload?.mint || 'UNK',
      priceUsd: Number(payload?.priceUsd || payload?.usd || 0) || undefined,
      volumeUsd1m: Number(payload?.vol1m || payload?.volumeUsd1m || 0) || 0,
      volumeUsd5m: Number(payload?.vol5m || payload?.volumeUsd5m || 0) || 0,
      txBuys1m: Number(payload?.buys1m || 0) || 0,
      txSells1m: Number(payload?.sells1m || 0) || 0,
    };
    await fn(tick as any);
  } catch { /* Engine (noch) nicht vorhanden -> egal */ }
}

export async function POST(req: Request) {
  if (!tokenOk(req)) {
    return new NextResponse(JSON.stringify({ ok:false, reason:'BAD_TOKEN' }), { status: 401, headers:{'content-type':'application/json'} });
  }
  let raw = '';
  try { raw = await req.text(); } catch {}
  let payload: any = {};
  try { payload = raw ? JSON.parse(raw) : {}; } catch {}
  // Best effort: Tick weiterreichen (no-op wenn Engine fehlt)
  await maybeTick(payload);
  return NextResponse.json({ ok:true, endpoint:'quicknode' });
}

export async function GET() {
  return NextResponse.json({ ok:true, endpoint:'quicknode', ready:true });
}

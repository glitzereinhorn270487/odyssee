import { NextResponse } from 'next/server';
import { verifyQuickNode } from '@/lib/webhooks/verify';
import { parsePumpfunEvent } from '@/lib/pumpfun/map';
import { seen } from '@/lib/bot/idemPotency';
import { trackPool, firstSeenAuthoritySnapshot } from '@/lib/bot/watch';
import { recordTrade } from '@/lib/bot/rules';

export const runtime = 'nodejs';

function idOf(p:any){
  return p?.signature || p?.eventId || `${p?.slot||0}:${p?.index||0}:${p?.mint||''}`;
}

export async function POST(req: Request) {
  const v = await verifyQuickNode(req);
  if (!v.ok) return new NextResponse(JSON.stringify({ ok:false, reason: v.reason||'verify_failed' }), {
  status: 401,
  headers: { 'content-type':'application/json' }
});


  let payload:any = {};
  try { payload = v.payloadText ? JSON.parse(v.payloadText) : {}; } catch {}

  const eid = idOf(payload);
  if (eid && await seen(eid)) return new NextResponse(null, { status: 204 });

  const evt = parsePumpfunEvent(payload);

  if (evt.type === 'pf_create') {
    // frühe Sichtung → Authority-Snapshot (kein Polling, one-shot)
    await firstSeenAuthoritySnapshot(evt.mint);
  } else if (evt.type === 'pf_buy' || evt.type === 'pf_sell') {
    await recordTrade(evt.mint, evt.trader, evt.usd || 0, evt.type === 'pf_sell' ? 'sell' : 'buy');
  } else if (evt.type === 'pf_migrate') {
    // Treat as "Pool created" Signal, lässt unser Revocation/Manager greifen
    await trackPool(evt.mint);
  }

  return NextResponse.json({ ok: true, type: evt.type });
}

export async function GET() {
  const hasSecret = !!(process.env.QN_STREAMS_TOKEN || process.env.QUICKNODE_STREAMS_TOKEN || process.env.QN_PUMPFUN_TOKEN);
  return NextResponse.json({ ok: true, pumpfun: 'ready', hasSecret });
}

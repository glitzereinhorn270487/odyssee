import { NextResponse } from 'next/server';
import { verifyQuickNode } from '@/lib/webhooks/verify';
import { seen } from '@/lib/bot/idemPotency';
import { trackPool, recordRevocation, firstSeenAuthoritySnapshot } from '@/lib/bot/watch';
import { recordTrade } from '@/lib/bot/rules';
import { onTick } from '@/lib/paper/engine';

export const runtime = 'nodejs';

// ---- Mapping (vereinfachte Defaults – später an dein Stream-Schema anpassen) ----
function idOf(payload:any) {
  return payload?.signature || payload?.eventId || `${payload?.slot||0}:${payload?.index||0}:${payload?.mint||''}`;
}
type ParsedEvt =
  | { type:'pool_create'; mint:string; data:any }
  | { type:'set_authority'; mint:string; newMintAuth:any; newFreezeAuth:any; data:any }
  | { type:'trade'; side:'buy'|'sell'; mint:string; trader:string|null; usd:number; data:any }
  | { type:'price_tick'; mint?:string; symbol?:string; priceUsd:number; vol1m?:number; vol5m?:number; buys1m?:number; sells1m?:number; data:any }
  | { type:'unknown'; data:any };

function parseEvent(payload:any): ParsedEvt {
  if (payload?.event === 'pool_created' && payload?.mint) return { type:'pool_create', mint: payload.mint, data: payload };
  if (payload?.event === 'set_authority' && payload?.mint) {
    return { type:'set_authority', mint: payload.mint, newMintAuth: payload?.newMintAuthority ?? null, newFreezeAuth: payload?.newFreezeAuthority ?? null, data: payload };
  }
  if (payload?.event === 'swap' && payload?.mint) {
    const side = payload?.side === 'sell' ? 'sell' : 'buy';
    const trader = payload?.owner || payload?.trader || null;
    const usd = Number(payload?.usd || payload?.amountUsd || 0);
    return { type:'trade', side, mint: payload.mint, trader, usd, data: payload };
  }
  if (typeof payload?.priceUsd === 'number' && (payload?.symbol || payload?.mint)) {
    return { type:'price_tick', mint: payload.mint, symbol: payload.symbol, priceUsd: payload.priceUsd, vol1m: payload.vol1m, vol5m: payload.vol5m, buys1m: payload.buys1m, sells1m: payload.sells1m, data: payload };
  }
  return { type:'unknown', data: payload };
}

// ---- Handlers ----
export async function POST(req: Request) {
  // 1) HMAC prüfen (Streams Security Token)
  const v = await verifyQuickNode(req);
  if (!v.ok) return new NextResponse(JSON.stringify({ ok:false, reason: v.reason||'verify_failed' }), {
  status: 401,
  headers: { 'content-type':'application/json' }
});


  // 2) Payload parsen (wir nutzen den verifizierten Klartext)
  let payload:any = {};
  try { payload = v.payloadText ? JSON.parse(v.payloadText) : {}; } catch {}

  // 3) Idempotenz
  const evt = parseEvent(payload);
  const eid = idOf(payload);
  if (eid && await seen(eid)) return new NextResponse(null, { status: 204 });

  // 4) Routing
  if (evt.type === 'pool_create') {
    await trackPool(evt.mint);
    await firstSeenAuthoritySnapshot(evt.mint);
  } else if (evt.type === 'set_authority') {
    const revokedMint = evt.newMintAuth === null || payload?.mintAuthorityRevoked === true;
    const revokedFreeze = evt.newFreezeAuth === null || payload?.freezeAuthorityRevoked === true;
    if (revokedMint || revokedFreeze) await recordRevocation(evt.mint, revokedMint && revokedFreeze ? 'both' : (revokedMint ? 'mint' : 'freeze'));
  } else if (evt.type === 'trade') {
    await recordTrade(evt.mint, evt.trader, evt.usd, evt.side);
  } else if (evt.type === 'price_tick') {
    await onTick({
      mint: evt.mint,
      symbol: evt.symbol || evt.mint || 'UNKNOWN',
      priceUsd: evt.priceUsd,
      volumeUsd1m: evt.vol1m || 0,
      volumeUsd5m: evt.vol5m || 0,
      txBuys1m: evt.buys1m || 0,
      txSells1m: evt.sells1m || 0,
    } as any);
  }

  return NextResponse.json({ ok: true });
}

export async function GET() {
  const hasSecret = !!(process.env.QN_STREAMS_TOKEN || process.env.QUICKNODE_STREAMS_TOKEN);
  return NextResponse.json({ ok: true, verify: 'hmac', hasSecret });
}

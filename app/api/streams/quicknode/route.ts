import { NextResponse } from 'next/server';
import { gate } from '@/lib/bot/guard';
import { seen } from '@/lib/bot/idemPotency';
import { trackPool, recordRevocation, firstSeenAuthoritySnapshot } from '@/lib/bot/watch';
import { recordTrade } from '@/lib/bot/rules';
import { onTick } from '@/lib/paper/engine';

export const runtime = 'nodejs';

// ---- Mapping helpers (ANPASSEN an dein QuickNode-Setup) ----
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
  // Beispiele – bitte je nach Stream ändern:
  if (payload?.event === 'pool_created' && payload?.mint) {
    return { type:'pool_create', mint: payload.mint, data: payload };
  }
  if (payload?.event === 'set_authority' && payload?.mint) {
    return { type:'set_authority', mint: payload.mint, newMintAuth: payload?.newMintAuthority ?? null, newFreezeAuth: payload?.newFreezeAuthority ?? null, data: payload };
  }
  if (payload?.event === 'swap' && payload?.mint) {
    const side = (payload?.side === 'buy' ? 'buy' : (payload?.side === 'sell' ? 'sell' : 'buy'));
    const trader = payload?.owner || payload?.trader || null;
    const usd = Number(payload?.usd || payload?.amountUsd || 0);
    return { type:'trade', side, mint: payload.mint, trader, usd, data: payload };
  }
  if (typeof payload?.priceUsd === 'number' && (payload?.symbol || payload?.mint)) {
    return { type:'price_tick', mint: payload.mint, symbol: payload.symbol, priceUsd: payload.priceUsd, vol1m: payload.vol1m, vol5m: payload.vol5m, buys1m: payload.buys1m, sells1m: payload.sells1m, data: payload };
  }
  return { type:'unknown', data: payload };
}

// ---- Handler ----
export async function POST(req: Request) {
  const g = await gate(req);
  if (!g.allowed) return new NextResponse(null, { status: 204 });

  let payload:any = {};
  try { payload = await req.json(); } catch {}
  const evt = parseEvent(payload);
  const eid = idOf(payload);
  if (eid && await seen(eid)) return new NextResponse(null, { status: 204 }); // idempotent

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
  return NextResponse.json({ ok: true, stream: 'quicknode', rules: 'trade-tracking+revocation+ticks' });
}
import { NextResponse } from 'next/server';
import { verifyQuickNode } from '@/lib/webhooks/verify';
import { seen } from '@/lib/bot/idemPotency';
import { trackPool, recordRevocation, firstSeenAuthoritySnapshot } from '@/lib/bot/watch';
import { recordTrade } from '@/lib/bot/rules';
import { onTick } from '@/lib/paper/engine';
import { derivePriceUsdFromSwap } from '@/lib/streams/price';

export const runtime = 'nodejs';

function idOf(p:any){ return p?.signature || p?.eventId || `${p?.slot||0}:${p?.index||0}:${p?.mint||''}`; }

export async function POST(req: Request) {
  const v = await verifyQuickNode(req);
  if (!v.ok) return new NextResponse(JSON.stringify({ ok:false, reason:v.reason||'verify_failed' }), { status: 401, headers:{'content-type':'application/json'} });

  let payload:any = {};
  try { payload = v.payloadText ? JSON.parse(v.payloadText) : {}; } catch {}

  const eid = idOf(payload);
  if (eid && await seen(eid)) return new NextResponse(null, { status: 204 });

  const ev = String(payload?.event||payload?.type||'').toLowerCase();

  if (ev.includes('pool_created') && payload?.mint) {
    await trackPool(payload.mint);
    await firstSeenAuthoritySnapshot(payload.mint);
  } else if (ev.includes('set_authority') && payload?.mint) {
    const revokedMint = payload?.mintAuthorityRevoked === true || payload?.newMintAuthority === null;
    const revokedFreeze = payload?.freezeAuthorityRevoked === true || payload?.newFreezeAuthority === null;
    if (revokedMint || revokedFreeze) await recordRevocation(payload.mint, revokedMint && revokedFreeze ? 'both' : (revokedMint ? 'mint' : 'freeze'));
  } else if (ev.includes('swap') && payload?.mint) {
    // Trade-Counting
    const side = (payload?.side === 'sell') ? 'sell' : 'buy';
    const trader = payload?.owner || payload?.trader || null;
    const usd = Number(payload?.usd || payload?.amountUsd || 0);
    await recordTrade(payload.mint, trader, Number.isFinite(usd)?usd:0, side as any);

    // Price-Tick für Engine
    const px = await derivePriceUsdFromSwap(payload);
    if (typeof px === 'number' && px > 0) {
      await onTick({
        mint: payload.mint,
        symbol: payload.symbol || payload.mint,
        priceUsd: px,
        volumeUsd1m: Number(payload?.vol1m || payload?.volumeUsd1m || 0),
        volumeUsd5m: Number(payload?.vol5m || payload?.volumeUsd5m || 0),
        txBuys1m: Number(payload?.buys1m || 0),
        txSells1m: Number(payload?.sells1m || 0),
      } as any);
    }
  } else if ((typeof payload?.priceUsd === 'number') && (payload?.mint || payload?.symbol)) {
    await onTick({
      mint: payload.mint,
      symbol: payload.symbol || payload.mint,
      priceUsd: payload.priceUsd,
      volumeUsd1m: Number(payload?.vol1m || 0),
      volumeUsd5m: Number(payload?.vol5m || 0),
      txBuys1m: Number(payload?.buys1m || 0),
      txSells1m: Number(payload?.sells1m || 0),
    } as any);
  }

  return NextResponse.json({ ok: true });
}

export async function GET(){ return NextResponse.json({ ok:true, raydium:'ready' }); }

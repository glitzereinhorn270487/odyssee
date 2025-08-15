import { NextResponse } from 'next/server';
import { gate } from '@/lib/bot/guard';
import { seen } from '@/lib/bot/idemPotency'; // Note: filename lower/upper
import { trackPool, recordRevocation, firstSeenAuthoritySnapshot } from '@/lib/bot/watch';
import { onTick } from '@/lib/paper/engine';

export const runtime = 'nodejs';

function idOf(payload:any) {
  return payload?.signature || payload?.eventId || `${payload?.slot||0}:${payload?.index||0}:${payload?.mint||''}`;
}

// Mapper: passe an dein QuickNode-Eventformat an
function parseEvent(payload:any): { type: 'pool_create'|'set_authority'|'price_tick'|'unknown'; mint?: string; data?: any } {
  // Beispiele – bitte je nach QuickNode-Stream anpassen:
  if (payload?.event === 'pool_created' && payload?.mint) return { type: 'pool_create', mint: payload.mint, data: payload };
  if (payload?.event === 'set_authority' && payload?.mint) return { type: 'set_authority', mint: payload.mint, data: payload };
  if (typeof payload?.priceUsd === 'number' && (payload?.symbol || payload?.mint)) return { type: 'price_tick', mint: payload.mint, data: payload };
  return { type: 'unknown', data: payload };
}

export async function POST(req: Request) {
  const g = await gate(req);
  if (!g.allowed) return new NextResponse(null, { status: 204 });

  let payload:any = {};
  try { payload = await req.json(); } catch {}
  const evt = parseEvent(payload);
  const eid = idOf(payload);
  if (eid && await seen(eid)) return new NextResponse(null, { status: 204 }); // idempotent

  if (evt.type === 'pool_create' && evt.mint) {
    await trackPool(evt.mint);
    await firstSeenAuthoritySnapshot(evt.mint); // One-shot snapshot
  }
  if (evt.type === 'set_authority' && evt.mint) {
    const revokedMint = payload?.newMintAuthority === null || payload?.mintAuthorityRevoked === true;
    const revokedFreeze = payload?.newFreezeAuthority === null || payload?.freezeAuthorityRevoked === true;
    if (revokedMint || revokedFreeze) await recordRevocation(evt.mint, revokedMint && revokedFreeze ? 'both' : (revokedMint ? 'mint' : 'freeze'));
  }
  if (evt.type === 'price_tick') {
    if (typeof payload?.priceUsd === 'number') {
      await onTick({ symbol: payload.symbol || payload.mint || 'UNKNOWN', priceUsd: payload.priceUsd, volumeUsd1m: payload.vol1m||0, volumeUsd5m: payload.vol5m||0, txBuys1m: payload.buys1m||0, txSells1m: payload.sells1m||0 } as any);
    }
  }
  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ ok: true, stream: 'quicknode', revocation: 'enabled', snapshot: 'on-first-seen' });
}

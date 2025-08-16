import { NextResponse } from 'next/server';
import { onTick } from '@/lib/paper/engine';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  let payload:any = {};
  try { payload = await req.json(); } catch {}
  const t = {
    mint: typeof payload.mint === 'string' ? payload.mint : undefined,
    symbol: typeof payload.symbol === 'string' ? payload.symbol : undefined,
    priceUsd: Number(payload.priceUsd ?? 0),
    volumeUsd1m: Number(payload.volumeUsd1m ?? 0),
    txBuys1m: Number(payload.txBuys1m ?? 0),
    txSells1m: Number(payload.txSells1m ?? 0),
    source: typeof payload.source === 'string' ? payload.source : 'test',
  };
  await onTick(t);
  return NextResponse.json({ ok:true });
}

export async function GET() {
  return NextResponse.json({ ok:true, route:'paper/tick' });
}

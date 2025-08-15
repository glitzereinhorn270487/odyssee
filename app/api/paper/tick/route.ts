import { NextResponse } from 'next/server';
import { onTick } from '@/lib/paper/engine';
import type { PaperTick } from '@/lib/paper/types';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const payload = await req.json().catch(() => ({}));
  const t: PaperTick = {
    mint: payload.mint, symbol: payload.symbol, name: payload.name,
    chain: 'Solana',
    priceUsd: Number(payload.priceUsd || payload.price || 0),
    mcapUsd: Number(payload.mcapUsd || 0),
    volumeUsd1m: Number(payload.volumeUsd1m || 0),
    volumeUsd5m: Number(payload.volumeUsd5m || 0),
    txBuys1m: Number(payload.txBuys1m || 0),
    txSells1m: Number(payload.txSells1m || 0),
  };
  await onTick(t);
  return NextResponse.json({ ok: true });
}

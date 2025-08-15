import { NextResponse } from 'next/server';
import { gate } from '@/lib/bot/guard';
import { onTick } from '@/lib/paper/engine';

export const runtime = 'nodejs';

// Passe das Mapping an dein QuickNode-Event an:
function mapQuickNodeToTick(payload: any) {
  // Beispiel: erwarte Felder priceUsd, vol1m, vol5m, buys1m, sells1m
  return {
    chain: 'Solana',
    symbol: payload?.symbol || payload?.pair || payload?.mint || 'UNKNOWN',
    priceUsd: Number(payload?.priceUsd ?? 0),
    volumeUsd1m: Number(payload?.vol1m ?? 0),
    volumeUsd5m: Number(payload?.vol5m ?? 0),
    txBuys1m: Number(payload?.buys1m ?? 0),
    txSells1m: Number(payload?.sells1m ?? 0),
  };
}

export async function POST(req: Request) {
  const g = await gate(req);
  if (!g.allowed) return new NextResponse(null, { status: 204 });
  let payload: any = {};
  try { payload = await req.json(); } catch {}
  const tick = mapQuickNodeToTick(payload);
  if (tick.priceUsd) await onTick(tick as any);
  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ ok: true, stream: 'quicknode' });
}
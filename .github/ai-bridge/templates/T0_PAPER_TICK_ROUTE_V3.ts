// T0_PAPER_TICK_ROUTE_V3.ts
import { NextResponse } from 'next/server';
import onTickDefault, * as Engine from '@/lib/paper/engine';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Incoming = {
  mint?: string; symbol?: string; priceUsd?: number;
  volumeUsd1m?: number; volumeUsd5m?: number;
  txBuys1m?: number; txSells1m?: number; source?: string;
};

function getOnTick(): ((t: any) => Promise<any>) | null {
  const anyEngine = Engine as any;
  if (typeof anyEngine.onTick === 'function') return anyEngine.onTick;
  if (typeof onTickDefault === 'function') return onTickDefault as any;
  return null;
}

export async function POST(req: Request) {
  let body: Incoming = {};
  try { body = await req.json(); } catch {}

  const mint = ((body.mint ?? body.symbol) ?? '').toString().trim();
  if (!mint) {
    return NextResponse.json({ ok:false, error:'MINT_REQUIRED' }, { status:400 });
  }

  const t = {
    mint,
    symbol: body.symbol ?? undefined,
    priceUsd: typeof body.priceUsd === 'number' ? body.priceUsd : undefined,
    volumeUsd1m: Number(body.volumeUsd1m ?? 0) || 0,
    volumeUsd5m: Number(body.volumeUsd5m ?? 0) || 0,
    txBuys1m: Number(body.txBuys1m ?? 0) || 0,
    txSells1m: Number(body.txSells1m ?? 0) || 0,
    source: body.source ?? 'manual',
  };

  const onTick = getOnTick();
  if (!onTick) {
    return NextResponse.json({ ok:false, error:'ENGINE_TICK_NOT_AVAILABLE' }, { status:500 });
  }

  await onTick(t);
  return NextResponse.json({ ok:true });
}

export async function GET() {
  return NextResponse.json({ ok:true, hint:'POST JSON to trigger paper tick' });
}

// ensure module in isolatedModules
export {};

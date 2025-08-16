// T0_PAPER_TICK_ROUTE_V2.ts
import { NextResponse } from 'next/server';
import * as Engine from '@/lib/paper/engine';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Incoming = {
  mint?: string;
  symbol?: string;
  priceUsd?: number;
  volumeUsd1m?: number;
  volumeUsd5m?: number;
  txBuys1m?: number;
  txSells1m?: number;
  source?: string;
};

export async function POST(req: Request) {
  let body: Incoming = {};
  try { body = await req.json(); } catch {}

  // Mindestanforderung: wir brauchen eine ID -> mint oder symbol
  const mint = ((body.mint ?? body.symbol) ?? '').toString().trim();
  if (!mint) {
    return NextResponse.json({ ok: false, error: 'MINT_REQUIRED' }, { status: 400 });
  }

  const t = {
    mint,
    symbol: body.symbol ?? undefined,
    priceUsd: typeof body.priceUsd === 'number' ? body.priceUsd : undefined,
    volumeUsd1m: Number(body.volumeUsd1m ?? 0) || 0,
    volumeUsd5m: Number(body.volumeUsd5m ?? 0) || 0,
    txBuys1m: Number(body.txBuys1m ?? 0) || 0,
    txSells1m: Number(body.txSells1m ?? 0) || 0,
    source: body.source ?? 'manual'
  };

  // onTick kann default export oder named sein – beide Varianten unterstützen
  const onTick = (Engine as any).onTick || (Engine as any).default;
  if (typeof onTick !== 'function') {
    return NextResponse.json({ ok: false, error: 'ENGINE_TICK_NOT_AVAILABLE' }, { status: 500 });
  }

  await onTick(t);
  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ ok: true, hint: 'POST JSON to trigger paper tick' });
}
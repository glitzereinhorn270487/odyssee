import { NextResponse } from 'next/server';
import { onTick } from '@/lib/paper/engine';

export const runtime = 'nodejs';

export async function POST(req: Request){
  const body = await req.json().catch(()=> ({}));
  const t = {
    mint: body.mint || 'TEST',
    symbol: body.symbol || 'TEST',
    priceUsd: Number(body.priceUsd || 0.001),
    volumeUsd1m: Number(body.volumeUsd1m || 1000),
    volumeUsd5m: Number(body.volumeUsd5m || 400),
    txBuys1m: Number(body.txBuys1m || 12),
    txSells1m: Number(body.txSells1m || 4),
  };
  await onTick(t as any);
  return NextResponse.json({ ok:true, fed:t });
}

export async function GET(){ return NextResponse.json({ ok:true, how:'POST JSON { mint, symbol, priceUsd, ... }' }); }
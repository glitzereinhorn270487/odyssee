// T0_STREAMS_TEST_POST.ts
import { NextResponse } from 'next/server';
export const runtime = 'nodejs';

export async function POST(req: Request) {
  let body:any = {};
  try { body = await req.json(); } catch {}
  const payload = {
    mint: body.mint || body.tokenMint || 'TestMint1111111111111111111111111111111',
    symbol: body.symbol || 'TEST',
    priceUsd: typeof body.priceUsd === 'number' ? body.priceUsd : 0.001,
    volumeUsd1m: typeof body.volumeUsd1m === 'number' ? body.volumeUsd1m : 100,
    volumeUsd5m: typeof body.volumeUsd5m === 'number' ? body.volumeUsd5m : 300,
    txBuys1m: typeof body.txBuys1m === 'number' ? body.txBuys1m : 5,
    txSells1m: typeof body.txSells1m === 'number' ? body.txSells1m : 2,
    source: body.source || 'local-test'
  };

  try {
    const mod:any = await import('@/lib/paper/engine');
    const wh = mod.onWebhook || mod.handleWebhook || mod.webhook;
    if (typeof wh === 'function') await wh({ source: 'test', path: 'manual', payload });
    const tick = mod.onTick || mod.tick || mod.default;
    if (typeof tick === 'function') await tick(payload);
  } catch (e:any) {
    return NextResponse.json({ ok:false, error:String(e) }, { status: 500 });
  }
  return NextResponse.json({ ok:true, payload });
}

export async function GET() {
  return NextResponse.json({ ok:true, hint:'POST JSON to simulate an event' });
}
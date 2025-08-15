import { NextResponse } from 'next/server';
import { getOpenPositions, closePosition } from '../../lib/store/positions';
import { kvGet, kvSet } from '../../lib/store/volatile';

export const runtime = 'nodejs';
const KEY_LAST = 'manager:lastRun';

function shouldClose(pnlUSD: number) {
  const takeProfit = 200;   // +$200 oder mehr -> zu
  const stopLoss  = -100;   // -$100 oder weniger -> zu
  return pnlUSD >= takeProfit || pnlUSD <= stopLoss;
}

async function runManagerOnce() {
  const open = await getOpenPositions();
  const toClose = open.filter(p => shouldClose(p.pnlUSD)).slice(0, 5); // max 5 pro Lauf
  const closed: string[] = [];
  for (const p of toClose) {
    const ok = await closePosition(p.id);
    if (ok) closed.push(p.id);
  }
  await kvSet(KEY_LAST, new Date().toISOString());
  return { closed, remaining: (await getOpenPositions()).length };
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  if (url.searchParams.get('run') === '1') {
    const res = await runManagerOnce();
    return NextResponse.json({ ok: true, mode: 'manual', ...res });
  }
  const last = await kvGet<string>(KEY_LAST);
  const openCount = (await getOpenPositions()).length;
  return NextResponse.json({ ok: true, lastRunAt: last ?? null, open: openCount });
}

export async function POST() {
  const res = await runManagerOnce();
  return NextResponse.json({ ok: true, mode: 'cron', ...res });
}

import { NextResponse } from 'next/server';
import { getOpenPositions, getClosedPositions } from '@/lib/store/positions';
export const runtime = 'nodejs';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const window = url.searchParams.get('window') || '24h';
  const now = Date.now();
  const horizon = window === '24h' ? now - 24*60*60*1000 : now - 60*60*1000;

  const open = await getOpenPositions();
  const closed = await getClosedPositions();

  const pnlOpen = open.reduce((s,p:any)=> s + (p.pnlUSD||0), 0);
  const pnlClosed = closed.filter((p:any)=> (p.closedAt||0) >= horizon).reduce((s,p:any)=> s + (p.realizedUSD||0), 0);

  return NextResponse.json({ pnl_usd: pnlOpen + pnlClosed, open_count: open.length, closed_24h: closed.length });
}

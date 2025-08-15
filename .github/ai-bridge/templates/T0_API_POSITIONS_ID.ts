import { NextResponse } from 'next/server';
import { getOpenPositions } from '../../../../lib/store/positions';

export const runtime = 'nodejs';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const url = new URL(req.url);
  const timeWindow = url.searchParams.get('timeWindow') || '24h';
  const list = await getOpenPositions();
  const p = list.find(x => x.id === params.id);
  // einfache Dummy-Details + Zeitfenster
  const details = {
    id: params.id,
    timeWindow,
    holders: p?.holders ?? 0,
    tx_count: p?.txCount ?? { buy: 0, sell: 0 },
    scores: p?.scores ? {
      scorex: p.scores.scorex, risk: p.scores.risk, fomo: p.scores.fomo, pump_dump_prob: p.scores.pumpDumpProb
    } : undefined,
    links: p?.links
  };
  return NextResponse.json(details);
}

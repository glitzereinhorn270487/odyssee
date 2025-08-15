import { NextResponse } from 'next/server';
import { getOpenPositions, getClosedPositions } from '../../../lib/store/positions';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const status = url.searchParams.get('status') || 'open';
  const data = status === 'closed' ? await getClosedPositions() : await getOpenPositions();
  // Dashboard kann beides, wir geben array zurück:
  return NextResponse.json(data);
}

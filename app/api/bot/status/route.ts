import { NextResponse } from 'next/server';
import { kvGet } from '@/lib/store/volatile';

export const runtime = 'nodejs';

export async function GET() {
  const s = (await kvGet<{ status: 'OFF'|'PAPER'|'LIVE'; level: 'low'|'mid'|'high' }>('botStatus'))
    ?? { status: 'OFF', level: 'low' };
  return NextResponse.json(s);
}

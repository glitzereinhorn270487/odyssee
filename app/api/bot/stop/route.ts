import { NextResponse } from 'next/server';
import { kvSet } from '@/lib/store/volatile';

export const runtime = 'nodejs';

export async function POST() {
  await kvSet('botStatus', { status: 'OFF', level: 'low' });
  return NextResponse.json({ ok: true, status: 'OFF' });
}

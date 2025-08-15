import { NextResponse } from 'next/server';
import { kvGet } from '@/lib/store/volatile';

export const runtime = 'nodejs';
const KEY = 'bot:status';
const DEFAULT = { status: 'OFF', level: 'low' as const };

export async function GET() {
  const s = await kvGet<typeof DEFAULT>(KEY);
  return NextResponse.json(s ?? DEFAULT);
}

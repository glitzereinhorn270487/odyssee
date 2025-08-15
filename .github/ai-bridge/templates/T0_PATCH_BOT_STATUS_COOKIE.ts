import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { kvGet } from '@/lib/store/volatile';

export const runtime = 'nodejs';

export async function GET() {
  const c = cookies();
  const cookieStatus = c.get('bot_status')?.value || 'OFF';
  const cookieLevel  = c.get('bot_level')?.value || 'low';

  // Fallback auf KV, falls Cookies fehlen
  const kv = (await kvGet<any>('bot:status')) || { status: 'OFF', level: 'low' };

  const status = cookieStatus || kv.status || 'OFF';
  const level  = cookieLevel  || kv.level  || 'low';

  return NextResponse.json({ status, level, ts: Date.now() });
}

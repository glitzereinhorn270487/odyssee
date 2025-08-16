import { NextResponse } from 'next/server';
import * as KV from '@/lib/store/volatile';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    KV.set('bot.active', false);
    await KV.kvSet('bot:status', { status: 'inactive', level: 'standard' });
  } catch {}
  return NextResponse.json({ ok: true, status: 'inactive' });
}

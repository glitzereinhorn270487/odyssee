// app/api/bot/status/route.ts
import { NextResponse } from 'next/server';
import * as KV from '@/lib/store/volatile';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const active = KV.getBoolean('bot.active', true);
  const rules = KV.get('rules');
  return NextResponse.json({ ok: true, active, rules });
}

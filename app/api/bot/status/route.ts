import { NextResponse } from 'next/server';
import * as KV from '@/lib/store/volatile';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const active = KV.getBoolean('bot.active', false);
  const status = active ? 'active' : 'inactive';
  return NextResponse.json({ ok: true, status, active });
}

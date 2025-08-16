import { NextResponse } from 'next/server';
import * as KV from '@/lib/store/volatile';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  const status = 'inactive';
  try {
    if (typeof KV.kvSet === 'function') KV.kvSet('bot.active', false);
    if (typeof KV.set === 'function')   KV.set('bot.active', false);
    if (typeof KV.kvSet === 'function') KV.kvSet('bot:status', { status, level: 'standard' });
  } catch {}
  return NextResponse.json({ ok: true, status, active: false });
}

export async function GET() {
  const active =
    typeof KV.getBoolean === 'function'
      ? KV.getBoolean('bot.active', true)
      : true;
  return NextResponse.json({ ok: true, status: active ? 'active' : 'inactive', active });
}

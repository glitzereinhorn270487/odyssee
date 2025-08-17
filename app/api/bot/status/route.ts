import { NextResponse } from 'next/server';
import { getBoolean, get } from '@/lib/store/volatile';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function json(data: any, init: ResponseInit = {}) {
  const res = NextResponse.json(data, init);
  res.headers.set('Access-Control-Allow-Origin', '*');
  return res;
}

export async function GET() {
  const active = getBoolean('bot.active', true);
  const rules = get('rules', {});
  return json({ ok: true, active, status: active ? 'active' : 'inactive', rules });
}

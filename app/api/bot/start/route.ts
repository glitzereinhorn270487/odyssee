import { NextResponse } from 'next/server';
import { get, set, getBoolean } from '@/lib/store/volatile';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function json(data: any, init: ResponseInit = {}) {
  const res = NextResponse.json(data, init);
  res.headers.set('Access-Control-Allow-Origin', '*');
  res.headers.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  return res;
}

export async function OPTIONS() {
  return json({ ok: true });
}

// GET zeigt Status; zusätzlich: ?action=start erlaubt Start per GET (hilfreich zum Testen)
export async function GET(req: Request) {
  const url = new URL(req.url);
  if (url.searchParams.get('action') === 'start') {
    set('bot.active', true);
    set('bot:status', { status: 'active', level: 'standard' });
  }
  const active = getBoolean('bot.active', true);
  return json({ ok: true, status: active ? 'active' : 'inactive', active });
}

// POST startet oder stoppt
export async function POST(req: Request) {
  let body: any = {};
  try { body = await req.json(); } catch {}
  if (body?.active === false) {
    set('bot.active', false);
    set('bot:status', { status: 'inactive' });
    return json({ ok: true, status: 'inactive', active: false });
  }
  const level = String(body?.level ?? 'standard');
  set('bot.active', true);
  set('bot:status', { status: 'active', level });
  return json({ ok: true, status: 'active', active: true, level });
}

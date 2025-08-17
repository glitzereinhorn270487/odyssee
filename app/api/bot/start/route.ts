// app/api/bot/start/route.ts
import { NextResponse } from 'next/server';
import * as KV from '@/lib/store/volatile';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  let body: any = {};
  try { body = await req.json(); } catch {}
  const level = String(body?.level ?? 'standard');

  KV.set('bot.active', true);
  KV.set('bot:status', { status: 'active', level });

  return NextResponse.json({ ok: true, status: 'active', level });
}

export async function GET() {
  const active = !!KV.getBoolean('bot.active', true);
  return NextResponse.json({ ok: true, status: active ? 'active' : 'inactive', active });
}

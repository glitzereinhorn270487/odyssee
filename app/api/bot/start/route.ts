import { NextResponse } from 'next/server';
import * as KV from '@/lib/store/volatile';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Startet den Bot (POST) und liefert Status (GET Fallback, falls dein Frontend das nutzt)

export async function POST(req: Request) {
  let body: any = {};
  try { body = await req.json(); } catch {}
  const level = String(body?.level ?? 'standard');

  // Status -> active
  try {
    KV.set('bot.active', true);
    await KV.kvSet('bot:status', { status: 'active', level });
  } catch {}

  return NextResponse.json({ ok: true, status: 'active', level });
}

export async function GET() {
  // Fallback-Status-Abfrage, falls das Dashboard hier statt /api/bot/status schaut
  const active = KV.getBoolean('bot.active', false);
  const status = active ? 'active' : 'inactive';
  return NextResponse.json({ ok: true, status, active });
}

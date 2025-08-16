import { NextResponse } from 'next/server';
import * as KV from '@/lib/store/volatile';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  const status = 'inactive';
  try { KV.kvSet?.('bot.active', false); KV.set?.('bot.active', false); } catch {}
  try { KV.kvSet?.('bot:status', { status, level: 'standard' }); } catch {}
  return NextResponse.json({ ok: true, status, active: false });
}

export async function GET() {
  const active = KV.getBoolean?.('bot.active', true) ?? true;
  return NextResponse.json({ ok: true, status: active ? 'active' : 'inactive', active });
}

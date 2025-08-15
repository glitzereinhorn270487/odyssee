import { NextResponse } from 'next/server';
import { kvSet } from '@/lib/store/volatile';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({})) as any;
  const level: 'low'|'mid'|'high' = (body?.level === 'mid' || body?.level === 'high') ? body.level : 'low';
  await kvSet('botStatus', { status: 'PAPER', level });
  return NextResponse.json({ ok: true, status: 'PAPER', level });
}

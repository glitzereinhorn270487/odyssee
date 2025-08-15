import { NextResponse } from 'next/server';
import { kvSet } from '@/lib/store/volatile';
import { toggleQuickNodeStreams } from '@/lib/quicknode/client';

export const runtime = 'nodejs';
const KEY = 'bot:status';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const level = (body?.level === 'mid' || body?.level === 'high') ? body.level : 'low';
  const status = level === 'low' ? 'PAPER' : 'LIVE';
  await kvSet(KEY, { status, level });
  await toggleQuickNodeStreams(true).catch(() => {});
  return NextResponse.json({ ok: true, status, level });
}

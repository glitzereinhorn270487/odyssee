import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { kvSet } from '@/lib/store/volatile';
import { toggleQuickNodeStreams } from '@/lib/quicknode/client';
import { notifyStartStop } from '@/lib/telegram/notifier';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const body = await req.json().catch(()=> ({}));
  const level = (body?.level === 'mid' || body?.level === 'high') ? body.level : 'low';
  const status = level === 'low' ? 'PAPER' : 'LIVE';

  await kvSet('bot:status', { status, level });

  const res = NextResponse.json({ ok: true, status, level });
  const c = cookies();
  c.set('bot_status', status, { httpOnly: false, sameSite: 'lax', path: '/' });
  c.set('bot_level',  level,  { httpOnly: false, sameSite: 'lax', path: '/' });

  // Streams anschalten (Fehler dürfen Start nicht blockieren)
  await toggleQuickNodeStreams(true).catch(()=>{});
  await notifyStartStop('start', { status, level }).catch(()=>{});

  return res;
}

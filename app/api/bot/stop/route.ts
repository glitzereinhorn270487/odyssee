import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { kvSet } from '@/lib/store/volatile';
import { toggleQuickNodeStreams } from '@/lib/quicknode/client';
import { notifyStartStop } from '@/lib/telegram/notifier';

export const runtime = 'nodejs';

export async function POST() {
  await kvSet('bot:status', { status: 'OFF', level: 'low' });

  const res = NextResponse.json({ ok: true, status: 'OFF' });
  const c = cookies();
  c.set('bot_status', 'OFF', { httpOnly: false, sameSite: 'lax', path: '/' });
  c.set('bot_level',  'low',  { httpOnly: false, sameSite: 'lax', path: '/' });

  await toggleQuickNodeStreams(false).catch(()=>{});
  await notifyStartStop('stop', { status: 'OFF', level: 'low' }).catch(()=>{});

  return res;
}

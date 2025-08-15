import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const runtime = 'nodejs';

export async function POST() {
  const res = NextResponse.json({ ok: true, status: 'OFF', level: 'low' });
  const c = cookies();
  c.set('bot_status', 'OFF', { httpOnly: false, sameSite: 'lax', path: '/' });
  c.set('bot_level',  'low',  { httpOnly: false, sameSite: 'lax', path: '/' });

  try {
    const kv = await import('@/lib/store/volatile');
    if ((kv as any)?.kvSet) await (kv as any).kvSet('bot:status', { status: 'OFF', level: 'low' });
  } catch {}

  try {
    const mod = await import('@/lib/quicknode/client');
    if ((mod as any)?.toggleQuickNodeStreams) await (mod as any).toggleQuickNodeStreams(false);
  } catch {}

  try {
    const tg = await import('@/lib/telegram/notifier');
    if ((tg as any)?.notifyStartStop) await (tg as any).notifyStartStop('stop', { status: 'OFF', level: 'low' });
  } catch {}

  return res;
}

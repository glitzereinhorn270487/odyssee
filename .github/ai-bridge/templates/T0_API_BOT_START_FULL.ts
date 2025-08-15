import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  let level = 'low';
  try {
    const body = await req.json();
    if (body?.level && ['low','mid','high'].includes(body.level)) level = body.level;
  } catch {}

  const status = (level === 'low') ? 'PAPER' : 'LIVE';

  // Cookies setzen (sichtbar fürs Dashboard, unabhängig vom Lambda)
  const res = NextResponse.json({ ok: true, status, level });
  const c = cookies();
  c.set('bot_status', status, { httpOnly: false, sameSite: 'lax', path: '/' });
  c.set('bot_level',  level,  { httpOnly: false, sameSite: 'lax', path: '/' });

  // Optional: best-effort KV (falls vorhanden) – bricht nie das Starten
  try {
    const kv = await import('@/lib/store/volatile');
    if ((kv as any)?.kvSet) await (kv as any).kvSet('bot:status', { status, level });
  } catch {}

  // Optional: QuickNode Streams anschalten (wenn vorhanden)
  try {
    const mod = await import('@/lib/quicknode/client');
    if ((mod as any)?.toggleQuickNodeStreams) await (mod as any).toggleQuickNodeStreams(true);
  } catch {}

  // Optional: Telegram (wenn vorhanden)
  try {
    const tg = await import('@/lib/telegram/notifier');
    if ((tg as any)?.notifyStartStop) await (tg as any).notifyStartStop('start', { status, level });
  } catch {}

  return res;
}

import { NextResponse } from 'next/server';
import { kvSet } from '@/lib/store/volatile';
import { toggleQuickNodeStreams } from '@/lib/quicknode/client';
import { notifyStartStop } from '@/lib/telegram/notifier';

export const runtime = 'nodejs';
const KEY = 'bot:status';

export async function POST() {
  await kvSet(KEY, { status: 'OFF', level: 'low' });
  await toggleQuickNodeStreams(false).catch(()=>{});
  await notifyStartStop('stop',{ status: 'OFF', level: 'low' });
  return NextResponse.json({ ok: true, status: 'OFF' });
}

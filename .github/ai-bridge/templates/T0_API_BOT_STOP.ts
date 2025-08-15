import { NextResponse } from 'next/server';
import { kvSet } from '../../../../lib/store/volatile';
import { toggleQuickNodeStreams } from '../../../../lib/quicknode/client';

export const runtime = 'nodejs';
const KEY = 'bot:status';

export async function POST() {
  await kvSet(KEY, { status: 'OFF', level: 'low' });
  await toggleQuickNodeStreams(false).catch(() => {});
  return NextResponse.json({ ok: true, status: 'OFF' });
}

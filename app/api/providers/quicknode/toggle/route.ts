import { NextResponse } from 'next/server';
import { toggleQuickNodeStreams } from '@/lib/quicknode/client';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const url = new URL(req.url);
  const action = url.searchParams.get('action') || 'pause'; // default: Pause (sicher)
  const idsParam = url.searchParams.get('ids') || '';
  const ids = idsParam.split(',').map(s=>s.trim()).filter(Boolean);
  const enable = action === 'activate' || action === 'resume' || action === 'on';
  const res = await toggleQuickNodeStreams(enable, ids.length ? ids : undefined);
  return NextResponse.json({ action: enable ? 'activate' : 'pause', ...res });
}

export async function GET(req: Request) {
  // Convenience: GET ?action=activate|pause
  return POST(req);
}
import { NextResponse } from 'next/server';
import { getStream, listStreams } from '@/lib/quicknode/client';

export const runtime = 'nodejs';

export async function GET() {
  const ids = (process.env.QN_STREAM_IDS || '').split(',').map(s=>s.trim()).filter(Boolean);
  if (ids.length) {
    const details = await Promise.all(ids.map(id => getStream(id)));
    return NextResponse.json({ ok: true, ids, details });
  } else {
    const all = await listStreams().catch((e:any)=>({ ok:false, error: e?.message || String(e)}));
    return NextResponse.json({ ok: true, ids: [], details: all });
  }
}

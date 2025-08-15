import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(
  _req: Request,
  ctx: { params: { any?: string[] } }
) {
  const path = (ctx.params?.any ?? []).join('/');
  return NextResponse.json({ ok: true, endpoint: path || '(root)', ready: true });
}

export async function POST(
  req: Request,
  ctx: { params: { any?: string[] } }
) {
  const path = (ctx.params?.any ?? []).join('/');
  const raw = await req.text().catch(()=>'');
  // Nur Echo zum Handshake – Logik/Verify schalten wir danach zu
  return NextResponse.json({
    ok: true,
    endpoint: path || '(root)',
    receivedRaw: raw.slice(0, 2000)
  });
}

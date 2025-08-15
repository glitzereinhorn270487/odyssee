import { NextResponse } from 'next/server';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ ok: true, here: '/api/streams', ready: true });
}
export async function POST(req: Request) {
  const raw = await req.text().catch(()=> '');
  return NextResponse.json({ ok: true, here: '/api/streams', got: raw.slice(0, 2000) });
}

import { NextResponse } from 'next/server';
import { gate } from '@/lib/bot/guard';

export const runtime = 'nodejs'; // erlaubt Zugriff auf unseren Store

export async function POST(req: Request) {
  const g = await gate(req);
  if (!g.allowed) return new NextResponse(null, { status: 204 }); // leise droppen
  let payload: any = {};
  try { payload = await req.json(); } catch {}
  console.log('[quicknode]', payload?.type ?? 'evt');
  // TODO: Strategy/ScoreX etc.
  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ ok: true, ping: true });
}
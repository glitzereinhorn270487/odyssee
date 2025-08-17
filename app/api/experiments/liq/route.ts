import { NextResponse } from 'next/server';
import { liqList, liqClear } from '@/lib/experiments/liqlog';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const data = await liqList();
  return NextResponse.json({ ok: true, count: data.length, data });
}

export async function DELETE() {
  const res = await liqClear();
  return NextResponse.json(res);
}

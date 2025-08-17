// /app/api/experiments/liq/route.ts
import { NextResponse } from 'next/server';
import { liqList, liqClear } from '@/lib/experiments/liqlog';

export const runtime = 'nodejs';

export async function GET() {
  const items = liqList(100);
  return NextResponse.json({ ok: true, count: items.length, items });
}

export async function DELETE() {
  liqClear();
  return NextResponse.json({ ok: true, cleared: true });
}

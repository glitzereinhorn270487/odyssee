// /app/api/watchlist/route.ts
import { NextResponse } from 'next/server';
import { getSignals, clearSignals } from '@/lib/watchlist';

export const runtime = 'nodejs';

export async function GET() {
  const list = getSignals(50);
  return NextResponse.json({ ok: true, count: list.length, items: list });
}

export async function DELETE() {
  clearSignals();
  return NextResponse.json({ ok: true, cleared: true });
}

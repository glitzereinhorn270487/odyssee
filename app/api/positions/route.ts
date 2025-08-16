import { NextResponse } from 'next/server';
import * as Store from '@/lib/store/positions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const list = await Store.listPositions();
  return NextResponse.json(list);
}

export async function POST(req: Request) {
  const b = await req.json();
  const p = await Store.openPosition(b);
  return NextResponse.json(p);
}


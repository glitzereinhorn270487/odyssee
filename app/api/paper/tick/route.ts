// Test-Endpoint: du kannst manuell ein Signal schicken
import { NextResponse } from 'next/server';
import { onTick } from '@/lib/paper/tick';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  let payload: any = {};
  try { payload = await req.json(); } catch {}
  const res = await onTick(payload);
  return NextResponse.json(res);
}

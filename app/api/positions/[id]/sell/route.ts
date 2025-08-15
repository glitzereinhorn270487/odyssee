import { NextResponse } from 'next/server';
import { closePosition } from '@/lib/store/positions';

export const runtime = 'nodejs';

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const ok = await closePosition(params.id);
  return NextResponse.json({ ok, id: params.id, message: ok ? `Position ${params.id} geschlossen` : 'not found' });
}

import { NextResponse } from 'next/server';
import { closePosition } from '@/lib/store/positions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(_req: Request, ctx: { params: { id: string } }) {
  const id = ctx.params.id;
  const res = await closePosition(id, 'manual_sell');
  if (!res) return NextResponse.json({ ok:false, error:'not_found' }, { status:404 });
  return NextResponse.json({ ok:true, position: res });
}

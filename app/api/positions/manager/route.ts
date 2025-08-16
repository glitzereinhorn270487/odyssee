// T0_POSITIONS_MANAGER_ROUTE.ts
import { NextResponse } from 'next/server';
import { onManager } from '@/lib/paper/engine';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try { await onManager(); return NextResponse.json({ ok:true, ran:true }); }
  catch(e:any){ return NextResponse.json({ ok:false, error:String(e) }, { status:500 }); }
}

export async function POST() {
  return GET();
}
import { NextResponse } from 'next/server';
export const runtime = 'nodejs';

export async function GET() {
  // TODO: Echtwerte einspeisen
  return NextResponse.json({ pnl_usd: 42.70 });
}

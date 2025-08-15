import { NextResponse } from 'next/server';
export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json({ free_usd: 118.72 });
}

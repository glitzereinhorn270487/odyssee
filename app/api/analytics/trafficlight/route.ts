import { NextResponse } from 'next/server';
export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json({ color: 'green', winrate: 0.62, factor: 1.8 });
}

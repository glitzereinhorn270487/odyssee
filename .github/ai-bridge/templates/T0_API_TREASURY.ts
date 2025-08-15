import { NextResponse } from 'next/server';
import { getCash } from '@/lib/paper/portfolio';
export const runtime = 'nodejs';

export async function GET() {
  const free_usd = await getCash();
  return NextResponse.json({ free_usd });
}

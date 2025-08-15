import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const runtime = 'nodejs';

export async function GET() {
  const c = cookies();
  const status = c.get('bot_status')?.value || 'OFF';
  const level  = c.get('bot_level')?.value || 'low';
  return NextResponse.json({ status, level });
}
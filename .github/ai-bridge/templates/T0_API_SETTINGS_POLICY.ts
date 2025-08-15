import { NextResponse } from 'next/server';
import { getPolicy, setPolicy } from '@/lib/bot/policy';

export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json(await getPolicy());
}
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const saved = await setPolicy(body || {});
  return NextResponse.json({ ok: true, policy: saved });
}

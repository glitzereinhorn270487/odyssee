import { NextResponse } from 'next/server';
import { kvGet } from '@/lib/store/volatile';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function mb(n: number) { return Math.round((n / 1_000_000) * 100) / 100; }

export async function GET() {
  const qC = Number(await kvGet('metrics:quicknode:count')) || 0;
  const qB = Number(await kvGet('metrics:quicknode:bytes')) || 0;
  const pC = Number(await kvGet('metrics:pumpfun:count')) || 0;
  const pB = Number(await kvGet('metrics:pumpfun:bytes')) || 0;

  return NextResponse.json({
    ok: true,
    webhooks: {
      quicknode: { count: qC, bytes: qB, approxMB: mb(qB) },
      pumpfun:   { count: pC, bytes: pB, approxMB: mb(pB) },
      totalMB: mb(qB + pB)
    }
  });
}

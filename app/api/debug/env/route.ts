// T0_DEBUG_ENV.ts
import { NextResponse } from 'next/server';
export const runtime = 'nodejs';
export async function GET() {
  const mask = (s?: string) => {
    const v = (s||'').trim();
    if (!v) return '';
    return v.length<=8 ? '*'.repeat(v.length) : v.slice(0,4)+'…'+v.slice(-4);
  };
  return NextResponse.json({
    ok: true,
    env: {
      QN_STREAMS_TOKEN: mask(process.env.QN_STREAMS_TOKEN),
      QN_PUMPFUN_TOKEN: mask(process.env.QN_PUMPFUN_TOKEN),
      QN_ALLOW_UNSIGNED: process.env.QN_ALLOW_UNSIGNED || '',
      DEBUG_TOKEN: mask(process.env.DEBUG_TOKEN),
      NODE_ENV: process.env.NODE_ENV || '',
      VERCEL_ENV: process.env.VERCEL_ENV || '',
    }
  });
}
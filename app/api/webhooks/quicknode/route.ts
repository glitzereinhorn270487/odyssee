// /app/api/webhooks/quicknode/route.ts
import { NextResponse } from 'next/server';
import { liqAdd } from '@/lib/experiments/liqlog';

export const runtime = 'nodejs';

// Raydium AMM + gängige Quote-Mints
const RAYDIUM_AMM = '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8';
const QUOTES = new Set<string>([
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', // USDT
  'So11111111111111111111111111111111111111112',  // wSOL
]);

function q(req: Request, key: string) {
  try { return new URL(req.url).searchParams.get(key) || ''; } catch { return ''; }
}
function okAuth(req: Request) {
  const want = (process.env.QN_WEBHOOK_TOKEN || process.env.QNODE_WEBHOOK_TOKEN || '').trim();
  if (!want) return true;
  const got = q(req, 'token').trim();
  return !!got && got === want;
}

function pickLogs(body: any): string[] {
  const metaLogs = body?.value?.transaction?.meta?.logMessages ?? body?.value?.meta?.logMessages;
  const msgLogs  = body?.message?.logs;
  const logs     = (metaLogs || msgLogs || body?.logs || []) as any[];
  return logs.filter((l) => typeof l === 'string').slice(0, 3);
}
function pickAccountKeys(body: any): string[] {
  const k1 = body?.message?.accountKeys;
  const k2 = body?.value?.transaction?.message?.accountKeys;
  const raw = (k1 || k2 || []) as any[];
  return raw.map((k) => (typeof k === 'string' ? k : k?.pubkey)).filter(Boolean);
}
function pickSignature(body: any): string | undefined {
  return body?.value?.transaction?.signatures?.[0]
      || body?.transaction?.signatures?.[0]
      || body?.message?.signature;
}
function touchesRaydium(body: any): boolean {
  const logs = pickLogs(body);
  const keys = pickAccountKeys(body);
  return keys.includes(RAYDIUM_AMM) || logs.some((l) => l.includes(RAYDIUM_AMM));
}
function isLpBurn(body: any): boolean {
  const logs = pickLogs(body);
  const burn = logs.some((l) => /instruction:\s*burn/i.test(l));
  return burn && touchesRaydium(body);
}
function guessTargetMint(body: any): string | undefined {
  const keys = pickAccountKeys(body);
  return keys.find((k) => k && k.length >= 32 && !QUOTES.has(k) && k !== RAYDIUM_AMM);
}

// OPTIONAL: an alte Stream-Route weiterleiten, damit Papierhandel unverändert greift
async function forwardToLegacy(req: Request) {
  try {
    const legacy = await import('../../streams/quicknode/route' as any);
    if (legacy?.POST) {
      const clone = req.clone();
      // @ts-ignore
      return legacy.POST(clone);
    }
  } catch {}
  return null;
}

export async function POST(req: Request) {
  if (!okAuth(req)) {
    return NextResponse.json({ ok: false, err: 'unauthorized' }, { status: 401 });
  }

  let body: any = null;
  try { body = await req.json(); } catch {}

  // Watch-only: LP Burn erkennen und protokollieren
  if (isLpBurn(body)) {
    liqAdd({
      ts: Date.now(),
      kind: 'lp_burn',
      mint: guessTargetMint(body),
      sig: pickSignature(body),
      sampleLogs: pickLogs(body),
      note: 'LP Burn erkannt – WatchOnly (kein Trade).',
    });
  }

  // Papierhandel normal weiterlaufen lassen (falls Legacy-Handler existiert)
  const forwarded = await forwardToLegacy(req);
  if (forwarded) return forwarded;

  // Fallback: 200 antworten
  return NextResponse.json({ ok: true, forwarded: false });
}


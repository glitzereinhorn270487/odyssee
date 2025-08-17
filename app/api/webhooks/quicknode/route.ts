// /app/api/webhooks/quicknode/route.ts
import { NextResponse } from 'next/server';
import { addSignal } from '@/lib/watchlist';

export const runtime = 'nodejs';

const RAYDIUM_AMM = '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8';

function getQueryToken(req: Request): string {
  try { return new URL(req.url).searchParams.get('token') || ''; }
  catch { return ''; }
}

function okAuth(req: Request) {
  const want = (process.env.QN_WEBHOOK_TOKEN || process.env.QNODE_WEBHOOK_TOKEN || '').trim();
  if (!want) return true;                       // Kein Token hinterlegt -> akzeptieren (dev)
  const got = getQueryToken(req).trim();
  return got && got === want;
}

function pickLogs(body: any): string[] {
  // Versuche mehrere mögliche Pfade aus QuickNode/Solana-Payloads
  const fromValueMeta =
    body?.value?.transaction?.meta?.logMessages ??
    body?.value?.meta?.logMessages;

  const fromMsg = body?.message?.logs;
  const fromLogs = body?.logs;

  const logs = (fromValueMeta || fromMsg || fromLogs || []) as any[];
  return logs.filter((l) => typeof l === 'string').slice(0, 3); // kurz halten
}

function pickAccountKeys(body: any): string[] {
  const keys1 = body?.message?.accountKeys;
  const keys2 = body?.value?.transaction?.message?.accountKeys;
  const raw = (keys1 || keys2 || []) as any[];
  return raw.map((k) => (typeof k === 'string' ? k : k?.pubkey)).filter(Boolean);
}

function pickSignature(body: any): string | undefined {
  const s1 = body?.value?.transaction?.signatures?.[0];
  const s2 = body?.transaction?.signatures?.[0];
  const s3 = body?.message?.signature;
  return s1 || s2 || s3;
}

function classify(body: any) {
  const logs = pickLogs(body);
  const keys = pickAccountKeys(body);
  const touchesRaydium =
    keys.includes(RAYDIUM_AMM) || logs.some((l) => l.includes(RAYDIUM_AMM));

  const hasInit2 = logs.some((l) => l.includes('Instruction: Initialize2'));
  const setAuth = logs.some((l) => l.toLowerCase().includes('instruction: setauthority'));
  const noneAuth = logs.some((l) => /new authority:\s*none/i.test(l));
  const burnLP = logs.some((l) => /instruction:\s*burn/i.test(l));

  if (touchesRaydium && hasInit2) return 'raydium_pool_init2';
  if (setAuth && noneAuth)        return 'authority_revoked';
  if (burnLP && touchesRaydium)   return 'lp_burn';
  return 'other';
}

export async function POST(req: Request) {
  if (!okAuth(req)) return NextResponse.json({ ok: false, err: 'unauthorized' }, { status: 401 });

  let body: any = null;
  try { body = await req.json(); }
  catch { /* not fatal */ }

  const kind = classify(body);
  const sig = pickSignature(body);
  const sampleLogs = pickLogs(body);

  // Nur WATCH-ONLY: wir fügen die Erkennung in die Watchlist ein, öffnen aber keine Position.
  addSignal({
    ts: Date.now(),
    kind,
    sig,
    note: kind === 'raydium_pool_init2'
      ? 'Neue Raydium-Pool-Erstinitialisierung erkannt.'
      : kind === 'authority_revoked'
      ? 'SetAuthority -> None erkannt.'
      : kind === 'lp_burn'
      ? 'LP Burn-Hinweis (SPL Token Burn) erkannt.'
      : 'Event erkannt.',
    sampleLogs,
  });

  return NextResponse.json({ ok: true });
}

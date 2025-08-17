// app/api/webhooks/quicknode/route.ts
import { NextResponse } from 'next/server';
import * as Vol from '@/lib/store/volatile';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ---- token handling ----
function getQueryToken(req: Request): string {
  try { return new URL(req.url).searchParams.get('token') || ''; }
  catch { return ''; }
}

function getHeaderToken(req: Request): string {
  const auth = req.headers.get('authorization') || '';
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  const candidates = [
    getQueryToken(req),
    bearer,
    req.headers.get('x-qn-token') || '',
    req.headers.get('x-quicknode-token') || '',
    req.headers.get('x-security-token') || '',
    req.headers.get('x-webhook-token') || '',
    req.headers.get('x-verify-token') || '',
    req.headers.get('x-token') || '',
    req.headers.get('x-auth-token') || '',
    req.headers.get('x-api-key') || '',
    req.headers.get('quicknode-token') || '',
  ].filter(Boolean);
  return candidates[0] || '';
}

function authorize(req: Request) {
  const allowUnsigned = process.env.QN_ALLOW_UNSIGNED === '1';
  const want = (process.env.QN_WEBHOOK_TOKEN || process.env.WEBHOOK_TOKEN || '').trim();
  const got = getHeaderToken(req);
  const ok = allowUnsigned || (!!want && got === want);
  return { ok, wantLen: want.length };
}

// ---- classify helpers (best-effort; QuickNode filter sollte Grobarbeit machen) ----
function classify(raw: any) {
  const text = JSON.stringify(raw || {}).toLowerCase();

  const isRaydiumPool =
    text.includes('raydium') ||
    text.includes('amm') ||
    text.includes('create_pool') ||
    text.includes('initialize_pool') ||
    text.includes('liquidity') && text.includes('initialize');

  const isContractRevoke =
    text.includes('setauthority') && (text.includes('"newauthority":null') || text.includes('"new_authority":null')) ||
    text.includes('revoke') && text.includes('mint');

  const isLiquidityBurn =
    (text.includes('burn') && text.includes('liquidity')) ||
    text.includes('burn_lp') ||
    text.includes('burned_liquidity');

  let kind: 'raydium_pool' | 'contract_revoke' | 'lp_burn' | 'other' = 'other';
  if (isRaydiumPool) kind = 'raydium_pool';
  else if (isContractRevoke) kind = 'contract_revoke';
  else if (isLiquidityBurn) kind = 'lp_burn';

  return { kind };
}

// store last N events
function pushEvent(e: any) {
  const key = 'events:list';
  const arr = Vol.get<any[]>(key, [])!;
  arr.push(e);
  while (arr.length > 500) arr.shift();
  Vol.set(key, arr);

  // counters
  const ckey = 'events:count';
  const cnt = Vol.get<Record<string, number>>(ckey, {})!;
  const k = e.kind || 'other';
  cnt[k] = (cnt[k] || 0) + 1;
  Vol.set(ckey, cnt);
}

export async function POST(req: Request) {
  // quick visibility in logs (headers snapshot)
  console.info('[webhook][quicknode][hdr]', {
    authorization: req.headers.get('authorization') || '',
    'x-qn-token': req.headers.get('x-qn-token') || '',
    'x-quicknode-token': req.headers.get('x-quicknode-token') || '',
    'x-security-token': req.headers.get('x-security-token') || '',
    'x-webhook-token': req.headers.get('x-webhook-token') || '',
    'x-verify-token': req.headers.get('x-verify-token') || '',
    'x-token': req.headers.get('x-token') || '',
    'x-auth-token': req.headers.get('x-auth-token') || '',
    'x-api-key': req.headers.get('x-api-key') || '',
    'quicknode-token': req.headers.get('quicknode-token') || '',
  });

  const auth = authorize(req);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  let body: any = {};
  try { body = await req.json(); } catch { body = {}; }

  const cls = classify(body);
  const now = Date.now();

  const rules = Vol.get<any>('rules') || {};
  const active = Vol.getBoolean('bot.active', true);

  // watch-only logging
  pushEvent({
    t: now,
    kind: cls.kind,
    active,
    watchOnly: true,
    rulesSnapshot: {
      investUsd: rules?.investUsd,
      minInvestUsd: rules?.minInvestUsd,
      lpBurn: { ...(rules?.lpBurn || {}) },
    },
    raw: body,
  });

  // Always 200 — QuickNode erwartet schnelle Antwort
  return NextResponse.json({ ok: true, kind: cls.kind });
}

// (optional) GET zum Debuggen: letzte Events
export async function GET() {
  const list = Vol.get<any[]>('events:list', [])!;
  const counts = Vol.get<Record<string, number>>('events:count', {})!;
  return NextResponse.json({ ok: true, counts, last: list.slice(-30).reverse() });
}

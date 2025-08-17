import { NextResponse } from 'next/server';
import { onTick } from '@/lib/paper/tick';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ===== Helpers =====
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
  return (candidates[0] as string) || '';
}

function authOk(req: Request): boolean {
  const want = (process.env.QN_WEBHOOK_TOKEN as string) || '';
  const got = getHeaderToken(req);
  if (!want) return true; // keine Sperre, falls Token nicht gesetzt (Dev)
  return got === want;
}

// Tiefes, defensives Feldsuchen
function collectStrings(obj: any, out: string[] = [], depth = 0): string[] {
  if (!obj || depth > 4) return out;
  if (typeof obj === 'string') out.push(obj);
  else if (Array.isArray(obj)) obj.forEach(v => collectStrings(v, out, depth + 1));
  else if (typeof obj === 'object') {
    for (const k of Object.keys(obj)) {
      const v = (obj as any)[k];
      if (typeof v === 'string') out.push(v);
      else if (typeof v === 'object') collectStrings(v, out, depth + 1);
    }
  }
  return out;
}

function collectField(obj: any, keys: string[] = ['mint','tokenMint','baseMint','quoteMint']): string | null {
  if (!obj || typeof obj !== 'object') return null;
  for (const k of keys) {
    if (typeof (obj as any)[k] === 'string') return (obj as any)[k] as string;
  }
  for (const v of Object.values(obj)) {
    if (v && typeof v === 'object') {
      const got = collectField(v as any, keys);
      if (got) return got;
    }
  }
  return null;
}

function detectEvents(body: any): any[] {
  const texts = collectStrings(body, []);
  const textBlob = texts.join(' | ').toLowerCase();

  // Heuristik: Raydium Pool / AMM
  const isRaydiumish =
    /initialize|init[_ ]?pool|create[_ ]?pool|raydium|amm|liquidity add|add liquidity/i.test(textBlob);

  // Contract revoked / ownership renounced
  const isRevoked =
    /revoke|revoked|renounce|renounced|ownership removed|freeze_authority removed/i.test(textBlob);

  // LP burn (Watch-Only)
  const isLpBurn =
    /burn.*liquidity|liquidity.*burn|lp.*burn|burned lp|liq burned|burned liquidity/i.test(textBlob);

  const mint = collectField(body);

  const out: any[] = [];
  if (isRaydiumish) {
    out.push({
      category: 'Raydium',
      tag: 'pool_init_or_liquidity',
      source: 'webhook:quicknode',
      mint,
      raw: undefined,
    });
  }
  if (isRevoked) {
    out.push({
      category: 'Raydium',
      tag: 'contract_revoked',
      source: 'webhook:quicknode',
      mint,
      raw: undefined,
    });
  }
  if (isLpBurn) {
    out.push({
      category: 'LIQ_BURN_MOMENTUM',
      watchOnly: true,
      tag: 'lp_burn_detected',
      source: 'webhook:quicknode',
      mint,
      raw: undefined,
    });
  }
  return out;
}

// ===== Routes =====
export async function GET() {
  return NextResponse.json({ ok: true, hint: 'POST QuickNode webhooks here' });
}

export async function POST(req: Request) {
  console.info('[webhook:quicknode][hit]', {
  ua: req.headers.get('user-agent') || '',
  ct: req.headers.get('content-type') || '',
  tokenLen: (getHeaderToken(req) || '').length,
});

  if (!authOk(req)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  let body: any = {};
  try { body = await req.json(); } catch {}

  const events = detectEvents(body);
  const results: any[] = [];
  for (const ev of events) {
    try {
      const res = await onTick(ev);
      results.push({ ok: true, ev: ev.tag || ev.category, res });
    } catch (e: any) {
      results.push({ ok: false, ev: ev.tag || ev.category, error: String(e?.message || e) });
    }
  }
  console.info('[webhook:quicknode][done]', { evCount: events.length, tags: events.map(e => e.tag || e.category) });


  return NextResponse.json({
    ok: true,
    received: true,
    evCount: events.length,
    results,
  });
}

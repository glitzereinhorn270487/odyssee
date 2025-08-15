// T0_STREAMS_CATCHALL_V4.ts
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = { params: { any?: string[] } };

// Welcher Token wird für welches Endpoint-Segment erwartet?
function expectedFor(endpoint: string) {
  const e = endpoint.toLowerCase();
  if (e === 'pumpfun') return process.env.QN_PUMPFUN_TOKEN || process.env.QN_STREAMS_TOKEN || '';
  if (e === 'quicknode') return process.env.QN_STREAMS_TOKEN || process.env.QN_PUMPFUN_TOKEN || '';
  return process.env.QN_STREAMS_TOKEN || process.env.QN_PUMPFUN_TOKEN || '';
}

function mask(s: string | null) {
  if (!s) return '';
  const str = String(s);
  if (str.length <= 8) return '*'.repeat(str.length);
  return str.slice(0,4) + '…' + str.slice(-4);
}

function maskBearer(v: string | null) {
  if (!v) return '';
  const m = v.match(/^\s*(Bearer)\s+(.+)$/i);
  return m ? `${m[1]} ${mask(m[2])}` : mask(v);
}

// Kandidaten aus allen üblichen Header-/Query-Quellen einsammeln
function extractCandidates(req: Request): string[] {
  const url = new URL(req.url);
  const h = req.headers;

  const auth = h.get('authorization') || '';
  let bearer = '';
  const m = auth.match(/^\s*Bearer\s+(.+)$/i);
  if (m) bearer = m[1].trim();

  const candidates = [
    bearer,
    h.get('x-qn-token') || '',
    h.get('x-quicknode-token') || '',
    h.get('x-security-token') || '',
    h.get('x-webhook-token') || '',
    h.get('x-verify-token') || '',
    h.get('x-token') || '',
    h.get('x-auth-token') || '',
    h.get('x-api-key') || '',
    h.get('quicknode-token') || '',
    new URL(req.url).searchParams.get('token') || '',
  ].filter(Boolean);

  return candidates;
}

function tokenOk(req: Request, endpoint: string) {
  const want = expectedFor(endpoint);
  if (!want) return true; // kein Secret hinterlegt -> alles durchlassen (Dev)
  const cands = extractCandidates(req);
  return cands.includes(want);
}

export async function GET(req: Request, ctx: Ctx) {
  const segs = ctx.params.any ?? [];
  const endpoint = (segs[0] || '(root)').toLowerCase();

  // Inspect-Modus (nur mit DEBUG_TOKEN)
  const dt = process.env.DEBUG_TOKEN || '';
  const url = new URL(req.url);
  const wantInspect = url.searchParams.get('inspect') === '1';
  const gotDT = url.searchParams.get('token') || req.headers.get('x-debug-token') || '';

  if (wantInspect && dt && gotDT === dt) {
    const names = ['authorization','x-qn-token','x-quicknode-token','x-security-token','x-webhook-token','x-verify-token','x-token','x-auth-token','x-api-key','quicknode-token'];
    const seen: Record<string,string> = {};
    for (const n of names) {
      const v = req.headers.get(n);
      if (v) seen[n] = n === 'authorization' ? maskBearer(v) : mask(v);
    }
    const want = expectedFor(endpoint);
    return NextResponse.json({
      ok: true,
      endpoint,
      expectedSet: !!want,
      expectedPreview: mask(want),
      seenHeaders: seen,
      note: 'Inspect mode (GET). Für echte QuickNode-POST-Header siehe Vercel-Logs.'
    });
  }

  return NextResponse.json({ ok: true, endpoint, ready: true });
}

export async function POST(req: Request, ctx: Ctx) {
  const segs = ctx.params.any ?? [];
  const endpoint = (segs[0] || '(root)').toLowerCase();

  // --- Debug: Header-Previews in Logs (maskiert) ---
  try {
    const names = ['authorization','x-qn-token','x-quicknode-token','x-security-token','x-webhook-token','x-verify-token','x-token','x-auth-token','x-api-key','quicknode-token'];
    const preview: Record<string,string> = {};
    for (const n of names) preview[n] = n==='authorization' ? maskBearer(req.headers.get(n)) : mask(req.headers.get(n));
    // eslint-disable-next-line no-console
    console.log('[streams] headers', endpoint, preview);
  } catch {}

  const ok = tokenOk(req, endpoint);

  // Payload best effort parsen & Engine zart antickern (nicht kritisch)
  let raw = '';
  try { raw = await req.text(); } catch {}
  let payload: any = {};
  try { payload = raw ? JSON.parse(raw) : {}; } catch {}

  try {
    const mod: any = await import('@/lib/paper/engine');
    const wh = mod.onWebhook || mod.handleWebhook || mod.webhook;
    if (typeof wh === 'function') await wh({ source: endpoint, path: segs.join('/'), payload });
    const tickFn = mod.onTick || mod.tick || mod.default;
    if (typeof tickFn === 'function') {
      await tickFn({
        mint: payload?.mint || payload?.tokenMint || payload?.symbol || 'UNKNOWN',
        symbol: payload?.symbol || payload?.mint || 'UNK',
        priceUsd: Number(payload?.priceUsd ?? payload?.usd ?? payload?.amountUsd) || undefined,
        volumeUsd1m: Number(payload?.vol1m || payload?.volumeUsd1m || 0) || 0,
        volumeUsd5m: Number(payload?.vol5m || payload?.volumeUsd5m || 0) || 0,
        txBuys1m: Number(payload?.buys1m || 0) || 0,
        txSells1m: Number(payload?.sells1m || 0) || 0,
      });
    }
  } catch {}

  if (!ok) {
    return new NextResponse(JSON.stringify({ ok:false, reason:'BAD_TOKEN' }), {
      status: 401,
      headers: { 'content-type':'application/json' }
    });
  }

  return NextResponse.json({ ok:true, endpoint });
}

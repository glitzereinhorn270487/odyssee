// T0_STREAMS_CATCHALL_V6.ts
import { NextResponse } from 'next/server';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = { params: { any?: string[] } };

const norm = (s: any) => String(s ?? '').trim().replace(/^['"]|['"]$/g, '');
const mask = (s: any) => {
  const v = norm(s);
  if (!v) return '';
  return v.length <= 8 ? '*'.repeat(v.length) : v.slice(0,4)+'…'+v.slice(-4);
};
const maskBearer = (v: any) => {
  const x = norm(v);
  const m = x.match(/^\s*(Bearer)\s+(.+)$/i);
  return m ? `${m[1]} ${mask(m[2])}` : mask(x);
};

function allowUnsigned() {
  const v = norm(process.env.QN_ALLOW_UNSIGNED);
  return v === '1' || v.toLowerCase() === 'true';
}
function expectedFor(endpoint: string) {
  const e = (endpoint || '').toLowerCase();
  if (e === 'pumpfun') return norm(process.env.QN_PUMPFUN_TOKEN) || norm(process.env.QN_STREAMS_TOKEN);
  if (e === 'quicknode') return norm(process.env.QN_STREAMS_TOKEN) || norm(process.env.QN_PUMPFUN_TOKEN);
  return norm(process.env.QN_STREAMS_TOKEN) || norm(process.env.QN_PUMPFUN_TOKEN);
}
function extractCandidates(req: Request): string[] {
  const url = new URL(req.url);
  const h = req.headers;
  const auth = norm(h.get('authorization'));
  let bearer = '';
  const m = auth.match(/^\s*Bearer\s+(.+)$/i);
  if (m) bearer = norm(m[1]);
  return [
    bearer,
    norm(h.get('x-qn-token')),
    norm(h.get('x-quicknode-token')),
    norm(h.get('x-security-token')),
    norm(h.get('x-webhook-token')),
    norm(h.get('x-verify-token')),
    norm(h.get('x-token')),
    norm(h.get('x-auth-token')),
    norm(h.get('x-api-key')),
    norm(h.get('quicknode-token')),
    norm(url.searchParams.get('token')),
  ].filter(Boolean);
}
function tokenOk(req: Request, endpoint: string) {
  const want = expectedFor(endpoint);
  if (!want) return true;
  const cands = extractCandidates(req);
  if (cands.includes(want)) return true;
  return allowUnsigned(); // temporärer Bypass
}

export async function GET(req: Request, ctx: Ctx) {
  const segs = ctx.params.any ?? [];
  const endpoint = (segs[0] || '(root)').toLowerCase();
  const url = new URL(req.url);
  const inspect = url.searchParams.get('inspect') === '1';

  if (inspect) {
    const names = ['authorization','x-qn-token','x-quicknode-token','x-security-token','x-webhook-token','x-verify-token','x-token','x-auth-token','x-api-key','quicknode-token'];
    const seen: Record<string,string> = {};
    for (const n of names) {
      const v = req.headers.get(n);
      if (v) seen[n] = n === 'authorization' ? maskBearer(v) : mask(v);
    }
    const want = expectedFor(endpoint);
    return NextResponse.json({
      ok: true,
      mode: 'inspect',
      endpoint,
      expectedSet: !!want,
      expectedPreview: mask(want),
      allowUnsigned: allowUnsigned(),
      seenHeaders: seen,
    });
  }
  return NextResponse.json({ ok: true, endpoint, ready: true });
}

export async function POST(req: Request, ctx: Ctx) {
  const segs = ctx.params.any ?? [];
  const endpoint = (segs[0] || '(root)').toLowerCase();

  // Maskierte Header in Logs (für QuickNode-Test)
  try {
    const names = ['authorization','x-qn-token','x-quicknode-token','x-security-token','x-webhook-token','x-verify-token','x-token','x-auth-token','x-api-key','quicknode-token'];
    const preview: Record<string,string> = {};
    for (const n of names) preview[n] = n==='authorization' ? maskBearer(req.headers.get(n)) : mask(req.headers.get(n));
    console.log('[streams][hdr]', endpoint, preview);
  } catch {}

  // Payload lesen (optional an Engine weitergereicht)
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

  if (!tokenOk(req, endpoint)) {
    const want = expectedFor(endpoint);
    const got = extractCandidates(req).map(mask);
    return new NextResponse(JSON.stringify({
      ok:false, reason:'BAD_TOKEN',
      expectedPreview: mask(want),
      gotCandidates: got,
      allowUnsigned: allowUnsigned(),
    }), { status: 401, headers: {'content-type':'application/json'} });
  }

  return NextResponse.json({ ok:true, endpoint });
}

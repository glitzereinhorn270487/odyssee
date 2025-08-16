// T0_STREAMS_CATCHALL_V5.ts
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = { params: { any?: string[] } };

function norm(s: string | null | undefined) {
  return (s ?? '').trim().replace(/^['"]|['"]$/g, '');
}
function mask(s: string | null | undefined) {
  const v = norm(s);
  if (!v) return '';
  return v.length <= 8 ? '*'.repeat(v.length) : v.slice(0,4)+'…'+v.slice(-4);
}
function maskBearer(v: string | null | undefined) {
  const x = norm(v);
  const m = x.match(/^\s*(Bearer)\s+(.+)$/i);
  return m ? `${m[1]} ${mask(m[2])}` : mask(x);
}

function expectedFor(endpoint: string) {
  const e = (endpoint || '').toLowerCase();
  if (e === 'pumpfun') return norm(process.env.QN_PUMPFUN_TOKEN) || norm(process.env.QN_STREAMS_TOKEN);
  if (e === 'quicknode') return norm(process.env.QN_STREAMS_TOKEN) || norm(process.env.QN_PUMPFUN_TOKEN);
  return norm(process.env.QN_STREAMS_TOKEN) || norm(process.env.QN_PUMPFUN_TOKEN);
}

function extractCandidates(req: Request): string[] {
  const h = req.headers;
  const url = new URL(req.url);

  const auth = norm(h.get('authorization'));
  let bearer = '';
  const m = auth.match(/^\s*Bearer\s+(.+)$/i);
  if (m) bearer = norm(m[1]);

  const cands = [
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

  return cands;
}

function tokenOk(req: Request, endpoint: string) {
  const want = expectedFor(endpoint);
  if (!want) return true; // kein Secret hinterlegt => alles durchlassen
  const cands = extractCandidates(req);
  return cands.includes(want);
}

export async function GET(req: Request, ctx: Ctx) {
  const segs = ctx.params.any ?? [];
  const endpoint = (segs[0] || '(root)').toLowerCase();

  const url = new URL(req.url);
  const wantInspect = url.searchParams.get('inspect') === '1';
  // Ab V5: Inspect erlaubt auch OHNE DEBUG_TOKEN (für dich jetzt am einfachsten)
  if (wantInspect) {
    const names = ['authorization','x-qn-token','x-quicknode-token','x-security-token','x-webhook-token','x-verify-token','x-token','x-auth-token','x-api-key','quicknode-token'];
    const seen: Record<string,string> = {};
    for (const n of names) {
      const v = req.headers.get(n);
      if (!v) continue;
      seen[n] = n === 'authorization' ? maskBearer(v) : mask(v);
    }
    const want = expectedFor(endpoint);
    return NextResponse.json({
      ok: true,
      mode: 'inspect',
      endpoint,
      expectedSet: !!want,
      expectedPreview: mask(want),
      seenHeaders: seen,
    });
  }

  return NextResponse.json({ ok: true, endpoint, ready: true });
}

export async function POST(req: Request, ctx: Ctx) {
  const segs = ctx.params.any ?? [];
  const endpoint = (segs[0] || '(root)').toLowerCase();

  // Header-Preview (maskiert) in Logs
  try {
    const names = ['authorization','x-qn-token','x-quicknode-token','x-security-token','x-webhook-token','x-verify-token','x-token','x-auth-token','x-api-key','quicknode-token'];
    const preview: Record<string,string> = {};
    for (const n of names) preview[n] = n==='authorization' ? maskBearer(req.headers.get(n)) : mask(req.headers.get(n));
    // eslint-disable-next-line no-console
    console.log('[streams][hdr]', endpoint, preview);
  } catch {}

  const ok = tokenOk(req, endpoint);

  // Payload best effort
  let raw = '';
  try { raw = await req.text(); } catch {}
  let payload: any = {};
  try { payload = raw ? JSON.parse(raw) : {}; } catch {}

  // Engine zart antriggern (optional)
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
    const want = expectedFor(endpoint);
    const got = extractCandidates(req).map(mask);
    return new NextResponse(JSON.stringify({
      ok:false, reason:'BAD_TOKEN',
      expectedPreview: mask(want),
      gotCandidates: got,
    }), { status: 401, headers: {'content-type':'application/json'} });
  }

  return NextResponse.json({ ok:true, endpoint });
}

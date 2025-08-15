import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Ctx = { params: { any?: string[] } };

// --- simple token check (works with QuickNode Security "token") ---
function tokenOk(req: Request, endpoint: string) {
  const want =
    (endpoint === 'pumpfun'
      ? (process.env.QN_PUMPFUN_TOKEN || process.env.QN_STREAMS_TOKEN)
      : (process.env.QN_STREAMS_TOKEN || process.env.QN_PUMPFUN_TOKEN)
    ) || '';

  if (!want) return true; // no token set -> accept (dev)

  const h = req.headers;
  const auth = h.get('authorization') || '';
  const bearer = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7) : '';
  const xqn = h.get('x-qn-token') || h.get('x-quicknode-token') || '';
  const url = new URL(req.url);
  const q = url.searchParams.get('token') || '';

  const got = bearer || xqn || q;
  return got === want;
}

// optional best-effort price mapping (keine externen Imports nötig)
async function derivePriceUsd(payload: any): Promise<number | undefined> {
  const direct = Number(payload?.priceUsd ?? payload?.usd ?? payload?.amountUsd);
  if (Number.isFinite(direct) && direct > 0) return direct;

  // Wenn QuickNode dir amounts liefert (SOL vs Token), könnte man hier schätzen.
  // Da die Felder stark variieren, lassen wir das konservativ weg -> Engine kann selbst entscheiden.
  return undefined;
}

async function tryNotifyEngine(endpoint: string, path: string, payload: any) {
  try {
    const mod: any = await import('@/lib/paper/engine');

    // 1) Volle Webhook-Info, falls Engine das unterstützt
    const wh = mod.onWebhook || mod.handleWebhook || mod.webhook;
    if (typeof wh === 'function') {
      await wh({ source: endpoint, path, payload });
    }

    // 2) Leichter Tick, falls Engine das unterstützt
    const tickFn = mod.onTick || mod.tick || mod.default;
    if (typeof tickFn === 'function') {
      const px = await derivePriceUsd(payload);
      // Wir reichen nur das Minimum weiter – Engine kann den Rest ignorieren/verfeinern
      const tick = {
        mint: payload?.mint || payload?.tokenMint || payload?.symbol || 'UNKNOWN',
        symbol: payload?.symbol || payload?.mint || 'UNK',
        priceUsd: px, // kann undefined sein – Engine darf das ignorieren
        // einfache Metriken, falls vorhanden:
        volumeUsd1m: Number(payload?.vol1m || payload?.volumeUsd1m || 0) || 0,
        volumeUsd5m: Number(payload?.vol5m || payload?.volumeUsd5m || 0) || 0,
        txBuys1m: Number(payload?.buys1m || 0) || 0,
        txSells1m: Number(payload?.sells1m || 0) || 0,
      };
      await tickFn(tick);
    }
  } catch {
    // Keine Engine oder andere Signatur – nicht schlimm, Endpoint antwortet trotzdem 200
  }
}

// --- GET: Health/Ready ---
export async function GET(_req: Request, ctx: Ctx) {
  const segs = (ctx.params.any ?? []);
  const endpoint = (segs[0] || '(root)').toLowerCase();
  return NextResponse.json({ ok: true, endpoint, ready: true });
}

// --- POST: Stream/Webhook Handler ---
export async function POST(req: Request, ctx: Ctx) {
  const segs = (ctx.params.any ?? []);
  const endpoint = (segs[0] || '(root)').toLowerCase();
  const path = segs.join('/');

  if (!tokenOk(req, endpoint)) {
    return new NextResponse(JSON.stringify({ ok: false, reason: 'BAD_TOKEN', endpoint }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    });
  }

  // Rohdaten lesen (QuickNode sendet oft raw JSON)
  let raw = '';
  try { raw = await req.text(); } catch {}
  let payload: any = {};
  try { payload = raw ? JSON.parse(raw) : {}; } catch {}

  // Engine benachrichtigen (best effort, keine harte Abhängigkeit)
  await tryNotifyEngine(endpoint, path, payload);

  return NextResponse.json({ ok: true, endpoint });
}
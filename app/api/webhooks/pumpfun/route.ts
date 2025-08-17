import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// --- simple metering (für spätere Kostenabschätzung)
type Meter = { hits: number; bytes: number; since: number };
const meterPump: Meter = { hits: 0, bytes: 0, since: Date.now() };

// --- helpers
function getQueryToken(req: Request): string {
  try { return new URL(req.url).searchParams.get('token') || ''; }
  catch { return ''; }
}
function getHeaderToken(req: Request): string {
  const h = (n: string) => req.headers.get(n) || '';
  const auth = h('authorization');
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  const candidates = [
    getQueryToken(req), bearer,
    h('x-qn-token'), h('x-quicknode-token'), h('x-security-token'),
    h('x-webhook-token'), h('x-verify-token'), h('x-token'),
    h('x-auth-token'), h('x-api-key'), h('quicknode-token'),
  ].filter(Boolean);
  return candidates[0] || '';
}
function authorized(req: Request, wantEnv: string) {
  const allowUnsigned = process.env.QN_ALLOW_UNSIGNED === '1';
  const want = (process.env[wantEnv] as string) || '';
  const got  = getHeaderToken(req);
  return allowUnsigned || (!!want && got === want);
}

// --- zentrale Handler-Logik (für POST/PUT/PATCH)
async function handleWrite(req: Request) {
  if (!authorized(req, 'PUMPFUN_WEBHOOK_TOKEN')) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  let body: any = null; try { body = await req.json(); } catch {}
  try {
    const bytes = Number(req.headers.get('content-length') || 0) || JSON.stringify(body ?? {}).length;
    meterPump.hits += 1; meterPump.bytes += bytes;
  } catch {}
  // TODO: hier ggf. deine Engine/Scores/Positions triggern
  return NextResponse.json({ ok: true });
}

// --- Exporte der Methoden
export async function POST(req: Request)  { return handleWrite(req); }
export async function PUT(req: Request)   { return handleWrite(req); }   // falls der Provider PUT nutzt
export async function PATCH(req: Request) { return handleWrite(req); }   // falls der Provider PATCH nutzt

// QuickNode pingt oft vorher mit HEAD/OPTIONS -> niemals 405 liefern
export async function HEAD() {
  return new Response(null, { status: 200, headers: { 'x-endpoint': 'pumpfun' } });
}
export async function OPTIONS() {
  return new Response(null, { status: 204, headers: { 'Allow': 'POST,GET,HEAD,OPTIONS,PUT,PATCH' } });
}

// Health/Metrics (nur mit Token oder wenn QN_ALLOW_UNSIGNED=1)
export async function GET(req: Request) {
  const expose = process.env.QN_ALLOW_UNSIGNED === '1' || authorized(req, 'PUMPFUN_WEBHOOK_TOKEN');
  if (!expose) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  return NextResponse.json({ ok: true, meter: meterPump });
}


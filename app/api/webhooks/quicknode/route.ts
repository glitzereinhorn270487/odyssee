// /app/api/webhooks/quicknode/route.ts
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TAG = '[webhook:quicknode]';

type AuthResult = { ok: boolean; wantLen: number; gotLen: number; reason?: string };

function corsHeaders() {
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'POST,GET,OPTIONS',
    'access-control-allow-headers': '*',
  };
}

function pickHeader(req: Request, name: string): string {
  return req.headers.get(name) || '';
}

function getQueryToken(req: Request): string {
  try {
    return new URL(req.url).searchParams.get('token') || '';
  } catch {
    return '';
  }
}

function getHeaderToken(req: Request): string {
  const auth = pickHeader(req, 'authorization');
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  const candidates = [
    getQueryToken(req), // Query-Token hat Priorität
    bearer,
    pickHeader(req, 'x-qn-token'),
    pickHeader(req, 'x-quicknode-token'),
    pickHeader(req, 'x-security-token'),
    pickHeader(req, 'x-webhook-token'),
    pickHeader(req, 'x-verify-token'),
    pickHeader(req, 'x-token'),
    pickHeader(req, 'x-auth-token'),
    pickHeader(req, 'x-api-key'),
    pickHeader(req, 'quicknode-token'),
  ].filter(Boolean);
  return candidates[0] || '';
}

function authorize(req: Request): AuthResult {
  const allowUnsigned = process.env.QN_ALLOW_UNSIGNED === '1';
  const want = (process.env.QN_WEBHOOK_TOKEN as string) || '';
  const got = getHeaderToken(req);
  const ok = allowUnsigned || !want || got === want;
  return { ok, wantLen: want.length, gotLen: got.length, reason: ok ? undefined : 'token-mismatch' };
}

async function readBody(req: Request): Promise<{ body: any; raw?: string }> {
  const ct = (req.headers.get('content-type') || '').toLowerCase();
  if (ct.includes('application/json')) {
    try {
      const body = await req.json();
      return { body };
    } catch (e: any) {
      return { body: null, raw: undefined };
    }
  }
  const raw = await req.text();
  try {
    return { body: JSON.parse(raw), raw };
  } catch {
    return { body: { raw }, raw };
  }
}

function collectField(obj: any, keys: string[] = ['mint', 'tokenMint', 'baseMint', 'quoteMint']): string | null {
  if (!obj || typeof obj !== 'object') return null;
  for (const k of keys) {
    if (typeof obj[k] === 'string') return obj[k] as string;
  }
  return null;
}

function extractEvents(payload: any): any[] {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;

  if (Array.isArray(payload.events)) return payload.events;
  if (payload.data && Array.isArray(payload.data.events)) return payload.data.events;

  const v = payload?.result?.value;
  if (Array.isArray(v)) return v;
  if (v && typeof v === 'object') return [v];

  // Fallback: einzelne bekannte Felder in Array verpacken
  if (payload.event) return [payload.event];
  return [];
}

export async function GET() {
  return NextResponse.json(
    { ok: true, hint: 'POST QuickNode webhooks here', expects: '/api/webhooks/quicknode?token=YOUR_TOKEN' },
    { headers: corsHeaders() }
  );
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function POST(req: Request) {
  const t0 = Date.now();
  const url = req.url;
  const method = req.method;
  const token = getHeaderToken(req);

  console.info(`${TAG}[hit]`, {
    method,
    url,
    tokenLen: token.length,
    ct: pickHeader(req, 'content-type'),
    clen: pickHeader(req, 'content-length'),
    ua: pickHeader(req, 'user-agent'),
  });

  const auth = authorize(req);
  if (!auth.ok) {
    console.warn(`${TAG}[unauthorized]`, { wantLen: auth.wantLen, gotLen: auth.gotLen, reason: auth.reason });
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401, headers: corsHeaders() });
  }

  const { body, raw } = await readBody(req);
  if (!body) {
    console.warn(`${TAG}[bad-body]`, { hasRaw: !!raw });
    return NextResponse.json({ ok: false, error: 'bad-json' }, { status: 400, headers: corsHeaders() });
  }

  const events = extractEvents(body);
  const sample = events.slice(0, 3).map((e: any) => ({
    tag: e?.tag || e?.type || e?.event || null,
    mint: collectField(e) || collectField(e?.accountData) || collectField(e?.meta) || null,
  }));

  console.info(`${TAG}[parsed]`, {
    rootKeys: Object.keys(body || {}).slice(0, 10),
    evCount: events.length,
    sample,
  });

  // TODO: hier ggf. intern weiterleiten (Signal-Pipeline / Engine)
  // Aktuell nur ACK + Logging.
  const t1 = Date.now();
  console.info(`${TAG}[done]`, { evCount: events.length, ms: t1 - t0 });

  return NextResponse.json(
    { ok: true, received: true, evCount: events.length, ms: t1 - t0 },
    { headers: corsHeaders() }
  );
}

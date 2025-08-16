import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const HDR_KEYS = [
  'authorization',
  'x-qn-token',
  'x-quicknode-token',
  'x-security-token',
  'x-webhook-token',
  'x-verify-token',
  'x-token',
  'x-auth-token',
  'x-api-key',
  'quicknode-token',
] as const;

function logHeaders(prefix: string, req: Request) {
  const out: Record<string, string> = {};
  for (const k of HDR_KEYS) out[k] = req.headers.get(k) || '';
  console.info('[streams][hdr]', prefix, out);
}

function getHeaderToken(req: Request): string {
  const auth = req.headers.get('authorization') || '';
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  const candidates = [
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

function authorize(req: Request, envVarName: string) {
  const allowUnsigned = process.env.QN_ALLOW_UNSIGNED === '1';
  const want = (process.env[envVarName] as string) || '';
  const got = getHeaderToken(req);
  const ok = allowUnsigned || (!!want && got === want);
  return { ok, wantLen: want.length };
}

async function readBody(req: Request) {
  try {
    const raw = await req.text();
    if (!raw) return { raw: '', json: undefined as any };
    try {
      const json = JSON.parse(raw);
      return { raw, json };
    } catch {
      return { raw, json: undefined as any };
    }
  } catch {
    return { raw: '', json: undefined as any };
  }
}

function logBody(prefix: string, body: { raw: string; json: any }) {
  if (process.env.LOG_STREAM_BODY !== '1') return;
  if (body.json && typeof body.json === 'object') {
    if (Array.isArray(body.json)) {
      console.info('[streams][body]', prefix, { type: 'array', len: body.json.length });
    } else {
      const keys = Object.keys(body.json);
      console.info('[streams][body]', prefix, { type: 'object', keys });
    }
  } else {
    const sample = body.raw.length > 800 ? body.raw.slice(0, 800) + '…' : body.raw;
    console.info('[streams][bodyRaw]', prefix, { bytes: body.raw.length, sample });
  }
}

export async function POST(req: Request) {
  const prefix = 'pumpfun';
  logHeaders(prefix, req);

  const auth = authorize(req, 'QN_PUMPFUN_TOKEN');
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const body = await readBody(req);
  logBody(prefix, body);

  // TODO: Mapping → onTick(), sobald 1 echtes Body-Beispiel vorliegt.

  return NextResponse.json({ ok: true, source: 'pumpfun' });
}


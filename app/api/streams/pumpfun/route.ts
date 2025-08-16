import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getQueryToken(req: Request): string {
  try { return new URL(req.url).searchParams.get('token') || ''; }
  catch { return ''; }
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
async function logHeaders(prefix: string, req: Request) {
  const out: Record<string, string> = {
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
  };
  console.info('[streams][hdr]', prefix, out);
}
function authorize(req: Request, envVarName: string) {
  const want = (process.env[envVarName] as string) || '';
  const got = getQueryToken(req) || getHeaderToken(req);
  const ok = !!want && got === want;
  return { ok, wantLen: want.length, gotLen: got.length };
}

export async function POST(req: Request) {
  await logHeaders('pumpfun', req);
  const { ok } = authorize(req, 'QN_PUMPFUN_TOKEN');
  if (!ok) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

  let payload: any = null;
  try { payload = await req.json(); } catch {}
  return NextResponse.json({ ok: true, source: 'pumpfun', received: !!payload });
}

export async function GET() {
  return NextResponse.json({ ok: true, kind: 'pumpfun' });
}


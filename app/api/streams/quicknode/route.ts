import { NextResponse } from 'next/server';
import { kvGet, kvSet } from '@/lib/store/volatile';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// --- helpers -------------------------------------------------
function wantTokenVar(): string {
  return process.env.QN_WEBHOOK_TOKEN || process.env.QUICKNODE_WEBHOOK_TOKEN || '';
}
function getQueryToken(req: Request): string {
  try { return new URL(req.url).searchParams.get('token') || ''; } catch { return ''; }
}
function getHeaderToken(req: Request): string {
  const auth = req.headers.get('authorization') || '';
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  const cands = [
    getQueryToken(req), bearer,
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
  return cands[0] || '';
}
async function bump(kind: 'quicknode'|'pumpfun', bytes: number) {
  const cKey = `metrics:${kind}:count`;
  const bKey = `metrics:${kind}:bytes`;
  const oldC = Number(await kvGet(cKey)) || 0;
  const oldB = Number(await kvGet(bKey)) || 0;
  await kvSet(cKey, oldC + 1);
  await kvSet(bKey, oldB + (bytes || 0));
}
// ------------------------------------------------------------

export async function POST(req: Request) {
  const allowUnsigned = process.env.QN_ALLOW_UNSIGNED === '1';
  const want = wantTokenVar();
  const got = getHeaderToken(req);
  const authorized = allowUnsigned || (!!want && got === want);
  if (!authorized) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

  const clone = req.clone();
  let raw = '';
  try { raw = await clone.text(); } catch {}
  let payload: any = {};
  try { payload = raw ? JSON.parse(raw) : await req.json(); } catch {}

  // Bytes aus Header oder Fallback berechnen
  const cLen = Number(req.headers.get('content-length')) || 0;
  const bytes = cLen || (raw ? Buffer.byteLength(raw, 'utf8') : Buffer.byteLength(JSON.stringify(payload || {}), 'utf8'));
  await bump('quicknode', bytes);

  // TODO: Hier ggf. euer internes Signal/Engine-Handling aufrufen
  return NextResponse.json({ ok: true });
}

export async function GET() {
  // Mini-Health
  return NextResponse.json({ ok: true, source: 'quicknode' });
}

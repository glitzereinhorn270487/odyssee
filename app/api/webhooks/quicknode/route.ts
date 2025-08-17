// app/api/webhooks/quicknode/route.ts
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const RAYDIUM_AMM = '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8';

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
  return candidates[0] || '';
}

function authorize(req: Request, envVarName = 'QN_WEBHOOK_TOKEN') {
  const allowUnsigned = process.env.QN_ALLOW_UNSIGNED === '1';
  const want = (process.env[envVarName] as string) || '';
  const got = getHeaderToken(req);
  const ok = allowUnsigned || (!!want && got === want);
  return { ok, wantLen: (want || '').length, gotLen: (got || '').length, reason: ok ? 'ok' : (allowUnsigned ? 'unsigned-allowed' : 'token-mismatch') };
}

function toArray<T>(x: T | T[] | null | undefined): T[] {
  if (x == null) return [];
  return Array.isArray(x) ? x : [x];
}

function normalizeKeys(arr: any): string[] {
  const a = toArray(arr);
  return a.map(k => (typeof k === 'string' ? k : (k?.pubkey || ''))).filter(Boolean);
}

function collectField(obj: any, keys: string[] = ['mint', 'tokenMint', 'baseMint', 'quoteMint']): string | null {
  if (!obj || typeof obj !== 'object') return null;
  for (const k of keys) {
    if (typeof obj[k] === 'string') return obj[k] as string;
  }
  return null;
}

function extractLogs(node: any): string[] {
  const cands = [
    node?.meta?.logMessages,
    node?.transaction?.meta?.logMessages,
    node?.value?.transaction?.meta?.logMessages,
    node?.message?.logs, // falls QuickNode so nennt
  ];
  for (const c of cands) {
    const arr = toArray<string>(c);
    if (arr.length) return arr.filter(x => typeof x === 'string');
  }
  return [];
}

function extractAccountKeys(node: any): string[] {
  const cands = [
    node?.transaction?.message?.accountKeys,
    node?.value?.transaction?.message?.accountKeys,
    node?.message?.accountKeys,
  ];
  for (const c of cands) {
    const arr = normalizeKeys(c);
    if (arr.length) return arr;
  }
  return [];
}

function* iterTransactions(body: any) {
  // QuickNode liefert i.d.R. { transactions: [ ... ] }
  for (const t of toArray(body?.transactions)) yield t;

  // Fallbacks: manchmal steckt das Ding eine Ebene tiefer/anders
  if (body?.transaction || body?.value?.transaction) yield body;
  if (body?.result?.transaction) yield body.result; // RPC-ähnlich
}

function isRaydiumInit2(node: any): boolean {
  const logs = extractLogs(node);
  const hasInit2 = logs.some((l) => typeof l === 'string' && /Initialize2/i.test(l));
  const keys = extractAccountKeys(node);
  const touchesRaydium = keys.includes(RAYDIUM_AMM) || logs.some((l) => l.includes(RAYDIUM_AMM));
  return hasInit2 && touchesRaydium;
}

async function parseBody(req: Request) {
  const ct = (req.headers.get('content-type') || '').toLowerCase();
  let text = '';
  try { text = await req.text(); } catch {}
  if (!text) return { ok: false as const, body: null, hasRaw: false, ct };
  try {
    const body = JSON.parse(text);
    return { ok: true as const, body, hasRaw: true, ct };
  } catch (e) {
    console.warn('[webhook:quicknode][bad-json]', { ct, preview: text.slice(0, 200) });
    return { ok: false as const, body: null, hasRaw: true, ct };
  }
}

export async function POST(req: Request) {
  const t0 = Date.now();
  const url = req.url;
  const auth = authorize(req, 'QN_WEBHOOK_TOKEN');

  console.info('[webhook:quicknode][hit]', {
    method: req.method,
    url,
    tokenLen: getHeaderToken(req).length,
    ct: req.headers.get('content-type'),
    clen: req.headers.get('content-length'),
    ua: req.headers.get('user-agent')
  });

  if (!auth.ok) {
    console.warn('[webhook:quicknode][unauthorized]', { wantLen: auth.wantLen, gotLen: auth.gotLen, reason: auth.reason });
    return NextResponse.json({ ok: false, unauthorized: true }, { status: 401 });
  }

  const parsed = await parseBody(req);
  if (!parsed.ok || !parsed.body) {
    console.warn('[webhook:quicknode][bad-body]', { hasRaw: parsed.hasRaw });
    return NextResponse.json({ ok: false, error: 'bad-body' }, { status: 200 });
  }

  let txs = 0;
  let matches = 0;
  for (const node of iterTransactions(parsed.body)) {
    txs++;
    if (isRaydiumInit2(node)) matches++;
  }

  console.info('[webhook:quicknode][batch]', { txs, matches, ms: Date.now() - t0 });
  return NextResponse.json({ ok: true, received: true, txs, matches, ms: Date.now() - t0 });
}

export async function GET() {
  return NextResponse.json({ ok: true, info: 'QuickNode webhook is up' });
}

import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function q(url: string) {
  try { return new URL(url).searchParams.get('token') || ''; } catch { return ''; }
}
function tokenFrom(req: Request) {
  const auth = req.headers.get('authorization') || '';
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  const cands = [
    q(req.url),
    bearer,
    req.headers.get('x-webhook-token') || '',
    req.headers.get('x-verify-token') || '',
    req.headers.get('x-token') || '',
    req.headers.get('x-api-key') || '',
  ].filter(Boolean);
  return cands[0] || '';
}
function authorize(req: Request, envVar: string) {
  const want = (process.env[envVar] as string) || '';
  const got = tokenFrom(req);
  return !!want && got === want;
}

// -------- serverseitiger Filter (Keywords) --------
function anyLogMatches(payload: any, re: RegExp): boolean {
  const txs =
    payload?.transactions ??
    payload?.result?.value?.block?.transactions ??
    [];
  for (const t of txs) {
    const logs: string[] = t?.meta?.logMessages ?? [];
    for (const line of logs) if (re.test(line)) return true;
  }
  return false;
}

async function handler(req: Request) {
  if (!authorize(req, 'PUMPFUN_WEBHOOK_TOKEN')) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  if (req.method !== 'POST') return NextResponse.json({ ok: true, method: req.method });

  let payload: any = null;
  try { payload = await req.json(); } catch {}

  // nur Launch/AMM/Pool/Init-Events (pumpfun-typische Logs)
  const matched = anyLogMatches(
    payload,
    /(pump|create|launch|initialize|liquidity|amm|pool)/i
  );

  if (!matched) {
    return NextResponse.json({ ok: true, filtered: true });
  }

  // TODO: hier an eure Engine weiterreichen (Signal öffnen etc.)
  console.info('[pumpfun match]', JSON.stringify(payload).slice(0, 1500));
  return NextResponse.json({ ok: true, matched: true });
}

export async function GET(req: Request)     { return handler(req); }
export async function HEAD(req: Request)    { return handler(req); }
export async function OPTIONS(req: Request) { return handler(req); }
export async function POST(req: Request)    { return handler(req); }
export async function PUT(req: Request)     { return handler(req); }
export async function PATCH(req: Request)   { return handler(req); }



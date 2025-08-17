import { NextResponse } from 'next/server';

// Da die Webhook-Module-scope Variablen nicht direkt hier verfügbar sind,
// liefern wir nur einen "ping" und leiten die Detail-Meter über deren GET aus.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const base = new URL(req.url);
  const qn = await fetch(new URL('/api/webhooks/quicknode', base)).then(r => r.json()).catch(()=>({}));
  const pf = await fetch(new URL('/api/webhooks/pumpfun', base)).then(r => r.json()).catch(()=>({}));
  return NextResponse.json({
    ok: true,
    quicknode: qn?.meter ?? null,
    pumpfun: pf?.meter ?? null,
  });
}

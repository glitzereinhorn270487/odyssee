// app/api/webhooks/pumpfun/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  return new Response(JSON.stringify({ ok: false, error: 'pumpfun webhook disabled' }), {
    status: 405,
    headers: { 'content-type': 'application/json' },
  });
}

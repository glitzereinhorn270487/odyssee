import { NextResponse } from 'next/server';
export const runtime = 'nodejs';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const from = url.searchParams.get('from') ?? '2025-08-01';
  const to   = url.searchParams.get('to')   ?? '2025-08-31';
  const lines = [
    'Datum; Chain; Token; Kategorie; Marketcap; Volumen; Investment; PnL_USD; TAX_USD',
    '2025-08-01; SOL; CATCOIO; meme; 1250000; 980000; 120; 34.50; 1.23',
    '2025-08-01; SOL; FROGZ; meme; 2300000; 4500000; 110; 220.10; 6.60'
  ];
  const text = `# Tax Export ${from}..${to}\n` + lines.join('\n') + '\n';
  return new Response(text, { headers: { 'content-type': 'text/plain; charset=utf-8' }});
}

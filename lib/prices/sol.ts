const KEY = 'px:solusd';
const TTL_MS = 60_000;

async function fetchSolUsd(): Promise<number> {
  // Server-side fetch ok on Vercel
  try {
    const r = await fetch('https://price.jup.ag/v4/price?ids=SOL', { cache: 'no-store' });
    const j = await r.json();
    const n = Number(j?.data?.SOL?.price);
    if (Number.isFinite(n) && n > 0) return n;
  } catch {}
  try {
    const r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd', { cache: 'no-store' });
    const j = await r.json();
    const n = Number(j?.solana?.usd);
    if (Number.isFinite(n) && n > 0) return n;
  } catch {}
  return 0;
}

let cache: { v: number; t: number } | null = null;

export async function getSolUsd(): Promise<number> {
  const now = Date.now();
  if (cache && (now - cache.t) < TTL_MS && cache.v > 0) return cache.v;
  const v = await fetchSolUsd();
  cache = { v, t: now };
  return v;
}
const TTL = 60_000;
let cache: { t: number; v: number } | null = null;

async function fetchSol(): Promise<number> {
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

export async function getSolUsd(): Promise<number> {
  const now = Date.now();
  if (cache && (now - cache.t) < TTL && cache.v > 0) return cache.v;
  const v = await fetchSol();
  cache = { t: now, v };
  return v;
}

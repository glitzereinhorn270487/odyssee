// lib/prices/dexscreener.ts
export async function fetchDexPriceUsdByMint(mint: string): Promise<number | undefined> {
  try {
    const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`, {
      // kurze Cache-Gültigkeit, kein Dauer-Polling
      next: { revalidate: 10 },
    });
    if (!res.ok) return undefined;
    const data = await res.json();
    const p = data?.pairs?.[0]?.priceUsd;
    const n = p ? Number(p) : undefined;
    return Number.isFinite(n) ? n : undefined;
  } catch {
    return undefined;
  }
}

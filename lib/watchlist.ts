// /lib/watchlist.ts
type WatchItem = {
  ts: number;
  kind: string;           // z.B. "raydium_pool_init2" | "authority_revoked" | "lp_burn" | "other"
  sig?: string;
  note?: string;
  sampleLogs?: string[];  // nur 1-2 Zeilen zur Orientierung
};

const g = globalThis as any;
if (!g.__WATCHLIST__) g.__WATCHLIST__ = [] as WatchItem[];

export function addSignal(item: WatchItem) {
  const arr = g.__WATCHLIST__ as WatchItem[];
  arr.unshift(item);
  if (arr.length > 200) arr.length = 200; // Deckel
}

export function getSignals(limit = 50): WatchItem[] {
  const arr = (globalThis as any).__WATCHLIST__ as WatchItem[];
  return Array.isArray(arr) ? arr.slice(0, limit) : [];
}

export function clearSignals() {
  (globalThis as any).__WATCHLIST__ = [];
}

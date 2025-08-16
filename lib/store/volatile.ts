// Simple In-Memory "KV"-Store für Runtime (Vercel/Node).
// Bietet sync- und async-APIs, plus Utility-Helper die anderswo importiert werden.

const mem = new Map<string, any>();

// ---------- Sync API ----------
export function set(key: string, value: any): void {
  mem.set(key, value);
}

export function get<T = any>(key: string, def?: T): T | undefined {
  return mem.has(key) ? (mem.get(key) as T) : def;
}

export function getBoolean(key: string, def = false): boolean {
  const v = mem.get(key);
  if (typeof v === 'boolean') return v;
  if (typeof v === 'string') {
    if (v.toLowerCase() === 'true') return true;
    if (v.toLowerCase() === 'false') return false;
  }
  return def;
}

export function getNumber(key: string, def = 0): number {
  const v = mem.get(key);
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

// Patch-artige Zuweisung für Settings o.ä.
export function merge(patch: Record<string, any>): void {
  for (const [k, v] of Object.entries(patch)) {
    mem.set(k, v);
  }
}

// ---------- Async Aliase (kompatibel zu bestehendem Code) ----------
export async function kvSet(key: string, value: any): Promise<void> {
  set(key, value);
}
export async function kvGet<T = any>(key: string): Promise<T | undefined> {
  return get<T>(key);
}

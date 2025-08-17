// lib/store/volatile.ts
type JSONValue = any;

const mem = new Map<string, JSONValue>();

export function get<T = any>(key: string, def?: T): T {
  return (mem.has(key) ? mem.get(key) : def) as T;
}

export function set<T = any>(key: string, val: T): void {
  mem.set(key, val);
}

export function getBoolean(key: string, def = false): boolean {
  const v = get<any>(key);
  return typeof v === 'boolean' ? v : Boolean(def);
}

export function getNumber(key: string, def = 0): number {
  const v = get<any>(key);
  const n = typeof v === 'number' ? v : Number.NaN;
  return Number.isFinite(n) ? n : def;
}

export function merge(patch: Record<string, any>, rootKey = 'rules') {
  const cur = get<Record<string, any>>(rootKey, {});
  const next = deepMerge(cur, patch);
  set(rootKey, next);
  return next;
}

function isObj(x: unknown): x is Record<string, any> {
  return !!x && typeof x === 'object' && !Array.isArray(x);
}

// kleine, robuste Deep-Merge
function deepMerge(a: any, b: any): any {
  if (Array.isArray(a) && Array.isArray(b)) return b.slice();

  if (isObj(a) && isObj(b)) {
    const ao: Record<string, any> = a;
    const bo: Record<string, any> = b;
    const out: Record<string, any> = { ...ao };
    for (const k of Object.keys(bo)) {
      out[k] = deepMerge(ao[k], bo[k]);
    }
    return out;
  }

  return b;
}

// Async-Aliase (Kompatibilität)
export async function kvGet<T = any>(key: string): Promise<T | undefined> {
  return get<T>(key);
}

export async function kvSet<T = any>(key: string, val: T): Promise<void> {
  set(key, val);
}

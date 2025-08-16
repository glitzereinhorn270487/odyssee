// Super-schlichte In-Memory-"KV" für Runtime auf Vercel/Node.
// Bietet synchrone und "async" Varianten (kompatibel zu deinem Code).

const mem = new Map<string, any>();

export function set(key: string, value: any): void {
  mem.set(key, value);
}
export function get<T = any>(key: string, def?: T): T | undefined {
  return mem.has(key) ? (mem.get(key) as T) : def;
}
export function getBoolean(key: string, def = false): boolean {
  const v = mem.get(key);
  return typeof v === 'boolean' ? v : def;
}

// Async-Aliase (einige Stellen erwarten kvGet/kvSet)
export async function kvSet(key: string, value: any): Promise<void> {
  set(key, value);
}
export async function kvGet<T = any>(key: string): Promise<T | undefined> {
  return get<T>(key);
}

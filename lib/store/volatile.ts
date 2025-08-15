// Einfache, flüchtige Key-Value-Map (pro Lambda-Instanz)
type Store = Map<string, any>;
const KEY = '__volatile_store__';
const g = globalThis as any;
if (!g[KEY]) g[KEY] = new Map<string, any>() as Store;
const store: Store = g[KEY];

export async function kvGet<T>(k: string): Promise<T | null> {
  return store.has(k) ? (store.get(k) as T) : null;
}
export async function kvSet<T>(k: string, v: T): Promise<void> {
  store.set(k, v);
}

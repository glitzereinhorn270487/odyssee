// Simple in-memory store (V1.0). V1.1 -> Upstash/Vercel KV.
const g = globalThis as any;
g.__VOLATILE_STORE__ ||= new Map<string, any>();

export async function kvGet<T = any>(key: string): Promise<T | undefined> {
  return g.__VOLATILE_STORE__.get(key);
}
export async function kvSet(key: string, value: any): Promise<void> {
  g.__VOLATILE_STORE__.set(key, value);
}
export async function kvDel(key: string): Promise<void> {
  g.__VOLATILE_STORE__.delete(key);
}
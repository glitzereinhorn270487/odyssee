// /lib/experiments/liqlog.ts
type LqLog = {
  ts: number;
  kind: 'lp_burn';
  mint?: string;
  sig?: string;
  sampleLogs?: string[];
  note?: string;
};

const g = globalThis as any;
if (!g.__LIQ_LOG__) g.__LIQ_LOG__ = [] as LqLog[];

export function liqAdd(entry: LqLog) {
  const arr = g.__LIQ_LOG__ as LqLog[];
  arr.unshift(entry);
  if (arr.length > 400) arr.length = 400;
}

export function liqList(limit = 100): LqLog[] {
  const arr = (globalThis as any).__LIQ_LOG__ as LqLog[];
  return Array.isArray(arr) ? arr.slice(0, limit) : [];
}

export function liqClear() {
  (globalThis as any).__LIQ_LOG__ = [];
}

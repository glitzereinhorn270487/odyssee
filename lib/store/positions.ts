// Einfacher In-Memory Positions-Store, API-kompatibel zur Engine

export type Position = {
  id: string;
  chain: 'SOL';
  name: string;
  category: 'Raydium' | 'PumpFun' | 'Test';
  marketcap?: number;
  volume?: number;
  investmentUsd: number;
  pnlUsd: number;
  taxBuyPct?: number;
  taxSellPct?: number;
  openedAt: number;
  status: 'open' | 'closed';
  reason?: string;
  meta?: Record<string, any>;
};

const mem = new Map<string, Position>();

export async function listPositions(): Promise<Position[]> {
  return Array.from(mem.values());
}

export async function getPosition(id: string): Promise<Position | null> {
  return mem.get(id) ?? null;
}

export async function openPosition(p: Position): Promise<Position> {
  mem.set(p.id, p);
  return p;
}

export async function updatePosition(id: string, patch: Partial<Position>): Promise<Position | null> {
  const cur = mem.get(id);
  if (!cur) return null;
  const upd: Position = { ...cur, ...patch };
  mem.set(id, upd);
  return upd;
}

export async function closePosition(id: string, reason?: string): Promise<Position | null> {
  const cur = mem.get(id);
  if (!cur) return null;
  const upd: Position = { ...cur, status: 'closed', reason: reason ?? 'closed' };
  mem.set(id, upd);
  return upd;
}

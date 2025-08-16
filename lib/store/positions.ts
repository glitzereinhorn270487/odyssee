// Einfacher In-Memory Positions-Store, API-kompatibel zur Engine + Analytics

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

/** Basis-API */
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

/** Zusatz-API, die von Analytics/Treasury erwartet wird */
export async function getOpenPositions(): Promise<Position[]> {
  return (await listPositions()).filter(p => p.status === 'open');
}

export async function getClosedPositions(): Promise<Position[]> {
  return (await listPositions()).filter(p => p.status === 'closed');
}

/**
 * setOpenPositions / setClosedPositions:
 * Ersetzt jeweils die aktuelle Menge offener/geschlossener Positionen im In-Memory Store.
 * Geschlossene bleiben bei setOpenPositions unverändert (und umgekehrt).
 */
export async function setOpenPositions(list: Position[]): Promise<boolean> {
  // entferne aktuelle "open"
  for (const [id, p] of mem.entries()) {
    if (p.status === 'open') mem.delete(id);
  }
  // setze neue "open"
  for (const p of list) {
    mem.set(p.id, { ...p, status: 'open' });
  }
  return true;
}

export async function setClosedPositions(list: Position[]): Promise<boolean> {
  // entferne aktuelle "closed"
  for (const [id, p] of mem.entries()) {
    if (p.status === 'closed') mem.delete(id);
  }
  // setze neue "closed"
  for (const p of list) {
    mem.set(p.id, { ...p, status: 'closed' });
  }
  return true;
}

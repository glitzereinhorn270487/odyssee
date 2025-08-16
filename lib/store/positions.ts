// lib/store/positions.ts
export type Chain = 'SOL';
export type Category = 'Raydium' | 'PumpFun' | 'Test';
export type Status = 'open' | 'closed';

export type Position = {
  id: string;
  chain: Chain;
  name: string;
  category: Category;
  marketcap?: number;
  volume?: number;
  investmentUsd: number;
  entryPriceUsd?: number;
  currentPriceUsd?: number;
  pnlUsd?: number;
  tax?: number;
  openedAt: number;
  closedAt?: number;
  status: Status;
  reason?: string;
  meta?: Record<string, any>;
  // optional – damit dein Dashboard nicht crasht, wenn leer:
  holders?: number;
  txCount?: { buy: number; sell: number };
  scores?: { scorex: number; risk: number; fomo: number; pumpDumpProb: number };
  links?: { telegram?: string; dexscreener?: string };
  mint?: string; // wichtig für DexScreener Preis
};

const openMap = new Map<string, Position>();
const closedMap = new Map<string, Position>();

export function openPosition(p: Position): Position {
  openMap.set(p.id, p);
  return p;
}

export function closePosition(id: string, reason = 'closed'): Position | null {
  const cur = openMap.get(id);
  if (!cur) return null;
  const upd: Position = { ...cur, status: 'closed', reason, closedAt: Date.now() };
  openMap.delete(id);
  closedMap.set(id, upd);
  return upd;
}

export function updatePosition(id: string, patch: Partial<Position>): Position | null {
  const cur = openMap.get(id) ?? closedMap.get(id);
  if (!cur) return null;
  const next: Position = { ...cur, ...patch };
  if (next.status === 'open') {
    closedMap.delete(id);
    openMap.set(id, next);
  } else {
    openMap.delete(id);
    closedMap.set(id, next);
  }
  return next;
}

// Diese Wrapper erwartet dein Code an ein paar Stellen:
export function getOpenPositions(): Position[] {
  return Array.from(openMap.values());
}
export function getClosedPositions(): Position[] {
  return Array.from(closedMap.values());
}
export function listPositions(): Position[] {
  return [...openMap.values(), ...closedMap.values()].sort((a, b) => b.openedAt - a.openedAt);
}

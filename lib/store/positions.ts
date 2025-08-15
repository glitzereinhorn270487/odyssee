import { kvGet, kvSet } from './volatile';

export type Position = {
  id: string; chain: string; name: string; category: string; narrative?: string | null;
  mcap: number; volume: number; investment: number; pnlUSD: number; taxUSD: number;
  holders?: number; txCount?: { buy: number; sell: number };
  scores?: { scorex: number; risk: number; fomo: number; pumpDumpProb: number };
  links?: { telegram?: string; dexscreener?: string };
  // Paper-Fields
  entryPrice?: number; lastPrice?: number; qty?: number;
  openedAt?: number; closedAt?: number; realizedUSD?: number;
};

const KEY_OPEN = 'positions:open';
const KEY_CLOSED = 'positions:closed';

async function seedIfEmpty() {
  const open = await kvGet<Position[]>(KEY_OPEN);
  if (!open || open.length === 0) {
    await kvSet(KEY_OPEN, []);
  }
  const closed = await kvGet<Position[]>(KEY_CLOSED);
  if (!closed) await kvSet(KEY_CLOSED, []);
}

export async function getOpenPositions(): Promise<Position[]> {
  await seedIfEmpty();
  return (await kvGet<Position[]>(KEY_OPEN)) ?? [];
}
export async function getClosedPositions(): Promise<Position[]> {
  await seedIfEmpty();
  return (await kvGet<Position[]>(KEY_CLOSED)) ?? [];
}
export async function setOpenPositions(xs: Position[]) { await kvSet(KEY_OPEN, xs); }
export async function setClosedPositions(xs: Position[]) { await kvSet(KEY_CLOSED, xs); }
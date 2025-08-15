import { kvGet, kvSet } from './volatile';

export type Position = {
  id: string; chain: string; name: string; category: string; narrative?: string | null;
  mcap: number; volume: number; investment: number; pnlUSD: number; taxUSD: number;
  holders?: number; txCount?: { buy: number; sell: number };
  scores?: { scorex: number; risk: number; fomo: number; pumpDumpProb: number };
  links?: { telegram?: string; dexscreener?: string };
  // Paper-Felder
  entryPrice?: number; lastPrice?: number; qty?: number;
  openedAt?: number; closedAt?: number; realizedUSD?: number;
};

const KEY_OPEN   = 'positions:open';
const KEY_CLOSED = 'positions:closed';
const KEY_CASH   = 'portfolio:cash';

async function ensureInit() {
  const open = await kvGet<Position[]>(KEY_OPEN);
  if (!open) await kvSet(KEY_OPEN, []);
  const closed = await kvGet<Position[]>(KEY_CLOSED);
  if (!closed) await kvSet(KEY_CLOSED, []);
  const cash = await kvGet<number>(KEY_CASH);
  if (typeof cash !== 'number') await kvSet(KEY_CASH, 120); // Startkapital V1.0
}

export async function getOpenPositions(): Promise<Position[]> {
  await ensureInit();
  return (await kvGet<Position[]>(KEY_OPEN)) ?? [];
}
export async function getClosedPositions(): Promise<Position[]> {
  await ensureInit();
  return (await kvGet<Position[]>(KEY_CLOSED)) ?? [];
}
export async function setOpenPositions(xs: Position[]) { await kvSet(KEY_OPEN, xs); }
export async function setClosedPositions(xs: Position[]) { await kvSet(KEY_CLOSED, xs); }

// interne Cash-Helfer
async function getCash(): Promise<number> {
  const v = await kvGet<number>(KEY_CASH);
  return typeof v === 'number' ? v : 120;
}
async function setCash(v: number) { await kvSet(KEY_CASH, v); }

/**
 * closePosition:
 * - verschiebt Position von "open" nach "closed"
 * - schreibt closedAt & realizedUSD
 * - gutschrift: investment + realizedUSD zurück auf Cash
 */
export async function closePosition(id: string): Promise<boolean> {
  await ensureInit();
  const open = await getOpenPositions();
  const idx = open.findIndex(p => p.id === id);
  if (idx === -1) return false;

  const p: any = open[idx];

  // Preise/Qty möglichst robust ableiten
  const entry = typeof p.entryPrice === 'number' ? p.entryPrice : (typeof p.lastPrice === 'number' ? p.lastPrice : 0);
  const last  = typeof p.lastPrice  === 'number' ? p.lastPrice  : entry;
  const qty   = typeof p.qty        === 'number' ? p.qty        : (entry > 0 && p.investment ? p.investment / entry : 0);

  const realized = typeof p.realizedUSD === 'number' ? p.realizedUSD : (last - entry) * qty;

  // Move
  open.splice(idx, 1);
  const closed = await getClosedPositions();
  const moved: Position & any = {
    ...p,
    closedAt: Date.now(),
    realizedUSD: realized,
    txCount: { ...(p.txCount || {}), sell: (p.txCount?.sell || 0) + 1 },
  };

  await setOpenPositions(open);
  await setClosedPositions([moved, ...closed]);

  // Cash gutschreiben
  const cash = await getCash();
  const invest = typeof p.investment === 'number' ? p.investment : 0;
  await setCash(cash + invest + (realized || 0));

  return true;
}
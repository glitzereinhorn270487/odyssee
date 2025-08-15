import { kvGet, kvSet } from './volatile';

export type Position = {
  id: string;
  chain: string;
  name: string;
  category: string;
  narrative?: string | null;
  mcap: number;
  volume: number;
  investment: number;
  pnlUSD: number;
  taxUSD: number;
  holders?: number;
  txCount?: { buy: number; sell: number };
  scores?: { scorex: number; risk: number; fomo: number; pumpDumpProb: number };
  links?: { telegram?: string; dexscreener?: string };
};

const KEY_OPEN = 'positions:open';
const KEY_CLOSED = 'positions:closed';

async function seedIfEmpty() {
  const open = await kvGet<Position[]>(KEY_OPEN);
  if (!open || open.length === 0) {
    const seed: Position[] = [
      {
        id: '1', chain: 'Solana', name: 'SOL/USDT', category: 'Layer1', narrative: 'DeFi',
        mcap: 9_500_000_000, volume: 250_000_000, investment: 5000, pnlUSD: 1250, taxUSD: 50,
        holders: 12000, txCount: { buy: 45, sell: 12 },
        scores: { scorex: 85, risk: 15, fomo: 70, pumpDumpProb: 0.15 },
        links: { telegram: 'https://t.me/solana', dexscreener: 'https://dexscreener.com/solana' }
      },
      {
        id: '2', chain: 'Solana', name: 'BONK/USDT', category: 'Meme', narrative: 'Community',
        mcap: 350_000_000, volume: 20_000_000, investment: 200, pnlUSD: -35, taxUSD: 5,
        holders: 5000, txCount: { buy: 12, sell: 4 },
        scores: { scorex: 65, risk: 35, fomo: 50, pumpDumpProb: 0.40 },
        links: { telegram: 'https://t.me/bonk', dexscreener: 'https://dexscreener.com/bonk' }
      }
    ];
    await kvSet(KEY_OPEN, seed);
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

export async function closePosition(id: string): Promise<boolean> {
  const open = await getOpenPositions();
  const idx = open.findIndex(p => p.id === id);
  if (idx === -1) return false;
  const [p] = open.splice(idx, 1);
  const closed = await getClosedPositions();
  await kvSet(KEY_OPEN, open);
  await kvSet(KEY_CLOSED, [p, ...closed]);
  return true;
}

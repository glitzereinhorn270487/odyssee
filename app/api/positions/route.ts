// app/api/positions/route.ts
import { NextResponse } from 'next/server';
import {
  getOpenPositions,
  getClosedPositions,
  updatePosition,
  Position,
} from '@/lib/store/positions';
import { fetchDexPriceUsdByMint } from '@/lib/prices/dexscreener';

export const runtime = 'nodejs';

function computePnlUsd(p: Position, price: number): number | undefined {
  const entry = p.entryPriceUsd ?? price;
  if (!entry || !p.investmentUsd) return undefined;
  const qty = p.meta?.qty && Number.isFinite(p.meta.qty)
    ? Number(p.meta.qty)
    : p.investmentUsd / entry;
  if (!qty) return undefined;
  const pnl = (price - entry) * qty;
  return Math.round(pnl * 100) / 100;
}

export async function GET() {
  const open = getOpenPositions();
  const closed = getClosedPositions();

  // Preis nur für offene Positionen nachladen – sparsam & on-demand
  await Promise.all(
    open.map(async (p) => {
      if (!p.mint) return;
      const price = await fetchDexPriceUsdByMint(p.mint).catch(() => undefined);
      if (!price) return;
      const pnlUsd = computePnlUsd(p, price);
      const patch: Partial<Position> = {
        currentPriceUsd: price,
        entryPriceUsd: p.entryPriceUsd ?? price,
        pnlUsd,
      };
      updatePosition(p.id, patch);
    })
  );

  return NextResponse.json({
    open: getOpenPositions(),
    closed: getClosedPositions(),
  });
}

import type { PaperTick } from './types';
import { getOpenPositions, setOpenPositions } from '../store/positions';
import { openPosition, markToMarket, closePositionByPrice } from './portfolio';

const cfg = {
  minUsdPerTrade: 25,
  maxUsdPerTrade: 50,
  tpPct: 0.15,   // +15% Take Profit
  slPct: 0.10,   // -10% Stop Loss
  coolDownMs: 5 * 60 * 1000,
};

const lastBuyTsBySymbol = new Map<string, number>();

function shouldBuy(t: PaperTick): boolean {
  if (!t.priceUsd) return false;
  const vr = (t.volumeUsd1m ?? 0) / Math.max(1, t.volumeUsd5m ?? 1);
  const flow = (t.txBuys1m ?? 0) - (t.txSells1m ?? 0);
  return vr >= 2 && flow > 0; // simple momentum
}

function shouldSell(entry: number, last: number): { sell: boolean; reason?: 'TP'|'SL' } {
  const chg = (last - entry) / entry;
  if (chg >= cfg.tpPct) return { sell: true, reason: 'TP' };
  if (chg <= -cfg.slPct) return { sell: true, reason: 'SL' };
  return { sell: false };
}

export async function onTick(t: PaperTick) {
  const symbol = t.symbol || t.name || t.mint || 'UNKNOWN';
  const price = t.priceUsd;

  // 1) Update offener Positionen
  const open = await getOpenPositions();
  for (const p of open as any[]) {
    if (p.name === symbol) {
      await markToMarket(p.id, price);
      const decision = shouldSell(p.entryPrice, price);
      if (decision.sell) await closePositionByPrice(p.id, price);
    }
  }

  // 2) Buy-Check
  const now = Date.now();
  const last = lastBuyTsBySymbol.get(symbol) || 0;
  if (now - last < cfg.coolDownMs) return;

  if (shouldBuy(t)) {
    const usd = cfg.maxUsdPerTrade;
    const pos = await openPosition(symbol, price, usd);
    if (pos) lastBuyTsBySymbol.set(symbol, now);
  }
}

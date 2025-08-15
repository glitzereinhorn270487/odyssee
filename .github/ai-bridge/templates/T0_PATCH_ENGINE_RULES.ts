import type { PaperTick } from './types';
import { getOpenPositions, setOpenPositions } from '../store/positions';
import { openPosition, markToMarket, closePositionByPrice } from './portfolio';
import { getPolicy } from '../bot/policy';
import { canOpenForMint, postOpenMark, sweepUnconfirmed } from '../bot/rules';
import { getCash } from './portfolio';

function momentumBuySignal(t: PaperTick): boolean {
  if (!t.priceUsd) return false;
  const vr = (t.volumeUsd1m ?? 0) / Math.max(1, t.volumeUsd5m ?? 1);
  const flow = (t.txBuys1m ?? 0) - (t.txSells1m ?? 0);
  return vr >= 2 && flow > 0; // simple momentum
}

export async function onTick(t: PaperTick) {
  const symbol = t.symbol || t.name || t.mint || 'UNKNOWN';
  const price = t.priceUsd;

  // 0) offene Positionen markieren & forcierte Exits (Entry-Bestätigung)
  await sweepUnconfirmed((_p: any) => t.priceUsd);

  // 1) Mark-to-Market & TP/SL (aus Policy)
  const pcy = await getPolicy();
  const open = await getOpenPositions();
  for (const p of open as any[]) {
    if (p.name === symbol) {
      await markToMarket(p.id, price);
      // Forced exit?
      if (p._forceCloseAt) {
        await closePositionByPrice(p.id, p._forceCloseAt);
        continue;
      }
      // Policy TP/SL
      const entry = p.entryPrice ?? price;
      const chg = entry > 0 ? (price - entry) / entry : 0;
      if (pcy.tpPct && chg >= pcy.tpPct) await closePositionByPrice(p.id, price);
      else if (pcy.slPct && chg <= -pcy.slPct) await closePositionByPrice(p.id, price);
    }
  }

  // 2) Entry-Signal
  const wantsBuy = momentumBuySignal(t);
  if (!wantsBuy) return;

  const cash = await getCash();
  const guard = await canOpenForMint(t.mint || symbol, /*tax schätzen*/ undefined);
  if (!guard.allow) return;

  // Positionsgröße
  const maxPerTrade = 50; // V1.0 simple cap
  let usd = Math.min(maxPerTrade, cash);
  if (guard.firstBuyer && typeof guard.capUsd === 'number') {
    usd = Math.min(usd, Math.max(10, Math.floor(guard.capUsd)));
  }
  if (usd < 10) return; // zu wenig Cash

  const pos = await openPosition(symbol, price, usd);
  if (pos) {
    await postOpenMark(t.mint || symbol, pos.id, usd, !!guard.firstBuyer);
  }
}

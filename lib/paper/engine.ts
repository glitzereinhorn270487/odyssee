import type { PaperTick } from './types';
import { getOpenPositions, setOpenPositions } from '@/lib/store/positions';
import { openPosition, markToMarket, closePositionByPrice } from '@/lib/paper/portfolio';
import { getPolicy } from '@/lib/bot/policy';
import { canOpenForMint, postOpenMark, sweepUnconfirmed } from '@/lib/bot/rules';
import { getCash } from '@/lib/paper/portfolio';
import { notifyBuy, notifySell } from '@/lib/telegram/notifier';

function momentumBuySignal(t: PaperTick): boolean {
  if (!t.priceUsd) return false;
  const vr = (t.volumeUsd1m ?? 0) / Math.max(1, t.volumeUsd5m ?? 1);
  const flow = (t.txBuys1m ?? 0) - (t.txSells1m ?? 0);
  return vr >= 2 && flow > 0;
}

export async function onTick(t: PaperTick) {
  const symbol = t.symbol || t.name || t.mint || 'UNKNOWN';
  const price = t.priceUsd;

  // 0) Unconfirmed-Exits prüfen
  await sweepUnconfirmed((_p: any) => t.priceUsd);

  // 1) MTM & TP/SL
  const pcy = await getPolicy();
  const open = await getOpenPositions();
  for (const p of open as any[]) {
    if (p.name === symbol) {
      await markToMarket(p.id, price);
      if (p._forceCloseAt) {
        const approx = (p.entryPrice && p.qty) ? (p._forceCloseAt - p.entryPrice) * p.qty : undefined;
        await notifySell(p, { reason: 'ENTRY_NOT_CONFIRMED', price: p._forceCloseAt, approxPnL: approx });
        await closePositionByPrice(p.id, p._forceCloseAt);
        continue;
      }
      const entry = p.entryPrice ?? price;
      const chg = entry > 0 ? (price - entry) / entry : 0;
      if (pcy.tpPct && chg >= pcy.tpPct) {
        const approx = (p.entryPrice && p.qty) ? (price - p.entryPrice) * p.qty : undefined;
        await notifySell(p, { reason: 'TP', price, approxPnL: approx });
        await closePositionByPrice(p.id, price);
      } else if (pcy.slPct && chg <= -pcy.slPct) {
        const approx = (p.entryPrice && p.qty) ? (price - p.entryPrice) * p.qty : undefined;
        await notifySell(p, { reason: 'SL', price, approxPnL: approx });
        await closePositionByPrice(p.id, price);
      }
    }
  }

  // 2) Entry
  if (!momentumBuySignal(t)) return;
  const cash = await getCash();
  const guard = await canOpenForMint(t.mint || symbol, undefined);
  if (!guard.allow) return;

  const maxPerTrade = 50;
  let usd = Math.min(maxPerTrade, cash);
  if (guard.firstBuyer && typeof guard.capUsd === 'number') {
    usd = Math.min(usd, Math.max(10, Math.floor(guard.capUsd)));
  }
  if (usd < 10) return;

  const pos = await openPosition(symbol, price, usd);
  if (pos) {
    await notifyBuy(pos, { usd });
    await postOpenMark(t.mint || symbol, pos.id, usd, !!guard.firstBuyer);
  }
}
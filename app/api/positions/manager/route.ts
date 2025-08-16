// app/api/positions/manager/route.ts
import { NextResponse } from 'next/server';
import { getOpenPositions, closePosition, updatePosition } from '@/lib/store/positions';

export const runtime = 'nodejs';

export async function GET() {
  const now = Date.now();
  const MAX_AGE_MS = 60 * 60 * 1000; // 1h Zeitfenster als Fallback in V1

  const toClose: string[] = [];
  for (const p of getOpenPositions()) {
    // Beispiel-Regeln V1: „Positionsmanager darf immer auslaufen“
    // 1) Fallback: zu alt -> zu
    if (now - p.openedAt > MAX_AGE_MS) toClose.push(p.id);
    // 2) Optional: Stop-Loss per Meta (z.B. -30%)
    if (typeof p.meta?.hardSL === 'number' && typeof p.entryPriceUsd === 'number' && typeof p.currentPriceUsd === 'number') {
      const drawdown = (p.currentPriceUsd - p.entryPriceUsd) / p.entryPriceUsd;
      if (drawdown <= p.meta.hardSL) toClose.push(p.id);
    }
  }

  for (const id of toClose) closePosition(id, 'manager');
  // leichte Markierung fürs UI
  for (const p of getOpenPositions()) updatePosition(p.id, {});

  return NextResponse.json({ ok: true, closed: toClose.length });
}

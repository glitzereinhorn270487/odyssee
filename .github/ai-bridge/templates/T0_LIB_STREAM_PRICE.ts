import { getSolUsd } from '@/lib/prices/sol';

// Versucht, aus einem Raydium-Swap/Txn-Payload priceUsd abzuleiten
export async function derivePriceUsdFromSwap(payload: any): Promise<number|undefined> {
  // 1) Wenn bereits vorhanden
  const direct = Number(payload?.priceUsd ?? payload?.usd ?? payload?.amountUsd);
  if (Number.isFinite(direct) && direct > 0) return direct;

  // 2) Aus Beträgen (Token/SOL) schätzen
  const side = (payload?.side || payload?.direction || '').toString().toLowerCase(); // 'buy'|'sell'
  const amtToken = Number(payload?.amountToken ?? payload?.tokenAmount ?? payload?.uiTokenAmount);
  const amtSol   = Number(payload?.amountSol   ?? payload?.solAmount   ?? payload?.uiSolAmount);
  const decimals = Number(payload?.tokenDecimals ?? 9);
  if (Number.isFinite(amtToken) && Number.isFinite(amtSol) && amtToken > 0 && amtSol > 0) {
    const tokenQty = amtToken / Math.pow(10, decimals || 0);
    // Preis des Tokens in SOL
    const pxSol = amtSol / tokenQty;
    const solUsd = await getSolUsd();
    if (solUsd > 0) return pxSol * solUsd;
  }

  // 3) Fallback: nichts ableitbar
  return undefined;
}

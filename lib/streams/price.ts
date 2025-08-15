import { getSolUsd } from '@/lib/prices/sol';

export async function derivePriceUsdFromSwap(payload: any): Promise<number|undefined> {
  const direct = Number(payload?.priceUsd ?? payload?.usd ?? payload?.amountUsd);
  if (Number.isFinite(direct) && direct > 0) return direct;

  const amtToken = Number(payload?.amountToken ?? payload?.tokenAmount ?? payload?.uiTokenAmount);
  const amtSol   = Number(payload?.amountSol   ?? payload?.solAmount   ?? payload?.uiSolAmount);
  const decimals = Number(payload?.tokenDecimals ?? 9);

  if (Number.isFinite(amtToken) && Number.isFinite(amtSol) && amtToken > 0 && amtSol > 0) {
    const tokenQty = amtToken / Math.pow(10, decimals || 0);
    const pxSol = amtSol / tokenQty;
    const solUsd = await getSolUsd();
    if (solUsd > 0) return pxSol * solUsd;
  }
  return undefined;
}

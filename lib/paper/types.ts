export type PaperTick = {
  mint?: string; symbol?: string; name?: string;
  chain?: 'Solana';
  priceUsd: number;
  mcapUsd?: number;
  volumeUsd1m?: number;
  volumeUsd5m?: number; // Durchschnitt 5m oder Summe – wir nutzen als Proxy
  txBuys1m?: number;
  txSells1m?: number;
};

export type PaperOrder = {
  side: 'buy'|'sell';
  symbol: string;
  price: number;
  usd: number;
  qty: number;
  ts: number;
};
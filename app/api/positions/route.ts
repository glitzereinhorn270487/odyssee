import { NextResponse } from 'next/server';

export async function GET() {
  const positions = [
    {
      id: '1',
      name: 'SOL/USDT',
      chain: 'Solana',
      category: 'Layer1',
      narrative: 'DeFi',
      mcap: 9500000000,
      volume: 250000000,
      investment: 5000,
      pnlUSD: 1250,
      taxUSD: 50,
      holders: 12000,
      txCount: { buy: 45, sell: 12 },
      scores: { scorex: 85, risk: 15, fomo: 70, pumpDumpProb: 0.15 },
      links: {
        telegram: 'https://t.me/solana',
        dexscreener: 'https://dexscreener.com/solana'
      }
    },
    {
      id: '2',
      name: 'BONK/USDT',
      chain: 'Solana',
      category: 'Meme',
      narrative: 'Community',
      mcap: 350000000,
      volume: 20000000,
      investment: 200,
      pnlUSD: -35,
      taxUSD: 5,
      holders: 5000,
      txCount: { buy: 12, sell: 4 },
      scores: { scorex: 65, risk: 35, fomo: 50, pumpDumpProb: 0.4 },
      links: {
        telegram: 'https://t.me/bonk',
        dexscreener: 'https://dexscreener.com/bonk'
      }
    }
  ];

  return NextResponse.json(positions);
}


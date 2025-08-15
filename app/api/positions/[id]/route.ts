import { NextResponse } from 'next/server';
export const runtime = 'nodejs';

const detail = {
  pos_1: {
    id:'pos_1', chain:'SOL', name:'CATCOIO', category:'meme', narrative:null,
    mcap:1250000, volume:980000, investment:120, pnlUSD:34.5, taxUSD:1.23,
    holders:1403, tx_count:{ buy:230, sell:180 },
    scores:{ scorex:72.4, risk:18, fomo:64, pump_dump_prob:0.22 },
    links:{ telegram:'https://t.me/example', dexscreener:'https://dexscreener.com/solana/xyz' }
  },
  pos_2: {
    id:'pos_2', chain:'SOL', name:'DOGEGOD', category:'meme', narrative:null,
    mcap:845000, volume:2100000, investment:90, pnlUSD:-12.7, taxUSD:0.0,
    holders:803, tx_count:{ buy:120, sell:150 },
    scores:{ scorex:58.2, risk:35, fomo:52, pump_dump_prob:0.33 },
    links:{ telegram:'https://t.me/example2', dexscreener:'https://dexscreener.com' }
  },
  pos_3: {
    id:'pos_3', chain:'SOL', name:'FROGZ', category:'meme', narrative:null,
    mcap:2300000, volume:4500000, investment:110, pnlUSD:220.1, taxUSD:6.6,
    holders:2004, tx_count:{ buy:410, sell:390 },
    scores:{ scorex:81.1, risk:12, fomo:70, pump_dump_prob:0.18 },
    links:{ telegram:'https://t.me/frogz', dexscreener:'https://dexscreener.com/solana/frogz' }
  }
};

export async function GET(_req: Request, ctx: { params: { id: string }}) {
  const id = ctx.params.id;
  const data = (detail as any)[id];
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(data);
}

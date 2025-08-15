import { NextResponse } from 'next/server';
export const runtime = 'nodejs';

const open = [
  {
    id:'pos_1', chain:'SOL', name:'CATCOIO', category:'meme', narrative:null,
    mcap:1250000, volume:980000, investment:120, pnlUSD:34.5, taxUSD:1.23
  },
  {
    id:'pos_2', chain:'SOL', name:'DOGEGOD', category:'meme', narrative:null,
    mcap:845000, volume:2100000, investment:90, pnlUSD:-12.7, taxUSD:0.0
  },
];

const closed = [
  {
    id:'pos_3', chain:'SOL', name:'FROGZ', category:'meme', narrative:null,
    mcap:2300000, volume:4500000, investment:110, pnlUSD:220.1, taxUSD:6.6
  },
];

export async function GET(req: Request) {
  const url = new URL(req.url);
  const status = url.searchParams.get('status') ?? 'open';
  const items = status === 'closed' ? closed : open;
  return NextResponse.json({ items, nextCursor: null });
}

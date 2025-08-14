'use client';
import React, { useMemo, useState, useEffect } from 'react';
import styles from './styles.module.css';

type Position = {
  id: string;
  chain: string;
  name: string;
  category: string;
  narrative?: string | null;
  mcap: number;
  volume: number;
  investment: number;
  pnlUSD: number;
  taxUSD: number;
  holders?: number;
  txCount?: { buy: number; sell: number };
  scores?: {
    scorex: number;
    risk: number;
    fomo: number;
    pumpDumpProb: number;
  };
  links?: { telegram?: string; dexscreener?: string };
};

type SortKey = keyof Pick<
  Position,
  'chain' | 'name' | 'category' | 'narrative' | 'mcap' | 'volume' | 'investment' | 'pnlUSD' | 'taxUSD'
>;
type SortDir = 'asc' | 'desc';

const fmtUSD = (n: number) => n.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
const fmtNum = (n: number) => n.toLocaleString();

function classNames(...xs: Array<string | false | undefined>) {
  return xs.filter(Boolean).join(' ');
}

// ---- Mockdaten (werden später via API ersetzt) ----
const mockOpen: Position[] = [
  {
    id: 'pos_1',
    chain: 'SOL',
    name: 'CATCOIO',
    category: 'meme',
    narrative: null,
    mcap: 1_250_000,
    volume: 980_000,
    investment: 120,
    pnlUSD: 34.5,
    taxUSD: 1.23,
    holders: 1403,
    txCount: { buy: 230, sell: 180 },
    scores: { scorex: 72.4, risk: 18, fomo: 64, pumpDumpProb: 0.22 },
    links: { telegram: 'https://t.me/example', dexscreener: 'https://dexscreener.com/solana/xyz' },
  },
  {
    id: 'pos_2',
    chain: 'SOL',
    name: 'DOGEGOD',
    category: 'meme',
    narrative: null,
    mcap: 845_000,
    volume: 2_100_000,
    investment: 90,
    pnlUSD: -12.7,
    taxUSD: 0.0,
    holders: 803,
    txCount: { buy: 120, sell: 150 },
    scores: { scorex: 58.2, risk: 35, fomo: 52, pumpDumpProb: 0.33 },
    links: { telegram: 'https://t.me/example2', dexscreener: 'https://dexscreener.com' },
  },
];

const mockClosed: Position[] = [
  {
    id: 'pos_3',
    chain: 'SOL',
    name: 'FROGZ',
    category: 'meme',
    narrative: null,
    mcap: 2_300_000,
    volume: 4_500_000,
    investment: 110,
    pnlUSD: 220.1,
    taxUSD: 6.6,
    h

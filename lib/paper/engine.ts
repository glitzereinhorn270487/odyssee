// T0_PAPER_ENGINE_V1.ts
// Minimal lauffähige Paper-Engine für V1.0:
// - nimmt "Ticks" aus Streams entgegen (raydium/pumpfun/test)
// - entscheidet simpel: bei frischem Pool => Paper-Buy
// - schließt Positionen bei Stagnation / Zeitablauf
// - nutzt lib/store/positions (wenn vorhanden), sonst Fallback im Speicher

type Tick = {
  mint: string;
  symbol?: string;
  priceUsd?: number;
  volumeUsd1m?: number;
  volumeUsd5m?: number;
  txBuys1m?: number;
  txSells1m?: number;
  source?: string; // 'quicknode' | 'pumpfun' | 'local-test'
};

type Position = {
  id: string;            // = mint
  chain: 'SOL';
  name: string;          // symbol oder mint short
  category: 'Raydium' | 'PumpFun' | 'Test';
  marketcap?: number;
  volume?: number;
  investmentUsd: number;
  pnlUsd: number;
  taxBuyPct?: number;
  taxSellPct?: number;
  openedAt: number;
  status: 'open' | 'closed';
  reason?: string;
  meta?: Record<string, any>;
};

let storeApi: any = null;
let inMemory: Map<string, Position> | null = null;

// Versucht offiziellen Store zu laden, sonst Fallback.
async function ensureStore() {
  if (storeApi) return storeApi;
  try {
    const mod = await import('@/lib/store/positions');
    // Erwartete Funktionen:
    // listPositions(), getPosition(id), openPosition(pos), updatePosition(id, patch), closePosition(id, reason)
    if (mod && mod.listPositions && mod.openPosition && mod.closePosition) {
      storeApi = mod;
      return storeApi;
    }
  } catch {}
  // Fallback:
  if (!inMemory) inMemory = new Map<string, Position>();
  storeApi = {
    async listPositions() { return Array.from(inMemory!.values()); },
    async getPosition(id: string) { return inMemory!.get(id) || null; },
    async openPosition(p: Position) { inMemory!.set(p.id, p); return p; },
    async updatePosition(id: string, patch: Partial<Position>) {
      const cur = inMemory!.get(id); if (!cur) return null;
      const upd = { ...cur, ...patch }; inMemory!.set(id, upd); return upd;
    },
    async closePosition(id: string, reason?: string) {
      const cur = inMemory!.get(id); if (!cur) return null;
      const upd = { ...cur, status: 'closed', reason: reason || 'closed' }; inMemory!.set(id, upd); return upd;
    },
  };
  return storeApi;
}

// --- einfache Heuristiken / Schwellen für V1.0 (Paper) ---
const CFG = {
  minVol1mUsd: 50,           // mindestens $50 Volumen in 1m
  minBuys1m: 1,              // mindestens 1 Kauf in der letzten Minute (kein "erster Käufer" Risiko)
  investUsd: 5,              // Paper-Invest pro Trade
  stagnationMinutes: 5,      // wenn innerhalb dieses Fensters keine Buys -> schließen
  maxFirstBuyerSlots: 3,     // maximale gleichzeitig offene Positionen ohne Folgekäufer (Safety)
};

// Hilfsfunktionen
function now() { return Date.now(); }
function niceName(t: Tick) {
  const s = (t.symbol || '').trim();
  if (s) return s.toUpperCase();
  return t.mint ? t.mint.slice(0,4)+'…'+t.mint.slice(-4) : 'UNK';
}
function categoryFor(t: Tick): Position['category'] {
  if ((t.source || '').toLowerCase().includes('pump')) return 'PumpFun';
  if ((t.source || '').toLowerCase().includes('quick')) return 'Raydium';
  return 'Test';
}

// Core-Entscheidung: soll Paper-Buy ausgelöst werden?
async function shouldOpen(t: Tick) {
  const vol = Number(t.volumeUsd1m || 0);
  const buys = Number(t.txBuys1m || 0);

  // Basisfilter
  if (vol < CFG.minVol1mUsd) return { ok: false, reason: 'vol_too_low' };

  // "Erster Käufer" Schutz: nur begrenzt parallel erlauben
  if (buys < CFG.minBuys1m) {
    const api = await ensureStore();
    const open = (await api.listPositions()).filter((p: Position) => p.status === 'open');
    const firstBuyerOpen = open.filter((p: Position) => (p.meta?.noFollowers === true)).length;
    if (firstBuyerOpen >= CFG.maxFirstBuyerSlots) {
      return { ok: false, reason: 'no_follower_slots_full' };
    }
    // sonst erlauben, aber markieren
    return { ok: true, noFollowers: true };
  }

  return { ok: true };
}

async function paperOpen(t: Tick) {
  const api = await ensureStore();
  const id = (t.mint || (t.symbol || 'UNK')).trim();
  if (!id) return;

  const exists = await api.getPosition(id);
  if (exists && exists.status === 'open') return; // schon offen

  const pos: Position = {
    id,
    chain: 'SOL',
    name: niceName(t),
    category: categoryFor(t),
    marketcap: undefined,
    volume: t.volumeUsd1m || 0,
    investmentUsd: CFG.investUsd,
    pnlUsd: 0,
    openedAt: now(),
    status: 'open',
    meta: {
      priceUsdAtOpen: t.priceUsd,
      noFollowers: Number(t.txBuys1m || 0) < CFG.minBuys1m,
      src: t.source || 'unknown',
    }
  };
  await api.openPosition(pos);
}

async function paperStagnationSweep() {
  const api = await ensureStore();
  const all: Position[] = await api.listPositions();
  const open = all.filter(p => p.status === 'open');
  const horizonMs = CFG.stagnationMinutes * 60 * 1000;
  const cutoff = now() - horizonMs;
  for (const p of open) {
    // sehr einfache Regel: wenn älter als cutoff UND (als "noFollowers" markiert) -> schließen
    if (p.openedAt < cutoff && p.meta?.noFollowers) {
      await api.closePosition(p.id, 'stagnation_no_followers');
    }
  }
}

// --- Public API (von Streams/Routes aufgerufen) ---
export async function onWebhook(evt: { source?: string; path?: string; payload?: any }) {
  // Hier könnten wir Source-spezifisches Parsing/Mappings machen (Raydium vs Pump.fun)
  // Für V1 Paper reicht unsere spätere onTick-Entscheidung.
  return { ok: true };
}

export async function onTick(t: Tick) {
  // 1) Versuch, zu öffnen
  const dec = await shouldOpen(t);
  if (dec.ok) {
    await paperOpen(t);
  }

  // 2) Stagnation regelmäßig prüfen (lightweight; idempotent)
  await paperStagnationSweep();

  return { ok: true, decision: dec };
}

export default onTick;
// T0_PAPER_ENGINE_TYPESAFE.ts
type Tick = {
  mint: string; symbol?: string; priceUsd?: number;
  volumeUsd1m?: number; volumeUsd5m?: number;
  txBuys1m?: number; txSells1m?: number; source?: string;
};
type Position = {
  id: string; chain: 'SOL'; name: string;
  category: 'Raydium' | 'PumpFun' | 'Test';
  marketcap?: number; volume?: number; investmentUsd: number; pnlUsd: number;
  taxBuyPct?: number; taxSellPct?: number; openedAt: number;
  status: 'open' | 'closed'; reason?: string; meta?: Record<string, any>;
};

let storeApi: any = null;
let inMemory: Map<string, Position> | null = null;

async function ensureStore() {
  if (storeApi) return storeApi;
  try {
    const mod: any = await import('@/lib/store/positions');
    const listFn  = mod.listPositions || mod.list || mod.getAll || mod.all;
    const getFn   = mod.getPosition   || mod.get  || mod.find;
    const openFn  = mod.openPosition  || mod.open || mod.create || mod.add;
    const updFn   = mod.updatePosition|| mod.update|| mod.patch  || mod.set;
    const closeFn = mod.closePosition || mod.close|| mod.remove  || mod.exit || mod.sellPosition;
    if (listFn && openFn && closeFn) {
      storeApi = {
        async listPositions(...a:any[]) { return await listFn(...a); },
        async getPosition(id:string)    { return getFn ? await getFn(id) : null; },
        async openPosition(p:Position)  { return await openFn(p); },
        async updatePosition(id:string, patch:Partial<Position>) {
          return updFn ? await updFn(id, patch) : null;
        },
        async closePosition(id:string, reason?:string) {
          return await closeFn(id, reason);
        },
      };
      return storeApi;
    }
  } catch {}
  if (!inMemory) inMemory = new Map<string, Position>();
  storeApi = {
    async listPositions() { return Array.from(inMemory!.values()); },
    async getPosition(id:string) { return inMemory!.get(id) || null; },
    async openPosition(p:Position) { inMemory!.set(p.id, p); return p; },
    async updatePosition(id:string, patch:Partial<Position>) {
      const cur = inMemory!.get(id); if (!cur) return null;
      const upd = { ...cur, ...patch }; inMemory!.set(id, upd); return upd;
    },
    async closePosition(id:string, reason?:string) {
      const cur = inMemory!.get(id); if (!cur) return null;
      const upd = { ...cur, status:'closed', reason: reason || 'closed' };
      inMemory!.set(id, upd); return upd;
    },
  };
  return storeApi;
}

const CFG = { minVol1mUsd: 50, minBuys1m: 1, investUsd: 5, stagnationMinutes: 5, maxFirstBuyerSlots: 3 };
const now = () => Date.now();
const niceName = (t:Tick) => (t.symbol?.trim() ? t.symbol!.toUpperCase() : (t.mint ? t.mint.slice(0,4)+'…'+t.mint.slice(-4) : 'UNK'));
const categoryFor = (t:Tick): Position['category'] => {
  const s = (t.source || '').toLowerCase();
  if (s.includes('pump')) return 'PumpFun';
  if (s.includes('quick')) return 'Raydium';
  return 'Test';
};

async function shouldOpen(t:Tick) {
  const vol = Number(t.volumeUsd1m || 0);
  const buys = Number(t.txBuys1m || 0);
  if (vol < CFG.minVol1mUsd) return { ok:false, reason:'vol_too_low' };
  if (buys < CFG.minBuys1m) {
    const api = await ensureStore();
    const open = (await api.listPositions()).filter((p:Position)=>p.status==='open');
    const firstBuyerOpen = open.filter((p:Position)=>p.meta?.noFollowers===true).length;
    if (firstBuyerOpen >= CFG.maxFirstBuyerSlots) return { ok:false, reason:'no_follower_slots_full' };
    return { ok:true, noFollowers:true };
  }
  return { ok:true };
}

async function paperOpen(t:Tick) {
  const api = await ensureStore();
  const id = (t.mint || t.symbol || '').trim();
  if (!id) return;
  const exists = await api.getPosition(id);
  if (exists?.status === 'open') return;
  const pos: Position = {
    id, chain:'SOL', name:niceName(t), category:categoryFor(t),
    marketcap: undefined, volume: t.volumeUsd1m || 0,
    investmentUsd: CFG.investUsd, pnlUsd: 0, openedAt: now(),
    status:'open',
    meta:{ priceUsdAtOpen: t.priceUsd, noFollowers: Number(t.txBuys1m||0) < CFG.minBuys1m, src: t.source || 'unknown' }
  };
  await api.openPosition(pos);
}

async function paperStagnationSweep() {
  const api = await ensureStore();
  const all: Position[] = await api.listPositions();
  const open = all.filter(p=>p.status==='open');
  const cutoff = now() - CFG.stagnationMinutes*60*1000;
  for (const p of open) {
    if (p.openedAt < cutoff && p.meta?.noFollowers) {
      await api.closePosition(p.id, 'stagnation_no_followers');
    }
  }
}

export async function onWebhook(_evt:{source?:string; path?:string; payload?:any}) { return { ok:true }; }
export async function onTick(t:Tick) { const d = await shouldOpen(t); if (d.ok) await paperOpen(t); await paperStagnationSweep(); return { ok:true, decision:d }; }
export default onTick;
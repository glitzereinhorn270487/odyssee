'use client';
import React, { useMemo, useState, useEffect } from 'react';
import styles from './styles.module.css';

type Position = {
  id: string; chain: string; name: string; category: string; narrative?: string | null;
  mcap: number; volume: number; investment: number; pnlUSD: number; taxUSD: number;
  holders?: number; txCount?: { buy: number; sell: number };
  scores?: { scorex: number; risk: number; fomo: number; pumpDumpProb: number };
  links?: { telegram?: string; dexscreener?: string };
};
type SortKey = keyof Pick<Position,'chain'|'name'|'category'|'narrative'|'mcap'|'volume'|'investment'|'pnlUSD'|'taxUSD'>;
type SortDir = 'asc'|'desc';

const fmtUSD = (n: number) => n.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
const fmtNum = (n: number) => n.toLocaleString();
function classNames(...xs: Array<string | false | undefined>) { return xs.filter(Boolean).join(' '); }

// --- Mockdaten für Tabellen (werden im nächsten Patch via API ersetzt) ---
const mockOpen: Position[] = [
  { id:'pos_1', chain:'SOL', name:'CATCOIO', category:'meme', narrative:null, mcap:1250000, volume:980000, investment:120, pnlUSD:34.5, taxUSD:1.23,
    holders:1403, txCount:{ buy:230, sell:180 }, scores:{ scorex:72.4, risk:18, fomo:64, pumpDumpProb:0.22 },
    links:{ telegram:'https://t.me/example', dexscreener:'https://dexscreener.com/solana/xyz' } },
  { id:'pos_2', chain:'SOL', name:'DOGEGOD', category:'meme', narrative:null, mcap:845000, volume:2100000, investment:90, pnlUSD:-12.7, taxUSD:0.0,
    holders:803, txCount:{ buy:120, sell:150 }, scores:{ scorex:58.2, risk:35, fomo:52, pumpDumpProb:0.33 },
    links:{ telegram:'https://t.me/example2', dexscreener:'https://dexscreener.com' } },
];
const mockClosed: Position[] = [
  { id:'pos_3', chain:'SOL', name:'FROGZ', category:'meme', narrative:null, mcap:2300000, volume:4500000, investment:110, pnlUSD:220.1, taxUSD:6.6,
    holders:2004, txCount:{ buy:410, sell:390 }, scores:{ scorex:81.1, risk:12, fomo:70, pumpDumpProb:0.18 },
    links:{ telegram:'https://t.me/frogz', dexscreener:'https://dexscreener.com/solana/frogz' } },
];

export default function DashboardPage() {
  const [botStatus, setBotStatus] = useState<'OFF'|'PAPER'|'LIVE'>('OFF');
  const [level, setLevel] = useState<'low'|'mid'|'high'>('low');
  const [showSettings, setShowSettings] = useState(false);
  const [detail, setDetail] = useState<Position | null>(null);
  const [timeWindow, setTimeWindow] = useState<'30m'|'1h'|'6h'|'12h'|'24h'>('1h');
  const [sortKey, setSortKey] = useState<SortKey>('pnlUSD');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // Panels
  const [freeUSD, setFreeUSD] = useState<number>(118.72);
  const [pnl24h, setPnl24h] = useState<number>(42.70);
  const [traffic, setTraffic] = useState<{ color:'green'|'yellow'|'red'; winrate:number; factor:number }>({ color:'green', winrate:0.62, factor:1.8 });

  // Tabellen (noch Mock)
  const openPositions = useMemo(() => sortPositions(mockOpen, sortKey, sortDir), [sortKey, sortDir]);
  const closedPositions = useMemo(() => sortPositions(mockClosed, sortKey, sortDir), [sortKey, sortDir]);

  // --- API: Initial laden ---
  useEffect(() => {
    (async () => {
      try {
        const s = await fetch('/api/bot/status', { cache: 'no-store' }).then(r => r.json());
        setBotStatus(s.status); setLevel(s.level ?? 'low');
      } catch {}
      try {
        const t = await fetch('/api/treasury', { cache: 'no-store' }).then(r => r.json());
        setFreeUSD(t.free_usd ?? 0);
      } catch {}
      try {
        const p = await fetch('/api/analytics/pnl?window=24h', { cache: 'no-store' }).then(r => r.json());
        setPnl24h(p.pnl_usd ?? 0);
      } catch {}
      try {
        const a = await fetch('/api/analytics/trafficlight', { cache: 'no-store' }).then(r => r.json());
        setTraffic(a);
      } catch {}
    })();
  }, []);

  // --- Handlers Start/Stop ---
  async function handleStart() {
    const res = await fetch('/api/bot/start', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ level })});
    const data = await res.json();
    setBotStatus(data.status); setLevel(data.level ?? 'low');
  }
  async function handleStop() {
    const res = await fetch('/api/bot/stop', { method: 'POST' });
    const data = await res.json();
    setBotStatus(data.status);
  }

  useEffect(() => { if (!detail) setTimeWindow('1h'); }, [detail]);

  return (
    <div className={styles.page}>
      <TopBar
        status={botStatus}
        level={level}
        setLevel={setLevel}
        onStart={handleStart}
        onStop={handleStop}
        onOpenSettings={() => setShowSettings(true)}
      />

      <div className={styles.grid}>
        <div className={styles.mainCol}>
          <Panel title="Offene Positionen">
            <PositionsTable items={openPositions} onRowClick={setDetail} sortKey={sortKey} sortDir={sortDir} onSort={k => handleSort(setSortKey, setSortDir, sortKey, sortDir, k)} />
          </Panel>

          <Panel title="Geschlossene Positionen" className={styles.mt12}>
            <PositionsTable items={closedPositions} onRowClick={setDetail} sortKey={sortKey} sortDir={sortDir} onSort={k => handleSort(setSortKey, setSortDir, sortKey, sortDir, k)} />
          </Panel>

          <div className={styles.footerRow}>
            <TaxExportPanel />
          </div>
        </div>

        <div className={styles.sideCol}>
          <Card title="Freies Kapital">
            <div className={styles.valueBig}>{fmtUSD(freeUSD)}</div>
          </Card>

          <TrafficLightCard className={styles.mt12} winrate={traffic.winrate} factor={traffic.factor} color={traffic.color} />

          <Card title="PnL (24h)" className={styles.mt12}>
            <div className={classNames(styles.valueMed, ' ', pnl24h >= 0 ? styles.positive : styles.negative)}>
              {pnl24h >= 0 ? '+' : ''} {fmtUSD(Math.abs(pnl24h))}
            </div>
          </Card>
        </div>
      </div>

      {showSettings && (<SettingsModal onClose={() => setShowSettings(false)} />)}
      {detail && (<DetailDrawer position={detail} timeWindow={timeWindow} onTimeWindow={setTimeWindow} onClose={() => setDetail(null)} onSell={() => alert('Sell Position (TODO API)')} />)}
    </div>
  );
}

function handleSort(setKey: any, setDir: any, oldKey: any, oldDir: any, k: any) {
  if (k === oldKey) setDir(oldDir === 'asc' ? 'desc' : 'asc');
  else { setKey(k); setDir('desc'); }
}

function sortPositions(items: Position[], key: SortKey, dir: SortDir) {
  const arr = [...items];
  arr.sort((a, b) => {
    const va = (a[key] ?? '') as any, vb = (b[key] ?? '') as any;
    if (typeof va === 'number' && typeof vb === 'number') return dir === 'asc' ? va - vb : vb - va;
    const sa = String(va).toLowerCase(), sb = String(vb).toLowerCase();
    return dir === 'asc' ? sa.localeCompare(sb) : sb.localeCompare(sa);
  });
  return arr;
}

// ------- UI (unverändert zur vorherigen Version) -------
function TopBar(props: {
  status: 'OFF'|'PAPER'|'LIVE'; level: 'low'|'mid'|'high';
  setLevel: (v:any)=>void; onStart: ()=>void; onStop: ()=>void; onOpenSettings: ()=>void;
}) {
  const { status, level, setLevel, onStart, onStop, onOpenSettings } = props;
  return (
    <div className={styles.topbar}>
      <div className={styles.leftGroup}>
        <button className={classNames(styles.btn, styles.btnStart)} onClick={onStart} disabled={status !== 'OFF'}>Agent starten</button>
        <button className={classNames(styles.btn, styles.btnStop)} onClick={onStop} disabled={status === 'OFF'}>Agent stoppen</button>
        <div className={styles.level}>
          <span className={styles.badge}>Investmentstufe</span>
          <select className={styles.select} value={level} onChange={e => setLevel(e.target.value as any)}>
            <option value="low">Paper / Low</option>
            <option value="mid">Live / Mid</option>
            <option value="high">Live / High</option>
          </select>
        </div>
      </div>
      <div className={styles.rightGroup}>
        <button className={classNames(styles.btn, styles.btnSettings)} onClick={onOpenSettings}>Einstellungen</button>
      </div>
    </div>
  );
}

function Panel(props: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={[styles.panel, props.className].filter(Boolean).join(' ')}>
      <div className={styles.panelHeader}><h3>{props.title}</h3></div>
      <div className={styles.panelBody}>{props.children}</div>
    </div>
  );
}

function Card(props: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={[styles.card, props.className].filter(Boolean).join(' ')}>
      <div className={styles.cardTitle}>{props.title}</div>
      <div className={styles.cardBody}>{props.children}</div>
    </div>
  );
}

function TrafficLightCard(props: { className?: string; color: 'green'|'yellow'|'red'; winrate: number; factor: number }) {
  const { className, color, winrate, factor } = props;
  return (
    <div className={[styles.card, className].filter(Boolean).join(' ')}>
      <div className={styles.cardTitle}>Ampelsystem</div>
      <div className={styles.cardBody}>
        <div className={styles.trafficRow}>
          <div className={[styles.light, styles[color]].join(' ')} />
          <div className={styles.tStats}>
            <div>Gewinnrate: <strong>{Math.round(winrate * 100)}%</strong></div>
            <div>Gewinnfaktor: <strong>{factor.toFixed(2)}x</strong></div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PositionsTable(props: {
  items: Position[]; onRowClick: (p: Position) => void;
  sortKey: SortKey; sortDir: SortDir; onSort: (k: SortKey) => void;
}) {
  const { items, onRowClick, sortKey, sortDir, onSort } = props;
  const headers: { key: SortKey; label: string }[] = [
    { key:'chain', label:'Chain' }, { key:'name', label:'Name' }, { key:'category', label:'Kategorie' },
    { key:'narrative', label:'Narrative' }, { key:'mcap', label:'Marketcap' }, { key:'volume', label:'Volumen' },
    { key:'investment', label:'Investmenthöhe' }, { key:'pnlUSD', label:'G/V ($)' }, { key:'taxUSD', label:'TAX' },
  ];
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            {headers.map(h => (
              <th key={h.key} onClick={() => onSort(h.key)} className={styles.sortable}>
                {h.label}
                <span className={[styles.sortCaret, sortKey === h.key ? styles[sortDir] : ''].join(' ')}>▾</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map(it => (
            <tr key={it.id} className={styles.row} onClick={() => onRowClick(it)}>
              <td>{it.chain}</td><td>{it.name}</td><td>{it.category}</td>
              <td className={styles.dim}>{it.narrative ?? '—'}</td>
              <td>{fmtNum(it.mcap)}</td><td>{fmtNum(it.volume)}</td>
              <td>{fmtUSD(it.investment)}</td>
              <td className={it.pnlUSD >= 0 ? styles.positive : styles.negative}>{fmtUSD(it.pnlUSD)}</td>
              <td>{fmtUSD(it.taxUSD)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DetailDrawer(props: {
  position: Position; timeWindow: '30m'|'1h'|'6h'|'12h'|'24h';
  onTimeWindow: (w:any)=>void; onClose: ()=>void; onSell: ()=>void;
}) {
  const { position: p, timeWindow, onTimeWindow, onClose, onSell } = props;
  return (
   <div>
  <span className={styles.dim}>G/V ($)</span>
  <div className={p.pnlUSD >= 0 ? styles.positive : styles.negative}>
    {fmtUSD(p.pnlUSD)}
    </div>
    </div>
 <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.modalTitle}>{p.name} <span className={styles.badge}>{p.chain}</span></div>
          <div className={styles.modalActions}>
            <select className={styles.select} value={timeWindow} onChange={e => onTimeWindow(e.target.value)}>
              <option value="30m">letzte 30 Min</option><option value="1h">letzte Stunde</option>
              <option value="6h">vor 6 Stunden</option><option value="12h">vor 12 Stunden</option>
              <option value="24h">vor 24 Stunden</option>
            </select>
            <button className={classNames(styles.btn, styles.btnSell)} onClick={onSell}>Sell Position</button>
            <button className={classNames(styles.btn)} onClick={onClose}>Schließen</button>
          </div>
        </div>
        <div className={styles.modalBody}>
          <div className={styles.detailGrid}>
            <div><span className={styles.dim}>Kategorie</span><div>{p.category}</div></div>
            <div><span className={styles.dim}>Narrative</span><div>{p.narrative ?? '—'}</div></div>
            <div><span className={styles.dim}>Marketcap</span><div>{fmtNum(p.mcap)}</div></div>
            <div><span className={styles.dim}>Volumen</span><div>{fmtNum(p.volume)}</div></div>
            <div><span className={styles.dim}>Investmenthöhe</span><div>{fmtUSD(p.investment)}</div></div>
            <div><span className={p.pnlUSD >= 0 ? styles.positive : styles.negative}>{fmtUSD(p.pnlUSD)}</div></div>
            <div><span className={styles.dim}>TAX</span><div>{fmtUSD(p.taxUSD)}</div></div>
            <div><span className={styles.dim}>Holderanzahl</span><div>{fmtNum(p.holders ?? 0)}</div></div>
            <div><span className={styles.dim}>Transaktionen</span><div>Buy {p.txCount?.buy ?? 0} • Sell {p.txCount?.sell ?? 0}</div></div>
            <div><span className={styles.dim}>ScoreX</span><div>{p.scores?.scorex ?? '—'}</div></div>
            <div><span className={styles.dim}>RiskScore</span><div>{p.scores?.risk ?? '—'}</div></div>
            <div><span className={styles.dim}>FomoScore</span><div>{p.scores?.fomo ?? '—'}</div></div>
            <div><span className={styles.dim}>P&D Wahrscheinlichkeit</span><div>{(p.scores?.pumpDumpProb ?? 0).toFixed(2)}</div></div>
            <div><span className={styles.dim}>Links</span>
              <div className={styles.linkList}>
                {p.links?.telegram && <a href={p.links.telegram} target="_blank">Telegram</a>}
                {p.links?.dexscreener && <a href={p.links.dexscreener} target="_blank">DexScreener</a>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingsModal(props: { onClose: () => void }) {
  const [global, setGlobal] = useState(true);
  const [cats, setCats] = useState({ signals: true, buy: true, sell: true, startstop: true, risk: true, pnl: true });
  const [events, setEvents] = useState({ newSignal: true, entry: true, exit: true, stopLoss: true, warning: true, dailyPnl: true });

  function save() { /* TODO: POST /api/settings/telegram */ props.onClose(); }

  return (
    <div className={styles.modalOverlay} onClick={props.onClose}>
      <div className={[styles.modal, styles.glassy].join(' ')} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.modalTitle}>Einstellungen • Telegram</div>
          <div className={styles.modalActions}>
            <button className={classNames(styles.btn)} onClick={props.onClose}>Abbrechen</button>
            <button className={classNames(styles.btn, styles.btnStart)} onClick={save}>Speichern</button>
          </div>
        </div>
        <div className={styles.modalBody}>
          <div className={styles.settingsGrid}>
            <div className={styles.settingsCard}>
              <div className={styles.cardTitle}>Global</div>
              <label className={styles.switch}><input type="checkbox" checked={global} onChange={e => setGlobal(e.target.checked)} /><span>Alle Benachrichtigungen</span></label>
            </div>
            <div className={styles.settingsCard}>
              <div className={styles.cardTitle}>Rubriken</div>
              {Object.entries(cats).map(([k,v]) => (
                <label key={k} className={styles.switch}><input type="checkbox" checked={v} onChange={e => setCats({ ...cats, [k]: e.target.checked })} /><span>{k}</span></label>
              ))}
            </div>
            <div className={styles.settingsCard}>
              <div className={styles.cardTitle}>Einzelevents</div>
              {Object.entries(events).map(([k,v]) => (
                <label key={k} className={styles.switch}><input type="checkbox" checked={v} onChange={e => setEvents({ ...events, [k]: e.target.checked })} /><span>{k}</span></label>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TaxExportPanel() {
  const [range, setRange] = useState<'30d'|'90d'|'ytd'|'custom'>('30d');
  function download() {
    // ruft unsere API und lädt Text herunter
    const url = `/api/tax/export`; // (from/to optional)
    const a = document.createElement('a');
    a.href = url; a.download = `tax-export-${range}.txt`; a.click();
  }
  return (
    <div className={styles.taxPanel}>
      <div>
        <div className={styles.cardTitle}>Steuer-Export</div>
        <select className={styles.select} value={range} onChange={e => setRange(e.target.value as any)}>
          <option value="30d">Letzter Monat</option><option value="90d">Letzte 90 Tage</option>
          <option value="ytd">YTD</option><option value="custom">Benutzerdefiniert</option>
        </select>
      </div>
      <button className={classNames(styles.btn, styles.btnStart)} onClick={download}>Download</button>
    </div>
  );
}

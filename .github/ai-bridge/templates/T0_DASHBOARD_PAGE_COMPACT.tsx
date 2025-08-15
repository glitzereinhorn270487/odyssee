'use client';

import * as React from 'react';

type BotStatus = { status: 'OFF'|'PAPER'|'LIVE'; level?: 'low'|'mid'|'high' };
type Position = {
  id: string;
  name?: string;
  chain?: string;
  category?: string;
  narrative?: string;
  marketcap?: number;
  volume?: number;
  sizeUSD?: number;
  pnlUSD?: number;
  taxPct?: number;
  status?: 'open'|'closed';
  closed?: boolean;
};

export default function DashboardPage() {
  const [st, setSt] = React.useState<BotStatus>({ status: 'OFF' });
  const [busy, setBusy] = React.useState<'start'|'stop'|null>(null);
  const [openPos, setOpenPos] = React.useState<Position[]>([]);
  const [closedPos, setClosedPos] = React.useState<Position[]>([]);

  async function loadStatus() {
    try {
      const r = await fetch('/api/bot/status', { cache: 'no-store' });
      const j = await r.json();
      setSt(j);
    } catch {}
  }
  async function loadPositions() {
    try {
      const r = await fetch('/api/positions', { cache: 'no-store' });
      const j = await r.json();
      const arr: Position[] = Array.isArray(j) ? j : (Array.isArray(j?.items) ? j.items : []);
      const open = arr.filter(p => !(p.closed || p.status === 'closed'));
      const closed = arr.filter(p => (p.closed || p.status === 'closed'));
      setOpenPos(open);
      setClosedPos(closed);
    } catch {}
  }

  React.useEffect(() => {
    loadStatus();
    loadPositions();
    const id = setInterval(() => { loadStatus(); }, 3000);
    const id2 = setInterval(() => { loadPositions(); }, 10000);
    return () => { clearInterval(id); clearInterval(id2); };
  }, []);

  async function doStart(level: 'low'|'mid'|'high'='low') {
    setBusy('start');
    try {
      const r = await fetch('/api/bot/start', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ level })
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      await loadStatus();
    } catch (e) {
      console.error('start failed', e);
    } finally {
      setBusy(null);
    }
  }
  async function doStop() {
    setBusy('stop');
    try {
      const r = await fetch('/api/bot/stop', { method: 'POST' });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      await loadStatus();
    } catch (e) {
      console.error('stop failed', e);
    } finally {
      setBusy(null);
    }
  }

  const running = st.status !== 'OFF';

  return (
    <main style={styles.page}>
      {/* Topbar */}
      <div style={styles.topbar}>
        <div style={styles.titleWrap}>
          <h1 style={styles.h1}>Odyssee · Dashboard</h1>
        </div>
        <div style={styles.controls}>
          <button
            type="button"
            onClick={() => doStart('low')}
            disabled={busy !== null || running}
            style={{
              ...styles.btn,
              background: running ? '#10b981' : '#16a34a',
              opacity: busy==='start' ? 0.75 : 1,
              cursor: (busy!==null || running) ? 'not-allowed' : 'pointer'
            }}
            aria-label="Agent starten"
            title={running ? 'Aktiv' : 'Agent starten'}
          >
            {running ? 'Aktiv' : (busy==='start' ? '… startet' : 'Agent starten')}
          </button>

          <button
            type="button"
            onClick={doStop}
            disabled={busy !== null || !running}
            style={{
              ...styles.btn,
              background: running ? '#ef4444' : '#6b7280',
              opacity: busy==='stop' ? 0.75 : 1,
              cursor: (busy!==null || !running) ? 'not-allowed' : 'pointer'
            }}
            aria-label="Agent stoppen"
            title={running ? 'Agent stoppen' : 'Inaktiv'}
          >
            {running ? (busy==='stop' ? '… stoppt' : 'Agent stoppen') : 'Inaktiv'}
          </button>
        </div>
      </div>

      {/* Panels */}
      <section style={styles.panelCol}>
        <Panel title="Offene Positionen">
          <PositionsTable rows={openPos} />
        </Panel>
        <Panel title="Geschlossene Positionen">
          <PositionsTable rows={closedPos} />
        </Panel>
      </section>
    </main>
  );
}

/* ---------- Subcomponents ---------- */

function Panel(props: { title: string; children: React.ReactNode }) {
  return (
    <div style={styles.panel}>
      <div style={styles.panelHeader}>
        <h2 style={styles.h2}>{props.title}</h2>
      </div>
      <div style={{padding:16}}>
        {props.children}
      </div>
    </div>
  );
}

function PositionsTable({ rows }: { rows: Position[] }) {
  return (
    <div style={{overflowX:'auto'}}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th>Chain</th>
            <th>Name</th>
            <th>Kategorie</th>
            <th>Narrative</th>
            <th>Marketcap</th>
            <th>Volumen</th>
            <th>Investment</th>
            <th>G/V (USD)</th>
            <th>TAX (%)</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={9} style={{textAlign:'center',opacity:.6,padding:16}}>Keine Daten</td></tr>
          ) : rows.map((p) => (
            <tr key={p.id}>
              <td>{p.chain ?? '-'}</td>
              <td>{p.name ?? '-'}</td>
              <td>{p.category ?? '-'}</td>
              <td>{p.narrative ?? '-'}</td>
              <td>{fmtNum(p.marketcap)}</td>
              <td>{fmtNum(p.volume)}</td>
              <td>{fmtUSD(p.sizeUSD)}</td>
              <td style={{color: (p.pnlUSD ?? 0) >= 0 ? '#10b981' : '#ef4444'}}>{fmtUSD(p.pnlUSD)}</td>
              <td>{p.taxPct != null ? `${p.taxPct}%` : '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---------- Helpers & Styles ---------- */
function fmtUSD(n?: number) {
  if (typeof n !== 'number') return '-';
  try { return new Intl.NumberFormat(undefined, { style:'currency', currency:'USD', maximumFractionDigits:2 }).format(n); }
  catch { return `$${n.toFixed(2)}`; }
}
function fmtNum(n?: number) {
  if (typeof n !== 'number') return '-';
  try { return new Intl.NumberFormat().format(n); } catch { return String(n); }
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    padding: 20,
    background: 'linear-gradient(135deg,#0b0d10 0%,#171a1f 100%)',
    color: '#e5e7eb',
    minHeight: '100dvh'
  },
  topbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 18
  },
  titleWrap: { display:'flex', alignItems:'center', gap:12 },
  h1: { margin:0, fontSize: 24, fontWeight: 800, letterSpacing: .2 },
  controls: { display: 'flex', gap: 10, alignItems: 'center' },
  btn: {
    padding: '10px 14px',
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,.12)',
    color: '#fff',
    fontWeight: 700,
    letterSpacing: .2,
    boxShadow: '0 8px 24px rgba(0,0,0,.25)',
    transition: 'transform .06s ease',
  },
  panelCol: { display: 'grid', gridTemplateColumns: '1fr', gap: 16 },
  panel: {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 16,
    backdropFilter: 'blur(6px)',
    boxShadow: '0 10px 30px rgba(0,0,0,.25)'
  },
  panelHeader: {
    padding: '12px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.06)'
  },
  h2: { margin:0, fontSize: 16, fontWeight: 700, letterSpacing: .2 },
  table: {
    width:'100%',
    borderCollapse:'separate',
    borderSpacing: 0,
    fontSize: 13
  }
};

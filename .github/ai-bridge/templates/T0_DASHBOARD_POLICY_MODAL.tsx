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
const fmtUSD = (n:number)=> n.toLocaleString(undefined,{style:'currency',currency:'USD',maximumFractionDigits:2});
const fmtNum = (n:number)=> n.toLocaleString();
function classNames(...xs:(string|false|undefined)[]){return xs.filter(Boolean).join(' ');}

export default function DashboardPage(){
  const [botStatus,setBotStatus]=useState<'OFF'|'PAPER'|'LIVE'>('OFF');
  const [level,setLevel]=useState<'low'|'mid'|'high'>('low');
  const [showSettings,setShowSettings]=useState(false);
  const [showPolicy,setShowPolicy]=useState(false);
  const [detail,setDetail]=useState<Position|null>(null);
  const [timeWindow,setTimeWindow]=useState<'30m'|'1h'|'6h'|'12h'|'24h'>('1h');

  const [sortKey,setSortKey]=useState<SortKey>('pnlUSD');
  const [sortDir,setSortDir]=useState<SortDir>('desc');

  const [freeUSD,setFreeUSD]=useState<number>(118.72);
  const [pnl24h,setPnl24h]=useState<number>(42.7);
  const [traffic,setTraffic]=useState<{color:'green'|'yellow'|'red';winrate:number;factor:number}>({color:'green',winrate:0.62,factor:1.8});

  const [openPositions,setOpenPositions]=useState<Position[]>([]);
  const [closedPositions,setClosedPositions]=useState<Position[]>([]);

  const openSorted=useMemo(()=>sortPositions(openPositions,sortKey,sortDir),[openPositions,sortKey,sortDir]);
  const closedSorted=useMemo(()=>sortPositions(closedPositions,sortKey,sortDir),[closedPositions,sortKey,sortDir]);

  useEffect(()=>{(async()=>{
    try{const s=await fetch('/api/bot/status',{cache:'no-store'}).then(r=>r.json()); if(s?.status)setBotStatus(s.status); if(s?.level)setLevel(s.level);}catch{}
    try{const t=await fetch('/api/treasury',{cache:'no-store'}).then(r=>r.json()); if(typeof t?.free_usd==='number') setFreeUSD(t.free_usd);}catch{}
    try{const p=await fetch('/api/analytics/pnl?window=24h',{cache:'no-store'}).then(r=>r.json()); if(typeof p?.pnl_usd==='number') setPnl24h(p.pnl_usd);}catch{}
    try{const a=await fetch('/api/analytics/trafficlight',{cache:'no-store'}).then(r=>r.json()); if(a?.color) setTraffic(a);}catch{}
    try{const o=await fetch('/api/positions?status=open',{cache:'no-store'}).then(r=>r.json()); setOpenPositions(Array.isArray(o)?o:(Array.isArray(o?.items)?o.items:[]));}catch{}
    try{const c=await fetch('/api/positions?status=closed',{cache:'no-store'}).then(r=>r.json()); setClosedPositions(Array.isArray(c)?c:(Array.isArray(c?.items)?c.items:[]));}catch{}
  })();},[]);

  async function handleStart(){const res=await fetch('/api/bot/start',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({level})});const d=await res.json(); if(d?.status)setBotStatus(d.status); if(d?.level)setLevel(d.level);}
  async function handleStop(){const d=await fetch('/api/bot/stop',{method:'POST'}).then(r=>r.json()); if(d?.status)setBotStatus(d.status);}

  async function openDetail(p:Position){
    try{
      const d=await fetch(`/api/positions/${encodeURIComponent(p.id)}?timeWindow=${timeWindow}`,{cache:'no-store'}).then(r=>r.json());
      setDetail({...p,
        holders:d?.holders??p.holders,
        txCount:d?.tx_count?{buy:d.tx_count.buy??0,sell:d.tx_count.sell??0}:p.txCount,
        scores:d?.scores?{scorex:d.scores.scorex??p.scores?.scorex??0,risk:d.scores.risk??p.scores?.risk??0,fomo:d.scores.fomo??p.scores?.fomo??0,pumpDumpProb:d.scores.pump_dump_prob??p.scores?.pumpDumpProb??0}:p.scores,
        links:d?.links?{telegram:d.links.telegram,dexscreener:d.links.dexscreener}:p.links,
      });
    }catch{ setDetail(p);}
  }
  useEffect(()=>{ if(!detail) return; (async()=>{ try{
    const d=await fetch(`/api/positions/${encodeURIComponent(detail.id)}?timeWindow=${timeWindow}`,{cache:'no-store'}).then(r=>r.json());
    setDetail(cur=>cur?{...cur,
      holders:d?.holders??cur.holders,
      txCount:d?.tx_count?{buy:d.tx_count.buy??0,sell:d.tx_count.sell??0}:cur.txCount,
      scores:d?.scores?{scorex:d.scores.scorex??cur.scores?.scorex??0,risk:d.scores.risk??cur.scores?.risk??0,fomo:d.scores.fomo??cur.scores?.fomo??0,pumpDumpProb:d.scores.pump_dump_prob??cur.scores?.pumpDumpProb??0}:cur.scores,
      links:d?.links?{telegram:d.links.telegram,dexscreener:d.links.dexscreener}:cur.links,
    }:cur);}catch{} })(); },[timeWindow,detail?.id]);

  async function handleSell(id:string){
    const ok=(await fetch(`/api/positions/${encodeURIComponent(id)}/sell`,{method:'POST'}).then(r=>r.json()))?.ok;
    if(ok){ setOpenPositions(list=>list.filter(x=>x.id!==id)); setClosedPositions(list=>{const f=openPositions.find(x=>x.id===id); return f?[{...f},...list]:list;}); setDetail(null); alert('Verkauf ausgelöst (Stub)');}
    else alert('Sell fehlgeschlagen');
  }

  return (
    <div className={styles.page}>
      <TopBar status={botStatus} level={level} setLevel={setLevel} onStart={handleStart} onStop={handleStop}
        onOpenSettings={()=>setShowSettings(true)} onOpenPolicy={()=>setShowPolicy(true)} />
      <div className={styles.grid}>
        <div className={styles.mainCol}>
          <Panel title="Offene Positionen"><PositionsTable items={openSorted} onRowClick={openDetail}
            sortKey={sortKey} sortDir={sortDir} onSort={(k)=>handleSort(setSortKey,setSortDir,sortKey,sortDir,k)} /></Panel>
          <Panel title="Geschlossene Positionen" className={styles.mt12}><PositionsTable items={closedSorted}
            onRowClick={openDetail} sortKey={sortKey} sortDir={sortDir}
            onSort={(k)=>handleSort(setSortKey,setSortDir,sortKey,sortDir,k)} /></Panel>
          <div className={styles.footerRow}><TaxExportPanel/></div>
        </div>
        <div className={styles.sideCol}>
          <Card title="Freies Kapital"><div className={styles.valueBig}>{fmtUSD(freeUSD)}</div></Card>
          <TrafficLightCard className={styles.mt12} winrate={traffic.winrate} factor={traffic.factor} color={traffic.color}/>
          <Card title="PnL (24h)" className={styles.mt12}>
            <div className={classNames(styles.valueMed,' ',pnl24h>=0?styles.positive:styles.negative)}>
              {pnl24h>=0?'+':''} {fmtUSD(Math.abs(pnl24h))}
            </div>
          </Card>
        </div>
      </div>

      {showSettings && <SettingsModal onClose={()=>setShowSettings(false)}/>}
      {showPolicy && <PolicyModal onClose={()=>setShowPolicy(false)}/>}

      {detail && <DetailDrawer position={detail} timeWindow={timeWindow} onTimeWindow={setTimeWindow}
        onClose={()=>setDetail(null)} onSell={()=>handleSell(detail.id)} />}
    </div>
  );
}

function handleSort(setKey:(k:SortKey)=>void,setDir:(d:SortDir)=>void,oldKey:SortKey,oldDir:SortDir,k:SortKey){
  if(k===oldKey) setDir(oldDir==='asc'?'desc':'asc'); else { setKey(k); setDir('desc'); }
}
function sortPositions(items:Position[],key:SortKey,dir:SortDir){
  const arr=[...items];
  arr.sort((a,b)=>{ const va=(a[key]??'') as any, vb=(b[key]??'') as any;
    if(typeof va==='number'&&typeof vb==='number') return dir==='asc'?va-vb:vb-va;
    const sa=String(va).toLowerCase(), sb=String(vb).toLowerCase(); return dir==='asc'?sa.localeCompare(sb):sb.localeCompare(sa);
  }); return arr;
}

// UI Bits...
function TopBar(p:{status:'OFF'|'PAPER'|'LIVE';level:'low'|'mid'|'high';setLevel:(v:any)=>void;onStart:()=>void;onStop:()=>void;onOpenSettings:()=>void;onOpenPolicy:()=>void;}){
  const {status,level,setLevel,onStart,onStop,onOpenSettings,onOpenPolicy}=p;
  return <div className={styles.topbar}>
    <div className={styles.leftGroup}>
      <button className={classNames(styles.btn,styles.btnStart)} onClick={onStart} disabled={status!=='OFF'}>Agent starten</button>
      <button className={classNames(styles.btn,styles.btnStop)} onClick={onStop} disabled={status==='OFF'}>Agent stoppen</button>
      <div className={styles.level}><span className={styles.badge}>Investmentstufe</span>
        <select className={styles.select} value={level} onChange={(e)=>setLevel(e.target.value as any)}>
          <option value="low">Paper / Low</option><option value="mid">Live / Mid</option><option value="high">Live / High</option>
        </select></div>
    </div>
    <div className={styles.rightGroup}>
      <button className={classNames(styles.btn,styles.btnSettings)} onClick={onOpenPolicy}>Regeln & Limits</button>
      <button className={classNames(styles.btn,styles.btnSettings)} onClick={onOpenSettings}>Einstellungen</button>
    </div>
  </div>;
}

function Panel(props:{title:string;children:React.ReactNode;className?:string}){return <div className={[styles.panel,props.className].filter(Boolean).join(' ')}><div className={styles.panelHeader}><h3>{props.title}</h3></div><div className={styles.panelBody}>{props.children}</div></div>;}
function Card(props:{title:string;children:React.ReactNode;className?:string}){return <div className={[styles.card,props.className].filter(Boolean).join(' ')}><div className={styles.cardTitle}>{props.title}</div><div className={styles.cardBody}>{props.children}</div></div>;}
function TrafficLightCard(props:{className?:string;color:'green'|'yellow'|'red';winrate:number;factor:number}){const {className,color,winrate,factor}=props; return <div className={[styles.card,className].filter(Boolean).join(' ')}><div className={styles.cardTitle}>Ampelsystem</div><div className={styles.cardBody}><div className={styles.trafficRow}><div className={[styles.light,styles[color]].join(' ')}/><div className={styles.tStats}><div>Gewinnrate: <strong>{Math.round(winrate*100)}%</strong></div><div>Gewinnfaktor: <strong>{factor.toFixed(2)}x</strong></div></div></div></div></div>;}
function PositionsTable(props:{items:Position[];onRowClick:(p:Position)=>void;sortKey:SortKey;sortDir:SortDir;onSort:(k:SortKey)=>void;}){const {items,onRowClick,sortKey,sortDir,onSort}=props;
  const headers:{key:SortKey;label:string}[]=[{key:'chain',label:'Chain'},{key:'name',label:'Name'},{key:'category',label:'Kategorie'},{key:'narrative',label:'Narrative'},{key:'mcap',label:'Marketcap'},{key:'volume',label:'Volumen'},{key:'investment',label:'Investmenthöhe'},{key:'pnlUSD',label:'G/V ($)'},{key:'taxUSD',label:'TAX'}];
  return <div className={styles.tableWrap}><table className={styles.table}><thead><tr>{headers.map(h=><th key={h.key} onClick={()=>onSort(h.key)} className={styles.sortable}>{h.label}<span className={[styles.sortCaret,sortKey===h.key?styles[sortDir]:''].join(' ')}>▾</span></th>)}</tr></thead>
    <tbody>{items.map(it=><tr key={it.id} className={styles.row} onClick={()=>onRowClick(it)}><td>{it.chain}</td><td>{it.name}</td><td>{it.category}</td><td className={styles.dim}>{it.narrative??'—'}</td><td>{fmtNum(it.mcap)}</td><td>{fmtNum(it.volume)}</td><td>{fmtUSD(it.investment)}</td><td className={it.pnlUSD>=0?styles.positive:styles.negative}>{fmtUSD(it.pnlUSD)}</td><td>{fmtUSD(it.taxUSD)}</td></tr>)}</tbody></table></div>;
}

function DetailDrawer(props:{position:Position;timeWindow:'30m'|'1h'|'6h'|'12h'|'24h';onTimeWindow:(w:any)=>void;onClose:()=>void;onSell:()=>void;}){
  const {position:p,timeWindow,onTimeWindow,onClose,onSell}=props;
  return <div className={styles.modalOverlay} onClick={onClose}><div className={styles.modal} onClick={e=>e.stopPropagation()}>
    <div className={styles.modalHeader}><div className={styles.modalTitle}>{p.name} <span className={styles.badge}>{p.chain}</span></div>
      <div className={styles.modalActions}><select className={styles.select} value={timeWindow} onChange={(e)=>onTimeWindow(e.target.value)}>
        <option value="30m">letzte 30 Min</option><option value="1h">letzte Stunde</option><option value="6h">vor 6 Stunden</option><option value="12h">vor 12 Stunden</option><option value="24h">vor 24 Stunden</option></select>
        <button className={classNames(styles.btn,styles.btnSell)} onClick={onSell}>Sell Position</button><button className={classNames(styles.btn)} onClick={onClose}>Schließen</button></div></div>
    <div className={styles.modalBody}><div className={styles.detailGrid}>
      <div><span className={styles.dim}>Kategorie</span><div>{p.category}</div></div>
      <div><span className={styles.dim}>Narrative</span><div>{p.narrative??'—'}</div></div>
      <div><span className={styles.dim}>Marketcap</span><div>{fmtNum(p.mcap)}</div></div>
      <div><span className={styles.dim}>Volumen</span><div>{fmtNum(p.volume)}</div></div>
      <div><span className={styles.dim}>Investmenthöhe</span><div>{fmtUSD(p.investment)}</div></div>
      <div><span className={p.pnlUSD>=0?styles.positive:styles.negative}>{fmtUSD(p.pnlUSD)}</span></div>
      <div><span className={styles.dim}>TAX</span><div>{fmtUSD(p.taxUSD)}</div></div>
      <div><span className={styles.dim}>Holderanzahl</span><div>{fmtNum(p.holders??0)}</div></div>
      <div><span className={styles.dim}>Transaktionen</span><div>Buy {p.txCount?.buy??0} • Sell {p.txCount?.sell??0}</div></div>
    </div></div>
  </div></div>;
}

function SettingsModal(props:{onClose:()=>void}){ /* unverändert: Telegram-Modal aus deiner letzten Version */ 
  const [global,setGlobal]=useState(true); const [cats,setCats]=useState({signals:true,buy:true,sell:true,startstop:true,risk:true,pnl:true}); const [events,setEvents]=useState({newSignal:true,entry:true,exit:true,stopLoss:true,warning:true,dailyPnl:true});
  const [loading,setLoading]=useState(true); const [saving,setSaving]=useState(false); const [err,setErr]=useState<string|null>(null);
  useEffect(()=>{(async()=>{try{const s=await fetch('/api/settings/telegram',{cache:'no-store'}).then(r=>r.json());
    if(typeof s?.global==='boolean') setGlobal(!!s.global); if(s?.categories) setCats({...cats,...s.categories}); if(s?.events) setEvents({...events,...s.events});
  }catch{setErr('Konnte Einstellungen nicht laden.');}finally{setLoading(false);}})();},[]);
  async function save(){ try{ setSaving(true); setErr(null); const res=await fetch('/api/settings/telegram',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({global,categories:cats,events})}); if(!res.ok) throw new Error(); props.onClose(); alert('Einstellungen gespeichert.'); }catch{ setErr('Speichern fehlgeschlagen.'); }finally{ setSaving(false);}}
  return (<div className={styles.modalOverlay} onClick={props.onClose}><div className={[styles.modal,styles.glassy].join(' ')} onClick={e=>e.stopPropagation()}>
    <div className={styles.modalHeader}><div className={styles.modalTitle}>Einstellungen • Telegram</div><div className={styles.modalActions}><button className={classNames(styles.btn)} onClick={props.onClose} disabled={saving}>Abbrechen</button><button className={classNames(styles.btn,styles.btnStart)} onClick={save} disabled={saving}>{saving?'Speichern…':'Speichern'}</button></div></div>
    <div className={styles.modalBody}>{loading?<div className={styles.dim}>Lade Einstellungen…</div>:<div className={styles.settingsGrid}>...</div>}{/* UI gekürzt */}{err&&<div className={styles.negative} style={{marginTop:12}}>{err}</div>}</div>
  </div></div>);
}

function PolicyModal(props:{onClose:()=>void}){
  const [loading,setLoading]=useState(true); const [saving,setSaving]=useState(false); const [err,setErr]=useState<string|null>(null);
  const [v,setV]=useState<any>({});
  useEffect(()=>{(async()=>{ try{ const p=await fetch('/api/settings/policy',{cache:'no-store'}).then(r=>r.json()); setV(p||{});}catch{ setErr('Policy laden fehlgeschlagen.'); }finally{ setLoading(false);} })();},[]);
  function upd(k:string,val:any){ setV((s:any)=>({ ...s, [k]: val })); }
  async function save(){ try{ setSaving(true); setErr(null);
    const res=await fetch('/api/settings/policy',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(v)}); if(!res.ok) throw new Error();
    props.onClose(); alert('Regeln gespeichert.');
  } catch{ setErr('Speichern fehlgeschlagen.'); } finally{ setSaving(false); } }
  return (<div className={styles.modalOverlay} onClick={props.onClose}><div className={[styles.modal,styles.glassy].join(' ')} onClick={e=>e.stopPropagation()}>
    <div className={styles.modalHeader}><div className={styles.modalTitle}>Regeln & Limits</div>
      <div className={styles.modalActions}><button className={classNames(styles.btn)} onClick={props.onClose} disabled={saving}>Abbrechen</button>
        <button className={classNames(styles.btn,styles.btnStart)} onClick={save} disabled={saving}>{saving?'Speichern…':'Speichern'}</button></div></div>
    <div className={styles.modalBody}>
      {loading? <div className={styles.dim}>Lade…</div> :
      <div className={styles.settingsGrid}>
        <div className={styles.settingsCard}>
          <div className={styles.cardTitle}>Entry-Confirmation</div>
          <label className={styles.switch}><span>Fenster (Sek.)</span><input type="number" value={v.confirmWindowSec||180} onChange={e=>upd('confirmWindowSec',Number(e.target.value))}/></label>
          <label className={styles.switch}><span>Min Käufer</span><input type="number" value={v.minConfirmBuyers||2} onChange={e=>upd('minConfirmBuyers',Number(e.target.value))}/></label>
          <label className={styles.switch}><span>Min Volumen ($)</span><input type="number" value={v.minConfirmVolumeUSD||150} onChange={e=>upd('minConfirmVolumeUSD',Number(e.target.value))}/></label>
        </div>
        <div className={styles.settingsCard}>
          <div className={styles.cardTitle}>First-Buyer Guards</div>
          <label className={styles.switch}><span>Cap (% Cash)</span><input type="number" step="0.01" value={v.firstBuyerCapPct||0.2} onChange={e=>upd('firstBuyerCapPct',Number(e.target.value))}/></label>
          <label className={styles.switch}><span>Max gleichz. Positionen</span><input type="number" value={v.maxFirstBuyerPositions||2} onChange={e=>upd('maxFirstBuyerPositions',Number(e.target.value))}/></label>
          <label className={styles.switch}><span>Max Buy TAX (%)</span><input type="number" value={v.maxTaxBuyPct||2} onChange={e=>upd('maxTaxBuyPct',Number(e.target.value))}/></label>
          <label className={styles.switch}><span>Max Sell TAX (%)</span><input type="number" value={v.maxTaxSellPct||2} onChange={e=>upd('maxTaxSellPct',Number(e.target.value))}/></label>
        </div>
        <div className={styles.settingsCard}>
          <div className={styles.cardTitle}>CurveRunner</div>
          <label className={styles.switch}><input type="checkbox" checked={!!v.enableCurveRunner} onChange={e=>upd('enableCurveRunner',e.target.checked)}/> <span>aktiv</span></label>
          <label className={styles.switch}><span>TP %</span><input type="number" step="0.01" value={v.tpPct||0.15} onChange={e=>upd('tpPct',Number(e.target.value))}/></label>
          <label className={styles.switch}><span>SL %</span><input type="number" step="0.01" value={v.slPct||0.10} onChange={e=>upd('slPct',Number(e.target.value))}/></label>
          <label className={styles.switch}><span>Cooldown (ms)</span><input type="number" value={v.cooldownMs||300000} onChange={e=>upd('cooldownMs',Number(e.target.value))}/></label>
        </div>
        <div className={styles.settingsCard}>
          <div className={styles.cardTitle}>Revocation & Backfill</div>
          <label className={styles.switch}><input type="checkbox" checked={!!v.enableFirstSeenAuthoritySnap} onChange={e=>upd('enableFirstSeenAuthoritySnap',e.target.checked)}/> <span>Snapshot bei erster Sichtung</span></label>
          <label className={styles.switch}><span>Backfill (Minuten)</span><input type="number" value={v.backfillMinutes||0} onChange={e=>upd('backfillMinutes',Number(e.target.value))}/></label>
          <label className={styles.switch}><input type="checkbox" checked={!!v.enableGlobalRevocationStream} onChange={e=>upd('enableGlobalRevocationStream',e.target.checked)}/> <span>Globaler SetAuthority-Stream</span></label>
        </div>
      </div>}
      {err && <div className={styles.negative} style={{marginTop:12}}>{err}</div>}
    </div>
  </div></div>);
}

function TaxExportPanel(){ const [range,setRange]=useState<'30d'|'90d'|'ytd'|'custom'>('30d'); function download(){ const a=document.createElement('a'); a.href='/api/tax/export'; a.download=`tax-export-${range}.txt`; a.click(); }
  return (<div className={styles.taxPanel}><div><div className={styles.cardTitle}>Steuer-Export</div><select className={styles.select} value={range} onChange={(e)=>setRange(e.target.value as any)}><option value="30d">Letzter Monat</option><option value="90d">Letzte 90 Tage</option><option value="ytd">YTD</option><option value="custom">Benutzerdefiniert</option></select></div>
    <button className={classNames(styles.btn,styles.btnStart)} onClick={download}>Download</button></div>);
}

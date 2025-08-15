'use client';
import * as React from 'react';

type Status = { status: 'OFF'|'PAPER'|'LIVE'; level?: 'low'|'mid'|'high' };

export default function AgentControls() {
  const [busy, setBusy] = React.useState<'start'|'stop'|null>(null);
  const [msg, setMsg] = React.useState<string>('');
  const [st, setSt] = React.useState<Status>({ status: 'OFF' });

  async function refresh() {
    try {
      const r = await fetch('/api/bot/status', { cache: 'no-store' });
      const j = await r.json();
      setSt(j);
    } catch {}
  }
  React.useEffect(()=>{ refresh(); }, []);

  async function doStart(level: 'low'|'mid'|'high'='low') {
    setBusy('start'); setMsg('');
    try {
      const r = await fetch('/api/bot/start', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ level })
      });
      const j = await r.json().catch(()=>({}));
      if (!r.ok) throw new Error(j?.reason || `HTTP ${r.status}`);
      setMsg('Agent gestartet');
      await refresh();
    } catch (e:any) {
      setMsg(`Start fehlgeschlagen: ${e?.message||e}`);
    } finally { setBusy(null); }
  }

  async function doStop() {
    setBusy('stop'); setMsg('');
    try {
      const r = await fetch('/api/bot/stop', { method: 'POST' });
      const j = await r.json().catch(()=>({}));
      if (!r.ok) throw new Error(j?.reason || `HTTP ${r.status}`);
      setMsg('Agent gestoppt');
      await refresh();
    } catch (e:any) {
      setMsg(`Stop fehlgeschlagen: ${e?.message||e}`);
    } finally { setBusy(null); }
  }

  const running = st.status !== 'OFF';

  return (
    <div style={{display:'flex',gap:12,alignItems:'center',flexWrap:'wrap'}}>
      <button type="button"
        onClick={()=>doStart('low')}
        disabled={busy!==null || running}
        style={btnStyle(running?'#6b7280':'#10b981')}>
        {busy==='start' ? '… startet' : 'Agent starten'}
      </button>
      <button type="button"
        onClick={doStop}
        disabled={busy!==null || !running}
        style={btnStyle(!running?'#6b7280':'#ef4444')}>
        {busy==='stop' ? '… stoppt' : 'Agent stoppen'}
      </button>
      <span style={{opacity:.8,fontSize:12}}>
        Status: <b>{st.status}</b>{st.level?` · ${st.level}`:''}
      </span>
      {msg ? <span style={{fontSize:12,opacity:.8}}>— {msg}</span> : null}
    </div>
  );
}

function btnStyle(color:string): React.CSSProperties {
  return {
    padding:'10px 14px',
    borderRadius:12,
    border:'1px solid rgba(255,255,255,.12)',
    background: color,
    color:'#fff',
    cursor:'pointer',
    boxShadow:'0 8px 24px rgba(0,0,0,.15)',
    transition:'transform .06s ease',
  };
}
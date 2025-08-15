'use client';
import * as React from 'react';

type BotStatus = { status: 'OFF' | 'PAPER' | 'LIVE'; level?: 'low' | 'mid' | 'high' };

export default function AgentStatusBadge() {
  const [st, setSt] = React.useState<BotStatus>({ status: 'OFF' });
  const [ts, setTs] = React.useState<string>('');

  async function load() {
    try {
      const r = await fetch('/api/bot/status', { cache: 'no-store' });
      const j = await r.json();
      setSt(j);
      setTs(new Date().toLocaleTimeString());
    } catch {}
  }

  React.useEffect(() => {
    load();
    const id = setInterval(load, 3000);
    return () => clearInterval(id);
  }, []);

  const running = st.status !== 'OFF';
  const color = running ? '#00d27a' : '#ee4b2b';
  const glow = running ? '0 0 16px rgba(0,210,122,0.55)' : '0 0 12px rgba(238,75,43,0.45)';

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 14px',
        borderRadius: 999,
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.12)',
        boxShadow: glow,
        backdropFilter: 'blur(6px)',
      }}
      title={`Agent ${st.status}${st.level ? ` • ${st.level}` : ''}`}
    >
      <span
        style={{
          width: 10,
          height: 10,
          borderRadius: 999,
          background: color,
          boxShadow: `0 0 10px ${color}`,
        }}
      />
      <span style={{ fontWeight: 700, letterSpacing: 0.3 }}>
        {running ? (st.status === 'LIVE' ? 'LIVE' : 'PAPER') : 'OFF'}
      </span>
      {st.level ? <span style={{ opacity: 0.75 }}>· {st.level}</span> : null}
      <span style={{ opacity: 0.5, fontSize: 12, marginLeft: 6 }}>{ts}</span>
    </div>
  );
}
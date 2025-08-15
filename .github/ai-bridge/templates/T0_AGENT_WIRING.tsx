'use client';
import * as React from 'react';

export default function AgentWiring() {
  React.useEffect(() => {
    let stopped = false;

    const selStart = '#agent-start, [data-role="agent-start"]';
    const selStop  = '#agent-stop,  [data-role="agent-stop"]';

    const like = (el: Element|null, words: string[]) =>
      !!el && words.some(w => (el.textContent||'').toLowerCase().includes(w));

    function findStart(): HTMLButtonElement | null {
      const direct = document.querySelector(selStart) as HTMLButtonElement | null;
      if (direct) return direct;
      const all = Array.from(document.querySelectorAll('button,[role=button]')) as HTMLButtonElement[];
      return all.find(b => like(b, ['agent starten','start agent','start'])) || null;
    }
    function findStop(): HTMLButtonElement | null {
      const direct = document.querySelector(selStop) as HTMLButtonElement | null;
      if (direct) return direct;
      const all = Array.from(document.querySelectorAll('button,[role=button]')) as HTMLButtonElement[];
      return all.find(b => like(b, ['agent stoppen','stop agent','stop'])) || null;
    }

    const paint = (running: boolean) => {
      const start = findStart();
      const stop  = findStop();
      if (start) {
        // grün wenn aktiv -> Start-Button gesperrt
        (start as any).disabled = running;
        start.style.backgroundColor = running ? '#10b981' : ''; // leer = deine originalen Styles
        start.style.filter = running ? 'drop-shadow(0 0 10px rgba(16,185,129,.5))' : '';
        start.title = running ? 'Aktiv' : 'Agent starten';
      }
      if (stop) {
        // rot wenn aktiv -> Stop-Button aktivierbar
        (stop as any).disabled = !running;
        stop.style.backgroundColor = running ? '#ef4444' : '';
        stop.style.filter = running ? 'drop-shadow(0 0 10px rgba(239,68,68,.5))' : '';
        stop.title = running ? 'Agent stoppen' : 'Inaktiv';
      }
    };

    async function getStatus() {
      try {
        const r = await fetch('/api/bot/status', { cache: 'no-store' });
        const j = await r.json();
        paint(j?.status && j.status !== 'OFF');
      } catch {}
    }

    async function doStart() {
      try {
        await fetch('/api/bot/start', {
          method: 'POST',
          headers: { 'content-type':'application/json' },
          body: JSON.stringify({ level: 'low' })
        });
      } catch {}
      getStatus();
    }

    async function doStop() {
      try { await fetch('/api/bot/stop', { method:'POST' }); } catch {}
      getStatus();
    }

    const wire = () => {
      const s = findStart();
      const x = findStop();
      if (s && !(s as any).__wired) {
        s.addEventListener('click', (e)=>{ e.preventDefault(); doStart(); });
        (s as any).__wired = true;
      }
      if (x && !(x as any).__wired) {
        x.addEventListener('click', (e)=>{ e.preventDefault(); doStop(); });
        (x as any).__wired = true;
      }
    };

    wire();
    getStatus();

    const id = setInterval(()=>{ if(!stopped){ wire(); getStatus(); } }, 3000);
    const mo = new MutationObserver(()=> wire());
    mo.observe(document.body, { childList:true, subtree:true });

    return ()=>{ stopped = true; clearInterval(id); mo.disconnect(); };
  }, []);

  return null;
}

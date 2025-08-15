'use client';
import * as React from 'react';

export default function AgentWiring() {
  React.useEffect(() => {
    let stopped = false;

    const selStart = '#agent-start,[data-role="agent-start"]';
    const selStop  = '#agent-stop,[data-role="agent-stop"]';

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

    const setText = (el: HTMLElement|null, text: string) => {
      if (!el) return;
      // Wenn du irgendwann eigene Labels per data-label steuerst, lassen wir sie in Ruhe.
      if (el.getAttribute('data-label')) return;
      el.textContent = text;
    };

    const paint = (running: boolean) => {
      const start = findStart();
      const stop  = findStop();

      if (start) {
        (start as HTMLButtonElement).disabled = running;
        start.setAttribute('aria-pressed', running ? 'true' : 'false');
        // Farben hart durchsetzen (falls dein CSS stärker ist)
        if (running) {
          start.style.setProperty('background-color', '#10b981', 'important'); // grün
          start.style.setProperty('filter', 'drop-shadow(0 0 10px rgba(16,185,129,.5))', 'important');
        } else {
          start.style.removeProperty('background-color');
          start.style.removeProperty('filter');
        }
        setText(start, running ? 'Aktiv' : 'Agent starten');
        start.title = running ? 'Aktiv' : 'Agent starten';
        start.style.cursor = running ? 'not-allowed' : 'pointer';
      }

      if (stop) {
        (stop as HTMLButtonElement).disabled = !running;
        stop.setAttribute('aria-pressed', running ? 'false' : 'true');
        if (running) {
          stop.style.setProperty('background-color', '#ef4444', 'important'); // rot
          stop.style.setProperty('filter', 'drop-shadow(0 0 10px rgba(239,68,68,.5))', 'important');
        } else {
          stop.style.setProperty('background-color', '#6b7280', 'important'); // grau bei OFF
          stop.style.removeProperty('filter');
        }
        setText(stop, running ? 'Agent stoppen' : 'Inaktiv');
        stop.title = running ? 'Agent stoppen' : 'Inaktiv';
        stop.style.cursor = running ? 'pointer' : 'not-allowed';
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
        s.addEventListener('click', (e) => { e.preventDefault(); doStart(); });
        (s as any).__wired = true;
      }
      if (x && !(x as any).__wired) {
        x.addEventListener('click', (e) => { e.preventDefault(); doStop(); });
        (x as any).__wired = true;
      }
    };

    wire();
    getStatus();

    const id = setInterval(() => { if (!stopped) { wire(); getStatus(); } }, 3000);
    const mo = new MutationObserver(() => wire());
    mo.observe(document.body, { childList: true, subtree: true });

    return () => { stopped = true; clearInterval(id); mo.disconnect(); };
  }, []);

  return null;
}
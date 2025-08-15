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
      // 1) explizite Selektoren
      const direct = document.querySelector(selStop) as HTMLButtonElement | null;
      if (direct) return direct;

      const all = Array.from(document.querySelectorAll('button,[role=button]')) as HTMLButtonElement[];

      // 2) nach Textmustern suchen (mehrsprachig)
      const byText = all.find(b => like(b, [
        'agent stoppen','stop agent','stop','beenden','aus'
      ]));
      if (byText) return byText;

      // 3) Fallback: Button im gleichen Container wie Start
      const s = findStart();
      if (s) {
        const container = s.closest('header,nav,section,div') || s.parentElement;
        if (container) {
          // Nimm einen anderen Button aus demselben Container
          const sibs = Array.from(container.querySelectorAll('button,[role=button]')) as HTMLButtonElement[];
          const other = sibs.find(b => b !== s);
          if (other) return other;
        }
      }
      return null;
    }

    const setText = (el: HTMLElement|null, text: string) => {
      if (!el) return;
      if (el.getAttribute('data-label')) return; // respektiere Custom-Labeling
      el.textContent = text;
    };

    const show = (el: HTMLElement) => {
      // Sichtbar machen, falls Framework ihn mit Klassen/Attributen versteckt
      el.removeAttribute('hidden');
      el.setAttribute('aria-hidden', 'false');
      el.classList.remove('hidden', 'sr-only');
      el.style.removeProperty('display'); // falls display:none gesetzt war
      el.style.visibility = 'visible';
    };

    const paint = (running: boolean) => {
      const start = findStart();
      const stop  = findStop();

      if (start) {
        (start as HTMLButtonElement).disabled = running;
        start.setAttribute('aria-pressed', running ? 'true' : 'false');
        if (running) {
          start.style.setProperty('background-color', '#10b981', 'important'); // grün
          start.style.setProperty('filter', 'drop-shadow(0 0 10px rgba(16,185,129,.5))', 'important');
          setText(start, 'Aktiv');
        } else {
          start.style.removeProperty('background-color');
          start.style.removeProperty('filter');
          setText(start, 'Agent starten');
        }
        show(start);
        start.style.cursor = running ? 'not-allowed' : 'pointer';
        start.title = running ? 'Aktiv' : 'Agent starten';
      }

      if (stop) {
        // Stop-Button soll NIE verschwinden – höchstens disabled sein
        show(stop);
        (stop as HTMLButtonElement).disabled = !running;
        stop.setAttribute('aria-pressed', running ? 'false' : 'true');
        if (running) {
          stop.style.setProperty('background-color', '#ef4444', 'important'); // rot aktiv
          stop.style.setProperty('filter', 'drop-shadow(0 0 10px rgba(239,68,68,.5))', 'important');
          setText(stop, 'Agent stoppen');
          stop.style.cursor = 'pointer';
          stop.title = 'Agent stoppen';
        } else {
          stop.style.setProperty('background-color', '#6b7280', 'important'); // grau inaktiv
          stop.style.removeProperty('filter');
          setText(stop, 'Inaktiv');
          stop.style.cursor = 'not-allowed';
          stop.title = 'Inaktiv';
        }
      }
    };

    async function getStatus() {
      try {
        const r = await fetch('/api/bot/status', { cache: 'no-store' });
        const j = await r.json();
        paint(!!(j?.status && j.status !== 'OFF'));
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

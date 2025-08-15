// Toleranter Parser für pump.fun + Migration-Events
// Funktioniert mit rohen Logs ODER bereits normalisierten Feldern.

const PUMP_FUN_PROGRAM = '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P';
const PUMP_MIGRATION_PROGRAM = '39azUYFWPz3VHgKCf3VChUwbpURdCHRxjWVowf5jUJjg';

type Parsed =
 | { type:'pf_create'; mint:string; data:any }
 | { type:'pf_buy'|'pf_sell'; mint:string; trader:string|null; usd:number; data:any }
 | { type:'pf_migrate'; mint:string; data:any }
 | { type:'unknown'; data:any };

function findBase58Like(s:string): string[] {
  const re = /\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/g; // grob Base58
  return (s.match(re) || []).slice(0, 10);
}

function fromLogs(payload:any){
  const logs: string[] = payload?.logs || payload?.meta?.logMessages || [];
  const programId = payload?.programId || payload?.program || payload?.accountKeys?.[0];
  const lower = logs.map((x)=>String(x).toLowerCase());

  // CREATE
  if ((programId===PUMP_FUN_PROGRAM) && lower.some(l=>l.includes('instruction: create'))) {
    // Mint heuristisch: in accounts oder in "Program data" Zeile
    const accounts: string[] = payload?.accounts || payload?.accountKeys || [];
    let mint = (payload?.mint)||'';
    if (!mint) {
      // Heuristik: nimm das erste base58 aus logs, das auch in accounts vorkommt
      const fromLog = findBase58Like(logs.join(' '));
      mint = fromLog.find(x => accounts.includes(x)) || fromLog[0] || '';
    }
    if (mint) return { type:'pf_create', mint, data: payload } as Parsed;
  }

  // BUY / SELL
  if (programId===PUMP_FUN_PROGRAM && lower.some(l=>l.includes('instruction: buy') || l.includes('instruction: sell'))) {
    const isSell = lower.some(l=>l.includes('instruction: sell'));
    const accounts: string[] = payload?.accounts || payload?.accountKeys || [];
    const trader = payload?.owner || payload?.trader || accounts[0] || null;
    const mint = payload?.mint || accounts.find((a)=>a!==trader) || '';
    const usd = Number(payload?.usd || payload?.amountUsd || 0);
    if (mint) return { type: isSell?'pf_sell':'pf_buy', mint, trader, usd, data: payload } as Parsed;
  }

  // MIGRATION (initialize2)
  if (programId===PUMP_MIGRATION_PROGRAM && lower.some(l=>l.includes('initialize2'))) {
    const accounts: string[] = payload?.accounts || payload?.accountKeys || [];
    const mint = payload?.mint || accounts[1] || accounts[0] || ''; // TODO: je nach Schema anpassen
    if (mint) return { type:'pf_migrate', mint, data: payload } as Parsed;
  }

  return { type:'unknown', data: payload } as Parsed;
}

export function parsePumpfunEvent(payload:any): Parsed {
  // Wenn QuickNode bereits ein "event"/"method" liefert:
  const evt = (payload?.event || payload?.method || '').toString().toLowerCase();
  if (payload?.programId===PUMP_FUN_PROGRAM || payload?.program===PUMP_FUN_PROGRAM) {
    const mint = payload?.mint || '';
    if (evt==='create' && mint) return { type:'pf_create', mint, data: payload };
    if ((evt==='buy'||evt==='sell') && mint) {
      const trader = payload?.owner || payload?.trader || null;
      const usd = Number(payload?.usd || payload?.amountUsd || 0);
      return { type: evt==='sell'?'pf_sell':'pf_buy', mint, trader, usd, data: payload };
    }
  }
  if (payload?.programId===PUMP_MIGRATION_PROGRAM) {
    const mint = payload?.mint || payload?.tokenMint || '';
    if (evt.includes('initialize2') && mint) return { type:'pf_migrate', mint, data: payload };
  }
  // Fallback auf Log-Parser
  return fromLogs(payload);
}
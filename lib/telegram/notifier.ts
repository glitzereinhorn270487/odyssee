import { tgSend } from '@/lib/telegram/client';
import { shouldNotify } from '@/lib/telegram/settings';

function esc(s: any){ return String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
const usd = (n:number)=> new Intl.NumberFormat(undefined,{ style:'currency', currency:'USD', maximumFractionDigits:2 }).format(n);

export async function notifyStartStop(action: 'start'|'stop', payload: { status?: string; level?: string }) {
  const ok = await shouldNotify(action);
  if (!ok) return;
  const t = action==='start' ? '🟢 <b>Agent gestartet</b>' : '🔴 <b>Agent gestoppt</b>';
  const meta = payload?.status ? `\nStatus: <code>${esc(payload.status)}</code>${payload?.level?` • Level: <code>${esc(payload.level)}</code>`:''}` : '';
  await tgSend(`${t}${meta}`);
}

export async function notifyBuy(p:any, opts:{usd:number}) {
  const ok = await shouldNotify('buy','entry'); if (!ok) return;
  const name = esc(p?.name || p?.symbol || 'Token');
  const body = `🟩 <b>BUY</b> • <b>${name}</b>\nSize: <code>${usd(opts.usd)}</code>${p?.entryPrice?`\nEntry: <code>${p.entryPrice}</code>`:''}`;
  await tgSend(body);
}

export async function notifySell(p:any, opts:{reason:'TP'|'SL'|'ENTRY_NOT_CONFIRMED'|'MANAGER'|'MANUAL'; price:number; approxPnL?: number;}) {
  const sub = opts.reason==='SL' ? 'stopLoss' : 'exit';
  const ok = await shouldNotify('sell', sub as any); if (!ok) return;
  const name = esc(p?.name || 'Token');
  const reason = opts.reason==='TP'?'TP':opts.reason==='SL'?'SL':opts.reason==='ENTRY_NOT_CONFIRMED'?'No-Confirm':'Exit';
  const approx = typeof opts.approxPnL==='number' ? `\nPnL≈: <code>${usd(opts.approxPnL)}</code>` : '';
  await tgSend(`🟥 <b>SELL</b> • <b>${name}</b>\nGrund: <code>${reason}</code>\nPreis: <code>${opts.price}</code>${approx}`);
}

export async function notifyManagerSummary(ids: string[]) {
  const ok = await shouldNotify('sell','exit'); if (!ok) return;
  if (!ids.length) return;
  await tgSend(`🧹 <b>Positions-Manager</b>: ${ids.length} Position(en) geschlossen.`);
}

export async function notifyInfo(text: string) {
  const ok = await shouldNotify('signal','newSignal'); if (!ok) return;
  await tgSend(`ℹ️ ${esc(text)}`);
}
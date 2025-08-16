// T0_SETTINGS_RULES_ROUTE.ts
import { NextResponse } from 'next/server';
import * as Vol from '@/lib/store/volatile';
import { getEffectiveConfig } from '@/lib/paper/engine';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const cfg = getEffectiveConfig();
  const active = Vol.getBoolean('bot.active', true);
  return NextResponse.json({ ok:true, active, rules: cfg });
}

export async function POST(req: Request) {
  let body:any = {};
  try { body = await req.json(); } catch {}
  const patch:Record<string,any> = {};

  if (body.hasOwnProperty('active')) {
    const a = String(body.active).toLowerCase();
    patch['bot.active'] = (a==='1'||a==='true'||a==='yes'||a==='on');
  }
  if (body.rules && typeof body.rules === 'object') {
    const r = body.rules;
    if (r.minVol1mUsd!=null) patch['rules.minVol1mUsd'] = Number(r.minVol1mUsd);
    if (r.minBuys1m!=null)   patch['rules.minBuys1m']   = Number(r.minBuys1m);
    if (r.investUsd!=null)   patch['rules.investUsd']   = Number(r.investUsd);
    if (r.stagnationMinutes!=null) patch['rules.stagnationMinutes'] = Number(r.stagnationMinutes);
    if (r.maxFirstBuyerSlots!=null) patch['rules.maxFirstBuyerSlots'] = Number(r.maxFirstBuyerSlots);
  }

  if (Object.keys(patch).length) Vol.merge(patch);
  const cfg = getEffectiveConfig();
  const active = Vol.getBoolean('bot.active', true);
  return NextResponse.json({ ok:true, active, rules: cfg });
}

import { NextResponse } from 'next/server';
import { tgSend } from '@/lib/telegram/client';
export const runtime = 'nodejs';
export async function GET(){ const r = await tgSend('✅ <b>Odyssee</b> Telegram Test OK'); return NextResponse.json(r); }
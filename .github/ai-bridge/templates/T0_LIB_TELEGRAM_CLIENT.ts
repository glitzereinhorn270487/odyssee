const BOT_TOKEN = process.env.TG_BOT_TOKEN || '';
const CHAT_ID = process.env.TG_CHAT_ID || '';
const API = BOT_TOKEN ? `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage` : '';

type SendOpts = { parse_mode?: 'HTML'|'MarkdownV2'; disable_preview?: boolean };

export async function tgSend(text: string, opts?: SendOpts) {
  if (!BOT_TOKEN || !CHAT_ID) return { ok: false, error: 'Missing TG_BOT_TOKEN or TG_CHAT_ID' };
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      chat_id: CHAT_ID,
      text,
      parse_mode: opts?.parse_mode ?? 'HTML',
      disable_web_page_preview: opts?.disable_preview ?? true,
    }),
  });
  const ok = res.ok;
  const body = await res.text().catch(()=>'');
  return { ok, body: body.slice(0, 300) };
}

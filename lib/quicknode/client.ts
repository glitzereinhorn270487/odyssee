const API_BASE = process.env.QN_API_BASE || 'https://api.quicknode.com/streams/rest/v1';
const API_KEY = process.env.QN_API_KEY || '';
const DEFAULT_IDS = (process.env.QN_STREAM_IDS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

type QnResult = { id: string; ok: boolean; status?: 'activated'|'paused'|'unknown'; error?: string };

async function qn(path: string, method: 'GET'|'POST'|'PATCH'|'DELETE' = 'GET', body?: any) {
  if (!API_KEY) throw new Error('Missing QN_API_KEY');
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'accept': 'application/json',
      'content-type': 'application/json',
      'x-api-key': API_KEY,
    },
    body: body ? JSON.stringify(body) : undefined,
    // Streams REST ist öffentlich erreichbar
  });
  if (!res.ok) {
    const txt = await res.text().catch(()=>'');
    throw new Error(`HTTP ${res.status} ${txt}`);
  }
  const ct = res.headers.get('content-type') || '';
  return ct.includes('application/json') ? res.json() : res.text();
}

export async function activateStream(id: string): Promise<QnResult> {
  try { await qn(`/streams/${id}/activate`, 'POST'); return { id, ok: true, status: 'activated' }; }
  catch (e: any) { return { id, ok: false, status: 'unknown', error: e?.message || String(e) }; }
}
export async function pauseStream(id: string): Promise<QnResult> {
  try { await qn(`/streams/${id}/pause`, 'POST'); return { id, ok: true, status: 'paused' }; }
  catch (e: any) { return { id, ok: false, status: 'unknown', error: e?.message || String(e) }; }
}

export async function getStream(id: string) {
  try {
    const data = await qn(`/streams/${id}`, 'GET');
    return { id, ok: true, data };
  } catch (e: any) {
    return { id, ok: false, error: e?.message || String(e) };
  }
}

export async function listStreams() {
  const data = await qn(`/streams`, 'GET');
  // Erwartet eine Liste deiner Streams (paging ggf. später)
  return data;
}

/** V1.1: echte Pause/Resume für alle in QN_STREAM_IDS (oder Override). */
export async function toggleQuickNodeStreams(enable: boolean, ids?: string[]) {
  const target = (ids && ids.length ? ids : DEFAULT_IDS);
  if (!target.length) return { ok: false, results: [], message: 'No stream IDs configured (QN_STREAM_IDS empty)' };
  const results: QnResult[] = [];
  for (const id of target) {
    results.push(enable ? await activateStream(id) : await pauseStream(id));
  }
  const allOk = results.every(r => r.ok);
  return { ok: allOk, results };
}
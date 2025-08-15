// V1.0 Stub – V1.1 schalten wir echte Streams via QuickNode API.
export async function toggleQuickNodeStreams(enable: boolean): Promise<void> {
  const url = process.env.QNODE_TOGGLE_URL;           // optionaler Webhook/Proxy
  const token = process.env.QNODE_TOGGLE_TOKEN;       // optional
  if (!url) return;                                   // kein Setup -> noop
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ enable }),
    });
  } catch {
    // noop in V1.0
  }
}

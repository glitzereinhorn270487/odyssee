import crypto from 'crypto';
import zlib from 'zlib';

export type QnVerifyResult = { ok: boolean; reason?: string; payloadText?: string };

export async function verifyQuickNode(req: Request): Promise<QnVerifyResult> {
  const secret = process.env.QN_STREAMS_TOKEN || process.env.QUICKNODE_STREAMS_TOKEN || '';
  const devBypass = process.env.QN_ALLOW_UNSIGNED === '1';

  const h = req.headers;
  const nonce = h.get('x-qn-nonce');
  const ts = h.get('x-qn-timestamp');
  const sig = h.get('x-qn-signature');

  if (!secret) return { ok: devBypass, reason: 'NO_SECRET' };
  if (!nonce || !ts || !sig) return { ok: devBypass, reason: 'MISSING_HEADERS' };

  try {
    const encoding = (h.get('content-encoding') || '').toLowerCase();
    let buf = Buffer.from(await req.arrayBuffer());
    if (encoding.includes('gzip')) {
      try { buf = zlib.gunzipSync(buf); } catch { return { ok: false, reason: 'GZIP_DECODE_FAILED' }; }
    }
    const payload = buf.toString('utf8');
    const data = `${nonce}${ts}${payload}`;

    const mac = crypto.createHmac('sha256', Buffer.from(secret));
    mac.update(Buffer.from(data));
    const expected = mac.digest('hex');

    const ok = crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(String(sig), 'hex'));
    return ok ? { ok: true, payloadText: payload } : { ok: false, reason: 'BAD_SIGNATURE', payloadText: payload };
  } catch {
    return { ok: devBypass, reason: 'VERIFY_ERROR' };
  }
}
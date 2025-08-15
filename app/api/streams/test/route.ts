*** Begin Patch
*** Add File: app/api/streams/test/route.ts
+import { NextResponse } from 'next/server';
+export const runtime = 'nodejs';
+export async function GET() {
+  return NextResponse.json({ ok: true });
+}

*** Add File: lib/webhooks/verify.ts
+import crypto from 'crypto';
+
+export function verifyQuickNodeSignature(req: Request, rawBody: string, secret: string): boolean {
+  // HMAC: sha256( `${timestamp}.${body}` )
+  const sig = req.headers.get('x-qn-signature') || req.headers.get('x-quicknode-signature');
+  const ts  = req.headers.get('x-qn-timestamp') || req.headers.get('x-quicknode-timestamp');
+  if (sig && ts && secret) {
+    const expected = crypto.createHmac('sha256', secret).update(`${ts}.${rawBody}`).digest('hex');
+    try {
+      return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
+    } catch {
+      return false;
+    }
+  }
+  // Fallback: simpler Token-Check per Header/Query (für Streams mit Custom Header)
+  const token = req.headers.get('x-verify-token') || new URL(req.url).searchParams.get('token');
+  return !!(secret && token && token === secret);
+}

*** Add File: app/api/debug/tree/route.ts
+import { NextResponse } from 'next/server';
+import fs from 'fs';
+import path from 'path';
+
+export const runtime = 'nodejs';
+
+const ALLOW = new Set([
+  'app', 'lib', 'components', 'public',
+  'package.json', 'tsconfig.json', 'next.config.js', 'vercel.json'
+]);
+
+function isAllowed(rel: string) {
+  for (const a of ALLOW) {
+    if (rel === a || rel.startsWith(a + '/')) return true;
+  }
+  return false;
+}
+
+function walk(dirAbs: string, baseRel: string, depth = 0, maxDepth = 6): any[] {
+  if (depth > maxDepth) return [];
+  const out: any[] = [];
+  for (const entry of fs.readdirSync(dirAbs, { withFileTypes: true })) {
+    const rel = path.posix.join(baseRel, entry.name);
+    if (!isAllowed(rel)) continue;
+    const childAbs = path.join(dirAbs, entry.name);
+    if (entry.isDirectory()) {
+      out.push({ type: 'dir', path: rel });
+      out.push(...walk(childAbs, rel, depth + 1, maxDepth));
+    } else {
+      const size = fs.statSync(childAbs).size;
+      out.push({ type: 'file', path: rel, size });
+    }
+  }
+  return out;
+}
+
+export async function GET(req: Request) {
+  const token = process.env.DEBUG_TOKEN || '';
+  if (token) {
+    const got = new URL(req.url).searchParams.get('token') || req.headers.get('x-debug-token');
+    if (got !== token) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
+  }
+  const data = walk(process.cwd(), '');
+  return NextResponse.json({ ok: true, data });
+}

*** Add File: app/api/debug/file/route.ts
+import { NextResponse } from 'next/server';
+import fs from 'fs';
+import path from 'path';
+
+export const runtime = 'nodejs';
+
+export async function GET(req: Request) {
+  const url = new URL(req.url);
+  const p = url.searchParams.get('path') || '';
+  const token = process.env.DEBUG_TOKEN || '';
+  if (token) {
+    const got = url.searchParams.get('token') || req.headers.get('x-debug-token');
+    if (got !== token) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
+  }
+  if (!p) return NextResponse.json({ ok: false, error: 'missing path' }, { status: 400 });
+  const abs = path.join(process.cwd(), p);
+  if (!abs.startsWith(process.cwd())) return NextResponse.json({ ok: false, error: 'bad path' }, { status: 400 });
+  if (!fs.existsSync(abs) || fs.statSync(abs).isDirectory()) {
+    return NextResponse.json({ ok: false, error: 'not found' }, { status: 404 });
+  }
+  const raw = fs.readFileSync(abs, 'utf8');
+  const max = 200_000;
+  const body = raw.length > max ? raw.slice(0, max) : raw;
+  return new Response(body, { status: 200, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
+}

*** Add File: app/api/streams/pumpfun/route.ts
+import { NextResponse } from 'next/server';
+import { verifyQuickNodeSignature } from '@/lib/webhooks/verify';
+
+export const runtime = 'nodejs';
+
+export async function POST(req: Request) {
+  // Raw Body für Signaturprüfung behalten
+  const raw = await req.text();
+  const secret = process.env.PUMPFUN_WEBHOOK_SECRET || process.env.QN_WEBHOOK_SECRET || '';
+  if (secret) {
+    const ok = verifyQuickNodeSignature(req, raw, secret);
+    if (!ok) return NextResponse.json({ ok: false, error: 'bad signature' }, { status: 401 });
+  }
+  let payload: any = null;
+  try { payload = JSON.parse(raw); } catch {}
+  console.log('pumpfun stream ⬇︎', payload ? (Array.isArray(payload) ? payload.length : 1) : raw.slice(0, 200));
+  // TODO: hier ins Paper-Engine-Intake schieben, wenn gewünscht
+  return NextResponse.json({ ok: true });
+}
+
+export async function GET() {
+  return NextResponse.json({ ok: true });
+}
*** End Patch

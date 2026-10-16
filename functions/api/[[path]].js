// Cloudflare Pages Functions. Paid assets are NEVER stored in the public checkout.
const BOOK_ID = 'cbse10-maths-standard';
const BOOK_TITLE = 'CBSE Class 10 Mathematics Standard (041)';
const YEAR = 365 * 24 * 60 * 60;
const encoder = new TextEncoder();
let cachedKeys = null;
let keysExpire = 0;
export class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
function fail(status, message) { throw new HttpError(status, message); }
function json(data, status = 200) { return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store, private', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' } }); }
function db(env) { if (!env.DB) fail(503, 'The store is being prepared. Please check back soon.'); return env.DB; }
export function priceFor(coupon = '') {
  if (typeof coupon !== 'string') fail(400, 'Invalid coupon.');
  const code = coupon.trim().toUpperCase();
  if (code && code !== 'TOPPERS50') fail(400, 'This coupon is not valid.');
  return { amount: code ? 14900 : 19900, coupon: code || null };
}
export function buyerDetails(body) {
  const name = typeof body.name === 'string' ? body.name.trim().replace(/\s+/g, ' ') : '';
  const raw = typeof body.phone === 'string' ? body.phone.replace(/[\s()+-]/g, '') : '';
  const phone = raw.startsWith('91') && raw.length === 12 ? raw.slice(2) : raw;
  if (name.length < 2 || name.length > 80 || /[\x00-\x1f<>]/.test(name)) fail(400, 'Enter a reader name between 2 and 80 characters.');
  if (!/^[6-9]\d{9}$/.test(phone)) fail(400, 'Enter a valid 10-digit Indian mobile number.');
  if (body.consent !== true) fail(400, 'Accept the online access terms and personal watermark before paying.');
  return { name, phone };
}
export function xml(value) { return String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[character])); }
function unbase64url(value) { const padded = value.replace(/-/g, '+').replace(/_/g, '/'); return Uint8Array.from(atob(padded.padEnd(Math.ceil(padded.length / 4) * 4, '=')), character => character.charCodeAt(0)); }
export function validateClaims(claims, projectId, now = Math.floor(Date.now() / 1000)) {
  if (!projectId || claims.aud !== projectId || claims.iss !== `https://securetoken.google.com/${projectId}` || typeof claims.sub !== 'string' || !claims.sub || claims.sub.length > 128 || !Number.isFinite(claims.exp) || claims.exp <= now || !Number.isFinite(claims.iat) || claims.iat > now || !Number.isFinite(claims.auth_time) || claims.auth_time > now || claims.email_verified !== true || typeof claims.email !== 'string') fail(401, 'Please sign in again with a verified email address.');
  return { uid: claims.sub, email: claims.email };
}
async function authenticate(request, env) {
  const token = request.headers.get('Authorization')?.match(/^Bearer ([A-Za-z0-9_.-]+)$/)?.[1];
  if (!token) fail(401, 'Sign in to access your books.');
  if (!env.FIREBASE_PROJECT_ID) fail(503, 'Customer sign-in is not open yet.');
  const parts = token.split('.'); if (parts.length !== 3) fail(401, 'Invalid sign-in token.');
  let header, claims;
  try { header = JSON.parse(new TextDecoder().decode(unbase64url(parts[0]))); claims = JSON.parse(new TextDecoder().decode(unbase64url(parts[1]))); } catch { fail(401, 'Invalid sign-in token.'); }
  if (header.alg !== 'RS256' || typeof header.kid !== 'string' || header.kid.length > 200) fail(401, 'Invalid sign-in token.');
  if (!cachedKeys || Date.now() > keysExpire || !cachedKeys.some(key => key.kid === header.kid)) {
    const response = await fetch('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com');
    if (!response.ok) fail(503, 'Sign-in verification is temporarily unavailable.');
    const document = await response.json(); if (!Array.isArray(document.keys)) fail(503, 'Sign-in verification is temporarily unavailable.');
    cachedKeys = document.keys; keysExpire = Date.now() + 5 * 60 * 1000;
  }
  const jwk = cachedKeys.find(key => key.kid === header.kid); if (!jwk) fail(401, 'Unknown sign-in token.');
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  if (!await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, unbase64url(parts[2]), encoder.encode(parts[0] + '.' + parts[1]))) fail(401, 'Invalid sign-in signature.');
  return validateClaims(claims, env.FIREBASE_PROJECT_ID);
}
export async function checkSignature(secret, value, signature) {
  if (!secret || typeof signature !== 'string' || !/^[a-fA-F0-9]{64}$/.test(signature)) return false;
  const actual = Uint8Array.from(signature.match(/../g), byte => parseInt(byte, 16));
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  // WebCrypto performs constant-time MAC verification; do not compare hex strings.
  return crypto.subtle.verify('HMAC', key, actual, encoder.encode(value));
}
async function gateway(env, path, options = {}) {
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) fail(503, 'Checkout is not open yet.');
  const response = await fetch('https://api.razorpay.com/v1/' + path, { ...options, headers: { Authorization: 'Basic ' + btoa(env.RAZORPAY_KEY_ID + ':' + env.RAZORPAY_KEY_SECRET), 'Content-Type': 'application/json' } });
  if (!response.ok) fail(502, 'The payment service could not confirm this request. Please contact support before paying again.');
  return response.json();
}
function salesEnabled(env) { return env.SALES_OPEN === 'true' && !!env.DB && !!env.BOOKS && !!env.FIREBASE_PROJECT_ID && !!env.FIREBASE_API_KEY && !!env.FIREBASE_AUTH_DOMAIN && /^rzp_live_/.test(env.RAZORPAY_KEY_ID || '') && !!env.RAZORPAY_KEY_SECRET && !!env.RAZORPAY_WEBHOOK_SECRET; }
async function bookRecord(env) { return db(env).prepare('SELECT * FROM books WHERE id = ?').bind(BOOK_ID).first(); }
async function publicConfig(env) {
  const authEnabled = !!(env.FIREBASE_API_KEY && env.FIREBASE_PROJECT_ID && env.FIREBASE_AUTH_DOMAIN);
  let salesOpen = false;
  if (salesEnabled(env)) { const book = await bookRecord(env); salesOpen = book?.is_ready === 1 && book.page_count > 0; }
  return json({ authEnabled, salesOpen, firebase: authEnabled ? { apiKey: env.FIREBASE_API_KEY, projectId: env.FIREBASE_PROJECT_ID, authDomain: env.FIREBASE_AUTH_DOMAIN } : null });
}
async function createOrder(request, env, user) {
  if (!salesEnabled(env)) fail(409, 'The complete book is still in preparation. Purchases are not open yet.');
  const book = await bookRecord(env); if (!book || book.is_ready !== 1 || book.page_count < 1) fail(409, 'The complete book is not available for purchase yet.');
  const body = await bodyJson(request); if (body.bookId !== BOOK_ID) fail(400, 'Unknown book.');
  const buyer = buyerDetails(body); const pricing = priceFor(body.coupon); const now = Math.floor(Date.now() / 1000);
  const existing = await db(env).prepare('SELECT order_id FROM entitlements WHERE uid = ? AND book_id = ? AND revoked = 0 AND expires_at > ?').bind(user.uid, BOOK_ID, now).first();
  if (existing) fail(409, 'You already have access to this book. Open My Books to read it.');
  const pending = await db(env).prepare("SELECT id FROM orders WHERE uid = ? AND book_id = ? AND status = 'created' AND created_at > ?").bind(user.uid, BOOK_ID, now - 1800).first();
  if (pending) fail(409, 'A recent order is already pending. Please check My Books or contact support before paying again.');
  const receipt = 'tb_' + crypto.randomUUID().replace(/-/g, '');
  // Amount and product are authoritative on the server. Client amounts are ignored.
  const order = await gateway(env, 'orders', { method: 'POST', body: JSON.stringify({ amount: pricing.amount, currency: 'INR', receipt, notes: { book_id: BOOK_ID } }) });
  if (typeof order.id !== 'string' || !/^order_[A-Za-z0-9]+$/.test(order.id) || order.amount !== pricing.amount || order.currency !== 'INR') fail(502, 'The payment order could not be created. Please contact support.');
  await db(env).prepare("INSERT INTO orders (id, uid, book_id, amount, coupon, reader_name, phone, status, created_at, consent_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'created', ?, ?)").bind(order.id, user.uid, BOOK_ID, pricing.amount, pricing.coupon, buyer.name, buyer.phone, now, now).run();
  return json({ orderId: order.id, keyId: env.RAZORPAY_KEY_ID, amount: pricing.amount, currency: 'INR' });
}
export function validatePayment(payment, order) {
  if (payment.status !== 'captured' || payment.captured !== true || payment.order_id !== order.id || payment.amount !== order.amount || payment.currency !== 'INR' || payment.amount_refunded > 0) fail(409, 'Payment is not confirmed as captured for this order. Please check My Books shortly or contact support.');
}
async function grant(env, order, payment) {
  validatePayment(payment, order);
  if (order.status === 'refunded') fail(409, 'This purchase has been refunded.');
  const now = Math.floor(Date.now() / 1000);
  const paidAt = order.paid_at || (Number.isInteger(payment.created_at) && payment.created_at > 0 && payment.created_at <= now ? payment.created_at : now);
  // A retry uses the same original timestamp and never adds another year.
  await db(env).batch([
    db(env).prepare("UPDATE orders SET status = 'paid', payment_id = ?, paid_at = COALESCE(paid_at, ?) WHERE id = ? AND status != 'refunded'").bind(payment.id, paidAt, order.id),
    db(env).prepare("INSERT INTO entitlements (uid, book_id, order_id, reader_name, phone, starts_at, expires_at, revoked) SELECT uid, book_id, id, reader_name, phone, paid_at, paid_at + ?, 0 FROM orders WHERE id = ? AND status = 'paid' ON CONFLICT(order_id) DO NOTHING").bind(YEAR, order.id)
  ]);
}
async function verifyOrder(request, env, user) {
  const body = await bodyJson(request);
  if (!/^order_[A-Za-z0-9]+$/.test(body.razorpay_order_id || '') || !/^pay_[A-Za-z0-9]+$/.test(body.razorpay_payment_id || '')) fail(400, 'Invalid payment reference.');
  const order = await db(env).prepare('SELECT * FROM orders WHERE id = ? AND uid = ?').bind(body.razorpay_order_id, user.uid).first();
  if (!order) fail(404, 'Order not found for this account.');
  if (!await checkSignature(env.RAZORPAY_KEY_SECRET, order.id + '|' + body.razorpay_payment_id, body.razorpay_signature)) fail(400, 'Payment signature could not be verified.');
  const payment = await gateway(env, 'payments/' + encodeURIComponent(body.razorpay_payment_id));
  await grant(env, order, payment); return json({ verified: true });
}
async function webhook(request, env) {
  if (!env.RAZORPAY_WEBHOOK_SECRET) fail(503, 'Webhook is not configured.');
  const raw = await limitedText(request);
  if (!await checkSignature(env.RAZORPAY_WEBHOOK_SECRET, raw, request.headers.get('X-Razorpay-Signature'))) fail(400, 'Invalid webhook signature.');
  let event; try { event = JSON.parse(raw); } catch { fail(400, 'Invalid webhook.'); }
  if (event.event === 'payment.captured' || event.event === 'order.paid') {
    const entity = event.payload?.payment?.entity; if (!entity || !/^pay_[A-Za-z0-9]+$/.test(entity.id || '')) fail(400, 'Missing payment reference.');
    const order = await db(env).prepare('SELECT * FROM orders WHERE id = ?').bind(entity.order_id).first();
    if (order && order.status !== 'refunded') { const payment = await gateway(env, 'payments/' + entity.id); await grant(env, order, payment); }
  }
  if (event.event === 'refund.processed') {
    const refund = event.payload?.refund?.entity;
    if (refund && /^pay_[A-Za-z0-9]+$/.test(refund.payment_id || '')) {
      const payment = await gateway(env, 'payments/' + refund.payment_id);
      if (payment.amount_refunded >= payment.amount && payment.amount > 0) {
        await db(env).batch([
          db(env).prepare("UPDATE orders SET status = 'refunded' WHERE id = ? AND payment_id = ?").bind(payment.order_id, payment.id),
          db(env).prepare('UPDATE entitlements SET revoked = 1 WHERE order_id = ?').bind(payment.order_id)
        ]);
      }
    }
  }
  return json({ received: true });
}
async function library(env, user) {
  const now = Math.floor(Date.now() / 1000);
  const result = await db(env).prepare('SELECT e.book_id, MAX(e.expires_at) AS expires_at, b.title, b.page_count, b.chapters_json FROM entitlements e JOIN books b ON b.id = e.book_id WHERE e.uid = ? AND e.revoked = 0 GROUP BY e.book_id, b.title, b.page_count, b.chapters_json').bind(user.uid).all();
  return json({ books: (result.results || []).map(book => ({ bookId: book.book_id, title: book.title, pageCount: book.page_count, chapters: JSON.parse(book.chapters_json), expiresAt: book.expires_at, active: book.expires_at > now })) });
}
export function watermarkedPage(image, name, phone, orderId, page) {
  const text = xml(name + ' · ' + phone + ' · ' + orderId);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1190 1684"><image width="1190" height="1684" preserveAspectRatio="xMidYMid meet" href="data:image/png;base64,${image}"/><g font-family="Arial,sans-serif" font-size="22" fill="#12395b" opacity=".16">${[260, 640, 1020, 1400].map(y => `<text x="595" y="${y}" text-anchor="middle" transform="rotate(-25 595 ${y})">${text}</text>`).join('')}</g><rect y="1646" width="1190" height="38" fill="#fff"/><text x="595" y="1671" text-anchor="middle" font-family="Arial,sans-serif" font-size="16" fill="#435b6e">Personal reading copy · ${text} · Page ${page}</text></svg>`;
}
async function readPage(env, user, id, pageValue) {
  if (id !== BOOK_ID || !/^[1-9]\d{0,4}$/.test(pageValue || '')) fail(404, 'Reading page not found.');
  const page = Number(pageValue); const now = Math.floor(Date.now() / 1000);
  const entitlement = await db(env).prepare('SELECT * FROM entitlements WHERE uid = ? AND book_id = ? AND revoked = 0 AND expires_at > ? ORDER BY expires_at DESC LIMIT 1').bind(user.uid, id, now).first();
  if (!entitlement) fail(403, 'An active purchase is required to read this book.');
  const book = await bookRecord(env); if (!book || !book.is_ready || page > book.page_count) fail(404, 'Reading page not found.');
  if (!env.BOOKS) fail(503, 'Reading pages are temporarily unavailable.');
  // User input cannot control the R2 object key prefix or extension.
  const object = await env.BOOKS.get(`${BOOK_ID}/pages/${String(page).padStart(4, '0')}.png`);
  if (!object) fail(404, 'This page is temporarily unavailable. Please contact support.');
  if (object.size > 4 * 1024 * 1024) fail(503, 'This reading page needs optimisation. Please contact support.');
  const bytes = new Uint8Array(await object.arrayBuffer()); let binary = ''; for (let offset = 0; offset < bytes.length; offset += 32768) binary += String.fromCharCode(...bytes.subarray(offset, offset + 32768));
  return json({ svg: watermarkedPage(btoa(binary), entitlement.reader_name, entitlement.phone, entitlement.order_id, page) });
}
async function limitedText(request) {
  if (Number(request.headers.get('Content-Length')) > 32768) fail(413, 'Request too large.');
  const reader = request.body?.getReader(); if (!reader) return '';
  const chunks = []; let size = 0;
  while (true) { const { value, done } = await reader.read(); if (done) break; size += value.length; if (size > 32768) { await reader.cancel(); fail(413, 'Request too large.'); } chunks.push(value); }
  const bytes = new Uint8Array(size); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return new TextDecoder().decode(bytes);
}
async function bodyJson(request) { let body; try { body = JSON.parse(await limitedText(request)); } catch (error) { if (error instanceof HttpError) throw error; fail(400, 'Invalid request body.'); } if (!body || typeof body !== 'object' || Array.isArray(body)) fail(400, 'Invalid request body.'); return body; }
export async function onRequest({ request, env }) {
  try {
    const path = new URL(request.url).pathname.replace(/^\/api\/?/, '').split('/').filter(Boolean);
    const route = path[0]; const method = request.method;
    if (route === 'config' && path.length === 1 && method === 'GET') return await publicConfig(env);
    if (route === 'webhook' && path.length === 1 && method === 'POST') return await webhook(request, env);
    if (!['orders', 'verify', 'library', 'read'].includes(route)) fail(404, 'Endpoint not found.');
    if ((['orders', 'verify'].includes(route) && method !== 'POST') || (['library', 'read'].includes(route) && method !== 'GET')) fail(405, 'Method not allowed.');
    if (method === 'POST' && request.headers.get('Origin') !== new URL(request.url).origin) fail(403, 'Open checkout from the Toppers Books website.');
    const user = await authenticate(request, env);
    if (route === 'orders' && path.length === 1) return await createOrder(request, env, user);
    if (route === 'verify' && path.length === 1) return await verifyOrder(request, env, user);
    if (route === 'library' && path.length === 1) return await library(env, user);
    if (route === 'read' && path.length === 3) return await readPage(env, user, path[1], path[2]);
    fail(404, 'Endpoint not found.');
  } catch (error) {
    // Never echo secrets, raw provider responses, user data or stack traces.
    return json({ error: error instanceof HttpError ? error.message : 'This service is temporarily unavailable. Please contact support.' }, error instanceof HttpError ? error.status : 503);
  }
}

import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { onRequest, priceFor, buyerDetails, profileDetails, validateClaims, validatePayment, checkSignature, watermarkedPage } from '../functions/api/[[path]].js';

const now = Math.floor(Date.now() / 1000);
const claims = { aud: 'test-project', iss: 'https://securetoken.google.com/test-project', sub: 'buyer-a', exp: now + 3600, iat: now - 60, auth_time: now - 60, email: 'buyer@example.test', email_verified: true };
let pair, jwk;
const originalFetch = globalThis.fetch;
let paymentResponse;
let pendingOrderResponse;
let pendingPaymentAttempts = { count: 0, items: [] };
let gatewayCalls = 0;
const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
async function token(overrides = {}) { const data = encode({ alg: 'RS256', kid: 'test-key' }) + '.' + encode({ ...claims, ...overrides }); const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', pair.privateKey, new TextEncoder().encode(data)); return data + '.' + Buffer.from(signature).toString('base64url'); }
before(async () => {
  pair = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
  jwk = { ...await crypto.subtle.exportKey('jwk', pair.publicKey), kid: 'test-key' };
  globalThis.fetch = async (url, options) => {
    if (String(url).includes('googleapis.com/service_accounts/')) return Response.json({ keys: [jwk] });
    if (String(url).includes('api.razorpay.com/v1/payments/')) { gatewayCalls++; return Response.json(paymentResponse); }
    if (String(url).endsWith('api.razorpay.com/v1/orders') && options?.method === 'POST') { gatewayCalls++; const order = JSON.parse(options.body); return Response.json({ id: 'order_restricted', ...order }); }
    if (String(url).endsWith('api.razorpay.com/v1/orders/order_pending/payments')) { gatewayCalls++; return Response.json(pendingPaymentAttempts); }
    if (String(url).endsWith('api.razorpay.com/v1/orders/order_pending')) { gatewayCalls++; return Response.json(pendingOrderResponse); }
    throw new Error('Unexpected external request: ' + url);
  };
});
after(() => { globalThis.fetch = originalFetch; });
function request(path, method = 'GET', body, authToken, extras = {}) { return new Request('https://store.test/api/' + path, { method, headers: { ...(method === 'POST' ? { Origin: 'https://store.test', 'Content-Type': 'application/json' } : {}), ...(authToken ? { Authorization: 'Bearer ' + authToken } : {}), ...extras }, ...(body !== undefined ? { body: typeof body === 'string' ? body : JSON.stringify(body) } : {}) }); }
const context = (req, env = {}) => onRequest({ request: req, env });
test('coupon pricing is authoritative and rejects unknown codes', () => { assert.equal(priceFor().amount, 19900); assert.equal(priceFor(' toppers50 ').amount, 14900); assert.throws(() => priceFor('FREE'), /not valid/); assert.throws(() => priceFor({}), /Invalid coupon/); });
test('buyer details require a valid phone and explicit watermark consent', () => { assert.deepEqual(buyerDetails({ name: 'Buyer Name', phone: '+91 83848 71987', consent: true }), { name: 'Buyer Name', phone: '8384871987' }); assert.throws(() => buyerDetails({ name: '<script>', phone: '8384871987', consent: true })); assert.throws(() => buyerDetails({ name: 'Buyer', phone: '123', consent: true })); assert.throws(() => buyerDetails({ name: 'Buyer', phone: '8384871987' }), /Accept/); });
test('tokens require exact issuer, audience, verified email and valid times', () => { assert.equal(validateClaims(claims, 'test-project', now).uid, 'buyer-a'); for (const invalid of [{ aud: 'other' }, { iss: 'https://attacker.test' }, { exp: now }, { iat: now + 1 }, { auth_time: now + 1 }, { sub: '' }, { email_verified: false }]) assert.throws(() => validateClaims({ ...claims, ...invalid }, 'test-project', now)); });
test('signatures verify the exact raw message', async () => { const signature = createHmac('sha256', 'secret').update('order_abc|pay_abc').digest('hex'); assert.equal(await checkSignature('secret', 'order_abc|pay_abc', signature), true); assert.equal(await checkSignature('secret', 'order_abc|pay_wrong', signature), false); assert.equal(await checkSignature('', 'order_abc|pay_abc', signature), false); assert.equal(await checkSignature('secret', 'value', 'invalid'), false); });
test('payment must be captured, match the stored amount/order and not be refunded', () => { const payment = { status: 'captured', captured: true, order_id: 'order_abc', amount: 14900, currency: 'INR', amount_refunded: 0 }; const order = { id: 'order_abc', amount: 14900 }; validatePayment(payment, order); for (const mismatch of [{ status: 'authorized' }, { captured: false }, { order_id: 'order_other' }, { amount: 1 }, { currency: 'USD' }, { amount_refunded: 14900 }]) assert.throws(() => validatePayment({ ...payment, ...mismatch }, order)); });
test('public configuration starts closed and never exposes secrets', async () => { const result = await context(request('config'), { RAZORPAY_KEY_SECRET: 'private', RAZORPAY_WEBHOOK_SECRET: 'webhook', SALES_OPEN: 'true' }); assert.equal(result.status, 200); const body = await result.text(); assert.equal(JSON.parse(body).salesOpen, false); assert.ok(!body.includes('private')); assert.ok(!body.includes('webhook')); });
test('forged/absent tokens cannot access library or reading pages', async () => { for (const path of ['library', 'read/cbse10-maths-standard/1']) { const response = await context(request(path), {}); assert.equal(response.status, 401); } const forged = encode({ alg: 'none', kid: 'test-key' }) + '.' + encode(claims) + '.forged'; assert.equal((await context(request('library', 'GET', undefined, forged), { FIREBASE_PROJECT_ID: 'test-project' })).status, 401); });
test('a signed-in user still cannot purchase before release', async () => { const response = await context(request('orders', 'POST', { amount: 1, coupon: 'FREE' }, await token()), { FIREBASE_PROJECT_ID: 'test-project' }); assert.equal(response.status, 409); });
test('API rejects cross-origin order posts and unsigned webhooks', async () => { assert.equal((await context(request('orders', 'POST', {}, undefined, { Origin: 'https://attacker.test' }))).status, 403); assert.equal((await context(request('webhook', 'POST', {}), { RAZORPAY_WEBHOOK_SECRET: 'secret' })).status, 400); });
test('an expired or missing entitlement prevents R2 access', async () => { let storageReads = 0; const env = { FIREBASE_PROJECT_ID: 'test-project', DB: { prepare() { return { bind() { return this; }, async first() { return null; } }; } }, BOOKS: { async get() { storageReads++; } } }; const response = await context(request('read/cbse10-maths-standard/1', 'GET', undefined, await token()), env); assert.equal(response.status, 403); assert.equal(storageReads, 0); });
test('page IDs cannot escape the private book object prefix', async () => { const response = await context(request('read/cbse10-maths-standard/0', 'GET', undefined, await token()), { FIREBASE_PROJECT_ID: 'test-project' }); assert.equal(response.status, 404); });
test('watermark embeds escaped identity and never interprets buyer input as markup', () => { const page = watermarkedPage('AA==', 'Buyer & <script>', '8384871987', 'order_test', 1); assert.ok(page.includes('Buyer &amp; &lt;script&gt;')); assert.ok(page.includes('8384871987')); assert.ok(!page.includes('<script>')); assert.equal((page.match(/rotate\(-25/g) || []).length, 4); });
test('order ownership is checked before a gateway confirmation', async () => { const initialCalls = gatewayCalls; const env = { FIREBASE_PROJECT_ID: 'test-project', DB: { prepare() { return { bind(id, uid) { assert.equal(uid, 'buyer-a'); return this; }, async first() { return null; } }; } } }; const response = await context(request('verify', 'POST', { razorpay_order_id: 'order_other', razorpay_payment_id: 'pay_other', razorpay_signature: 'a'.repeat(64) }, await token()), env); assert.equal(response.status, 404); assert.equal(gatewayCalls, initialCalls); });
test('captured payment retries use an idempotent entitlement write', async () => { const batches = []; const order = { id: 'order_demo', uid: 'buyer-a', book_id: 'cbse10-maths-standard', amount: 14900, reader_name: 'Buyer', phone: '8384871987', status: 'paid', paid_at: now - 300 }; const env = { FIREBASE_PROJECT_ID: 'test-project', RAZORPAY_KEY_ID: 'rzp_live_example', RAZORPAY_KEY_SECRET: 'secret', DB: { prepare(sql) { return { sql, bind(...args) { this.args = args; return this; }, async first() { return order; } }; }, async batch(statements) { batches.push(statements); } } }; paymentResponse = { id: 'pay_demo', order_id: order.id, status: 'captured', captured: true, amount: 14900, currency: 'INR', amount_refunded: 0, created_at: now - 300 }; const signature = createHmac('sha256', 'secret').update('order_demo|pay_demo').digest('hex'); const body = { razorpay_order_id: order.id, razorpay_payment_id: 'pay_demo', razorpay_signature: signature }; for (let i = 0; i < 2; i++) assert.equal((await context(request('verify', 'POST', body, await token()), env)).status, 200); assert.equal(batches.length, 2); for (const statements of batches) { assert.equal(statements[0].args[1], now - 300); assert.match(statements[1].sql, /ON CONFLICT\(order_id\) DO NOTHING/); assert.match(statements[1].sql, /status = 'paid'/); } });

function profileDatabase() {
  const profiles = new Map(), preferences = new Map();
  return { profiles, preferences, prepare(sql) { return {
    bind(...args) { this.args = args; return this; },
    async run() {
      if (sql.startsWith('CREATE TABLE IF NOT EXISTS practice_email_preferences')) return;
      if (sql.startsWith('INSERT INTO customer_profiles')) { profiles.set(this.args[0], this.args); return; }
      if (sql.startsWith('INSERT INTO practice_email_preferences')) { preferences.set(this.args[0], this.args); return; }
      throw new Error('Unexpected write: ' + sql);
    },
    async first() {
      if (sql.includes('FROM customer_profiles')) { const saved = profiles.get(this.args[0]); return saved ? { name: saved[2], phone: saved[3], phone_verified: 0 } : null; }
      if (sql.includes('FROM practice_email_preferences')) { const saved = preferences.get(this.args[0]); return saved ? { enabled: saved[2] } : null; }
      throw new Error('Unexpected read: ' + sql);
    }
  }; } };
}
test('profile persistence uses the signed UID/email and never caller-supplied identity', async () => {
  const env = { FIREBASE_PROJECT_ID: 'test-project', DB: profileDatabase() };
  const response = await context(request('profile', 'POST', { uid: 'victim', email: 'victim@example.test', name: 'Buyer Name', phone: '+91 83848 71987', consent: true, phoneVerified: true }, await token({ email_verified: false })), env);
  const saved = env.DB.profiles.get('buyer-a');
  assert.equal(response.status, 200); assert.equal(saved[0], 'buyer-a'); assert.equal(saved[1], 'buyer@example.test');
  const returned = await response.json(); assert.equal(returned.profile.phoneVerified, false); assert.equal(returned.profile.practiceAlerts, false);
  const read = await context(request('profile?uid=victim', 'GET', undefined, await token()), env);
  assert.equal(read.status, 200); assert.equal((await read.json()).profile.name, 'Buyer Name');
});

test('practice alerts persist opt-in and opt-out, preserve omitted preferences and isolate accounts', async () => {
  const env = { FIREBASE_PROJECT_ID: 'test-project', DB: profileDatabase() };
  const body = { name: 'Buyer Name', phone: '8384871987', consent: true, uid: 'victim', email: 'victim@example.test' };
  const authToken = await token();
  for (const enabled of [true, false]) {
    const save = await context(request('profile', 'POST', { ...body, practiceAlerts: enabled }, authToken), env);
    assert.equal(save.status, 200); assert.equal((await save.json()).profile.practiceAlerts, enabled);
    const read = await context(request('profile', 'GET', undefined, authToken), env);
    assert.equal((await read.json()).profile.practiceAlerts, enabled);
    const legacy = await context(request('profile', 'POST', body, authToken), env);
    assert.equal((await legacy.json()).profile.practiceAlerts, enabled);
    const saved = env.DB.preferences.get('buyer-a');
    assert.equal(saved[1], 'buyer@example.test'); assert.equal(saved[2], Number(enabled)); assert.ok(saved[3] > 0);
    assert.equal(env.DB.preferences.has('victim'), false);
  }
  const other = await context(request('profile', 'GET', undefined, await token({ sub: 'buyer-b' })), env);
  assert.equal((await other.json()).profile, null);
  const invalid = await context(request('profile', 'POST', { ...body, practiceAlerts: 'true' }, authToken), env);
  assert.equal(invalid.status, 400);
});

test('profile-only access for an unverified account cannot read the library or books', async () => {
  const unverified = await token({ email_verified: false });
  for (const path of ['library', 'read/cbse10-maths-standard/1']) assert.equal((await context(request(path, 'GET', undefined, unverified), { FIREBASE_PROJECT_ID: 'test-project' })).status, 401);
});

test('profile save fails honestly without storage and rejects missing consent', async () => {
  const authToken = await token();
  const body = { name: 'Buyer Name', phone: '8384871987', consent: true };
  const response = await context(request('profile', 'POST', body, authToken), { FIREBASE_PROJECT_ID: 'test-project' });
  assert.equal(response.status, 503); assert.ok(!(await response.text()).includes('"saved":true'));
  const env = { FIREBASE_PROJECT_ID: 'test-project', DB: {} };
  assert.equal((await context(request('profile', 'POST', { ...body, consent: false }, authToken), env)).status, 400);
  assert.throws(() => profileDetails({ name: '<img>', phone: '8384871987' }));
});

function restrictedEnvironment(overrides = {}) {
  return { FIREBASE_PROJECT_ID: 'test-project', SALES_OPEN: 'false', TEST_CHECKOUT_EMAIL: 'buyer@example.test', RAZORPAY_KEY_ID: 'rzp_live_example', RAZORPAY_KEY_SECRET: 'secret', RAZORPAY_WEBHOOK_SECRET: 'webhook', BOOKS: {},
    DB: { prepare(sql) { return { bind() { return this; }, async first() {
      if (sql.includes('FROM books')) return { is_ready: 1, page_count: 223 };
      if (sql.includes('FROM customer_profiles')) return { name: 'Buyer Name', phone: '8384871987' };
      return null;
    }, async run() { return { success: true }; } }; } }, ...overrides };
}
test('restricted checkout requires exact signed verified email and keeps public configuration closed', async () => {
  const env = restrictedEnvironment();
  const publicResult = await (await context(request('config?email=buyer@example.test'), env)).json();
  assert.equal(publicResult.salesOpen, false); assert.equal(publicResult.checkoutEnabled, false);
  assert.ok(!JSON.stringify(publicResult).includes(env.TEST_CHECKOUT_EMAIL));
  const permitted = await (await context(request('config', 'GET', undefined, await token()), env)).json();
  assert.equal(permitted.salesOpen, false); assert.equal(permitted.checkoutEnabled, true); assert.equal(permitted.liveTest, true);
  const other = await (await context(request('config', 'GET', undefined, await token({ email: 'other@example.test' })), env)).json();
  assert.equal(other.checkoutEnabled, false);
  assert.equal((await context(request('config', 'GET', undefined, await token({ email_verified: false })), env)).status, 401);
});
test('only the allowed tester can create a real order while sales are closed', async () => {
  const body = { bookId: 'cbse10-maths-standard', name: 'Buyer Name', phone: '8384871987', consent: true, coupon: 'TOPPERS50' };
  const env = restrictedEnvironment(); const initial = gatewayCalls;
  const denied = await context(request('orders', 'POST', { ...body, email: 'buyer@example.test' }, await token({ email: 'other@example.test' })), env);
  assert.equal(denied.status, 409); assert.equal(gatewayCalls, initial);
  const allowed = await context(request('orders', 'POST', { ...body, amount: 1 }, await token()), env);
  assert.equal(allowed.status, 200); const order = await allowed.json(); assert.equal(order.amount, 14900); assert.equal(order.keyId, env.RAZORPAY_KEY_ID);
  for (const change of [{ TEST_CHECKOUT_EMAIL: '' }, { RAZORPAY_KEY_ID: 'rzp_test_example' }, { RAZORPAY_WEBHOOK_SECRET: '' }, { AUTH_DISABLED: 'true' }]) {
    const response = await context(request('orders', 'POST', body, await token()), { ...env, ...change });
    assert.ok([401, 409, 503].includes(response.status));
  }
});
test('restricted checkout still requires the complete book to be ready', async () => {
  const env = restrictedEnvironment({ DB: { prepare() { return { bind() { return this; }, async first() { return { is_ready: 0, page_count: 223 }; } }; } } });
  const result = await (await context(request('config', 'GET', undefined, await token()), env)).json();
  assert.equal(result.checkoutEnabled, false);
  assert.equal((await context(request('orders', 'POST', {}, await token()), env)).status, 409);
});

test('retry reopens only the same unpaid order and never creates another charge', async () => {
  const pending = { id: 'order_pending', amount: 14900, reader_name: 'Buyer Name', phone: '8384871987' };
  const env = restrictedEnvironment({ DB: { prepare(sql) { return { bind() { return this; }, async first() {
    if (sql.includes('FROM books')) return { is_ready: 1, page_count: 223 };
    if (sql.includes('FROM customer_profiles')) return { name: 'Buyer Name', phone: '8384871987' };
    if (sql.includes('FROM orders')) return pending;
    return null;
  }, async run() { throw new Error('Retry must not insert a new order'); } }; } } });
  const body = { bookId: 'cbse10-maths-standard', name: 'Buyer Name', phone: '8384871987', consent: true, coupon: 'TOPPERS50' };
  pendingOrderResponse = { id: pending.id, amount: 14900, currency: 'INR', status: 'attempted', amount_paid: 0, amount_due: 14900 };
  const response = await context(request('orders', 'POST', body, await token()), env);
  assert.equal(response.status, 200); assert.equal((await response.json()).orderId, pending.id);
  for (const change of [{ status: 'paid', amount_paid: 14900, amount_due: 0 }, { currency: 'USD' }, { amount: 1 }, { id: 'order_other' }]) {
    const previous = pendingOrderResponse; pendingOrderResponse = { ...previous, ...change };
    assert.equal((await context(request('orders', 'POST', body, await token()), env)).status, 409);
    pendingOrderResponse = previous;
  }
  pendingPaymentAttempts = { count: 1, items: [{ order_id: pending.id, status: 'authorized' }] };
  assert.equal((await context(request('orders', 'POST', { ...body, coupon: '' }, await token()), env)).status, 409);
});

test('an abandoned unpaid order permits a changed coupon or profile without losing history', async () => {
  let writes = []; const pending = { id: 'order_pending', amount: 19900, reader_name: 'Old Buyer', phone: '9999999999' };
  const env = restrictedEnvironment({ DB: { prepare(sql) { return { sql, bind(...args) { this.args = args; return this; }, async first() {
    if (sql.includes('FROM books')) return { is_ready: 1, page_count: 223 };
    if (sql.includes('FROM customer_profiles')) return { name: 'Buyer Name', phone: '8384871987' };
    if (sql.includes('FROM orders')) { assert.match(sql, /ORDER BY created_at DESC, rowid DESC LIMIT 1/); return pending; }
    return null;
  }, async run() { writes.push({ sql, args: this.args }); return { success: true }; } }; } } });
  const body = { bookId: 'cbse10-maths-standard', name: 'Buyer Name', phone: '8384871987', consent: true, coupon: 'Toppers50' };
  pendingOrderResponse = { id: pending.id, amount: 19900, currency: 'INR', status: 'created', amount_paid: 0, amount_due: 19900 };
  for (const attempts of [{ count: 0, items: [] }, { count: 1, items: [{ order_id: pending.id, status: 'failed' }] }]) {
    pendingPaymentAttempts = attempts; writes = [];
    const response = await context(request('orders', 'POST', body, await token()), env);
    assert.equal(response.status, 200); assert.equal((await response.json()).amount, 14900);
    assert.equal(writes.length, 1); assert.match(writes[0].sql, /^INSERT INTO orders/); assert.equal(writes[0].args[3], 14900); assert.equal(writes[0].args[5], 'Buyer Name');
  }
  for (const status of ['created', 'authorized', 'captured', 'refunded', 'unknown']) {
    writes = []; pendingPaymentAttempts = { count: 1, items: [{ order_id: pending.id, status }] };
    const response = await context(request('orders', 'POST', body, await token()), env);
    assert.equal(response.status, 409); assert.equal(writes.length, 0);
  }
  pendingPaymentAttempts = { count: 1, items: [] };
  assert.equal((await context(request('orders', 'POST', body, await token()), env)).status, 409);
});

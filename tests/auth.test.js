import test from 'node:test';
import assert from 'node:assert/strict';
import { authMessage, emailAuthentication, passwordReset } from '../assets/auth-helpers.js';
import { onRequest, firebaseSettings } from '../functions/api/[[path]].js';

test('normal password sign-in does not send an email or create an account', async () => {
  const calls = [];
  const sdk = {
    async signInWithEmailAndPassword(auth, email, password) { calls.push(['signin', email, password]); return { user: { uid: 'existing', emailVerified: true } }; },
    async createUserWithEmailAndPassword() { assert.fail('Unexpected account creation'); },
    async sendEmailVerification() { assert.fail('Unexpected verification email on normal login'); }
  };
  const result = await emailAuthentication(sdk, {}, 'signin', 'buyer@example.test', 'user-password', 'https://store.test/#library');
  assert.equal(result.user.uid, 'existing'); assert.equal(result.verificationSent, false); assert.equal(calls.length, 1);
});

test('signup sends a verification email once and remains unverified', async () => {
  const calls = [];
  const user = { uid: 'new-buyer', emailVerified: false };
  const sdk = {
    async createUserWithEmailAndPassword() { calls.push('signup'); return { user }; },
    async sendEmailVerification(target, options) { assert.equal(target, user); assert.equal(options.url, 'https://store.test/#library'); calls.push('verify'); }
  };
  const result = await emailAuthentication(sdk, {}, 'signup', 'buyer@example.test', 'long-password', 'https://store.test/#library');
  assert.deepEqual(calls, ['signup', 'verify']); assert.equal(result.verificationSent, true); assert.equal(result.user.emailVerified, false);
});

test('a weak signup password does not create an account', async () => {
  const sdk = { async createUserWithEmailAndPassword() { assert.fail('Weak password reached account creation'); } };
  await assert.rejects(emailAuthentication(sdk, {}, 'signup', 'buyer@example.test', 'short', 'https://store.test'), { code: 'auth/weak-password' });
});

test('a verification email quota failure keeps the created account available for resend', async () => {
  const user = { uid: 'created', emailVerified: false };
  const sdk = { async createUserWithEmailAndPassword() { return { user }; }, async sendEmailVerification() { throw { code: 'auth/too-many-requests' }; } };
  const result = await emailAuthentication(sdk, {}, 'signup', 'buyer@example.test', 'long-password', 'https://store.test');
  assert.equal(result.user, user); assert.equal(result.verificationSent, false);
});

test('password reset does not reveal whether an email has an account', async () => {
  const success = await passwordReset({ async sendPasswordResetEmail() {} }, {}, 'exists@example.test', 'https://store.test');
  const missing = await passwordReset({ async sendPasswordResetEmail() { throw { code: 'auth/user-not-found' }; } }, {}, 'missing@example.test', 'https://store.test');
  assert.equal(success, missing);
  await assert.rejects(passwordReset({ async sendPasswordResetEmail() { throw { code: 'auth/network-request-failed' }; } }, {}, 'test@example.test', 'https://store.test'));
});

test('credential errors do not expose user enumeration or raw server messages', () => {
  assert.equal(authMessage({ code: 'auth/user-not-found' }), authMessage({ code: 'auth/wrong-password' }));
  assert.equal(authMessage({ code: 'auth/user-not-found' }), authMessage({ code: 'auth/invalid-credential' }));
  assert.ok(!authMessage({ message: 'private server detail' }).includes('private server detail'));
});

test('public Firebase config activates auth while leaving sales closed', async () => {
  const response = await onRequest({ request: new Request('https://store.test/api/config'), env: {} });
  const config = await response.json();
  assert.equal(config.authEnabled, true); assert.equal(config.firebase.projectId, 'toppers-books'); assert.equal(config.firebase.authDomain, 'toppers-books.firebaseapp.com'); assert.equal(config.salesOpen, false);
  assert.equal(firebaseSettings({ FIREBASE_PROJECT_ID: 'isolated-project' }).projectId, 'isolated-project');
});

test('auth can be explicitly disabled without enabling checkout', async () => {
  const response = await onRequest({ request: new Request('https://store.test/api/config'), env: { AUTH_DISABLED: 'true', SALES_OPEN: 'true' } });
  const config = await response.json();
  assert.equal(config.authEnabled, false); assert.equal(config.firebase, null); assert.equal(config.salesOpen, false);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../assets/app.js', import.meta.url), 'utf8');
const marker = "$('#checkout-form').addEventListener('submit', ";
const handlerSource = source.slice(source.indexOf(marker) + marker.length, source.indexOf('\nfunction updateCouponTotal()')).replace(/\);\s*$/, '');
function setup({ openThrows = false, verificationFails = false } = {}) {
  const dialog = { open: true, close() { this.open = false; } };
  const nodes = { '#checkout-dialog': dialog, '#checkout-status': {}, '#pay-button': {}, '#buyer-name': { value: 'Buyer Name' }, '#buyer-phone': { value: '8384871987' }, '#coupon': { value: 'TOPPERS50' }, '#purchase-consent': { checked: true } };
  let provider, options, verified = false, library = false, message;
  const context = { updateCouponTotal() {}, config: { checkoutEnabled: true }, currentUser: { email: 'buyer@example.test' }, $: key => nodes[key],
    api: async path => { if (path === 'verify') { if (verificationFails) throw new Error('Verification pending'); verified = true; return {}; } return { orderId: 'order_demo', keyId: 'rzp_live_example', amount: 14900 }; },
    window: { Razorpay: function(input) { options = input; provider = this; this.on = () => {}; this.open = () => { assert.equal(dialog.open, false, 'native modal must close before provider opens'); if (openThrows) throw new Error('Could not open payment'); }; } },
    openDialog: () => { dialog.open = true; }, setTimeout: fn => fn(), location: {}, showLibrary: () => { library = true; }, notify: value => { message = value; } };
  const submit = vm.runInNewContext('(' + handlerSource + ')', context);
  return { submit: () => submit({ preventDefault() {} }), dialog, nodes, get options() { return options; }, get provider() { return provider; }, get verified() { return verified; }, get library() { return library; }, get message() { return message; } };
}
test('payment overlay opens above the closed native form and dismissal restores it', async () => {
  const state = setup(); await state.submit(); assert.ok(state.provider); assert.equal(state.dialog.open, false);
  state.options.modal.ondismiss(); assert.equal(state.dialog.open, true); assert.equal(state.nodes['#pay-button'].disabled, false);
});
test('payment overlay launch failure restores the form with a visible error', async () => {
  const state = setup({ openThrows: true }); await state.submit(); assert.equal(state.dialog.open, true); assert.equal(state.nodes['#checkout-status'].textContent, 'Could not open payment'); assert.equal(state.nodes['#pay-button'].disabled, false);
});
test('payment callback verifies before opening purchased books and reports verification failures visibly', async () => {
  const state = setup(); await state.submit(); await state.options.handler({}); assert.equal(state.verified, true); assert.equal(state.library, true);
  const failed = setup({ verificationFails: true }); await failed.submit(); await failed.options.handler({}); assert.equal(failed.library, false); assert.equal(failed.message, 'Verification pending');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { requestReaderFullscreen, exitReaderFullscreen, setupReaderFullscreen } from '../assets/reader-fullscreen.js';

test('fullscreen requests only the reader stage, never the document or modal', async () => {
  const doc = { documentElement: {} };
  const stage = {};
  stage.requestFullscreen = async function(options) { assert.equal(this, stage); assert.deepEqual(options, { navigationUI: 'hide' }); doc.fullscreenElement = this; };
  assert.equal(await requestReaderFullscreen(doc, stage), true);
  doc.exitFullscreen = async () => { doc.fullscreenElement = null; };
  await exitReaderFullscreen(doc);
  assert.equal(doc.fullscreenElement, null);
});
test('unsupported and denied native fullscreen allow the full-window fallback', async () => {
  assert.equal(await requestReaderFullscreen({ documentElement: {} }, {}), false);
  assert.equal(await requestReaderFullscreen({ documentElement: {} }, { requestFullscreen: async () => { throw new Error('denied'); } }), false);
});
test('WebKit fullscreen uses its prefixed request and exit methods', async () => {
  const doc = { documentElement: {} };
  const stage = {};
  stage.webkitRequestFullscreen = async () => { doc.webkitFullscreenElement = stage; };
  doc.webkitExitFullscreen = async () => { doc.webkitFullscreenElement = null; };
  assert.equal(await requestReaderFullscreen(doc, stage), true);
  await exitReaderFullscreen(doc);
  assert.equal(doc.webkitFullscreenElement, null);
});
function element() {
  const handlers = new Map(), classes = new Set();
  return { disabled: false, hidden: false, attrs: {}, open: true,
    classList: { toggle(name, value) { value ? classes.add(name) : classes.delete(name); }, remove(name) { classes.delete(name); }, contains(name) { return classes.has(name); } },
    setAttribute(name, value) { this.attrs[name] = value; },
    addEventListener(name, fn) { const list = handlers.get(name) || []; list.push(fn); handlers.set(name, list); },
    async emit(name, event = {}) { for (const fn of handlers.get(name) || []) await fn(event); },
    contains() { return false; }, closest() { return null; }
  };
}
for (const native of [false, true]) test(`${native ? 'Native reader fullscreen' : 'Full-window fallback'} keeps the modal open, toggles controls and restores locks on exit`, async () => {
  const previousRAF = globalThis.requestAnimationFrame;
  globalThis.requestAnimationFrame = fn => fn();
  const root = element(), fullscreen = element(), lock = element(), hint = element();
  const previous = element(), next = element(); previous.disabled = true;
  const nodes = { '#reader-stage': element(), '#reader-fullscreen': fullscreen, '#reader-lock': lock, '#reader-focus-hint': hint };
  root.querySelector = selector => nodes[selector]; root.querySelectorAll = () => [previous, next];
  const doc = { ...element(), documentElement: {} };
  if (native) {
    nodes['#reader-stage'].requestFullscreen = async () => { doc.fullscreenElement = nodes['#reader-stage']; await doc.emit('fullscreenchange'); };
    doc.exitFullscreen = async () => { doc.fullscreenElement = null; await doc.emit('fullscreenchange'); };
    doc.documentElement.requestFullscreen = () => { throw new Error('The website must never be the fullscreen target'); };
  }
  let enters = 0, lockCalls = 0, messages = 0;
  const controller = setupReaderFullscreen(root, { onResize() {}, onMessage() { messages++; }, onEnter() { enters++; }, onLock() { lockCalls++; } }, doc);
  const target = { closest: selector => selector === '#page-viewport' ? target : null };
  async function tap() {
    const event = { target, pointerId: 1, clientX: 100, clientY: 100 };
    await root.emit('pointerdown', event); await root.emit('pointerup', event);
  }
  try {
    await fullscreen.emit('click');
    assert.equal(controller.active, true); assert.equal(enters, 1); assert.equal(messages, native ? 0 : 1); assert.equal(root.open, true); assert.equal(lock.hidden, false);
    await tap(); assert.equal(root.classList.contains('focus-controls-hidden'), true);
    await tap(); assert.equal(root.classList.contains('focus-controls-hidden'), false);
    await lock.emit('click'); assert.equal(controller.locked, true); assert.equal(next.disabled, true); assert.equal(lockCalls, 1);
    await tap(); assert.equal(root.classList.contains('focus-controls-hidden'), false);
    await lock.emit('click'); assert.equal(controller.locked, false); assert.equal(previous.disabled, true); assert.equal(next.disabled, false);
    await lock.emit('click'); await fullscreen.emit('click');
    assert.equal(controller.active, false); assert.equal(root.open, true); if (native) assert.equal(doc.fullscreenElement, null); assert.equal(controller.locked, false); assert.equal(lock.hidden, true); assert.equal(next.disabled, false);
  } finally { await controller.close(); globalThis.requestAnimationFrame = previousRAF; }
});

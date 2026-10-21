import test from 'node:test';
import assert from 'node:assert/strict';
import { bindReaderGestures } from '../assets/reader-gestures.js';

function harness() {
  let time = 0, allowed = true, scale = 1;
  const listeners = new Map(), turns = [], drags = [];
  const target = { clientWidth: 390, addEventListener(type, handler) { listeners.set(type, handler); }, removeEventListener(type) { listeners.delete(type); }, setPointerCapture() {} };
  const viewportListeners = new Map();
  const viewport = { addEventListener(type, fn) { viewportListeners.set(type, fn); }, removeEventListener(type) { viewportListeners.delete(type); } };
  const binding = bindReaderGestures(target, { viewport, getScale: () => scale, enabled: () => allowed, now: () => time, onTurn: direction => turns.push(direction), onDrag: dx => drags.push(dx), onReset() {} });
  function send(type, fields = {}, advance = 20) {
    time += advance;
    const event = { cancelable: true, prevented: false, preventDefault() { this.prevented = true; }, target: { closest() { return null; } }, ...fields };
    listeners.get(type)?.(event); return event;
  }
  return { send, turns, drags, binding, nativeZoom(value) { scale = value; viewportListeners.get('resize')?.(); }, allow(value) { allowed = value; } };
}
const finger = (x, y = 100, identifier = 1) => ({ clientX: x, clientY: y, identifier });

test('Mac trackpad horizontal wheel stream turns once despite its momentum tail', () => {
  const h = harness();
  for (const deltaX of [12, 18, 20, 40, 30, 15, 5]) {
    const event = h.send('wheel', { deltaX, deltaY: 0, deltaMode: 0 });
    assert.equal(event.prevented, true);
  }
  assert.deepEqual(h.turns, [1]);
  h.send('wheel', { deltaX: -55, deltaY: 0 }, 300);
  assert.deepEqual(h.turns, [1, -1]);
});

test('iPhone touch swipe survives pointer cancellation and never double-turns', () => {
  const h = harness();
  h.send('pointerdown', { pointerType: 'touch', pointerId: 1, button: 0, clientX: 250, clientY: 100 });
  h.send('touchstart', { touches: [finger(250)] });
  h.send('pointercancel', { pointerType: 'touch', pointerId: 1 });
  const move = h.send('touchmove', { touches: [finger(170)] });
  assert.equal(move.prevented, true);
  h.send('touchend', { touches: [], changedTouches: [finger(150)] });
  h.send('pointerup', { pointerType: 'touch', pointerId: 1, clientX: 150, clientY: 100 });
  assert.deepEqual(h.turns, [1]);
  assert.deepEqual(h.drags, [-80]);
});

test('mouse dragging turns pages; vertical scrolling and two-finger pinch do not', () => {
  const h = harness();
  h.send('pointerdown', { pointerType: 'mouse', pointerId: 8, button: 0, clientX: 150, clientY: 100 });
  h.send('pointermove', { pointerId: 8, clientX: 230, clientY: 110 });
  h.send('pointerup', { pointerId: 8, clientX: 230, clientY: 110 });
  assert.deepEqual(h.turns, [-1]);
  const wheel = h.send('wheel', { deltaX: 0, deltaY: 160 });
  assert.equal(wheel.prevented, false);
  h.send('touchstart', { touches: [finger(220)] });
  h.send('touchmove', { touches: [finger(215, 200)] });
  h.send('touchend', { changedTouches: [finger(100, 250)] });
  h.send('touchstart', { touches: [finger(200), finger(300, 100, 2)] });
  h.send('touchend', { changedTouches: [finger(80)] });
  assert.deepEqual(h.turns, [-1]);
});

test('zoomed reading allows native scrolling/pinching without changing pages', () => {
  const h = harness(); h.allow(false);
  assert.equal(h.send('wheel', { deltaX: 100, deltaY: 0 }).prevented, false);
  h.send('touchstart', { touches: [finger(220)] });
  assert.equal(h.send('touchmove', { touches: [finger(100)] }).prevented, false);
  h.send('touchend', { changedTouches: [finger(100)] });
  assert.deepEqual(h.turns, []);
  h.allow(true);
  assert.equal(h.send('wheel', { deltaX: 100, deltaY: 0, ctrlKey: true }).prevented, false);
  assert.deepEqual(h.turns, []);
});


test('native phone pinch zoom blocks wheel, touch and mouse page turns while allowing panning', () => {
  const h = harness(); h.nativeZoom(2);
  assert.equal(h.send('wheel', { deltaX: 100, deltaY: 0 }).prevented, false);
  h.send('touchstart', { touches: [finger(250)] });
  assert.equal(h.send('touchmove', { touches: [finger(100)] }).prevented, false);
  h.send('touchend', { touches: [], changedTouches: [finger(100)] });
  h.send('pointerdown', { pointerType: 'mouse', pointerId: 1, button: 0, clientX: 250, clientY: 100 });
  h.send('pointermove', { pointerId: 1, clientX: 100, clientY: 100 });
  h.send('pointerup', { pointerId: 1, clientX: 100, clientY: 100 });
  assert.deepEqual(h.turns, []); assert.deepEqual(h.drags, []);
  h.nativeZoom(1);
  h.send('wheel', { deltaX: 55, deltaY: 0 }, 300);
  assert.deepEqual(h.turns, [1]);
});

test('zooming mid-swipe cancels it, and a remaining pinch finger cannot start a page turn', () => {
  const h = harness();
  h.send('touchstart', { touches: [finger(250)] });
  h.send('touchmove', { touches: [finger(220)] });
  h.nativeZoom(2);
  assert.equal(h.send('touchend', { touches: [], changedTouches: [finger(100)] }).prevented, false);
  h.nativeZoom(1);
  h.send('touchstart', { touches: [finger(250), finger(300,100,2)] });
  h.send('touchend', { touches: [finger(250)], changedTouches: [finger(300,100,2)] });
  h.send('touchstart', { touches: [finger(250)] });
  h.send('touchmove', { touches: [finger(100)] });
  h.send('touchend', { touches: [], changedTouches: [finger(100)] });
  assert.deepEqual(h.turns, []);
  h.send('touchstart', { touches: [finger(250)] });
  h.send('touchmove', { touches: [finger(100)] });
  h.send('touchend', { touches: [], changedTouches: [finger(100)] });
  assert.deepEqual(h.turns, [1]);
});

test('Safari native zoom and trackpad pinch cannot carry a partial wheel swipe into a page turn', () => {
  const h = harness();
  h.send('wheel', { deltaX: 35, deltaY: 0 });
  h.send('wheel', { deltaX: 80, deltaY: 0, ctrlKey: true });
  h.send('wheel', { deltaX: 15, deltaY: 0 });
  assert.deepEqual(h.turns, []);
  h.send('gesturestart'); h.send('gesturechange', {scale: 2}); h.send('gestureend', {scale: 2});
  assert.equal(h.send('wheel', {deltaX: 100,deltaY: 0}).prevented,false);
  assert.deepEqual(h.turns, []);
  h.send('gesturestart'); h.send('gestureend', {scale: .5});
  h.send('wheel', {deltaX: 55,deltaY: 0},300); assert.deepEqual(h.turns,[1]);
});

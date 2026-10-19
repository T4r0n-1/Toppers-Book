import { swipeDirection } from './reader-layout.js';

// A trackpad swipe arrives as wheel events; iOS uses Touch Events. Keep them
// separate from mouse/pen pointer dragging so one gesture can only turn once.
export function bindReaderGestures(target, { enabled, onTurn, onDrag, onReset, now = () => performance.now() }) {
  let pointer = null, touch = null, wheelSum = 0, wheelAt = -Infinity, wheelTurned = false;
  const subscriptions = [];
  function listen(type, handler, options) { target.addEventListener(type, handler, options); subscriptions.push([type, handler, options]); }
  function begin(x, y, id) { return { x, y, id, at: now(), horizontal: false }; }
  function cancel() { pointer = touch = null; onReset(); }
  function move(state, x, y, event) {
    if (!enabled()) { cancel(); return; }
    const dx = x - state.x, dy = y - state.y;
    if (!state.horizontal && Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx)) { cancel(); return; }
    if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy) * 1.2) state.horizontal = true;
    if (!state.horizontal) return;
    if (event.cancelable) event.preventDefault();
    onDrag(dx);
  }
  function end(state, x, y, event) {
    if (!state) return;
    const direction = enabled() ? swipeDirection(x - state.x, y - state.y, now() - state.at, target.clientWidth) : 0;
    if (state.horizontal && event.cancelable) event.preventDefault();
    onReset();
    if (direction) onTurn(direction);
  }
  listen('pointerdown', event => {
    if (event.pointerType === 'touch') return;
    if (!enabled() || event.isPrimary === false || event.button !== 0 || event.target.closest?.('button, a')) return;
    pointer = begin(event.clientX, event.clientY, event.pointerId);
    try { target.setPointerCapture?.(event.pointerId); } catch { /* End events within the reader still work without capture. */ }
  });
  listen('pointermove', event => { if (pointer?.id === event.pointerId) move(pointer, event.clientX, event.clientY, event); });
  listen('pointerup', event => { if (pointer?.id !== event.pointerId) return; const state = pointer; pointer = null; end(state, event.clientX, event.clientY, event); });
  for (const type of ['pointercancel', 'lostpointercapture']) listen(type, event => { if (pointer?.id === event.pointerId) { pointer = null; onReset(); } });

  listen('touchstart', event => {
    if (!enabled() || event.touches.length !== 1) { touch = null; onReset(); return; }
    const finger = event.touches[0]; touch = begin(finger.clientX, finger.clientY, finger.identifier);
  }, { passive: true });
  listen('touchmove', event => {
    if (!touch) return;
    if (event.touches.length !== 1) { cancel(); return; }
    const finger = [...event.touches].find(t => t.identifier === touch.id);
    if (finger) move(touch, finger.clientX, finger.clientY, event);
  }, { passive: false });
  listen('touchend', event => {
    if (!touch) return;
    const finger = [...event.changedTouches].find(t => t.identifier === touch.id);
    if (!finger) return;
    const state = touch; touch = null; end(state, finger.clientX, finger.clientY, event);
  }, { passive: false });
  listen('touchcancel', () => { touch = null; onReset(); }, { passive: true });

  listen('wheel', event => {
    if (!enabled() || event.ctrlKey || event.metaKey) return;
    let dx = event.deltaX, dy = event.deltaY;
    if (event.shiftKey && !dx) { dx = dy; dy = 0; }
    if (!Number.isFinite(dx) || Math.abs(dx) <= Math.abs(dy) * 1.2 || Math.abs(dx) < .1) return;
    if (event.cancelable) event.preventDefault();
    const time = now();
    if (time - wheelAt > 220) { wheelSum = 0; wheelTurned = false; }
    wheelAt = time;
    if (wheelTurned) return;
    const pixels = dx * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? target.clientWidth : 1);
    // Changing direction before the threshold starts a fresh deliberate swipe.
    if (wheelSum && Math.sign(wheelSum) !== Math.sign(pixels)) wheelSum = 0;
    wheelSum += pixels;
    if (Math.abs(wheelSum) >= 45) { wheelTurned = true; onTurn(wheelSum > 0 ? 1 : -1); }
  }, { passive: false });
  return {
    reset() { pointer = touch = null; wheelSum = 0; wheelAt = -Infinity; wheelTurned = false; onReset(); },
    destroy() { subscriptions.forEach(([type, handler, options]) => target.removeEventListener(type, handler, options)); }
  };
}

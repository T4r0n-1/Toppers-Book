export function fullscreenElement(doc) { return doc.fullscreenElement || doc.webkitFullscreenElement || null; }
export async function requestReaderFullscreen(doc) {
  // A <dialog> cannot be the Fullscreen API target. The document root can.
  const root = doc.documentElement;
  try {
    if (root.requestFullscreen) await root.requestFullscreen({ navigationUI: 'hide' });
    else if (root.webkitRequestFullscreen) await root.webkitRequestFullscreen();
    else return false;
    return fullscreenElement(doc) === root;
  } catch { return false; }
}
export async function exitReaderFullscreen(doc) {
  try {
    if (doc.exitFullscreen) await doc.exitFullscreen();
    else if (doc.webkitExitFullscreen) await doc.webkitExitFullscreen();
  } catch { /* The browser may already have exited fullscreen. */ }
}
export function setupReaderFullscreen(root, { onResize, onMessage, canHide = () => true, onEnter = () => {}, onLock = () => {} }, doc = document) {
  const fullscreen = root.querySelector('#reader-fullscreen');
  const lock = root.querySelector('#reader-lock');
  const hint = root.querySelector('#reader-focus-hint');
  let active = false, locked = false, hidden = false, nativeOwned = false, hideTimer, pointer = null;
  const disabledBeforeLock = new Map();
  function resize() { requestAnimationFrame(onResize); }
  function schedule() {
    clearTimeout(hideTimer);
    if (!active || hidden) return;
    hideTimer = setTimeout(() => {
      if (!canHide() || root.contains(doc.activeElement) && doc.activeElement?.matches('input,select,textarea')) { schedule(); return; }
      controls(false);
    }, 3000);
  }
  function controls(show) {
    hidden = !show;
    root.classList.toggle('focus-controls-hidden', active && hidden);
    hint.hidden = !active || !hidden;
    hint.textContent = locked ? 'Locked · tap to show controls' : 'Tap the page to show controls';
    if (show) schedule(); else clearTimeout(hideTimer);
  }
  function setLocked(value) {
    locked = value && active;
    root.classList.toggle('reader-locked', locked);
    lock.setAttribute('aria-pressed', String(locked)); lock.textContent = locked ? '🔒 Unlock' : '🔓 Lock';
    lock.setAttribute('aria-label', locked ? 'Unlock reading controls' : 'Lock reading controls');
    if (locked) {
      onLock();
      for (const element of root.querySelectorAll('#reader-contents button,.reader-controls button,.reader-controls select,.page-navigation button,.page-navigation input,[data-open-rough],#toggle-contents')) {
        disabledBeforeLock.set(element, element.disabled); element.disabled = true;
      }
      controls(false);
    } else {
      for (const [element, disabled] of disabledBeforeLock) element.disabled = disabled;
      disabledBeforeLock.clear(); controls(true);
    }
    resize();
  }
  function mode(value) {
    active = value; root.classList.toggle('is-reader-fullscreen', active);
    lock.hidden = !active;
    fullscreen.textContent = active ? 'Exit full screen' : 'Full screen';
    fullscreen.setAttribute('aria-label', active ? 'Exit full-screen reading' : 'Enter full-screen reading');
    fullscreen.setAttribute('aria-pressed', String(active));
    if (!active) { setLocked(false); hidden = false; root.classList.remove('focus-controls-hidden'); hint.hidden = true; clearTimeout(hideTimer); }
    else { controls(true); schedule(); }
    resize();
  }
  async function leave() {
    const owned = nativeOwned; nativeOwned = false; mode(false);
    if (owned && fullscreenElement(doc) === doc.documentElement) await exitReaderFullscreen(doc);
  }
  fullscreen.addEventListener('click', async () => {
    if (active) { await leave(); return; }
    onEnter();
    mode(true);
    if (fullscreenElement(doc) === doc.documentElement) return;
    nativeOwned = true;
    const entered = await requestReaderFullscreen(doc);
    if (!entered) { nativeOwned = false; onMessage('Full-window reading is on. This browser controls whether its address bar can be hidden.'); }
    if (!root.open) await leave();
    resize();
  });
  lock.addEventListener('click', () => setLocked(!locked));
  function changed() {
    if (fullscreenElement(doc) === doc.documentElement) { if (root.open && !active) mode(true); resize(); }
    else if (nativeOwned) { nativeOwned = false; mode(false); }
  }
  doc.addEventListener('fullscreenchange', changed); doc.addEventListener('webkitfullscreenchange', changed);
  root.addEventListener('pointerdown', event => {
    if (!active) return;
    if (!event.target.closest('#page-viewport')) { controls(true); return; }
    if (event.isPrimary === false) { pointer = null; return; }
    pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, at: performance.now() };
  });
  root.addEventListener('pointerup', event => {
    const start = pointer; pointer = null;
    if (!active || !start || start.id !== event.pointerId) return;
    if (Math.hypot(event.clientX - start.x, event.clientY - start.y) < 12 && performance.now() - start.at < 650) controls(hidden);
    else schedule();
  });
  root.addEventListener('pointercancel', () => { pointer = null; });
  root.addEventListener('keydown', event => {
    if (!active) return;
    if (event.key === 'Escape') { if (!nativeOwned) { event.preventDefault(); event.stopPropagation(); leave(); } return; }
    controls(true);
  });
  // Locked controls never navigate or follow links; the lock/exit buttons remain available.
  root.addEventListener('click', event => {
    if (locked && event.target.closest('.reader-controls,.page-navigation,.reader-sidebar,[data-open-rough]')) { event.preventDefault(); event.stopImmediatePropagation(); controls(true); }
  }, true);
  return { get active() { return active; }, get locked() { return locked; }, showControls() { if (active) controls(true); }, close() { pointer = null; return leave(); } };
}

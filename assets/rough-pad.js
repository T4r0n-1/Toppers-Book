// Local rough work contains only the reader's own strokes and typed notes.
export function normalPoint(x, y, rect) {
  return { x: Math.max(0, Math.min(1, (x - rect.left) / Math.max(1, rect.width))), y: Math.max(0, Math.min(1, (y - rect.top) / Math.max(1, rect.height))) };
}
export function cleanRoughData(value) {
  if (!value || typeof value !== 'object') return { strokes: [], note: '' };
  let remaining = 50000;
  const strokes = (Array.isArray(value.strokes) ? value.strokes : []).slice(0, 1000).flatMap(stroke => {
    if (!['pen', 'eraser'].includes(stroke?.tool) || !Array.isArray(stroke.points)) return [];
    const points = stroke.points.slice(0, Math.min(5000, remaining)).filter(p => Number.isFinite(p?.x) && Number.isFinite(p?.y)).map(p => ({ x: Math.max(0, Math.min(1, p.x)), y: Math.max(0, Math.min(1, p.y)) }));
    remaining -= points.length;
    return points.length ? [{ tool: stroke.tool, points }] : [];
  });
  return { strokes, note: String(value.note || '').slice(0, 12000) };
}
export function setupRoughPads(root, identity) {
  const workspace = root.querySelector('#reading-workspace');
  const pads = [...root.querySelectorAll('[data-rough-pad]')].map(element => {
    const side = element.dataset.roughPad;
    const titleId = `rough-title-${side}`;
    element.innerHTML = `<div class="rough-pad-heading"><h3 id="${titleId}">${side === 'left' ? 'Left' : 'Right'} rough work</h3><button type="button" class="rough-close" aria-label="Close ${side} rough-work pad">×</button></div><div class="rough-tools" role="group" aria-label="Drawing tools"><button type="button" data-tool="pen" aria-pressed="true">Pen</button><button type="button" data-tool="eraser" aria-pressed="false">Eraser</button><button type="button" data-undo>Undo</button><button type="button" data-clear aria-label="Clear drawing">Clear</button></div><div class="rough-canvas-wrap"><canvas aria-label="Draw rough work with a mouse, finger or pen. You can also type in the notes field below."></canvas></div><label class="rough-note-label" for="rough-note-${side}">Or type your working</label><textarea id="rough-note-${side}" maxlength="12000" placeholder="Calculations, reminders…"></textarea><p class="rough-status" role="status">Notes stay on this device.</p>`;
    const canvas = element.querySelector('canvas');
    const context = canvas.getContext('2d');
    const note = element.querySelector('textarea');
    const status = element.querySelector('.rough-status');
    let data = { strokes: [], note: '' }, key = '', tool = 'pen', current = null, pointer = null, cleared = null, saveTimer;
    function render() {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height || !context) return;
      const scale = Math.min(devicePixelRatio || 1, 2);
      canvas.width = Math.round(rect.width * scale); canvas.height = Math.round(rect.height * scale);
      context.setTransform(scale, 0, 0, scale, 0, 0);
      for (const stroke of [...data.strokes, ...(current ? [current] : [])]) {
        if (!stroke.points.length) continue;
        context.globalCompositeOperation = stroke.tool === 'eraser' ? 'destination-out' : 'source-over';
        context.strokeStyle = context.fillStyle = '#253c74'; context.lineWidth = stroke.tool === 'eraser' ? 20 : 2.5;
        context.lineCap = context.lineJoin = 'round';
        const first = stroke.points[0];
        context.beginPath();
        if (stroke.points.length === 1) { context.arc(first.x * rect.width, first.y * rect.height, context.lineWidth / 2, 0, Math.PI * 2); context.fill(); }
        else { context.moveTo(first.x * rect.width, first.y * rect.height); for (const p of stroke.points.slice(1)) context.lineTo(p.x * rect.width, p.y * rect.height); context.stroke(); }
      }
      context.globalCompositeOperation = 'source-over';
      element.querySelector('[data-undo]').disabled = !data.strokes.length && !cleared;
    }
    function save() {
      clearTimeout(saveTimer);
      if (!key) return;
      data.note = note.value;
      try { localStorage.setItem(key, JSON.stringify(data)); status.textContent = 'Saved on this device · not synced'; }
      catch { status.textContent = 'Not saved. Keep this tab open to retain your rough work.'; }
    }
    function finish() {
      if (!current) return;
      data.strokes.push(current); current = null; cleared = null;
      if (pointer !== null && canvas.hasPointerCapture?.(pointer)) canvas.releasePointerCapture(pointer);
      pointer = null; render(); save();
    }
    function load() {
      const owner = identity();
      const nextKey = `toppers-rough-v1:${owner.uid}:${owner.book}:${side}`;
      if (key === nextKey) return;
      finish(); if (key) save();
      key = nextKey; data = { strokes: [], note: '' }; cleared = null;
      try { data = cleanRoughData(JSON.parse(localStorage.getItem(key))); }
      catch { /* A blocked store or invalid saved draft starts a fresh local pad. */ }
      note.value = data.note; status.textContent = 'Notes stay on this device.'; render();
    }
    function setOpen(open) {
      load();
      if (!open) { finish(); save(); }
      if (open && matchMedia('(max-width: 760px)').matches) pads.forEach(other => { if (other.side !== side) other.setOpen(false); });
      element.hidden = !open;
      workspace.classList.toggle(`has-rough-${side}`, open);
      const launcher = root.querySelector(`[data-open-rough="${side}"]`);
      launcher.hidden = open; launcher.setAttribute('aria-expanded', String(open));
      if (open) requestAnimationFrame(render);
    }
    canvas.addEventListener('pointerdown', event => {
      if (event.isPrimary === false || event.button !== 0 || current) return;
      if (data.strokes.length >= 1000) { status.textContent = 'Drawing is full. Undo or clear the drawing to continue.'; return; }
      event.preventDefault(); pointer = event.pointerId; canvas.setPointerCapture(pointer);
      current = { tool, points: [normalPoint(event.clientX, event.clientY, canvas.getBoundingClientRect())] }; render();
    });
    canvas.addEventListener('pointermove', event => {
      if (!current || event.pointerId !== pointer) return;
      event.preventDefault();
      if (current.points.length < 5000) current.points.push(normalPoint(event.clientX, event.clientY, canvas.getBoundingClientRect()));
      render();
    });
    canvas.addEventListener('pointerup', finish); canvas.addEventListener('pointercancel', finish); canvas.addEventListener('lostpointercapture', finish);
    canvas.addEventListener('contextmenu', event => event.preventDefault());
    element.querySelectorAll('[data-tool]').forEach(button => button.addEventListener('click', () => { tool = button.dataset.tool; element.querySelectorAll('[data-tool]').forEach(b => b.setAttribute('aria-pressed', String(b === button))); }));
    element.querySelector('[data-undo]').addEventListener('click', () => { finish(); if (data.strokes.length) data.strokes.pop(); else if (cleared) { data.strokes = cleared; cleared = null; } render(); save(); });
    element.querySelector('[data-clear]').addEventListener('click', () => { finish(); if (data.strokes.length) { cleared = data.strokes; data.strokes = []; render(); save(); } });
    element.querySelector('.rough-close').addEventListener('click', () => { setOpen(false); root.querySelector(`[data-open-rough="${side}"]`).focus(); });
    note.addEventListener('input', () => { clearTimeout(saveTimer); saveTimer = setTimeout(save, 350); });
    new ResizeObserver(render).observe(canvas.parentElement);
    return { side, load, setOpen, save };
  });
  root.querySelectorAll('[data-open-rough]').forEach(button => button.addEventListener('click', () => pads.find(pad => pad.side === button.dataset.openRough).setOpen(true)));
  window.addEventListener('pagehide', () => pads.forEach(pad => pad.save()));
  return { refresh() { pads.forEach(pad => { pad.load(); pad.setOpen(false); }); }, closeAll() { pads.forEach(pad => pad.setOpen(false)); } };
}

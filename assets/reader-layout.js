export function spreadPages(index, total, mode = 'spread') {
  const current = Math.max(0, Math.min(Math.trunc(Number(index)) || 0, total - 1));
  if (mode !== 'spread' || current === 0) return [current];
  const left = current % 2 === 1 ? current : current - 1;
  return left + 1 < total ? [left, left + 1] : [left];
}

export function turnPage(index, total, mode, direction) {
  const visible = spreadPages(index, total, mode);
  return direction > 0
    ? Math.min(total - 1, visible.at(-1) + 1)
    : Math.max(0, visible[0] - 1);
}

export function fitSpread(width, height, count, ratio, zoom = 1) {
  const gap = count > 1 ? 8 : 0;
  const fitHeight = Math.max(1, Math.min(height, Math.max(1, width - gap) / count / ratio));
  const pageHeight = fitHeight * zoom;
  const pageWidth = pageHeight * ratio;
  return { width: pageWidth * count + gap, height: pageHeight, pageWidth, gap };
}

export function swipeDirection(dx, dy, elapsed, width, zoom = 1) {
  if (zoom !== 1 || elapsed > 1600 || Math.abs(dx) < Math.min(75, Math.max(35, width * .08)) || Math.abs(dx) < Math.abs(dy) * 1.5) return 0;
  return dx < 0 ? 1 : -1;
}

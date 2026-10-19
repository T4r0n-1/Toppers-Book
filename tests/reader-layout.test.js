import test from 'node:test';
import assert from 'node:assert/strict';
import { spreadPages, turnPage, fitSpread } from '../assets/reader-layout.js';

test('book starts with a single cover then pairs 2–3, 4–5 through 222–223', () => {
  let page = 0;
  const visited = [];
  for (;;) {
    const spread = spreadPages(page, 223);
    visited.push(...spread);
    if (spread.at(-1) === 222) break;
    page = turnPage(page, 223, 'spread', 1);
  }
  assert.deepEqual(visited, Array.from({ length: 223 }, (_, i) => i));
  assert.deepEqual(spreadPages(0, 223), [0]);
  assert.deepEqual(spreadPages(13, 223), [13, 14]);
  assert.deepEqual(spreadPages(99, 223), [99, 100]);
  assert.deepEqual(spreadPages(222, 223), [221, 222]);
});

test('previous returns to the same spreads and single-page mode never skips pages', () => {
  assert.deepEqual(spreadPages(turnPage(3, 223, 'spread', -1), 223), [1, 2]);
  assert.equal(turnPage(1, 223, 'spread', -1), 0);
  assert.equal(turnPage(0, 223, 'spread', -1), 0);
  assert.equal(turnPage(222, 223, 'spread', 1), 222);
  assert.deepEqual(spreadPages(99, 223, 'single'), [99]);
  assert.equal(turnPage(99, 223, 'single', 1), 100);
  assert.deepEqual(spreadPages(3, 4), [3]);
  assert.deepEqual(spreadPages(Number.NaN, 223), [0]);
});

test('complete page and watermark fit in desktop, tablet, phone and short viewports', () => {
  for (const [width, height] of [[1100, 650], [700, 450], [350, 490], [820, 180]]) {
    for (const count of [1, 2]) {
      const fit = fitSpread(width, height, count, 1190 / 1724);
      assert.ok(fit.width <= width + .001);
      assert.ok(fit.height <= height + .001);
      assert.ok(Math.abs(fit.pageWidth / fit.height - 1190 / 1724) < .0001);
      const zoom = fitSpread(width, height, count, 1190 / 1724, 2);
      assert.equal(zoom.height, fit.height * 2);
    }
  }
});

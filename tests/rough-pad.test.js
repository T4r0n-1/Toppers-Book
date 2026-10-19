import test from 'node:test';
import assert from 'node:assert/strict';
import { normalPoint, cleanRoughData } from '../assets/rough-pad.js';

test('rough work pointer coordinates remain inside the pad when dragging past its edge', () => {
  const rect = { left: 100, top: 50, width: 200, height: 400 };
  assert.deepEqual(normalPoint(200, 250, rect), { x: .5, y: .5 });
  assert.deepEqual(normalPoint(-20, 700, rect), { x: 0, y: 1 });
});

test('local rough drafts retain pen, eraser and text but reject malformed strokes', () => {
  const draft = cleanRoughData({ note: 'x² + 2x = 3', strokes: [
    { tool: 'pen', points: [{ x: .5, y: .2 }] },
    { tool: 'eraser', points: [{ x: 2, y: -1 }] },
    { tool: 'unexpected', points: [{ x: 0, y: 0 }] },
    { tool: 'pen', points: [{ x: Number.NaN, y: 1 }] }
  ] });
  assert.equal(draft.note, 'x² + 2x = 3');
  assert.equal(draft.strokes.length, 2);
  assert.deepEqual(draft.strokes[1].points, [{ x: 1, y: 0 }]);
  assert.deepEqual(cleanRoughData(null), { strokes: [], note: '' });
});

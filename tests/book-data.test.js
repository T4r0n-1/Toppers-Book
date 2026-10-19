import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readdir } from 'node:fs/promises';
import { book } from '../assets/book-data.js';
import { watermarkedPage } from '../functions/api/[[path]].js';

test('public preview exposes only five selected pages with their original PDF references', async () => {
  assert.equal(book.id, 'cbse10-maths-standard');
  assert.equal(book.pageCount, 223);
  assert.deepEqual(book.samples.map(sample => sample.page), [5, 14, 15, 69, 180]);
  assert.equal(new Set(book.samples.map(sample => sample.src)).size, 5);
  for (const sample of book.samples) {
    assert.match(sample.src, /^\/assets\/book-samples\/page-\d{4}\.webp$/);
    await access(new URL('..' + sample.src, import.meta.url));
  }
  const files = await readdir(new URL('../assets/book-samples/', import.meta.url));
  assert.equal(files.length, 5);
});

test('all 14 supplied chapter starts are ordered and inside the book', () => {
  assert.equal(book.chapters.length, 14);
  assert.deepEqual(book.chapters.map(chapter => chapter.page), [14, 22, 33, 45, 57, 69, 85, 100, 114, 133, 149, 164, 180, 199]);
  assert.ok(book.chapters.every(chapter => chapter.page >= 1 && chapter.page <= book.pageCount));
});

test('personal watermark footer is below the entire source page', () => {
  const svg = watermarkedPage('test-image', 'Sample Reader', '9990000000', 'test-order', 1);
  assert.match(svg, /viewBox="0 0 1190 1724"/);
  assert.match(svg, /<image width="1190" height="1684"/);
  assert.match(svg, /<rect y="1684" width="1190" height="40"/);
});

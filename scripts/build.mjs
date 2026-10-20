import { mkdir, cp, rm, copyFile } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const dist = new URL('../dist/', import.meta.url);
await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
for (const file of ['index.html', 'terms.html', 'privacy.html', 'refunds.html', 'digital-access.html', 'corrections.html', 'practice.html', 'setup-gmail.html', '_headers', '_routes.json']) await copyFile(new URL(file, root), new URL(file, dist));
await cp(new URL('assets/', root), new URL('assets/', dist), { recursive: true });
console.log('Static store built to dist. Pages Functions remain in the root functions/ directory.');

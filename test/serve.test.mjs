import test from 'node:test';
import assert from 'node:assert/strict';
import { join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveRequestPath } from '../scripts/serve.mjs';

const root = resolve(fileURLToPath(new URL('../src/', import.meta.url)));
const inside = (file) => file === null || file.startsWith(root + sep);

test('serves the panel at / and ignores query strings', () => {
  assert.equal(resolveRequestPath('/', root), join(root, 'panel.html'));
  assert.equal(resolveRequestPath('/panel.css?v=2#x', root), join(root, 'panel.css'));
});

test('rejects encoded traversal', () => {
  assert.equal(resolveRequestPath('/%2e%2e%2fpackage.json', root), null);
  assert.equal(resolveRequestPath('/%2e%2e/%2e%2e/package.json', root), join(root, 'package.json'));
});

test('backslash traversal never leaves the root', () => {
  const result = resolveRequestPath('/..%5Cpackage.json', root);
  if (process.platform === 'win32') assert.equal(result, null);
  assert.ok(inside(result));
  assert.ok(inside(resolveRequestPath('/..\\package.json', root)));
});

test('rejects malformed escapes and NUL bytes', () => {
  assert.equal(resolveRequestPath('/%E0%A4%A', root), null);
  assert.equal(resolveRequestPath('/panel.html%00.css', root), null);
});

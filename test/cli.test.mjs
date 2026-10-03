import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const cli = fileURLToPath(new URL('../scripts/optimize-cli.mjs', import.meta.url));
const run = (...args) => spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' });

async function withTempDir(fn) {
  const dir = await mkdtemp(join(tmpdir(), 'prompt-lens-cli-'));
  try { await fn(dir); } finally { await rm(dir, { recursive: true, force: true }); }
}

async function optimize(dir, text, configPath, encoding = 'utf8') {
  const input = join(dir, 'in.txt');
  const output = join(dir, 'out.json');
  await writeFile(input, text, encoding);
  const result = run('--input', input, '--output', output, ...(configPath ? ['--config', configPath] : []));
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(await readFile(output, 'utf8'));
}

test('round-trips Chinese text and indentation with the default config', () => withTempDir(async (dir) => {
  const config = join(dir, 'nested', 'templates.json');
  assert.equal(run('--init-config', config).stdout.trim(), 'created');
  const source = '修复这个函数：\n    def f():\n        return 1';
  const { text, warning } = await optimize(dir, source, config);
  assert.equal(warning, null);
  assert.ok(text.startsWith('你是一名专业助手。'));
  assert.ok(text.endsWith(source));
}));

test('--init-config never overwrites an existing file', () => withTempDir(async (dir) => {
  const config = join(dir, 'templates.json');
  await writeFile(config, '{"activeTemplate":"mine","templates":{"mine":"keep me"}}');
  assert.equal(run('--init-config', config).stdout.trim(), 'exists');
  assert.equal(await readFile(config, 'utf8'), '{"activeTemplate":"mine","templates":{"mine":"keep me"}}');
}));

test('a broken config falls back with a warning and is left untouched', () => withTempDir(async (dir) => {
  const config = join(dir, 'templates.json');
  await writeFile(config, '{ broken');
  const { text, warning } = await optimize(dir, 'hello', config);
  assert.ok(text.endsWith('hello'));
  assert.match(warning, /your file was not changed/);
  assert.equal(await readFile(config, 'utf8'), '{ broken');
}));

test('custom English template and BOM input', () => withTempDir(async (dir) => {
  const config = join(dir, 'templates.json');
  await writeFile(config, '\uFEFF{"language":"en","activeTemplate":"mine","templates":{"mine":{"instruction":"Be terse."}}}');
  const { text } = await optimize(dir, '\uFEFFship it', config);
  assert.equal(text.split('\n')[0], 'You are an expert assistant. Be terse.');
  assert.ok(text.endsWith('\nship it'));
}));

test('missing arguments exit with an error', () => {
  const result = run('--input');
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Missing value/);
});

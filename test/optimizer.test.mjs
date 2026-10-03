import test from 'node:test';
import assert from 'node:assert/strict';
import { optimizePrompt } from '../src/optimizer.mjs';

test('returns empty for blank input', () => assert.equal(optimizePrompt('  '), ''));

test('adds task structure and preserves request', () => {
  const result = optimizePrompt('帮我修 bug', 'coding');
  assert.match(result, /帮我修 bug/);
  assert.match(result, /边界/);
});

test('supports English output', () => assert.match(optimizePrompt('fix login', 'review', { language: 'en' }), /You are an expert assistant/));

test('does not mutate the source string', () => {
  const source = '  ship this feature  ';
  optimizePrompt(source);
  assert.equal(source, '  ship this feature  ');
});

test('preserves code indentation and inner spacing', () => {
  const source = 'fix this:\n\ndef f():\n    if x:\n        return  1';
  assert.ok(optimizePrompt(source, 'coding').endsWith(source));
});

test('normalizes CRLF line endings', () => {
  const result = optimizePrompt('line one\r\nline two\rline three');
  assert.ok(result.endsWith('line one\nline two\nline three'));
  assert.ok(!result.includes('\r'));
});

test('uses a custom instruction in both languages', () => {
  assert.ok(optimizePrompt('x', 'task', { instruction: '  只输出代码  ' }).startsWith('你是一名专业助手。只输出代码\n'));
  assert.ok(optimizePrompt('x', 'task', { instruction: 'Only code.', language: 'en' }).startsWith('You are an expert assistant. Only code.\n'));
});

test('ignores a blank custom instruction', () => {
  assert.equal(optimizePrompt('x', 'review', { instruction: '   ' }), optimizePrompt('x', 'review'));
});

test('falls back to the task template for unknown keys', () => {
  assert.equal(optimizePrompt('x', 'nope'), optimizePrompt('x', 'task'));
  assert.equal(optimizePrompt('x', 'constructor'), optimizePrompt('x', 'task'));
});

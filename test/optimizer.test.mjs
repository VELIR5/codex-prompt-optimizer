import test from 'node:test'; import assert from 'node:assert/strict'; import { optimizePrompt } from '../src/optimizer.mjs';
test('returns empty for blank input', () => assert.equal(optimizePrompt('  '), ''));
test('adds task structure and preserves request', () => { const result = optimizePrompt('帮我修 bug', 'coding'); assert.match(result, /帮我修 bug/); assert.match(result, /边界/); });
test('supports English output', () => assert.match(optimizePrompt('fix login', 'review', { language: 'en' }), /You are an expert assistant/));

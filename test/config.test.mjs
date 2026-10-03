import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_CONFIG_TEXT, LEGACY_DEFAULT_INSTRUCTIONS, parseConfig, resolveTemplate } from '../src/config.mjs';

test('parseConfig strips a UTF-8 BOM (written by Windows PowerShell 5.1)', () => {
  const { config, warning } = parseConfig('\uFEFF{"activeTemplate":"coding"}');
  assert.equal(warning, null);
  assert.equal(config.activeTemplate, 'coding');
});

test('parseConfig reports broken JSON without throwing', () => {
  const { config, warning } = parseConfig('{ "activeTemplate": "task", }');
  assert.equal(config, null);
  assert.match(warning, /not valid JSON/);
});

test('parseConfig rejects non-object JSON', () => {
  assert.equal(parseConfig('[1, 2]').config, null);
  assert.equal(parseConfig('null').config, null);
});

test('resolveTemplate defaults to the zh task template', () => {
  assert.deepEqual(resolveTemplate(null), { name: 'task', template: 'task', language: 'zh', warning: null });
});

test('untouched v0.1 defaults use the bilingual built-ins', () => {
  for (const [name, instruction] of Object.entries(LEGACY_DEFAULT_INSTRUCTIONS)) {
    const resolved = resolveTemplate({ activeTemplate: name, templates: { [name]: { name, instruction } } });
    assert.equal(resolved.template, name);
    assert.equal(resolved.instruction, undefined);
    assert.equal(resolved.warning, null);
  }
});

test('edited built-in templates keep the user instruction', () => {
  const resolved = resolveTemplate({ activeTemplate: 'coding', templates: { coding: { instruction: '只改动必要的文件' } } });
  assert.equal(resolved.template, 'coding');
  assert.equal(resolved.instruction, '只改动必要的文件');
});

test('custom templates resolve to their instruction', () => {
  const resolved = resolveTemplate({ language: 'en', activeTemplate: 'mine', templates: { mine: { instruction: 'Be terse.' } } });
  assert.deepEqual(resolved, { name: 'mine', template: 'task', instruction: 'Be terse.', language: 'en', warning: null });
});

test('string shorthand is accepted for custom templates', () => {
  assert.equal(resolveTemplate({ activeTemplate: 'mine', templates: { mine: 'Be terse.' } }).instruction, 'Be terse.');
});

test('missing or empty custom templates fall back with a warning', () => {
  const missing = resolveTemplate({ activeTemplate: 'ghost' });
  assert.equal(missing.template, 'task');
  assert.match(missing.warning, /not found/);
  const empty = resolveTemplate({ activeTemplate: 'blank', templates: { blank: { instruction: '  ' } } });
  assert.equal(empty.template, 'task');
  assert.match(empty.warning, /no instruction/);
});

test('unknown language falls back to zh with a warning', () => {
  const resolved = resolveTemplate({ language: 'fr' });
  assert.equal(resolved.language, 'zh');
  assert.match(resolved.warning, /Unknown language/);
});

test('the default config is valid and resolves cleanly', () => {
  const { config, warning } = parseConfig(DEFAULT_CONFIG_TEXT);
  assert.equal(warning, null);
  assert.deepEqual(resolveTemplate(config), { name: 'task', template: 'task', language: 'zh', warning: null });
});

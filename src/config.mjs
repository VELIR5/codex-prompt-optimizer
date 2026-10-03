import { TEMPLATES } from './optimizer.mjs';

/**
 * Instructions written by the v0.1 companion into templates.json. Entries that still
 * match these exactly were never edited by the user, so the bilingual built-ins win.
 */
export const LEGACY_DEFAULT_INSTRUCTIONS = Object.freeze({
  task: 'Clarify the goal, constraints, acceptance criteria, deliverables, and open questions.',
  coding: 'Add relevant context, expected behavior, edge cases, test strategy, and implementation boundaries.',
  review: 'Prioritize correctness, regressions, security, and missing tests. Report findings by severity.',
  writing: 'Preserve intent and facts while improving structure, clarity, tone, and audience fit.'
});

export const DEFAULT_CONFIG = Object.freeze({
  language: 'zh',
  activeTemplate: 'task',
  inputClickOffset: { fromRight: 720, fromBottom: 135 },
  templates: {
    example: {
      name: '示例自定义模板',
      instruction: '在这里写下你希望助手遵循的要求，然后把 activeTemplate 改为 "example"。'
    }
  }
});

export const DEFAULT_CONFIG_TEXT = `${JSON.stringify(DEFAULT_CONFIG, null, 2)}\n`;

const isObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

/**
 * Parse templates.json text. Never throws: invalid input yields `{ config: null, warning }`
 * so callers can fall back to built-ins without touching the user's file.
 */
export function parseConfig(rawText) {
  const text = String(rawText ?? '').replace(/^\uFEFF/, '');
  try {
    const config = JSON.parse(text);
    if (!isObject(config)) return { config: null, warning: 'templates.json must contain a JSON object.' };
    return { config, warning: null };
  } catch (error) {
    return { config: null, warning: `templates.json is not valid JSON (${error.message}).` };
  }
}

/**
 * Decide which template, instruction and language to use.
 * @returns {{ name: string, template: string, instruction?: string, language: 'zh' | 'en', warning: string | null }}
 */
export function resolveTemplate(config) {
  const warnings = [];
  const source = isObject(config) ? config : {};

  let language = 'zh';
  if (source.language === 'en') language = 'en';
  else if (source.language !== undefined && source.language !== 'zh') warnings.push(`Unknown language "${source.language}", using "zh".`);

  const templates = isObject(source.templates) ? source.templates : {};
  const name = typeof source.activeTemplate === 'string' && source.activeTemplate.trim() ? source.activeTemplate.trim() : 'task';
  const builtin = Object.hasOwn(TEMPLATES, name);
  const entry = Object.hasOwn(templates, name) ? templates[name] : undefined;
  const rawInstruction = typeof entry === 'string' ? entry : entry?.instruction;
  const customText = typeof rawInstruction === 'string' ? rawInstruction.trim() : '';
  const isLegacyDefault = builtin && LEGACY_DEFAULT_INSTRUCTIONS[name] === customText;

  const done = (result) => ({ ...result, language, warning: warnings.join(' ') || null });

  if (customText && !isLegacyDefault) return done({ name, template: builtin ? name : 'task', instruction: customText });
  if (builtin) return done({ name, template: name });

  warnings.push(entry === undefined
    ? `Template "${name}" was not found, using "task".`
    : `Template "${name}" has no instruction, using "task".`);
  return done({ name: 'task', template: 'task' });
}

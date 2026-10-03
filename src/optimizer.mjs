export const TEMPLATES = {
  task: { label: '任务指令', en: 'Task instruction', prompt: '明确目标、约束、验收标准、交付物和待确认问题。', promptEn: 'Clarify the goal, constraints, acceptance criteria, deliverables, and open questions.' },
  coding: { label: '代码实现', en: 'Code implementation', prompt: '补充相关上下文、预期行为、边界情况、测试策略和实现边界。', promptEn: 'Add relevant context, expected behavior, edge cases, test strategy, and implementation boundaries.' },
  review: { label: '代码审查', en: 'Code review', prompt: '优先关注正确性、回归、安全性和缺失测试，并按严重程度给出文件与行号。', promptEn: 'Prioritize correctness, regressions, security, and missing tests. Report findings by severity with file and line references.' },
  writing: { label: '写作润色', en: 'Writing polish', prompt: '保留原意与事实，同时改善结构、清晰度、语气和读者适配。', promptEn: 'Preserve intent and facts while improving structure, clarity, tone, and audience fit.' }
};

// Only normalize line endings and outer whitespace. Inner spacing is preserved so
// code snippets keep their indentation (Python/YAML would break otherwise).
const normalize = (value) => String(value).replace(/\r\n?/g, '\n').trim();

/**
 * Wrap a raw request in a structured prompt.
 * @param {string} input Raw user request.
 * @param {keyof TEMPLATES} [template] Built-in template key; unknown keys fall back to `task`.
 * @param {{ language?: 'zh' | 'en', instruction?: string }} [options]
 *   `instruction` overrides the template text (used by custom templates).
 */
export function optimizePrompt(input, template = 'task', options = {}) {
  const source = normalize(input ?? '');
  if (!source) return '';
  const selected = Object.hasOwn(TEMPLATES, template) ? TEMPLATES[template] : TEMPLATES.task;
  const language = options.language === 'en' ? 'en' : 'zh';
  const custom = typeof options.instruction === 'string' ? options.instruction.trim() : '';
  const instruction = custom || (language === 'en' ? selected.promptEn ?? selected.prompt : selected.prompt);
  const prefix = language === 'en'
    ? `You are an expert assistant. ${instruction}`
    : `你是一名专业助手。${instruction}`;
  const structure = language === 'en'
    ? '\n\nReturn a practical answer. State assumptions briefly, keep scope bounded, and ask only essential clarifying questions.\n\nUser request:\n'
    : '\n\n请给出可执行的结果，简要说明关键假设，控制范围，并只提出必要的澄清问题。\n\n用户需求：\n';
  return `${prefix}${structure}${source}`;
}

import { optimizePrompt, TEMPLATES } from './optimizer.mjs';

const STRINGS = {
  zh: {
    tagline: 'Codex 提示词优化器',
    title: '让每一次输入<br><em>更接近正确答案</em>',
    intro: '在发送前，把自然语言变成结构清晰、可执行的 Codex 指令。',
    templateLabel: '优化模板',
    placeholder: '例如：帮我修复登录 bug，最好加上测试…',
    optimize: '✦ 立即优化 <kbd>Ctrl ↵</kbd>',
    resultTitle: '可以发送了',
    back: '↶ 返回编辑',
    copy: '复制优化结果',
    copied: '已复制',
    copyFailed: '复制失败，已选中文本，请按 Ctrl+C',
    privacy: '本地处理 · 不上传你的内容',
    langToggle: '中 / EN',
    count: (n) => `${n} 字符`
  },
  en: {
    tagline: 'Codex prompt optimizer',
    title: 'Make every prompt<br><em>closer to the right answer</em>',
    intro: 'Turn natural language into clear, executable Codex instructions before you send.',
    templateLabel: 'Template',
    placeholder: 'e.g. Fix the login bug and add tests…',
    optimize: '✦ Optimize <kbd>Ctrl ↵</kbd>',
    resultTitle: 'Ready to send',
    back: '↶ Back to edit',
    copy: 'Copy optimized prompt',
    copied: 'Copied',
    copyFailed: 'Copy failed: text selected, press Ctrl+C',
    privacy: 'Processed locally · nothing is uploaded',
    langToggle: 'EN / 中',
    count: (n) => `${n} characters`
  }
};

const LANGUAGE_KEY = 'prompt-lens-language';
const $ = (id) => document.getElementById(id);
const input = $('input');
const output = $('output');
const result = $('result');
const copyButton = $('copy');
const templateSelect = $('template');
let language = readStoredLanguage();
let copyTimer;

function readStoredLanguage() {
  try { return localStorage.getItem(LANGUAGE_KEY) === 'en' ? 'en' : 'zh'; } catch { return 'zh'; }
}

const t = (key) => STRINGS[language][key];
const resultVisible = () => !result.classList.contains('hidden');

function updateCount() {
  $('count').textContent = t('count')(input.value.length);
}

function run() {
  const value = optimizePrompt(input.value, templateSelect.value, { language });
  if (!value) {
    input.focus();
    return;
  }
  output.textContent = value;
  result.classList.remove('hidden');
}

function applyLanguage() {
  document.documentElement.lang = language === 'en' ? 'en' : 'zh-CN';
  document.querySelectorAll('[data-i18n]').forEach((element) => { element.textContent = t(element.dataset.i18n); });
  // Only static strings from STRINGS are used here, never user input.
  document.querySelectorAll('[data-i18n-html]').forEach((element) => { element.innerHTML = t(element.dataset.i18nHtml); });
  for (const option of templateSelect.options) {
    const template = TEMPLATES[option.value];
    if (template) option.textContent = language === 'en' ? template.en : template.label;
  }
  input.placeholder = t('placeholder');
  $('lang').textContent = t('langToggle');
  copyButton.textContent = t('copy');
  updateCount();
  if (resultVisible()) run();
}

function selectOutput() {
  const range = document.createRange();
  range.selectNodeContents(output);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
}

async function copyResult() {
  clearTimeout(copyTimer);
  let copied = false;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(output.textContent);
      copied = true;
    }
  } catch {
    copied = false;
  }
  if (!copied) selectOutput();
  copyButton.textContent = copied ? t('copied') : t('copyFailed');
  copyTimer = setTimeout(() => { copyButton.textContent = t('copy'); }, copied ? 1400 : 3000);
}

input.addEventListener('input', updateCount);
input.addEventListener('keydown', (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    event.preventDefault();
    run();
  }
});
$('optimize').addEventListener('click', run);
templateSelect.addEventListener('change', () => { if (resultVisible()) run(); });
$('back').addEventListener('click', () => {
  result.classList.add('hidden');
  input.focus();
});
copyButton.addEventListener('click', copyResult);
$('lang').addEventListener('click', () => {
  language = language === 'en' ? 'zh' : 'en';
  try { localStorage.setItem(LANGUAGE_KEY, language); } catch { /* storage may be unavailable */ }
  applyLanguage();
});

applyLanguage();

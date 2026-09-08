import { optimizePrompt } from './optimizer.mjs';
const $ = (id) => document.getElementById(id);
const input = $('input'), output = $('output'), result = $('result');
function run() { const value = optimizePrompt(input.value, $('template').value, { language: document.documentElement.lang === 'en' ? 'en' : 'zh' }); if (!value) { input.focus(); return; } output.textContent = value; result.classList.remove('hidden'); }
input.addEventListener('input', () => { $('count').textContent = `${input.value.length} 字符`; });
$('optimize').addEventListener('click', run); input.addEventListener('keydown', (event) => { if (event.ctrlKey && event.key === 'Enter') run(); });
$('restore').addEventListener('click', () => result.classList.add('hidden'));
$('copy').addEventListener('click', async () => { await navigator.clipboard?.writeText(output.textContent); $('copy').textContent = '已复制'; setTimeout(() => $('copy').textContent = '复制优化结果', 1400); });
$('lang').addEventListener('click', () => { document.documentElement.lang = document.documentElement.lang === 'en' ? 'zh-CN' : 'en'; $('lang').textContent = document.documentElement.lang === 'en' ? 'EN / 中' : '中 / EN'; });

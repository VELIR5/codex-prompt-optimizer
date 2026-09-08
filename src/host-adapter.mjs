import { optimizePrompt } from './optimizer.mjs';

/**
 * Attach Prompt Lens to a Codex-like composer. The adapter only relies on a
 * textarea/contenteditable and a submit control, so hosts can provide their
 * own selectors without coupling the optimizer to a UI framework.
 */
export function attachPromptLens({ root = document, input, submit, buttonText = '✦ 优化' } = {}) {
  if (!input) throw new Error('Prompt Lens needs an input element');
  if (input.dataset.promptLensAttached === 'true') return () => {};
  input.dataset.promptLensAttached = 'true';
  const button = root.createElement('button');
  button.type = 'button';
  button.className = 'prompt-lens-action';
  button.textContent = buttonText;
  button.title = '优化当前提示词';
  const original = () => input.isContentEditable ? input.textContent ?? '' : input.value ?? '';
  const write = (value) => {
    if (input.isContentEditable) input.textContent = value;
    else input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  };
  let previous = '';
  button.addEventListener('click', () => {
    if (button.dataset.state === 'optimized') {
      if (!previous) return;
      write(previous);
      previous = '';
      button.textContent = buttonText;
      delete button.dataset.state;
      return;
    }
    const current = original();
    if (!current.trim()) return;
    previous = current;
    write(optimizePrompt(current));
    button.textContent = '↶ 恢复';
    button.dataset.state = 'optimized';
  });
  (submit?.parentElement ?? input.parentElement)?.append(button);
  return () => { button.remove(); delete input.dataset.promptLensAttached; };
}

export function observeComposer({ root = document, selector = 'textarea' } = {}) {
  const attached = new WeakSet();
  const scan = () => root.querySelectorAll(selector).forEach((input) => {
    if (attached.has(input)) return;
    attached.add(input);
    attachPromptLens({ root, input, submit: input.form?.querySelector('button[type="submit"]') });
  });
  scan();
  const observer = new MutationObserver(scan);
  observer.observe(root.body ?? root, { childList: true, subtree: true });
  return () => observer.disconnect();
}

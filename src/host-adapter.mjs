import { optimizePrompt } from './optimizer.mjs';

const readText = (input) => (input.isContentEditable ? input.textContent ?? '' : input.value ?? '');
const comparable = (value) => String(value ?? '').replace(/\r\n?/g, '\n').trim();

/**
 * Set a textarea/input value through the prototype setter. React (and similar
 * frameworks) install a value tracker on the instance; assigning `input.value`
 * directly updates the tracker too, so the framework never notices the change.
 */
export function setNativeValue(input, value) {
  for (let proto = Object.getPrototypeOf(input); proto; proto = Object.getPrototypeOf(proto)) {
    const descriptor = Object.getOwnPropertyDescriptor(proto, 'value');
    if (descriptor?.set) {
      descriptor.set.call(input, value);
      return;
    }
  }
  input.value = value;
}

/**
 * Replace the content of a contenteditable editor (ProseMirror, Lexical, ...).
 * Selecting everything and using insertText routes the change through the editor's
 * own input pipeline; plain textContent assignment is only a fallback.
 */
function writeEditable(input, value, doc) {
  try {
    input.focus?.();
    const selection = doc?.defaultView?.getSelection?.();
    if (selection && doc.createRange && doc.execCommand) {
      const range = doc.createRange();
      range.selectNodeContents(input);
      selection.removeAllRanges();
      selection.addRange(range);
      if (doc.execCommand('insertText', false, value)) return;
    }
  } catch {
    // Fall back to direct assignment below.
  }
  input.textContent = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function writeText(input, value, doc) {
  if (input.isContentEditable) {
    writeEditable(input, value, doc);
    return;
  }
  setNativeValue(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

/**
 * Attach Prompt Lens to a Codex-like composer. The adapter only relies on a
 * textarea/contenteditable and a submit control, so hosts can provide their
 * own selectors without coupling the optimizer to a UI framework.
 */
export function attachPromptLens({
  root = document,
  input,
  submit,
  buttonText = '✦ 优化',
  restoreText = '↶ 恢复',
  template = 'task',
  language = 'zh'
} = {}) {
  if (!input) throw new Error('Prompt Lens needs an input element');
  if (input.dataset.promptLensAttached === 'true') return () => {};
  input.dataset.promptLensAttached = 'true';
  const doc = input.ownerDocument ?? root;
  const button = root.createElement('button');
  button.type = 'button';
  button.className = 'prompt-lens-action';

  let original = null;
  let optimized = null;
  let writing = false;

  const showOptimize = () => {
    original = null;
    optimized = null;
    button.textContent = buttonText;
    button.title = language === 'en' ? 'Optimize the current prompt' : '优化当前提示词';
    delete button.dataset.state;
  };
  const write = (value) => {
    writing = true;
    try { writeText(input, value, doc); } finally { writing = false; }
  };

  // If the user edits the optimized text, "restore" would discard their edits, so go back to "optimize".
  const onInput = () => {
    if (!writing && original !== null && comparable(readText(input)) !== comparable(optimized)) showOptimize();
  };

  const onClick = () => {
    const current = readText(input);
    if (original !== null) {
      if (comparable(current) === comparable(optimized)) {
        const previous = original;
        showOptimize();
        write(previous);
        return;
      }
      showOptimize();
    }
    if (!current.trim()) return;
    const next = optimizePrompt(current, template, { language });
    write(next);
    original = current;
    optimized = next;
    button.textContent = restoreText;
    button.title = language === 'en' ? 'Restore the original prompt' : '恢复原文';
    button.dataset.state = 'optimized';
  };

  showOptimize();
  button.addEventListener('click', onClick);
  input.addEventListener('input', onInput);
  (submit?.parentElement ?? input.parentElement)?.append(button);

  return () => {
    button.removeEventListener('click', onClick);
    input.removeEventListener('input', onInput);
    button.remove();
    delete input.dataset.promptLensAttached;
  };
}

/**
 * Watch for composers rendered at any time and attach Prompt Lens to each.
 * Extra options (buttonText, template, language, ...) are forwarded to attachPromptLens.
 * Returns a dispose function that stops observing and removes every injected button.
 */
export function observeComposer({ root = document, selector = 'textarea', ...options } = {}) {
  const attached = new Map();
  const scan = () => {
    for (const [input, detach] of attached) {
      if (input.isConnected === false) {
        detach();
        attached.delete(input);
      }
    }
    root.querySelectorAll(selector).forEach((input) => {
      if (attached.has(input)) return;
      attached.set(input, attachPromptLens({ ...options, root, input, submit: input.form?.querySelector('button[type="submit"]') }));
    });
  };
  scan();
  const Observer = root.defaultView?.MutationObserver ?? globalThis.MutationObserver;
  const observer = new Observer(scan);
  observer.observe(root.body ?? root, { childList: true, subtree: true });
  return () => {
    observer.disconnect();
    attached.forEach((detach) => detach());
    attached.clear();
  };
}

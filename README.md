# Prompt Lens

> One-click prompt optimization for Codex. Turn rough intent into clear, executable instructions before you send.

Prompt Lens is a lightweight, privacy-first Codex companion. Choose a template, press **Optimize**, and get a structured prompt you can review and copy. Your text never leaves your machine.

## Features

- Task, coding, review, and writing templates, plus custom templates
- Chinese / English UI and output toggle (remembered)
- Keyboard shortcut: `Ctrl+Enter`
- Code indentation is preserved, so you can paste snippets directly
- No API key, server, telemetry, or cloud storage

## Run locally

```bash
git clone https://github.com/VELIR5/codex-prompt-optimizer.git
cd codex-prompt-optimizer
npm test
npm run format:check
npm run dev
```

Open `http://127.0.0.1:4173` in a browser, or mount `src/` as a local Codex panel according to your host's extension API. For a Codex-like composer, call `observeComposer({ selector: 'textarea' })` from `src/host-adapter.mjs`; it watches dynamically-rendered inputs and adds an inline optimize/restore button. If you edit the optimized text, the button switches back to optimize instead of restoring over your edits. Optional settings: `template`, `language`, `buttonText`. The returned function stops observing and removes the buttons. React-controlled textareas and contenteditable editors are supported.

## One-click Codex Desktop workflow (Windows)

This companion does not modify Codex files.

1. Install Node.js 20+ (the companion needs `node.exe` at runtime). No `npm install` is required; the project has no dependencies.
2. Run `npm run companion:install` in PowerShell. It registers sign-in autostart, creates a desktop shortcut, and **starts the companion right away**; a Prompt Lens tray icon appears.
3. Focus the Codex composer and press `Ctrl+Alt+O` to select, optimize, and paste the prompt back. Your clipboard is restored afterwards.
4. Press `Ctrl+Alt+Z` to restore the previous text.

Hotkeys only act on Codex Desktop's `ChatGPT` process (and the CLI `codex` process); other apps are not changed. An empty composer is never modified. Processing is local-only.

While Codex Desktop is open, a 32×32 **four-color triangle icon** floats near the lower-right of the Codex window. Click it to optimize; click it again to restore (a white dot marks the restorable state). If Codex is in the background, the button brings it to the front and clicks the composer area first.

Right-click the tray icon for **Edit templates**, **Open log**, and **Exit Prompt Lens**. Errors are shown as tray balloons and written to `%APPDATA%\PromptLens\companion.log` (prompt text is never logged).

### Custom templates

Run `npm run companion:configure` (or use the tray menu) to open `%APPDATA%\PromptLens\templates.json`:

```json
{
  "language": "zh",
  "activeTemplate": "task",
  "inputClickOffset": { "fromRight": 720, "fromBottom": 135 },
  "templates": {
    "example": { "name": "My template", "instruction": "Describe what the assistant should do" }
  }
}
```

- `language`: output language, `zh` or `en`.
- `activeTemplate`: the template to use. The built-ins `task`, `coding`, `review`, and `writing` are always available.
- `templates`: add custom templates (an `instruction` is enough) or override a built-in by using its name.
- `inputClickOffset`: where to click the composer (from the window's lower-right corner) when Codex is in the background.

Changes apply on the next optimization; no restart is needed. If the file is invalid, the companion warns you and temporarily uses the built-in templates. **It never deletes or rewrites your file.** Configs created by older versions keep working.

### Uninstall

Run `npm run companion:uninstall` to stop the companion and remove autostart and the desktop shortcut. Your templates are kept.

### Troubleshooting

- No response: make sure Codex is the foreground window and the caret is in the composer; check the tray balloon or `companion.log`.
- The floating button optimized the wrong text: click into the Codex composer first, or adjust `inputClickOffset`.
- Hotkey conflict: close the application that owns `Ctrl+Alt+O` or `Ctrl+Alt+Z`, then restart the companion. The floating button keeps working in the meantime.
- Node.js not found: install Node.js 20+, confirm `node --version` works, then sign in again.
- Self-test: `npm run companion:selftest` (no UI, changes no settings).
- Stop immediately: right-click the tray icon → Exit Prompt Lens.

## Included in this release

The current release includes the Windows Codex companion, deterministic local optimizer, and standalone preview panel.

## License

MIT. See [LICENSE](LICENSE). See [SECURITY.md](SECURITY.md) for responsible disclosure.

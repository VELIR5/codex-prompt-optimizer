# Prompt Lens

> One-click prompt optimization for Codex. Turn rough intent into clear, executable instructions before you send.

Prompt Lens is a lightweight, privacy-first Codex companion. Choose a template, press **Optimize**, and get a structured prompt you can review, copy, or restore in one click. Your text stays in the local panel.

## Features

- Task, coding, review, and writing templates
- Chinese / English output toggle
- Keyboard shortcut: `Ctrl+Enter`
- Copy and restore actions
- No API key, server, telemetry, or cloud storage

## Run locally

```bash
git clone https://github.com/VELIR5/codex-prompt-optimizer.git
cd codex-prompt-optimizer
npm test
npm run format:check
npm run dev
```

Open `http://127.0.0.1:4173` in a browser, or mount `src/` as a local Codex panel according to your host's extension API. For a Codex-like composer, call `observeComposer({ selector: 'textarea' })` from `src/host-adapter.mjs`; it watches dynamically-rendered inputs and adds an inline optimize button.

## One-click Codex Desktop workflow (Windows)

This companion does not modify Codex files. Install Node.js 20+, run `npm install`, then run `npm run companion:install` in PowerShell. The launcher uses the STA mode required by Windows Forms. Focus the Codex composer and press `Ctrl+Alt+O` to select, optimize, and paste the prompt back. Press `Ctrl+Alt+Z` to restore the previous text. Hotkeys are guarded to Codex Desktop's `ChatGPT` process (and the CLI `codex` process); other apps are not changed. Stop auto-start with `npm run companion:uninstall`. Processing is local-only.

When the companion is running and Codex Desktop is open, a green **✦ Optimize** floating button appears near the lower-right of the Codex window. Click it to optimize; click it again to restore. It does not require Codex to remain the foreground window.

### Custom templates

Yes. Run `npm run companion:configure` to open `%APPDATA%\PromptLens\templates.json`. Set `activeTemplate` to a template key. Add any new template under `templates` with an `instruction`, set it active, then restart the companion. Built-in templates can also be edited.

### Troubleshooting

- No response: make sure Codex is the foreground window and only one companion instance is running.
- Hotkey conflict: close the application that owns `Ctrl+Alt+O` or `Ctrl+Alt+Z`, then restart the companion.
- Stop immediately: end the companion `powershell.exe` process in Task Manager.
- Uninstall: run `npm run companion:uninstall`, then stop any already-running companion process.

## Included in this release

The current release includes the Windows Codex companion, deterministic local optimizer, and standalone preview panel.

## License

MIT. See [LICENSE](LICENSE). See [SECURITY.md](SECURITY.md) for responsible disclosure.

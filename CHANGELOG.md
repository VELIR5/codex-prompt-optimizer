# Changelog

## 0.2.0 - 2026-10-03

### Fixed

- Windows companion no longer pastes stale clipboard content when the Codex composer is empty.
- Companion errors (empty or non-text clipboard, broken config, missing Node.js) are reported via tray balloons and a log file instead of silently terminating the process.
- An invalid `templates.json` is never deleted; built-in templates are used temporarily and the user is warned.
- Code indentation and inner spacing are preserved during optimization.
- Autostart registers only once (HKCU Run key); the legacy Startup shortcut and scheduled task are removed and a single-instance guard prevents duplicates.
- The floating button no longer clicks fixed coordinates when Codex is already focused; the fallback offset is configurable.
- The companion's message loop no longer swallows window messages, and it waits for Ctrl/Alt to be released before sending keys.
- Host adapter writes are visible to React-controlled inputs and contenteditable editors; restoring never overwrites edits made after optimizing.
- Dev server requests can no longer escape `src/` (e.g. `/%2e%2e/package.json`).
- The panel language switch now translates the whole UI.

### Changed

- The companion and the panel share one optimizer through `scripts/optimize-cli.mjs` (requires Node.js at runtime).
- `templates.json` gains `language` and `inputClickOffset`; built-in templates no longer need to be listed. Default output language is Chinese.
- Added a tray menu (edit templates, open log, exit) and `npm run companion:selftest`.
- `companion:install` starts the companion immediately; `companion:uninstall` stops running instances.
- Removed the non-functional panel settings button.
- `format:check` performs real checks (UTF-8, LF, whitespace, JSON, JS and PowerShell syntax).

## 0.1.0 - 2026-09-08

- Initial release of the deterministic Prompt Lens optimizer.
- Added bilingual panel, templates, copy/restore actions, tests, and documentation.
- Added a host adapter that injects an optimize/restore action into dynamic Codex-like composers.
- Added a Windows companion with global optimize/restore hotkeys and startup installation.

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
```

Open `src/panel.html` in a browser, or mount `src/` as a local Codex panel according to your host's extension API.

## Roadmap

The current release contains the deterministic optimization engine and host-neutral panel. The next adapter can bind `run()` to Codex's native composer events without changing the optimizer contract.

## License

MIT. See [LICENSE](LICENSE). See [SECURITY.md](SECURITY.md) for responsible disclosure.

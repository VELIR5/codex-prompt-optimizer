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

## Codex Desktop limitation

This version cannot be installed directly into Codex Desktop or inject a button into its native composer. Codex Desktop does not expose a public UI extension hook for this. The supported workflow is: run `npm run dev`, open `http://127.0.0.1:4173`, optimize, then copy the result into Codex. The host adapter only supports web hosts that explicitly allow DOM extensions.

## Roadmap

The current release contains the deterministic optimization engine and host-neutral panel. The next adapter can bind `run()` to Codex's native composer events without changing the optimizer contract.

## License

MIT. See [LICENSE](LICENSE). See [SECURITY.md](SECURITY.md) for responsible disclosure.

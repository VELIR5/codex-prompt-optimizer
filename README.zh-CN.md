# Prompt Lens

> Codex 一键提示词优化器：把模糊想法变成清晰、可执行的指令。

Prompt Lens 是一个轻量、隐私优先的 Codex companion。选择模板，点击「立即优化」，即可在发送前获得结构化提示词，并支持复制或恢复原文。输入内容只在本地面板中处理。

## 功能

- 任务、代码实现、代码审查、写作润色模板
- 中英文输出切换
- 快捷键：`Ctrl+Enter`
- 一键复制与恢复原文
- 无 API Key、无服务器、无遥测、无云端存储

## 本地运行

```bash
git clone https://github.com/VELIR5/codex-prompt-optimizer.git
cd codex-prompt-optimizer
npm test
npm run format:check
npm run dev
```

访问 `http://127.0.0.1:4173` 即可预览。接入 Codex 时，从 `src/host-adapter.mjs` 调用 `observeComposer({ selector: 'textarea' })`，它会监听动态渲染的输入框并注入行内优化按钮；点击一次优化，再点击即可恢复原文。

## Codex Desktop 一键使用

这是 Windows 桌面 companion，不修改 Codex 安装文件：

1. 在 Codex 输入框中安装 Node.js 20+ 后打开 PowerShell。
2. 执行 `npm install`（本项目无第三方依赖）。
3. 执行 `npm run companion:install`，注册开机启动。
4. 重新打开 Codex，把光标放在输入框并输入提示词。
5. 按 `Ctrl+Alt+O`：自动选中输入框内容、优化并写回。
6. 如需恢复，按 `Ctrl+Alt+Z`。

优化完全在本机执行，不上传输入内容。停止开机启动：`npm run companion:uninstall`。首次使用建议先在记事本验证快捷键，再切换到 Codex。

## 路线图

当前版本提供确定性的优化引擎和与宿主无关的面板。后续适配层可以直接绑定 Codex 原生 composer 事件，无需改变优化器接口。

## 开源协议

本项目采用 MIT 协议，详见 [LICENSE](LICENSE)。安全问题请阅读 [SECURITY.md](SECURITY.md)。

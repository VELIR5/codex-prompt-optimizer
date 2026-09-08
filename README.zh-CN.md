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

1. 安装 Node.js 20+，打开 PowerShell（不是在 Codex 输入框中执行）。
2. 执行 `npm install`（本项目无第三方依赖；启动项会以最小化窗口运行 Windows Forms 所需的 STA 模式）。
3. 执行 `npm run companion:install`，注册开机启动。
4. 重新打开 Codex，把光标放在输入框并输入提示词。
5. 按 `Ctrl+Alt+O`：自动选中输入框内容、优化并写回。
6. 如需恢复，按 `Ctrl+Alt+Z`。

启动 companion 后，Codex 窗口右下角会显示绿色「✦ 优化」悬浮按钮；点击它即可完成同样操作，再点击一次恢复原文。按钮只在 Codex 成为前台窗口时显示。

优化完全在本机执行，不上传输入内容；快捷键只对 Codex Desktop 的 `ChatGPT` 窗口（以及 CLI 的 `codex` 窗口）生效，其他应用不会被修改。停止开机启动：`npm run companion:uninstall`。首次使用建议先按下面的故障排查检查状态，再切换到 Codex。

### 自定义模板

支持。运行 `npm run companion:configure` 会打开 `%APPDATA%\PromptLens\templates.json`。`activeTemplate` 决定当前使用的模板；在 `templates` 中新增任意名称与 `instruction` 后，将 `activeTemplate` 改为该名称，重启 companion 即可生效。四个内置模板可直接修改或删除。配置文件必须保存为 UTF-8；模板内容可使用中文。

### 故障排查

- 没有反应：确认 Codex 是当前前台窗口，且没有重复运行两个 companion 实例。
- 提示快捷键被占用：关闭占用 `Ctrl+Alt+O` 或 `Ctrl+Alt+Z` 的工具后重新启动 companion。
- 需要立即停止：任务管理器中结束命令行包含 `windows-companion.ps1` 的 `powershell.exe`。
- 卸载：运行 `npm run companion:uninstall`，再手动结束仍在运行的 companion 进程。

## 路线图

当前版本提供 Windows Codex companion、确定性的本地优化引擎和可独立预览的面板。

## 开源协议

本项目采用 MIT 协议，详见 [LICENSE](LICENSE)。安全问题请阅读 [SECURITY.md](SECURITY.md)。

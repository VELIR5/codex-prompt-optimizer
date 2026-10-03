# Prompt Lens

> Codex 一键提示词优化器：把模糊想法变成清晰、可执行的指令。

Prompt Lens 是一个轻量、隐私优先的 Codex companion。选择模板，点击「立即优化」，即可在发送前获得结构化提示词，并支持复制或返回编辑。输入内容只在本机处理。

## 功能

- 任务、代码实现、代码审查、写作润色模板，支持自定义模板
- 中英文界面与输出切换（选择会被记住）
- 快捷键：`Ctrl+Enter`
- 保留代码缩进，适合直接贴代码片段
- 无 API Key、无服务器、无遥测、无云端存储

## 本地运行

```bash
git clone https://github.com/VELIR5/codex-prompt-optimizer.git
cd codex-prompt-optimizer
npm test
npm run format:check
npm run dev
```

访问 `http://127.0.0.1:4173` 即可预览。接入 Codex 网页时，从 `src/host-adapter.mjs` 调用 `observeComposer({ selector: 'textarea' })`，它会监听动态渲染的输入框并注入行内优化按钮；点击一次优化，再点击即可恢复原文。如果优化后你又修改了内容，按钮会回到「优化」状态，不会用旧原文覆盖你的修改。可选参数：`template`、`language`、`buttonText`；返回的函数用于停止监听并移除按钮。适配层兼容 React 受控的 `textarea` 和 contenteditable 编辑器。

## Codex Desktop 一键使用（Windows）

这是 Windows 桌面 companion，不修改 Codex 安装文件：

1. 安装 Node.js 20+（companion 运行时需要能找到 `node.exe`），打开 PowerShell（不是在 Codex 输入框中执行）。本项目无第三方依赖，无需 `npm install`。
2. 执行 `npm run companion:install`：注册登录自启动、创建桌面快捷方式，并**立即启动** companion。系统托盘会出现 Prompt Lens 图标。
3. 打开 Codex，把光标放在输入框并输入提示词。
4. 按 `Ctrl+Alt+O`：自动选中输入框内容、优化并写回，剪贴板会恢复成原来的内容。
5. 如需恢复，按 `Ctrl+Alt+Z`。

只要 Codex Desktop 窗口打开，窗口右下角发送区域附近就会显示一个 32×32 的**四色三角图标**悬浮按钮。点击它即可完成同样操作，再点击一次恢复原文（处于可恢复状态时图标右下角有一个白点）。如果 Codex 在后台，点击按钮会先把它切到前台并点击输入框位置。

优化完全在本机执行，不上传输入内容；快捷键只对 Codex Desktop 的 `ChatGPT` 窗口（以及 CLI 的 `codex` 窗口）生效，其他应用不会被修改。输入框为空时不会做任何改动。

托盘图标右键菜单：**Edit templates**（编辑模板）、**Open log**（查看日志）、**Exit Prompt Lens**（退出）。出错时会以托盘气泡提示，并记录到 `%APPDATA%\PromptLens\companion.log`（日志不包含提示词内容）。

### 自定义模板

运行 `npm run companion:configure`（或托盘菜单 Edit templates）会打开 `%APPDATA%\PromptLens\templates.json`：

```json
{
  "language": "zh",
  "activeTemplate": "task",
  "inputClickOffset": { "fromRight": 720, "fromBottom": 135 },
  "templates": {
    "example": { "name": "示例自定义模板", "instruction": "在这里写下你希望助手遵循的要求" }
  }
}
```

- `language`：输出语言，`zh` 或 `en`。
- `activeTemplate`：当前模板。内置 `task`、`coding`、`review`、`writing` 无需写在文件里即可使用。
- `templates`：新增自定义模板（写 `instruction` 即可），或用同名条目覆盖内置模板。
- `inputClickOffset`：Codex 在后台时，点击输入框的位置（相对窗口右下角）。

修改后保存即可，下一次优化时生效，无需重启。配置文件写错时 companion 会提示并临时使用内置模板，**不会删除或改写你的文件**。旧版本生成的配置可以继续使用。

### 卸载

执行 `npm run companion:uninstall`：停止正在运行的 companion，移除自启动和桌面快捷方式，保留你的模板文件。

### 故障排查

- 没有反应：确认 Codex 是当前前台窗口、光标在输入框内；查看托盘气泡或 `companion.log`。
- 点击悬浮按钮优化了错误内容：先点一下 Codex 输入框再点按钮；或调整 `inputClickOffset`。
- 提示快捷键被占用：关闭占用 `Ctrl+Alt+O` 或 `Ctrl+Alt+Z` 的工具后重新启动 companion；在此之前悬浮按钮仍可使用。
- 提示找不到 Node.js：安装 Node.js 20+，确认 `node --version` 可用后重新登录。
- 自检：`npm run companion:selftest`（不启动界面，不改动任何设置）。
- 需要立即停止：托盘图标右键 → Exit Prompt Lens。

## 路线图

当前版本提供 Windows Codex companion、确定性的本地优化引擎和可独立预览的面板。

## 开源协议

本项目采用 MIT 协议，详见 [LICENSE](LICENSE)。安全问题请阅读 [SECURITY.md](SECURITY.md)。

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
```

直接打开 `src/panel.html` 即可预览；接入 Codex 时，可按照宿主的扩展 API 将 `src/` 挂载为本地面板。

## 路线图

当前版本提供确定性的优化引擎和与宿主无关的面板。后续适配层可以直接绑定 Codex 原生 composer 事件，无需改变优化器接口。

## 开源协议

本项目采用 MIT 协议，详见 [LICENSE](LICENSE)。安全问题请阅读 [SECURITY.md](SECURITY.md)。

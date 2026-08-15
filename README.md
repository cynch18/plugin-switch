# plugin-switch

[![awesome · DSH plugin](https://awesome-dsh-plugin.com/badge.svg)](https://awesome-dsh-plugin.com)
[![release](https://img.shields.io/github/v/release/cynch18/plugin-switch)](https://github.com/cynch18/plugin-switch/releases/latest)
[![test](https://github.com/cynch18/plugin-switch/actions/workflows/test.yml/badge.svg)](https://github.com/cynch18/plugin-switch/actions/workflows/test.yml)

[English](README.en.md) | 中文

给 DeepSeek Harness (DSH) 的**插件清单页加上滑块开关**：点一下即可启用/停用任何插件，立即生效、不用重启服务端，重启后状态保持。

## 功能

- 实时启停（主动重放通道，绕开平台 watcher 死锁，确定性生效）
- 分组（系统/第三方/本地）、状态筛选、排序、搜索
- 批量启用/停用（单事务：一次备份，撤销一步全回）
- 撤销 + 自动备份（保留最近 20 份）
- 关键条目强确认、停用来源分层、config 预览、失败诊断
- 多标签页实时同步、CLI 恢复工具、双语界面与动画

## 快速开始

**方式一：`dsh plugin add`（推荐）**

```sh
dsh plugin --profile web add dsh-profile-plugin-switch
```

**方式二：直接下载（不用 git）**

在 [Releases](https://github.com/cynch18/plugin-switch/releases/latest) 下载 `plugin-switch.zip`，解压后运行：

```powershell
powershell -ExecutionPolicy Bypass -File .\install.ps1
```

**方式三：git clone**

```powershell
git clone https://github.com/cynch18/plugin-switch.git
cd plugin-switch
powershell -ExecutionPolicy Bypass -File .\scripts\install.ps1
```

然后**重启 dsh web**，按 `Ctrl+Shift+R` 刷新 → **设置 → 插件 → 插件清单**，每个插件右侧就是滑块开关。

> 方式二/三的 `-KeepOriginal` 参数保留原只读清单（仅启用 HTTP API）；`-Dev` 参数建 junction 指向源码，改代码直接生效。

## 卸载 / 恢复原版

- 恢复原只读清单：把 `%USERPROFILE%\.dsh\profiles\web\cordis.patch.yml` 里 `ui-settings-plugin-inventory`、`plugin-inventory` 的 `disabled: true` 改回 `false`，同时删除 `plugin-switch` 条目。
- 彻底卸载：删除 `%USERPROFILE%\.dsh\profiles\web\node_modules\dsh-profile-plugin-switch`，并移除 `cordis.patch.yml` 中的相关条目。

## 注意事项

- 需要以 `web` profile 运行 DSH（`npx @deepseek-ai/dsh web`），Node ≥ 22。
- 关闭"插件开关"自身会让开关页消失，恢复需手动把 `cordis.patch.yml` 里 `plugin-switch` 的 `disabled: true` 改回 `false`（页面上会弹确认）。
- `/plugin-switch` 是无鉴权的本地 HTTP 路由（与 DSH 自带 `/plugins/...` 同级信任），仅限个人本机使用。
- 改包内 `index.js` 需重启 dsh；改 `client.js` 刷新页面即可。

## 开发

```bash
npm install
npm test   # 单元测试（applyPatchEdit / 备份轮换 / 来源判定 / baked-disabled scrub）
```

## License

[MIT](LICENSE) © 2026 CYNCH18

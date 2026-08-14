# plugin-switch

给 DeepSeek Harness (DSH) 的**插件清单页加上开关**：点一下即可启用/停用任何插件，立即生效、不用重启服务端，重启后状态保持。

## 快速开始

```powershell
git clone https://github.com/cynch18/plugin-switch.git
cd plugin-switch
powershell -ExecutionPolicy Bypass -File .\scripts\install.ps1
```

然后**重启 dsh web**，打开 GUI 按 `Ctrl+Shift+R` 刷新 → **设置 → 插件 → 插件清单**，每个插件右侧就是滑块开关。

> 就这么三步。装完把 clone 下来的目录删掉也行，插件已复制到 DSH 的配置目录里。

## 安装脚本选项

| 命令 | 用途 |
|------|------|
| `install.ps1` | 默认安装（替换原只读清单为带开关版） |
| `install.ps1 -KeepOriginal` | 保留原只读清单（仅启用 HTTP API，开关页不显示） |
| `install.ps1 -Dev` | 开发模式：junction 指向本仓库，改代码直接生效 |

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
npm test   # applyPatchEdit 单元测试（10 用例）
```

## License

[MIT](LICENSE) © 2026 CYNCH18

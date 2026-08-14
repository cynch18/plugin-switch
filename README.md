# plugin-switch

一个 [DeepSeek Harness (DSH)](https://github.com/deepseek-ai/deepseek-harness) web 插件：在 GUI 的 **设置 → 插件 → 插件清单** 里为每个插件提供启用/停用滑块开关。点击立即生效，**无需重启服务端**，并持久化到 `cordis.patch.yml`（重启后保持）。

> 插件清单页默认是只读的。本插件把它替换为带开关的版本：完整的插件列表（entryId、模块名、启用状态、Cordis 挂载状态）+ 每行一个滑块开关。

## 特性

- 🎚️ 滑块开关：点击 ≤1 秒内热生效（Loader 原生 `Entry.update({disabled})`，不重启进程）
- 💾 持久化：开关写回 profile 的 `cordis.patch.yml`，保留全部注释，重启后保持
- 🛡️ 安全：只改补丁层文件，绝不把补丁行"烘焙"进基础配置（避免 `duplicate loader entry id`）
- 🔀 双语界面（zh/en）、搜索过滤、状态点、详情展开
- ⚡ 并发防护：切换请求串行处理，进行中按钮自动禁用
- 📦 无构建步骤：client 半是手写的 `window.__ModuleLoader__` bundle，host 半纯 Node 内置模块

## 环境要求

- 以 `web` profile 运行 DSH（`npx @deepseek-ai/dsh web`），Node ≥ 22
- DSH 0.1.0-rc.x（前端 bundle 需含 `dsh-client-modules` 及其 client 包阵容；本插件与 0.1.0-rc.6 联调通过）

## 安装

```powershell
# 在本仓库根目录：
powershell -ExecutionPolicy Bypass -File .\scripts\install.ps1
```

默认行为：安装插件包 + **替换原只读"插件清单"为带开关版**。

其他模式：

```powershell
# 保留原只读清单（仅启用 /plugin-switch HTTP API，开关页不出现）
powershell -ExecutionPolicy Bypass -File .\scripts\install.ps1 -KeepOriginal

# 开发模式：在 DSH home 建 junction 指向本仓库，改代码直接生效
# （client.js 改动刷新页面即可；index.js 改动需重启 dsh web）
powershell -ExecutionPolicy Bypass -File .\scripts\install.ps1 -Dev
```

装完后：**重启 dsh web → 强制刷新页面（Ctrl+Shift+R）→ 设置 → 插件 → 插件清单**。

### 手动安装（等价步骤）

1. 把本仓库的 `package.json`、`index.js`、`client.js` 复制到 `%USERPROFILE%\.dsh\profiles\web\node_modules\dsh-profile-plugin-switch\`；
2. 编辑 `%USERPROFILE%\.dsh\profiles\web\cordis.patch.yml`：
   - 在任意 `- insert:` 列表（或文件末尾新增一个）加入：
     ```yaml
     - id: plugin-switch
       name: dsh-profile-plugin-switch
     ```
   - 若要替换原只读清单，追加：
     ```yaml
     - id: ui-settings-plugin-inventory
       disabled: true
     - id: plugin-inventory
       disabled: true
     ```
3. 重启 dsh web，强制刷新页面。

## 工作原理

- **host 半（`index.js`）**：注册 `/plugin-switch` HTTP 路由（`GET /list`、`POST /toggle`）。toggle 流程：
  1. `entry.update({disabled})` —— 内存热开关，立即 dispose/start 对应 fiber；
  2. `applyPatchEdit()` 对 `cordis.patch.yml` 做行级文本修改（保留注释），原子写回；
  3. DSH 的 patch watcher 热重放补丁，使文件值与内存状态一致。
- **client 半（`client.js`）**：`window.__ModuleLoader__` 模块图 bundle，通过 slot `settings.plugins.tab`（id `all`）注册"插件清单"页；若检测到原只读清单仍在，自动让位，避免重复标签。
- 切换目标按 entryId 匹配（支持全名 `include:auto-open-browser` 或短名）；group 条目与 `!!js` 表达式条目被显式拒绝。

## 开发与测试

```bash
npm install   # 仅需 devDependency：js-yaml（测试用）
npm test      # 运行 test.mjs（applyPatchEdit 单元测试）
```

`test.mjs` 覆盖：末尾追加补丁（主路径）、幂等、顶层/insert 嵌套行的值替换与缩进插入、`!!js` 拒绝、注释保留、正则特殊字符 id、前缀防误匹配。

开发调试建议：

- `client.probe.js` 是最小探针 bundle：临时替换 `client.js` 并在浏览器控制台验证 `require("react")` 等模块图依赖。
- 生效规则：改 `cordis.patch.yml` → 热重放立即生效；改 `index.js` → 重启 dsh；改 `client.js` → 刷新页面。

## 卸载 / 恢复原版

- **恢复原只读清单**：把 `cordis.patch.yml` 中 `ui-settings-plugin-inventory`、`plugin-inventory` 的 `disabled: true` 改回 `false`，并删除/禁用 `plugin-switch` 条目（二者二选一，避免同 id 冲突）。
- **彻底卸载**：删除 `profiles\web\node_modules\dsh-profile-plugin-switch`（或 dev junction）并移除 `cordis.patch.yml` 中的相关条目。

## 常见问题

- **关闭插件开关自身**：页面与开关能力会消失（含 `/plugin-switch` 路由），恢复需把 `cordis.patch.yml` 中 `plugin-switch` 的 `disabled: true` 改回 `false`。UI 会弹确认。
- **开关显示"未持久化"**：写文件失败（只读权限）时，本次会话仍生效；重启或下次任何补丁改动重放后，状态会回到文件值。
- **dsh 升级后插件消失**：`profiles\node_modules` 若被重装清空，重跑 `install.ps1` 即可。
- **改代码不生效**：见上文"生效规则"。

## 安全注记

`/plugin-switch` 是裸 HTTP 路由（无鉴权），与 DSH 自带的 `/plugins/<id>/client.js` 同级信任；仅 localhost 绑定，个人机器可接受。多人/公网场景请勿使用或自行加鉴权。

## License

[MIT](LICENSE) © 2026 CYNCH18

# Typert Remote 迁移调研笔记（P3.1）

日期：2026-08-15（plugin-switch v0.2.0 之后）

## 结论

**放弃把 plugin-switch 从 HTTP 迁移到 Typert Remote；维持现有 HTTP API。**
理由：手写无构建插件与 Typert 的集成前提不成立，成本/收益不划算。

## 已核实的事实

1. **host 侧很便宜**：`TypertRemoteService` 只是 `super(ctx, "pluginSwitch")` +
   `@Remote("method")` 装饰器（Node ≥ 22 原生支持）。

2. **client 侧才是问题**：remote 门面不是"注入即得"的。以 pluginInventory 为例：
   - host 包带编译产物 `typert.remote-client.js`（zod schema + remote 方法表），
     导出 `./remote` 子路径；
   - api-remotes 的 client bundle **在编译期 import** 了
     `@deepseek-ai/dsh-host-plugin-inventory/remote`（静态目录，见其
     lib/types/client/index.js）；
   - client 插件通过 inject `"remote.pluginInventory"` 获得门面。

   也就是说：client 侧可用的 remote 命名空间是**各包构建时编译进 api-remotes
   bundle 的静态目录**。我们的新命名空间不在其中。

3. **要接入，必须二选一**：
   a. 走 typert 编译管线（ts 源码 + typert 编译器生成 zod schema/remote-client），
      放弃"无构建"；
   b. 手写 zod schema + remote-client 模块 + remote 挂载协议（$mount 顺序等），
      并在 client bundle 里 require 自己的 remote 模块与 zod（模块图里 zod 可用性未验证）。

   两者都显著增加复杂度，而 HTTP 通道已工作、有测试覆盖、无已知缺陷。

## 决定

- 维持 HTTP API（`/plugin-switch/*`）为唯一 transport。
- 若未来 DSH 提供"remote 命名空间注册"的运行时 API（无需编译），再评估迁移。
- 本次不迁移，也不保留"双通道"过渡（没有需要过渡的对象）。

# 配置编辑可行性调研笔记（P3.2）

日期：2026-08-15（plugin-switch v0.2.0 之后）

## 结论

**loader entry 的 `config` 编辑功能暂缓**；当前保持"详情只读展示 config JSON"（已实现）。
原因：在现有补丁层机制下没有安全的持久化通道。详见下文。

## 已核实的事实

1. **`dsh-client-schema-form` 是无 UI 的纯 helper 库**：
   - 提供 `rehydrateSchema`（把 `schema.toJSON()` 信封还原为 schemastery 节点树）、
     `validateDraft`、`getPath/setPath/deletePath`（按路径编辑 draft，immutable）。
   - **没有表单组件**。渲染表单（把 schema 节点树变成输入控件）需要插件自己实现；
     现有惯例是各插件用 `ctx.settingsScope.bind({namespace})` 自建表单（见
     dsh-client-ui-settings-plugins 的 BashCard/AgentLoopCard/WebSearchCard）。

2. **插件 Config schema 可获取**：host 侧 loader entry 的 fiber runtime 上挂着
   `plugin.Config`（schemastery schema，static 属性）。理论上可 `toJSON()` 传给 client。

3. **写入路径不通**：
   - loader entry 的 `config` 不是 settings 命名空间，`settingsScope` 写不了它。
   - 文本级改 `cordis.patch.yml` 的 `config:` 行不可行：多行块、引号、`!!js` 表达式，
     行级手术会破坏格式（applyPatchEdit 只支持 `disabled` 这种布尔单值行）。
   - `Entry.update({config})` 只改内存，且 EntryTree 层会触发 `tree.write()` 把补丁行
     烘焙进基础配置文件（重启 duplicate id）——**禁止**。

## 若将来要做编辑，可行路径（按推荐序）

1. **上游支持**：向 deepseek-harness 提议"loader entry config 的官方 set 通道"
   （如 include 行级 config 重写 API + 补丁层感知），社区插件再消费。
2. **受限 JSON 编辑**：只对"无 config 或纯 JSON 对象 config"的条目提供 JSON 文本框；
   保存时整行重写 `config:` 为 flow 风格单行 JSON（`config: {...}`），仅当原值
   也是纯 JSON 且无 `!!js` 时允许；其余条目只读。可行但需严格校验 + 备份兜底。
3. **settings 化**：让插件把自己的可配项通过 settings 命名空间暴露（新约定），
   与 loader config 解耦。

## 决定

- v0.2.x/v0.3.x：保持 config 只读展示（详情里的 JSON 预览），不做编辑。
- 若采用"受限 JSON 编辑"，单列一个版本实现（含 applyPatchEdit 风格的
  `applyConfigEdit` + 单测矩阵 + 备份回滚）。

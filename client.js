// dsh-profile-plugin-switch — client half.
// 替换只读"插件清单" tab：完整列表 + 每行滑块开关 + 分组/筛选/排序 + 批量操作。
window.__ModuleLoader__.load({
  id: "dsh-profile-plugin-switch",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    var React = require("react");

    const NS = "settings.pluginSwitch";
    const inject = ["slots", "locale"];

    // 双语字典：键集必须完全一致（ctx.locale.register 强制双语平衡）。
    const zh = {
      tab: "插件清单",
      loading: "正在读取插件…",
      error: "暂时无法读取插件。",
      retry: "重试",
      search: "搜索插件",
      empty: "暂无插件。",
      emptySearch: "没有匹配的插件。",
      enabledTag: "已启用",
      disabledTag: "已停用",
      configuration: "配置状态",
      cordis: "Cordis 状态",
      unobserved: "未挂载",
      pending: "等待依赖",
      loadingPhase: "加载中",
      active: "已挂载",
      failed: "挂载失败",
      unloading: "卸载中",
      toggleOn: "启用",
      toggleOff: "停用",
      toggling: "切换中…",
      toggleFailed: "切换失败",
      busy: "另一个切换正在进行，请稍候。",
      notPersisted: "本次会话已生效，但未能写入配置文件；重启或下次任何配置改动重放后，状态将回到文件值。",
      details: "详情",
      groupSystem: "系统",
      groupThird: "第三方",
      groupLocal: "本地",
      filterAll: "全部",
      filterEnabled: "已启用",
      filterDisabled: "已停用",
      filterFailed: "失败",
      sortByName: "按名称",
      sortByState: "按状态",
      bulkEnable: "全部启用",
      bulkDisable: "全部停用",
      bulkEnableConfirm: "确认启用 {n} 个插件？关键插件（{m} 个）已自动跳过。",
      bulkDisableConfirm: "确认停用 {n} 个插件？关键插件（{m} 个）已自动跳过。",
      bulkNothing: "没有可批量操作的插件（关键插件需单独操作）。",
      bulkDone: "批量完成：{n} 个成功。",
      bulkPartial: "批量完成：{n} 成功，{m} 失败。",
      bulkFailed: "批量操作失败",
      criticalApiGateway: "停用 api-gateway 将断开 GUI 与后端的通信，页面将失去响应。确定继续？",
      criticalWebserver: "停用 webserver 将关闭本插件与 GUI 的 HTTP 服务。确定继续？",
      criticalModules: "停用 modules 将移除浏览器插件加载机制，刷新后所有界面插件失效。确定继续？",
      criticalConnection: "停用 connection 将断开 GUI 与后端的实时连接。确定继续？",
      criticalWebRuntime: "停用 web-runtime 将移除 Web 界面运行环境。确定继续？",
      criticalPluginSwitch: "禁用插件开关自身后，本页面与开关能力都会消失，恢复需手动编辑 cordis.patch.yml。确定继续？",
      undo: "撤销",
      undoConfirm: "撤销将把配置恢复到上一次开关前的备份（会覆盖之后的手动编辑）。继续？",
      undoDone: "已恢复上一次备份。",
      undoFailed: "撤销失败",
      sourceLabel: "停用来源",
      sourceProfile: "profile 补丁层",
      sourceBundle: "bundle 层",
      depsLabel: "依赖服务",
      depsNone: "（无）",
      configLabel: "配置",
    };
    const en = {
      tab: "Plugin list",
      loading: "Reading plugins…",
      error: "Plugins are temporarily unavailable.",
      retry: "Retry",
      search: "Search plugins",
      empty: "No plugins are available.",
      emptySearch: "No matching plugins.",
      enabledTag: "Enabled",
      disabledTag: "Disabled",
      configuration: "Configuration",
      cordis: "Cordis status",
      unobserved: "Not mounted",
      pending: "Waiting for dependencies",
      loadingPhase: "Loading",
      active: "Mounted",
      failed: "Mount failed",
      unloading: "Unloading",
      toggleOn: "Enable",
      toggleOff: "Disable",
      toggling: "Toggling…",
      toggleFailed: "Toggle failed",
      busy: "Another toggle is in progress, please wait.",
      notPersisted: "Applied for this session, but could not be written to the config file; after a restart or the next config replay, the state will fall back to the file value.",
      details: "Details",
      groupSystem: "System",
      groupThird: "Third-party",
      groupLocal: "Local",
      filterAll: "All",
      filterEnabled: "Enabled",
      filterDisabled: "Disabled",
      filterFailed: "Failed",
      sortByName: "By name",
      sortByState: "By state",
      bulkEnable: "Enable all",
      bulkDisable: "Disable all",
      bulkEnableConfirm: "Enable {n} plugins? Critical plugins ({m}) are skipped automatically.",
      bulkDisableConfirm: "Disable {n} plugins? Critical plugins ({m}) are skipped automatically.",
      bulkNothing: "Nothing to bulk-toggle (critical plugins must be toggled individually).",
      bulkDone: "Bulk done: {n} succeeded.",
      bulkPartial: "Bulk done: {n} succeeded, {m} failed.",
      bulkFailed: "Bulk operation failed",
      criticalApiGateway: "Disabling api-gateway severs the GUI's connection to the backend and the page will stop responding. Continue?",
      criticalWebserver: "Disabling webserver shuts down the HTTP service used by this plugin and the GUI. Continue?",
      criticalModules: "Disabling modules removes the browser plugin loading mechanism; all UI plugins stop working after a refresh. Continue?",
      criticalConnection: "Disabling connection severs the live link between the GUI and the backend. Continue?",
      criticalWebRuntime: "Disabling web-runtime removes the Web UI runtime environment. Continue?",
      criticalPluginSwitch: "Disabling the plugin switch itself removes this page and the toggle capability; restoring it requires editing cordis.patch.yml manually. Continue?",
      undo: "Undo",
      undoConfirm: "Undo restores the config from the backup taken before the last toggle (overwriting any later manual edits). Continue?",
      undoDone: "Restored the latest backup.",
      undoFailed: "Undo failed",
      sourceLabel: "Disabled by",
      sourceProfile: "profile patch layer",
      sourceBundle: "bundle layer",
      depsLabel: "Dependencies",
      depsNone: "(none)",
      configLabel: "Config",
    };

    // 关键条目：关闭前弹强确认（短 id → 确认文案键）。
    const CRITICAL = {
      "api-gateway": "criticalApiGateway",
      webserver: "criticalWebserver",
      modules: "criticalModules",
      connection: "criticalConnection",
      "web-runtime": "criticalWebRuntime",
      "plugin-switch": "criticalPluginSwitch",
    };

    const CSS = `
.psw-section{width:100%;max-width:760px;color:var(--dsw-alias-label-primary);flex-direction:column;gap:14px;display:flex}
.psw-status{color:var(--dsw-alias-label-tertiary);font-size:13px;line-height:20px}
.psw-notice{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);border-radius:8px;padding:8px 12px;font-size:12px;line-height:18px;animation:psw-notice-in .18s ease}
.psw-notice[data-kind="error"]{color:var(--dsw-alias-state-error-primary);border-color:var(--dsw-alias-state-error-primary)}
.psw-notice[data-kind="warn"]{color:var(--dsw-alias-state-warning-primary,var(--dsw-alias-label-secondary))}
.psw-searchRow{align-items:center;gap:8px;display:flex}
.psw-searchRow .psw-search{flex:1}
.psw-toolbar{align-items:center;gap:4px;flex-wrap:wrap;display:flex}
.psw-search{width:100%;color:var(--dsw-alias-label-tertiary);align-items:center;display:flex;position:relative}
.psw-search input{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);width:100%;height:36px;color:var(--dsw-alias-label-primary);font:inherit;border-radius:8px;outline:none;padding:0 12px;font-size:13px}
.psw-search input:focus-visible{border-color:var(--dsw-alias-state-business-primary)}
.psw-undo{appearance:none;font:inherit;cursor:pointer;display:inline-flex;align-items:center;gap:6px;height:28px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);border-radius:14px;padding:0 12px;font-size:12px;line-height:18px;flex:none;transition:border-color .14s,background .14s,color .14s}
.psw-undo:hover:not(:disabled){border-color:var(--dsw-alias-state-business-primary);color:var(--dsw-alias-state-business-primary);background:var(--dsw-alias-interactive-bg-hover)}
.psw-undo:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:2px}
.psw-undo:disabled{cursor:default;opacity:.45}
.psw-chip{appearance:none;font:inherit;cursor:pointer;display:inline-flex;align-items:center;height:28px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-secondary);border-radius:14px;padding:0 9px;font-size:12px;line-height:18px;transition:color .14s,border-color .14s,background .14s}
.psw-chip:hover:not(:disabled){border-color:var(--dsw-alias-state-business-primary);color:var(--dsw-alias-state-business-primary)}
.psw-chip:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:2px}
.psw-chip[data-active="true"]{background:var(--dsw-alias-button-primary-fill);border-color:var(--dsw-alias-button-primary-fill);color:var(--dsw-alias-label-primary-foreground)}
.psw-chip:disabled{cursor:default;opacity:.55}
.psw-chipGhost{appearance:none;font:inherit;cursor:pointer;display:inline-flex;align-items:center;height:28px;border:1px solid transparent;background:transparent;color:var(--dsw-alias-label-tertiary);border-radius:14px;padding:0 7px;font-size:12px;line-height:18px;transition:color .14s,border-color .14s}
.psw-chipGhost:hover{color:var(--dsw-alias-label-primary)}
.psw-chipGhost[data-active="true"]{color:var(--dsw-alias-state-business-primary);border-color:var(--dsw-alias-state-business-primary)}
.psw-sep{width:1px;height:18px;background:var(--dsw-alias-border-l2);margin:0 2px;flex:none}
.psw-action,.psw-danger{appearance:none;font:inherit;cursor:pointer;display:inline-flex;align-items:center;height:28px;border-radius:14px;padding:0 10px;font-size:12px;line-height:18px;transition:background .14s,border-color .14s}
.psw-action{border:1px solid var(--dsw-alias-state-business-primary);background:transparent;color:var(--dsw-alias-state-business-primary)}
.psw-action:hover:not(:disabled){background:color-mix(in srgb, var(--dsw-alias-state-business-primary) 12%, transparent)}
.psw-danger{border:1px solid var(--dsw-alias-state-error-primary);background:transparent;color:var(--dsw-alias-state-error-primary)}
.psw-danger:hover:not(:disabled){background:color-mix(in srgb, var(--dsw-alias-state-error-primary) 10%, transparent)}
.psw-action:disabled,.psw-danger:disabled{cursor:default;opacity:.5}
.psw-cards{grid-template-columns:repeat(2,minmax(0,1fr));align-items:start;gap:10px;margin:0;padding:0;list-style:none;display:grid}
@media (width<=680px){.psw-cards{grid-template-columns:minmax(0,1fr)}}
.psw-groupHead{align-items:baseline;gap:7px;margin:0 0 6px;padding:0 2px;display:flex}
.psw-groupHead h3{color:var(--dsw-alias-label-primary);margin:0;font-size:13px;font-weight:600;line-height:20px}
.psw-groupCount{background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-tertiary);border-radius:999px;padding:0 8px;font-size:11px;line-height:18px;font-variant-numeric:tabular-nums}
.psw-card{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);border-radius:10px;min-width:0;overflow:hidden;animation:psw-in .22s ease both;transition:border-color .16s,box-shadow .16s,transform .16s}
.psw-card:hover{transform:translateY(-1px);box-shadow:var(--dsw-shadow-lv1)}
.psw-cardHead{box-sizing:border-box;width:100%;min-height:52px;color:inherit;font:inherit;text-align:left;cursor:pointer;background:0 0;border:0;justify-content:space-between;align-items:center;gap:12px;padding:12px 14px;display:flex}
.psw-cardHead:hover{background:var(--dsw-alias-interactive-bg-hover)}
.psw-title{text-overflow:ellipsis;white-space:nowrap;min-width:0;font-size:14px;font-weight:600;line-height:20px;overflow:hidden}
.psw-trailing{color:var(--dsw-alias-label-tertiary);flex:none;align-items:center;gap:7px;display:inline-flex}
.psw-dot{background:var(--dsw-alias-label-tertiary);border-radius:999px;flex:none;width:7px;height:7px;display:inline-block;transition:background .2s}
.psw-dot.psw-dotPop{animation:psw-pop .3s ease}
.psw-dot[data-phase="active"]{background:var(--dsw-alias-state-success-primary)}
.psw-dot[data-phase="failed"]{background:var(--dsw-alias-state-error-primary)}
.psw-dot[data-phase="loading"],.psw-dot[data-phase="pending"]{background:var(--dsw-alias-state-business-primary)}
.psw-tag{background:var(--dsw-alias-bg-layer-1);min-height:20px;color:var(--dsw-alias-label-secondary);white-space:nowrap;border-radius:5px;align-items:center;padding:1px 6px;font-size:11px;line-height:16px;display:inline-flex}
.psw-tag[data-enabled="true"]{background:color-mix(in srgb, var(--dsw-alias-state-success-primary) 10%, transparent);color:var(--dsw-alias-state-success-primary)}
.psw-toggle{appearance:none;font:inherit;cursor:pointer;border:1px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-primary);background:0 0;border-radius:6px;padding:3px 10px;font-size:12px;line-height:18px}
.psw-toggle:hover:not(:disabled){border-color:var(--dsw-alias-state-business-primary)}
.psw-toggle:disabled{cursor:default;opacity:.6}
.psw-switch{appearance:none;position:relative;width:38px;height:22px;border-radius:999px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);cursor:pointer;flex:none;padding:0;transition:background .16s,border-color .16s}
.psw-switch::after{content:"";position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:999px;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.25);transition:transform .16s var(--ds-ease-in-out,ease),background .16s}
.psw-switch:hover:not(:disabled):not([aria-checked="true"]){border-color:var(--dsw-alias-state-business-primary)}
.psw-switch:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:2px}
.psw-switch[aria-checked="true"]{background:var(--dsw-alias-state-success-primary);border-color:var(--dsw-alias-state-success-primary)}
.psw-switch[aria-checked="true"]::after{transform:translateX(16px)}
.psw-switch:disabled{cursor:default;opacity:.55}
.psw-switch:disabled::after{background:var(--dsw-alias-bg-layer-1)}
.psw-switch[data-pending="true"]{animation:psw-pulse 1s ease-in-out infinite}
@keyframes psw-pulse{0%,100%{opacity:.85}50%{opacity:.4}}
.psw-detailsWrap{display:grid;grid-template-rows:0fr;transition:grid-template-rows .22s var(--ds-ease-in-out,ease)}
.psw-detailsWrap[data-open="true"]{grid-template-rows:1fr}
.psw-detailsInner{overflow:hidden;min-height:0}
.psw-details{border-top:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-module-platform);padding:10px 14px 12px}
.psw-grid{grid-template-columns:76px minmax(0,1fr);gap:6px 10px;display:grid}
.psw-grid dt{color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:17px}
.psw-grid dd{overflow-wrap:anywhere;min-width:0;color:var(--dsw-alias-label-secondary);margin:0;font-size:12px;line-height:17px}
.psw-config{font-family:var(--ds-font-family-code);font-size:11px;line-height:16px;white-space:pre-wrap;word-break:break-all}
@keyframes psw-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
@keyframes psw-pop{0%{transform:scale(1)}45%{transform:scale(1.7)}100%{transform:scale(1)}}
@keyframes psw-notice-in{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:none}}
@keyframes psw-spin{to{transform:rotate(360deg)}}
.psw-spinner{width:12px;height:12px;border:2px solid currentColor;border-top-color:transparent;border-radius:50%;flex:none;animation:psw-spin .8s linear infinite}
.psw-undoIcon{display:inline-block;transition:transform .25s}
.psw-undo:hover:not(:disabled) .psw-undoIcon{transform:rotate(-180deg)}
`;

    const e = React.createElement;

    function StatusDot(props) {
      return e("span", { className: "psw-dot psw-dotPop", "data-phase": props.phase ?? "none" });
    }

    function Tag(props) {
      return e("span", { className: "psw-tag", "data-enabled": props.enabled ? "true" : "false" }, props.enabled ? props.t("enabledTag") : props.t("disabledTag"));
    }

    function PhaseText(props) {
      const map = { pending: "pending", loading: "loadingPhase", active: "active", failed: "failed", unloading: "unloading" };
      const key = map[props.phase];
      return key ? props.t(key) : props.t("unobserved");
    }

    const shortId = (entry) => entry.entryId.split(":").pop();
    const isCritical = (entry) => CRITICAL[shortId(entry)] !== undefined;
    const groupOf = (entry) => {
      const name = String(entry.moduleName);
      if (name.startsWith("@deepseek-ai/")) return "system";
      if (name.startsWith(".")) return "local";
      return "third";
    };

    // 同源多标签页同步通道（惰性单例；BroadcastChannel 不可用时退化为无同步）。
    let syncChannel = null;
    const getSyncChannel = () => {
      if (syncChannel === null) {
        try {
          syncChannel = new BroadcastChannel("plugin-switch-sync");
        } catch {
          syncChannel = false;
        }
      }
      return syncChannel === false ? null : syncChannel;
    };
    const broadcastSync = () => {
      try {
        getSyncChannel()?.postMessage("sync");
      } catch {
        // 忽略：同步是尽力而为。
      }
    };

    function PluginSwitchTab(props) {
      const t = props.t;
      const [snapshot, setSnapshot] = React.useState({ phase: "loading", entries: [], hasBackups: false, error: null });
      const [query, setQuery] = React.useState("");
      const [filter, setFilter] = React.useState("all");
      const [sortBy, setSortBy] = React.useState("name");
      const [openId, setOpenId] = React.useState(null);
      const [pendingId, setPendingId] = React.useState(null);
      const [bulkRunning, setBulkRunning] = React.useState(false);
      const [notice, setNotice] = React.useState(null);

      const load = React.useCallback(async () => {
        setSnapshot((prev) => ({ ...prev, phase: "loading" }));
        try {
          const res = await fetch("/plugin-switch/list");
          const data = await res.json();
          if (!data.ok) throw new Error(data.error || "list failed");
          setSnapshot({ phase: "ready", entries: data.value.entries, hasBackups: data.value.hasBackups === true, error: null });
        } catch (error) {
          setSnapshot((prev) => ({ ...prev, phase: "error", error: error instanceof Error ? error.message : String(error) }));
        }
      }, []);

      React.useEffect(() => {
        load();
      }, [load]);

      // 通知自动消失（错误保留更久）。
      React.useEffect(() => {
        if (!notice) return;
        const timer = setTimeout(() => setNotice(null), notice.kind === "error" ? 8000 : 4000);
        return () => clearTimeout(timer);
      }, [notice]);

      // 多标签页同步：广播接收 / 窗口聚焦 / 可见时 30s 轮询。
      React.useEffect(() => {
        const channel = getSyncChannel();
        const onMessage = () => load();
        const onFocus = () => load();
        channel?.addEventListener("message", onMessage);
        window.addEventListener("focus", onFocus);
        const timer = setInterval(() => {
          if (document.visibilityState === "visible") load();
        }, 30000);
        return () => {
          channel?.removeEventListener("message", onMessage);
          window.removeEventListener("focus", onFocus);
          clearInterval(timer);
        };
      }, [load]);

      // 单条目切换；返回 {ok}；skipConfirm 供批量调用。
      const toggleOne = async (entry, skipConfirm) => {
        if (!skipConfirm && isCritical(entry)) {
          if (!window.confirm(t(CRITICAL[shortId(entry)]))) return { ok: false, cancelled: true };
        }
        setPendingId(entry.entryId);
        setNotice(null);
        try {
          const res = await fetch("/plugin-switch/toggle", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ id: entry.entryId, enabled: !entry.enabled }),
          });
          const data = await res.json();
          if (!data.ok) {
            const isBusy = typeof data.error === "string" && data.error.startsWith("busy");
            setNotice({ kind: "error", text: isBusy ? t("busy") : `${t("toggleFailed")}: ${data.error ?? ""}` });
            return { ok: false, error: data.error };
          }
          if (data.value.persisted === false) {
            setNotice({ kind: "warn", text: t("notPersisted") });
          }
          broadcastSync();
          return { ok: true };
        } catch (error) {
          setNotice({ kind: "error", text: `${t("toggleFailed")}: ${error instanceof Error ? error.message : String(error)}` });
          return { ok: false, error: String(error) };
        } finally {
          setPendingId(null);
        }
      };

      const toggle = async (entry) => {
        const result = await toggleOne(entry, false);
        if (!result.cancelled) await load();
      };

      // 撤销：恢复 toggle 前自动备份的配置。
      const undo = async () => {
        if (!window.confirm(t("undoConfirm"))) return;
        setNotice(null);
        try {
          const res = await fetch("/plugin-switch/undo", { method: "POST" });
          const data = await res.json();
          if (!data.ok) {
            setNotice({ kind: "error", text: `${t("undoFailed")}: ${data.error ?? ""}` });
            return;
          }
          setNotice({ text: t("undoDone") });
          broadcastSync();
        } catch (error) {
          setNotice({ kind: "error", text: `${t("undoFailed")}: ${error instanceof Error ? error.message : String(error)}` });
        } finally {
          await load();
        }
      };

      // 管道：搜索 → 筛选 → 排序。
      const q = query.trim().toLowerCase();
      let entries = snapshot.entries.filter((entry) => q === "" || entry.entryId.toLowerCase().includes(q) || String(entry.moduleName).toLowerCase().includes(q));
      if (filter === "enabled") entries = entries.filter((entry) => entry.enabled);
      else if (filter === "disabled") entries = entries.filter((entry) => !entry.enabled);
      else if (filter === "failed") entries = entries.filter((entry) => entry.fiberPhase === "failed");
      entries = [...entries].sort(sortBy === "state"
        ? (a, b) => (b.enabled - a.enabled) || a.entryId.localeCompare(b.entryId)
        : (a, b) => a.entryId.localeCompare(b.entryId));

      const groups = [
        { key: "system", label: t("groupSystem"), items: entries.filter((entry) => groupOf(entry) === "system") },
        { key: "third", label: t("groupThird"), items: entries.filter((entry) => groupOf(entry) === "third") },
        { key: "local", label: t("groupLocal"), items: entries.filter((entry) => groupOf(entry) === "local") },
      ].filter((group) => group.items.length > 0);

      // 批量操作：单个事务（一次备份、撤销一步全回）。作用于当前筛选/搜索结果，跳过关键条目。
      const bulk = async (enabled) => {
        const targets = entries.filter((entry) => entry.enabled !== enabled && !isCritical(entry));
        const skipped = entries.filter((entry) => entry.enabled !== enabled && isCritical(entry)).length;
        if (targets.length === 0) {
          setNotice({ kind: "warn", text: t("bulkNothing") });
          return;
        }
        const message = t(enabled ? "bulkEnableConfirm" : "bulkDisableConfirm").replace("{n}", String(targets.length)).replace("{m}", String(skipped));
        if (!window.confirm(message)) return;
        setBulkRunning(true);
        setNotice(null);
        try {
          const res = await fetch("/plugin-switch/bulk", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ entries: targets.map((entry) => ({ id: entry.entryId, enabled })) }),
          });
          const data = await res.json();
          if (!data.ok) {
            setNotice({ kind: "error", text: `${t("bulkFailed")}: ${data.error ?? ""}` });
          } else {
            const failed = Array.isArray(data.value.failed) ? data.value.failed.length : 0;
            const changed = data.value.changed ?? 0;
            setNotice({
              text: failed > 0 ? t("bulkPartial").replace("{n}", String(changed)).replace("{m}", String(failed)) : t("bulkDone").replace("{n}", String(changed)),
            });
            broadcastSync();
          }
        } catch (error) {
          setNotice({ kind: "error", text: `${t("bulkFailed")}: ${error instanceof Error ? error.message : String(error)}` });
        } finally {
          setBulkRunning(false);
          await load();
        }
      };

      const renderCard = (entry, index) => {
        const open = openId === entry.entryId;
        const pending = pendingId === entry.entryId;
        return e("li", {
          key: entry.entryId,
          className: "psw-card",
          style: { animationDelay: `${Math.min(index * 18, 360)}ms` },
        },
          e("div", { className: "psw-cardHead" },
            e("button", {
              type: "button",
              className: "psw-cardHead",
              style: { flex: "1 1 auto", minWidth: 0 },
              "aria-expanded": open,
              onClick: () => setOpenId(open ? null : entry.entryId),
            },
              e("span", { className: "psw-title" }, entry.entryId),
              e("span", { className: "psw-trailing" },
                StatusDot({ key: `${entry.entryId}:${entry.fiberPhase}:${entry.enabled}`, phase: entry.fiberPhase }),
                Tag({ enabled: entry.enabled, t })
              )
            ),
            e("button", {
              type: "button",
              className: "psw-switch",
              role: "switch",
              "aria-checked": entry.enabled,
              "aria-label": entry.enabled ? t("toggleOff") : t("toggleOn"),
              title: entry.enabled ? t("toggleOff") : t("toggleOn"),
              disabled: pending || bulkRunning,
              "data-pending": pending ? "true" : "false",
              onClick: () => toggle(entry),
            })
          ),
          e("div", { className: "psw-detailsWrap", "data-open": open ? "true" : "false" },
            e("div", { className: "psw-detailsInner" },
              e("div", { className: "psw-details" },
                e("dl", { className: "psw-grid" },
                  e("dt", null, t("configuration")),
                  e("dd", null, entry.enabled ? t("enabledTag") : t("disabledTag")),
                  e("dt", null, t("cordis")),
                  e("dd", null, PhaseText({ phase: entry.fiberPhase, t })),
                  e("dt", null, t("details")),
                  e("dd", null, String(entry.moduleName)),
                  entry.disabledSource !== null && entry.disabledSource !== undefined
                    ? [e("dt", { key: "ds-l" }, t("sourceLabel")), e("dd", { key: "ds-v" }, entry.disabledSource === "profile" ? t("sourceProfile") : t("sourceBundle"))]
                    : null,
                  e("dt", null, t("depsLabel")),
                  e("dd", null, entry.inject && entry.inject.length > 0 ? entry.inject.join(", ") : t("depsNone")),
                  entry.config !== null && entry.config !== undefined
                    ? [e("dt", { key: "cfg-l" }, t("configLabel")), e("dd", { key: "cfg-v" }, e("code", { className: "psw-config" }, entry.config))]
                    : null
                )
              )
            )
          )
        );
      };

      const chips = [
        { key: "all", label: t("filterAll") },
        { key: "enabled", label: t("filterEnabled") },
        { key: "disabled", label: t("filterDisabled") },
        { key: "failed", label: t("filterFailed") },
      ];

      return e("div", { className: "psw-section" },
        notice ? e("div", { className: "psw-notice", "data-kind": notice.kind, role: "status" }, notice.text) : null,
        e("div", { className: "psw-searchRow" },
          e("div", { className: "psw-search" },
            e("input", {
              type: "search",
              placeholder: t("search"),
              value: query,
              onChange: (event) => setQuery(event.target.value),
              "aria-label": t("search"),
            })
          ),
          e("button", {
            type: "button",
            className: "psw-undo",
            disabled: !snapshot.hasBackups || bulkRunning,
            title: snapshot.hasBackups ? t("undo") : undefined,
            onClick: () => undo(),
          }, e("span", { className: "psw-undoIcon" }, "\u21BA"), " ", t("undo"))
        ),
        e("div", { className: "psw-toolbar" },
          chips.map((chip) => e("button", {
            key: chip.key,
            type: "button",
            className: "psw-chip",
            "data-active": filter === chip.key ? "true" : "false",
            onClick: () => setFilter(chip.key),
          }, chip.label)),
          e("span", { className: "psw-sep" }),
          e("button", {
            type: "button",
            className: "psw-chipGhost",
            "data-active": sortBy === "name" ? "true" : "false",
            onClick: () => setSortBy("name"),
          }, t("sortByName")),
          e("button", {
            type: "button",
            className: "psw-chipGhost",
            "data-active": sortBy === "state" ? "true" : "false",
            onClick: () => setSortBy("state"),
          }, t("sortByState")),
          e("span", { className: "psw-sep" }),
          e("button", {
            type: "button",
            className: "psw-action",
            disabled: bulkRunning,
            onClick: () => bulk(true),
          }, bulkRunning ? [e("span", { key: "sp", className: "psw-spinner" }), e("span", { key: "tx" }, t("toggling"))] : t("bulkEnable")),
          e("button", {
            type: "button",
            className: "psw-danger",
            disabled: bulkRunning,
            onClick: () => bulk(false),
          }, bulkRunning ? [e("span", { key: "sp", className: "psw-spinner" }), e("span", { key: "tx" }, t("toggling"))] : t("bulkDisable"))
        ),
        snapshot.phase === "loading" && entries.length === 0
          ? e("p", { className: "psw-status", role: "status" }, t("loading"))
          : null,
        snapshot.phase === "error"
          ? e("div", { className: "psw-notice", "data-kind": "error", role: "status" },
              t("error"),
              " ",
              e("button", { type: "button", className: "psw-toggle", onClick: () => load() }, t("retry")))
          : null,
        snapshot.phase === "ready" && entries.length === 0
          ? e("p", { className: "psw-status" }, q === "" ? t("empty") : t("emptySearch"))
          : groups.map((group) => e("div", { key: group.key },
              e("div", { className: "psw-groupHead" },
                e("h3", null, group.label),
                e("span", { className: "psw-groupCount" }, String(group.items.length))
              ),
              e("ul", { className: "psw-cards" }, group.items.map(renderCard))
            ))
      );
    }

    function apply(ctx) {
      ctx.effect(() => {
        const style = document.createElement("style");
        style.dataset.plugin = "dsh-profile-plugin-switch";
        style.textContent = CSS;
        document.head.appendChild(style);
        return () => style.remove();
      }, "plugin-switch: styles");
      ctx.effect(() => ctx.locale.register(NS, { zh, en }), "plugin-switch: dictionaries");
      const t = ctx.locale.bind(NS);

      let disposer;
      const slotOptions = {
        name: "settings.plugins.tab",
        id: "all",
        order: 10,
        label: () => t("tab"),
        locale: NS,
      };
      const hasOriginal = () => ctx.slots.entries("settings.plugins.tab").some((entry) => entry.options.id === "all");
      const registerOwn = () => {
        if (disposer !== undefined) return;
        disposer = ctx.slots.register(slotOptions, PluginSwitchTab);
      };

      ctx.slots.inject("settings.plugins.tab", () => {
        if (hasOriginal()) {
          // 原只读清单仍在：让位，500ms 复查一次，原版消失则注册。
          setTimeout(() => {
            if (disposer !== undefined || hasOriginal()) return;
            registerOwn();
          }, 500);
        } else {
          // 无同 id：延迟 300ms 复查一次（给原版注册留窗口），仍无才注册。
          setTimeout(() => {
            if (disposer !== undefined || hasOriginal()) return;
            registerOwn();
          }, 300);
        }
        return () => {
          if (disposer !== undefined) {
            disposer();
            disposer = undefined;
          }
        };
      });
    }

    exports.NS = NS;
    exports.apply = apply;
    exports.inject = inject;
    return module.exports;
  },
});

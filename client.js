// dsh-profile-plugin-switch — client half (stage 3 draft).
// 替换只读"插件清单" tab：完整列表 + 每行启用/禁用开关。
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
      selfConfirm: "禁用插件开关自身后，本页面与开关能力都会消失，恢复需手动编辑 cordis.patch.yml。确定继续？",
      details: "详情",
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
      selfConfirm: "Disabling the plugin switch itself removes this page and the toggle capability; restoring it requires editing cordis.patch.yml manually. Continue?",
      details: "Details",
    };

    const CSS = `
.psw-section{width:100%;max-width:760px;color:var(--dsw-alias-label-primary);flex-direction:column;gap:14px;display:flex}
.psw-status{color:var(--dsw-alias-label-tertiary);font-size:13px;line-height:20px}
.psw-notice{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);border-radius:8px;padding:8px 12px;font-size:12px;line-height:18px}
.psw-notice[data-kind="error"]{color:var(--dsw-alias-state-error-primary);border-color:var(--dsw-alias-state-error-primary)}
.psw-notice[data-kind="warn"]{color:var(--dsw-alias-state-warning-primary,var(--dsw-alias-label-secondary))}
.psw-search{width:100%;color:var(--dsw-alias-label-tertiary);align-items:center;display:flex;position:relative}
.psw-search input{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);width:100%;height:36px;color:var(--dsw-alias-label-primary);font:inherit;border-radius:8px;outline:none;padding:0 12px;font-size:13px}
.psw-search input:focus-visible{border-color:var(--dsw-alias-state-business-primary)}
.psw-cards{grid-template-columns:repeat(2,minmax(0,1fr));align-items:start;gap:10px;margin:0;padding:0;list-style:none;display:grid}
@media (width<=680px){.psw-cards{grid-template-columns:minmax(0,1fr)}}
.psw-card{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);border-radius:10px;min-width:0;overflow:hidden}
.psw-cardHead{box-sizing:border-box;width:100%;min-height:52px;color:inherit;font:inherit;text-align:left;cursor:pointer;background:0 0;border:0;justify-content:space-between;align-items:center;gap:12px;padding:12px 14px;display:flex}
.psw-cardHead:hover{background:var(--dsw-alias-interactive-bg-hover)}
.psw-title{text-overflow:ellipsis;white-space:nowrap;min-width:0;font-size:14px;font-weight:600;line-height:20px;overflow:hidden}
.psw-trailing{color:var(--dsw-alias-label-tertiary);flex:none;align-items:center;gap:7px;display:inline-flex}
.psw-dot{background:var(--dsw-alias-label-tertiary);border-radius:999px;flex:none;width:7px;height:7px;display:inline-block}
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
.psw-details{border-top:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-module-platform);padding:10px 14px 12px}
.psw-grid{grid-template-columns:76px minmax(0,1fr);gap:6px 10px;display:grid}
.psw-grid dt{color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:17px}
.psw-grid dd{overflow-wrap:anywhere;min-width:0;color:var(--dsw-alias-label-secondary);margin:0;font-size:12px;line-height:17px}
`;

    const e = React.createElement;

    function StatusDot(props) {
      return e("span", { className: "psw-dot", "data-phase": props.phase ?? "none" });
    }

    function Tag(props) {
      return e("span", { className: "psw-tag", "data-enabled": props.enabled ? "true" : "false" }, props.enabled ? props.t("enabledTag") : props.t("disabledTag"));
    }

    function PhaseText(props) {
      const map = { pending: "pending", loading: "loadingPhase", active: "active", failed: "failed", unloading: "unloading" };
      const key = map[props.phase];
      return key ? props.t(key) : props.t("unobserved");
    }

    function PluginSwitchTab(props) {
      const t = props.t;
      const [snapshot, setSnapshot] = React.useState({ phase: "loading", entries: [], error: null });
      const [query, setQuery] = React.useState("");
      const [openId, setOpenId] = React.useState(null);
      const [pendingId, setPendingId] = React.useState(null);
      const [notice, setNotice] = React.useState(null);

      const load = React.useCallback(async () => {
        setSnapshot((prev) => ({ ...prev, phase: "loading" }));
        try {
          const res = await fetch("/plugin-switch/list");
          const data = await res.json();
          if (!data.ok) throw new Error(data.error || "list failed");
          setSnapshot({ phase: "ready", entries: data.value.entries, error: null });
        } catch (error) {
          setSnapshot((prev) => ({ ...prev, phase: "error", error: error instanceof Error ? error.message : String(error) }));
        }
      }, []);

      React.useEffect(() => {
        load();
      }, [load]);

      const toggle = async (entry) => {
        if (entry.entryId === "plugin-switch" || entry.entryId.endsWith(":plugin-switch")) {
          if (!window.confirm(t("selfConfirm"))) return;
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
          } else if (data.value.persisted === false) {
            setNotice({ kind: "warn", text: t("notPersisted") });
          }
        } catch (error) {
          setNotice({ kind: "error", text: `${t("toggleFailed")}: ${error instanceof Error ? error.message : String(error)}` });
        } finally {
          setPendingId(null);
          await load();
        }
      };

      const q = query.trim().toLowerCase();
      const entries = snapshot.entries.filter((entry) => q === "" || entry.entryId.toLowerCase().includes(q) || String(entry.moduleName).toLowerCase().includes(q));

      return e("div", { className: "psw-section" },
        notice ? e("div", { className: "psw-notice", "data-kind": notice.kind, role: "status" }, notice.text) : null,
        e("div", { className: "psw-search" },
          e("input", {
            type: "search",
            placeholder: t("search"),
            value: query,
            onChange: (event) => setQuery(event.target.value),
            "aria-label": t("search"),
          })
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
          : e("ul", { className: "psw-cards" },
              entries.map((entry) => {
                const open = openId === entry.entryId;
                const pending = pendingId === entry.entryId;
                return e("li", { key: entry.entryId, className: "psw-card" },
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
                        StatusDot({ phase: entry.fiberPhase }),
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
                      disabled: pending,
                      onClick: () => toggle(entry),
                    })
                  ),
                  open
                    ? e("div", { className: "psw-details" },
                        e("dl", { className: "psw-grid" },
                          e("dt", null, t("configuration")),
                          e("dd", null, entry.enabled ? t("enabledTag") : t("disabledTag")),
                          e("dt", null, t("cordis")),
                          e("dd", null, PhaseText({ phase: entry.fiberPhase, t })),
                          e("dt", null, t("details")),
                          e("dd", null, String(entry.moduleName))
                        )
                      )
                    : null
                );
              })
            )
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

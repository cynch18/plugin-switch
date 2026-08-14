// dsh-profile-plugin-switch — stage-1 probe client half.
// 验证：包解析、dsh.client 发现、bundle 服务、模块图加载、require("react") 可用性。
window.__ModuleLoader__.load({
  id: "dsh-profile-plugin-switch",
  factory: (require) => {
    console.log("[plugin-switch-probe] moduleLoader:", typeof window.__ModuleLoader__);
    console.log("[plugin-switch-probe] react:", typeof require("react"));
    console.log("[plugin-switch-probe] jsxRuntime:", typeof require("react/jsx-runtime"));
    console.log("[plugin-switch-probe] useState:", typeof (require("react") && require("react").useState));
    return { apply() {}, inject: [] };
  },
});

# plugin-switch

[![awesome · DSH plugin](https://awesome-dsh-plugin.com/badge.svg)](https://awesome-dsh-plugin.com)
[![release](https://img.shields.io/github/v/release/cynch18/plugin-switch)](https://github.com/cynch18/plugin-switch/releases/latest)
[![test](https://github.com/cynch18/plugin-switch/actions/workflows/test.yml/badge.svg)](https://github.com/cynch18/plugin-switch/actions/workflows/test.yml)

English | [中文](README.md)

Adds toggle switches to the DeepSeek Harness (DSH) **plugin inventory page**: enable or disable any plugin with one click, live, without restarting the server — and the state persists across restarts.

## Features

- Live enable/disable via an active recompose channel (bypasses the platform watcher deadlock; deterministic application)
- Groups (system / third-party / local), status filters, sorting, search
- Bulk enable/disable as one transaction (single backup; undo reverts it all)
- Undo with automatic backups (latest 20 kept)
- Critical-entry confirmations, depended-on warnings with confirmation, disabled-source layering, config preview, failure diagnostics
- Multi-tab live sync, CLI recovery tool, bilingual UI, animations

## Quick start

**Option 1: `dsh plugin add` (recommended)**

```sh
dsh plugin --profile web add github:cynch18/plugin-switch
```

**Option 2: direct download (no git)**

Download `plugin-switch.zip` from [Releases](https://github.com/cynch18/plugin-switch/releases/latest), extract it, then run:

```powershell
powershell -ExecutionPolicy Bypass -File .\install.ps1
```

**Option 3: git clone**

```powershell
git clone https://github.com/cynch18/plugin-switch.git
cd plugin-switch
powershell -ExecutionPolicy Bypass -File .\scripts\install.ps1
```

Then **restart dsh web**, press `Ctrl+Shift+R`, and go to **Settings → Plugins → Plugin list** — every plugin row has a slider switch on the right.

> ⚠️ **Pick ONE installation method**: `dsh plugin add`, the zip, and install.ps1 must not be combined — installing twice in the same profile creates duplicate rows and the profile fails to start.
>
> Options 2/3 accept `-KeepOriginal` (keep the original read-only inventory; HTTP API only) and `-Dev` (junction to the source tree for live development).

## FAQ

**Q: I disabled the plugin switch itself and the page disappeared — how do I get it back?**

Open `%USERPROFILE%\.dsh\profiles\web\cordis.patch.yml`, find the `plugin-switch` entry, and change `disabled: true` back to `false` (or delete the line). It takes effect within ~3 seconds, no restart needed.

**Q: Toggling does nothing?**

Restart dsh web and try again; if it still fails, see Troubleshooting below.

**Q: I made a mistake — can I roll back?**

The "↺ Undo" button restores the configuration from the backup taken before your last toggle (every toggle is backed up automatically; the latest 20 are kept).

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Toggle page missing | Use only one install method, restart dsh, hard-refresh (Ctrl+Shift+R); check that `ui-settings-plugin-inventory` and `plugin-inventory` are `disabled: true` in `cordis.patch.yml` |
| State does not change | Restart dsh web and retry |
| Host errors | Check the dsh launcher window log (loader apply/error lines) |
| GUI unreachable | Use the CLI recovery tool: `node scripts/dsh-plugin-fix.mjs list / enable <id> / disable <id> / undo / backups` (run from the repo directory) |
| Config file broken | Backups live in `%USERPROFILE%\.dsh\profiles\web\backups\`; copy the latest one back to `cordis.patch.yml` |

## Uninstall / restore the original list

- Restore the original read-only inventory: in `%USERPROFILE%\.dsh\profiles\web\cordis.patch.yml`, set `disabled: true` back to `false` for `ui-settings-plugin-inventory` and `plugin-inventory`, and remove the `plugin-switch` entry.
- Full uninstall: delete `%USERPROFILE%\.dsh\profiles\web\node_modules\dsh-profile-plugin-switch` and remove the related rows from `cordis.patch.yml`.

## Notes

- Requires DSH running the `web` profile (`npx @deepseek-ai/dsh web`), Node ≥ 22.
- Disabling the plugin switch itself removes the toggle page; restore it by changing `plugin-switch`'s `disabled: true` back to `false` in `cordis.patch.yml` (the page asks for confirmation first).
- `/plugin-switch` is an unauthenticated local HTTP route (same trust level as DSH's built-in `/plugins/...`), for personal localhost use only.
- Editing `index.js` inside the package requires a dsh restart; editing `client.js` only needs a page refresh.

## Development

```bash
npm install
npm test   # unit tests (applyPatchEdit / backup rotation / source detection / baked-disabled scrub)
```

## License

[MIT](LICENSE) © 2026 CYNCH18

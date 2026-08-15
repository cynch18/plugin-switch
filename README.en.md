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
- Critical-entry confirmations, disabled-source layering, config preview, failure diagnostics
- Multi-tab live sync, CLI recovery tool, bilingual UI, animations

## Quick start

**Option 1: `dsh plugin add` (recommended)**

```sh
dsh plugin --profile web add dsh-profile-plugin-switch
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

> Options 2/3 accept `-KeepOriginal` (keep the original read-only inventory; HTTP API only) and `-Dev` (junction to the source tree for live development).

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

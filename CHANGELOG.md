# Changelog

All notable changes to this project are documented in this file.

## [0.5.0] - 2026-08-15

- Fixed the bundle patch so `dsh plugin add` installs show the toggle page (the two inventory disables were missing)
- Verified the official `dsh plugin add github:cynch18/plugin-switch` install path
- Added `dependents` dependency hints (normalized camelCase/kebab matching) with confirmation warnings
- Added the active recompose channel: toggle/bulk/undo apply through the loader include entry directly, bypassing the platform watcher deadlock (learned from dsh-web-plugin-manager), with baked-disabled scrub, deep clone, and a 5s timeout
- Added `dsh.bundle` manifest for standard `dsh plugin add` installs
- Listed on awesome-dsh-plugin (PR #374)

## [0.4.0] - 2026-08-15

- Active recompose channel (see 0.5.0 notes; released together with the bundle manifest)
- Bilingual README (zh/en) with the awesome-dsh-plugin badge

## [0.3.1] - 2026-08-15

- UI animations: staggered card entrance, sliding details, status-dot pop, notice auto-dismiss, bulk spinner, undo icon rotation

## [0.3.0] - 2026-08-15

- Compact two-row toolbar layout (search + undo / filters | sort | bulk)
- Disabled-source layering (profile vs bundle) and config preview in details
- Operation-level undo (in-memory reversal + file restore, independent of watcher replay)
- Fault-tolerant bulk (service-collision entries skipped and reported)

## [0.2.0] - 2026-08-15

- Groups (system/third-party/local), status filters, sorting, search
- Bulk enable/disable as one transaction (single backup; undo reverts it all)
- Pre-toggle backups (latest 20 kept) with undo
- Critical-entry confirmations
- Multi-tab sync (BroadcastChannel + focus + polling)
- CLI recovery tool `scripts/dsh-plugin-fix.mjs`

## [0.1.0] - 2026-08-14

- Initial release: toggle switches on the plugin inventory page with live hot-switch and persistence

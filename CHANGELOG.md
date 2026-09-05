# Changelog

All notable changes to this project are documented in this file.

## [0.5.2] - 2026-09-05

- Fixed the in-flight lock race in toggle/bulk: the lock now covers the whole request (including the body read), so concurrent requests can no longer both pass the check and overwrite the same patch file
- Fixed the test harness to actually run async tests (they previously reported ok immediately while real failures became unhandled rejections); the summary now prints at the end
- Added an `application/json` content-type check on all POST endpoints: cross-site form POSTs are now blocked at the browser preflight stage (the web client sends the header)
- `applyPatchEdit` now preserves CRLF line endings and the file's trailing newline (install.ps1 writes CRLF; edits used to create mixed-EOL files and dropped the final newline)
- bulk no longer reads and recomputes the patch file twice per operation (single probe pass; re-read only when some entries fail in memory)
- `sendJson` sends no body for HEAD requests; `readBody` has a 5s timeout so a stalled request cannot hold the lock forever; `loadYaml` retries instead of caching failure; the recompose race timer is cleared; the idempotent toggle response no longer claims `persisted: true`
- installers: anchored the already-installed row checks (the old regex could match unrelated text) and fixed the release installer copying into an existing directory (nested package bug)
- Tab arbitration now runs continuously instead of a single 300/500ms recheck: if the original read-only inventory registers late (slow load) or is re-enabled mid-session, our tab yields; if it gets disabled mid-session, our tab takes over. Self-registration is now told apart from the original via entry options (reference, label identity, or an owner marker — robust to platform cloning), and all pending timers are cancelled on unload (no zombie re-registration after self-disable)

## [0.5.1] - 2026-08-15

- Fixed dependents matching for object plugins: merge the resolved `fiber.inject` table (service name → config) so code-level dependencies surface regardless of plugin shape (class/function/{apply}-object)

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

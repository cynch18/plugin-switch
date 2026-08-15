// dsh-profile-plugin-switch — host half.
// GUI 插件开关：GET /plugin-switch/list|backups + POST /plugin-switch/toggle|undo。
//
// 热开关原理：
//   1) 内存：entry.update({disabled}) 立即 dispose/start 对应 fiber（loader 原生热开关）。
//   2) 持久化：文本级改写 cordis.patch.yml（保留注释），由 DSH 的 patch watcher
//      (watchUserPatches) 通过 HMR 事务性重放；不使用 EntryTree.update 等会把补丁
//      行烘焙进基础配置文件的路径。
//   3) 保险：每次 toggle 写文件前自动备份到 <profile>/backups/（保留最近 20 份），
//      可通过 /undo 恢复。
import { existsSync, readdirSync } from "node:fs";
import { copyFile, mkdir, readdir, readFile, unlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const name = "plugin-switch";
export const inject = ["loader", "webServer"];

// ── patch 文件定位 ────────────────────────────────────────────────────────
// 主选位置（包在 profiles/web/node_modules 下）：../../cordis.patch.yml
// 备选位置（包在 profiles/node_modules 下）：../../web/cordis.patch.yml
// 依次尝试两个候选，换目录不改代码；两个都不存在 → undefined（调用方显式报错）。
function resolvePatchPath() {
  const candidates = [
    fileURLToPath(new URL("../../cordis.patch.yml", import.meta.url)),
    fileURLToPath(new URL("../../web/cordis.patch.yml", import.meta.url)),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  return undefined;
}

// ── 纯函数：文本级修改 patch 文件（导出供测试） ──────────────────────────
// 把条目 shortId 的 disabled 设为 true/false。只做行级手术，保留全部注释与格式。
// - 找到 `- id: <id>` 条目块（顶层或 insert 列表内）：
//   已有 `disabled: true|false` 行 → 只替换值；
//   没有 → 在条目块末尾按缩进（条目缩进 + 2 空格）插入一行；
//   是 `!!js` 表达式 → 抛错，不破坏原文。
// - 全文件无此 id → 末尾追加顶层补丁条目 `- id: <id>` + `  disabled: <值>`
//   （id-targeted override，用户层最后应用，可覆盖 bundle 层插入的行）。
export function applyPatchEdit(content, shortId, disabled) {
  const value = disabled ? "true" : "false";
  const lines = content.split("\n");
  const escaped = shortId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const target = new RegExp(`^(\\s*)- id:\\s*${escaped}\\s*$`);

  for (let i = 0; i < lines.length; i++) {
    const match = target.exec(lines[i]);
    if (!match) continue;
    const indent = match[1];
    const child = indent + "  ";

    // 条目块结束：下一个缩进 <= 本条目缩进的 `- ` 行（或文件尾）。
    let end = lines.length;
    for (let j = i + 1; j < lines.length; j++) {
      const item = /^(\s*)- /.exec(lines[j]);
      if (item && item[1].length <= indent.length) {
        end = j;
        break;
      }
    }

    // 块内已有 disabled 行（只认条目直接子键缩进，避免误匹配嵌套 config）。
    const disabledLine = new RegExp(`^${child}disabled:\\s*(.*?)\\s*$`);
    for (let j = i + 1; j < end; j++) {
      const dm = disabledLine.exec(lines[j]);
      if (!dm) continue;
      if (/^(true|false)$/.test(dm[1])) {
        lines[j] = `${child}disabled: ${value}`;
        return lines.join("\n");
      }
      throw new Error(
        `cannot auto-toggle ${shortId}: its "disabled" is a JS expression; edit cordis.patch.yml manually`,
      );
    }

    // 无 disabled 行 → 插在条目块末尾（裁掉尾部空行，插在最后一个内容行之后）。
    while (end > i + 1 && lines[end - 1].trim() === "") end -= 1;
    lines.splice(end, 0, `${child}disabled: ${value}`);
    return lines.join("\n");
  }

  // 全文件无此 id → 追加顶层补丁条目（主路径：bundle 内置插件都没有行）。
  if (lines.length && lines[lines.length - 1] !== "") lines.push("");
  lines.push(`- id: ${shortId}`, `  disabled: ${value}`);
  return lines.join("\n");
}

// ── 备份（导出供测试与 CLI 复用） ────────────────────────────────────────
export function backupFileName(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `cordis.patch.${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}-${String(date.getMilliseconds()).padStart(3, "0")}.yml`;
}

export function isBackupFile(fileName) {
  return /^cordis\.patch\.\d{8}-\d{6}-\d{3}\.yml$/.test(fileName);
}

/** 轮换：删除超出 limit 的最旧备份，返回被删文件名列表。 */
export async function pruneBackups(backupsDir, limit = 20) {
  const files = (await readdir(backupsDir)).filter(isBackupFile).sort();
  const excess = files.slice(0, Math.max(0, files.length - limit));
  for (const file of excess) await unlink(join(backupsDir, file));
  return excess;
}

/** 把当前 patch 文件备份进 backupsDir 并轮换；返回备份文件名。 */
export async function writeBackup(patchPath, backupsDir, now = new Date()) {
  await mkdir(backupsDir, { recursive: true });
  const name = backupFileName(now);
  await copyFile(patchPath, join(backupsDir, name));
  await pruneBackups(backupsDir);
  return name;
}

/** 备份目录里的备份文件名（升序，最新的在最后）。 */
export async function listBackupFiles(backupsDir) {
  try {
    return (await readdir(backupsDir)).filter(isBackupFile).sort();
  } catch {
    return [];
  }
}

/** 用指定备份内容覆盖 patch 文件。 */
export async function restoreBackupContent(patchPath, backupsDir, backupName) {
  const content = await readFile(join(backupsDir, backupName), "utf8");
  // 直接写原文件（tmp+rename 的原子替换不会触发 DSH 的 patch watcher，已实证）。
  await writeFile(patchPath, content, "utf8");
}

/** 用最新备份覆盖 patch 文件，返回被恢复的备份文件名。 */
export async function restoreLatestBackup(patchPath, backupsDir) {
  const files = await listBackupFiles(backupsDir);
  if (files.length === 0) throw new Error("no backups available");
  const latest = files[files.length - 1];
  await restoreBackupContent(patchPath, backupsDir, latest);
  return latest;
}

// ── HTTP 小工具 ───────────────────────────────────────────────────────────
const MAX_BODY = 64 * 1024;

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY) {
        reject(new Error("body too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

// ── loader 工具 ───────────────────────────────────────────────────────────
function fiberPhaseOf(entry) {
  const fiber = entry.fiber;
  if (fiber === undefined) return null;
  // FiberState: PENDING 0, LOADING 1, ACTIVE 2, FAILED 3, DISPOSED 4, UNLOADING 5
  return ["pending", "loading", "active", "failed", null, "unloading"][fiber.state] ?? null;
}

/** 失败条目提取 fiber 错误原文（拿不到返回 null，不抛错）。 */
function failureOf(entry) {
  const fiber = entry.fiber;
  if (fiber === undefined) return null;
  try {
    const error = fiber.error;
    if (error === undefined || error === null) return null;
    if (error instanceof Error) return `${error.name !== "Error" ? `${error.name}: ` : ""}${error.message}`;
    return String(error);
  } catch {
    return null;
  }
}

/** inject 的服务名列表（数组直取；对象取键名；其余为空数组）。 */
function injectOf(entry) {
  const inject = entry.options.inject;
  if (inject === undefined || inject === null) return [];
  if (Array.isArray(inject)) return inject;
  if (typeof inject === "object") return Object.keys(inject);
  return [];
}

/** 纯函数：profile patch 文件里是否有该 shortId 的条目行（顶层或 insert 内）。 */
export function patchHasRow(content, shortId) {
  const escaped = shortId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^(\\s*)- id:\\s*${escaped}\\s*$`, "m").test(content);
}

/** config 的安全序列化（只读展示用）。 */
function configPreviewOf(entry) {
  const config = entry.options.config;
  if (config === undefined || config === null) return null;
  try {
    return JSON.stringify(config);
  } catch {
    try {
      return String(config);
    } catch {
      return null;
    }
  }
}

/** 停用来源：profile 补丁层（文件里有该 id 行）/ bundle 层 / null（未停用）。 */
function disabledSourceOf(entry, profileContent) {
  if (!entry.disabled) return null;
  if (profileContent !== undefined && patchHasRow(profileContent, entry.options.id)) return "profile";
  return "bundle";
}

function listEntries(ctx, profileContent) {
  const entries = [];
  for (const entry of ctx.loader.entries()) {
    if (entry.options.group) continue;
    entries.push({
      entryId: entry.id,
      moduleName: entry.options.name,
      enabled: !entry.disabled,
      fiberPhase: fiberPhaseOf(entry),
      inject: injectOf(entry),
      failure: failureOf(entry),
      config: configPreviewOf(entry),
      disabledSource: disabledSourceOf(entry, profileContent),
    });
  }
  return entries;
}

function findMatches(ctx, id) {
  const matches = [];
  for (const entry of ctx.loader.entries()) {
    if (entry.options.group) continue;
    if (entry.id === id || entry.options.id === id || entry.id.endsWith(":" + id)) {
      matches.push(entry);
    }
  }
  return matches;
}

// ── 主动重放通道（学习自 dsh-web-plugin-manager 的 live.ts） ─────────────
// 平台的 patch watcher 在重放时卸载 HMR 依赖的行（如 timer）会死锁，之后所有
// patch 变更被静默忽略。这里绕过 watcher，直接对 loader 的 include 条目调
// entry.update({config:{patches}})——与平台 watchUserPatches 同通道，确定性生效。

/** 找到 loader 树的根 include 条目（id 为 "include"，config 带 patches 栈）。 */
function findIncludeEntry(ctx) {
  for (const entry of ctx.loader.entries()) {
    if (entry.id !== "include") continue;
    const config = entry.options?.config;
    if (config === undefined || !Array.isArray(config.patches)) continue;
    return entry;
  }
  return undefined;
}

/** 加载 js-yaml：裸 import 优先，失败则走 DSH 自带的 profiles/node_modules fallback。 */
let yamlModule;
async function loadYaml() {
  if (yamlModule !== undefined) return yamlModule;
  try {
    yamlModule = await import("js-yaml");
  } catch {
    try {
      const { homedir } = await import("node:os");
      const { pathToFileURL } = await import("node:url");
      const home = process.env.DSH_HOME ?? join(homedir(), ".dsh");
      yamlModule = await import(pathToFileURL(join(home, "profiles", "node_modules", "js-yaml", "index.js")).href);
    } catch {
      yamlModule = null;
    }
  }
  return yamlModule;
}

/** 收集补丁栈里出现过的所有条目 id（顶层行与 insert 子行）。 */
export function collectRowIds(stack) {
  const ids = new Set();
  for (const row of stack ?? []) {
    if (row && typeof row === "object") {
      if (typeof row.id === "string") ids.add(row.id);
      if (Array.isArray(row.insert)) {
        for (const child of row.insert) {
          if (child && typeof child.id === "string") ids.add(child.id);
        }
      }
    }
  }
  return ids;
}

/**
 * 纯函数：清除 others（非 profile 行）里被 bake 的 disabled 值。
 * applyEntryPatches 会把 override 原地写进 insert 子行；当文件里已没有该 id 的
 * 行时（undo 恢复），baked 值会让条目永远停在旧状态——这里把这类 baked 值删掉，
 * 让条目回到 bundle 层原始状态。
 */
export function scrubBakedDisabled(others, rowIds, scrubIds) {
  const clone = structuredClone(others);
  for (const row of clone) {
    if (!row || typeof row !== "object" || !Array.isArray(row.insert)) continue;
    for (const child of row.insert) {
      if (child && typeof child.id === "string" && scrubIds.has(child.id) && !rowIds.has(child.id)) {
        delete child.disabled;
      }
    }
  }
  return clone;
}

// ── 插件主体 ──────────────────────────────────────────────────────────────
export function apply(ctx) {
  const patchPath = resolvePatchPath();

  // 操作日志：每次 toggle/bulk 成功后记录（备份文件名 + 每个条目的原状态），
  // undo 据此做内存级反向 + 文件恢复，不依赖 watcher 重放是否生效。
  const operationLog = [];
  // 主动重放状态：others = 非 profile 行的干净捕获；scrubIds = 我们写过的条目 id。
  let othersCache;
  let scrubIds = new Set();
  if (patchPath === undefined) {
    console.error("plugin-switch: cordis.patch.yml not found at either candidate location; toggle will fail");
  }
  const backupsDir = patchPath !== undefined ? join(dirname(patchPath), "backups") : undefined;

  let inFlight = false;

  const hasBackups = async () => {
    if (backupsDir === undefined) return false;
    try {
      return readdirSync(backupsDir).some(isBackupFile);
    } catch {
      return false;
    }
  };

  /**
   * 主动重放：读 patch 文件 → 组装补丁栈（非 profile 行 + 文件行）→ include 条目
   * update。绕过平台 watcher（其重放会因 HMR 依赖死锁而静默失效），确定性生效。
   */
  const recompose = async () => {
    const entry = findIncludeEntry(ctx);
    if (entry === undefined) return { ok: false, message: "no include entry" };
    if (patchPath === undefined) return { ok: false, message: "patch file not found" };
    const yaml = await loadYaml();
    if (yaml === null || yaml.default === undefined) return { ok: false, message: "js-yaml unavailable" };
    let content;
    try {
      content = await readFile(patchPath, "utf8");
    } catch (error) {
      return { ok: false, message: `read patch failed: ${error instanceof Error ? error.message : String(error)}` };
    }
    let rows;
    try {
      rows = (yaml.default.load ?? yaml.load)(content);
    } catch (error) {
      return { ok: false, message: `parse patch failed: ${error instanceof Error ? error.message : String(error)}` };
    }
    if (!Array.isArray(rows)) return { ok: false, message: "patch file is not a list" };
    const config = entry.options.config;
    const stack = config?.patches;
    if (!Array.isArray(stack)) return { ok: false, message: "no patch stack" };
    if (othersCache === undefined) {
      const needle = new Set(rows.map((row) => JSON.stringify(row)));
      othersCache = structuredClone(stack.filter((row) => !needle.has(JSON.stringify(row))));
    }
    const rowIds = collectRowIds(rows);
    const others = scrubBakedDisabled(othersCache, rowIds, scrubIds);
    const { patches: _ignored, ...rest } = config;
    const next = [...others, ...structuredClone(rows)];
    const task = entry.update({ config: { ...rest, patches: next } });
    try {
      await Promise.race([
        task,
        new Promise((_, reject) => setTimeout(() => reject(new Error("live apply timed out")), 5000)),
      ]);
      return { ok: true };
    } catch (error) {
      console.error("plugin-switch: recompose failed:", error instanceof Error ? error.message : String(error));
      return { ok: false, message: error instanceof Error ? error.message : String(error) };
    }
  };

  const route = {
    kind: "prefix",
    path: "/plugin-switch",
    handler: async (req, res) => {
      const pathname = new URL(req.url ?? "/", "http://x").pathname;
      try {
        if (pathname === "/plugin-switch/list") {
          if (req.method !== "GET" && req.method !== "HEAD") {
            sendJson(res, 405, { ok: false, error: "method not allowed" });
            return;
          }
          let profileContent;
          if (patchPath !== undefined) {
            try {
              profileContent = await readFile(patchPath, "utf8");
            } catch {
              profileContent = undefined;
            }
          }
          sendJson(res, 200, { ok: true, value: { entries: listEntries(ctx, profileContent), hasBackups: await hasBackups() } });
          return;
        }

        if (pathname === "/plugin-switch/backups") {
          if (req.method !== "GET") {
            sendJson(res, 405, { ok: false, error: "method not allowed" });
            return;
          }
          let files = [];
          if (backupsDir !== undefined) {
            try {
              files = readdirSync(backupsDir).filter(isBackupFile).sort();
            } catch {
              files = [];
            }
          }
          sendJson(res, 200, { ok: true, value: { files } });
          return;
        }

        if (pathname === "/plugin-switch/bulk") {
          if (req.method !== "POST") {
            sendJson(res, 405, { ok: false, error: "method not allowed" });
            return;
          }
          if (inFlight) {
            sendJson(res, 409, { ok: false, error: "busy: another operation is in progress" });
            return;
          }
          const body = await readBody(req);
          let parsed;
          try {
            parsed = JSON.parse(body);
          } catch {
            sendJson(res, 400, { ok: false, error: "invalid JSON body" });
            return;
          }
          const { entries } = parsed ?? {};
          if (!Array.isArray(entries) || entries.length === 0 || entries.some((item) => typeof item?.id !== "string" || typeof item?.enabled !== "boolean")) {
            sendJson(res, 400, { ok: false, error: "body must be {entries: [{id: string, enabled: boolean}]}" });
            return;
          }

          inFlight = true;
          try {
            // 校验：所有 id 唯一命中。
            const changes = [];
            for (const item of entries) {
              const matches = findMatches(ctx, item.id);
              if (matches.length !== 1) {
                sendJson(res, 400, { ok: false, error: `invalid entry "${item.id}": ${matches.length === 0 ? "not found" : "ambiguous"}` });
                return;
              }
              const entry = matches[0];
              if (!entry.disabled === item.enabled) continue; // 已处于目标状态
              changes.push({ entry, want: item.enabled });
            }
            if (changes.length === 0) {
              sendJson(res, 200, { ok: true, value: { changed: 0, failed: [], persisted: true } });
              return;
            }

            // 一个批量 = 一个事务：一次备份（undo 一步全回）。
            let persisted = false;
            let persistError;
            let live = { ok: false };
            const failures = [];
            let okChanges = [];
            if (patchPath !== undefined && backupsDir !== undefined) {
              try {
                const backupName = await writeBackup(patchPath, backupsDir);
                // 先纯文本预计算每条目标内容，失败的条目剔除（如 !!js 表达式）。
                let content = await readFile(patchPath, "utf8");
                for (const change of changes) {
                  try {
                    content = applyPatchEdit(content, change.entry.options.id, !change.want);
                    okChanges.push(change);
                  } catch (error) {
                    failures.push({ id: change.entry.id, error: error instanceof Error ? error.message : String(error) });
                  }
                }
                // 再动内存：逐条容错（如服务名冲突的条目，loader 自回滚该条）。
                const applied = [];
                for (const change of okChanges) {
                  try {
                    await change.entry.update({ disabled: !change.want });
                    applied.push(change);
                  } catch (error) {
                    failures.push({ id: change.entry.id, error: error instanceof Error ? error.message : String(error) });
                  }
                }
                okChanges = applied;
                // 文件只写入成功生效的条目，一次性落盘。
                if (okChanges.length > 0) {
                  content = await readFile(patchPath, "utf8");
                  for (const change of okChanges) {
                    content = applyPatchEdit(content, change.entry.options.id, !change.want);
                  }
                  // 直接写原文件（tmp+rename 的原子替换不会触发 DSH 的 patch watcher，已实证）。
                  await writeFile(patchPath, content, "utf8");
                  scrubIds = new Set([...scrubIds, ...okChanges.map((change) => change.entry.options.id)]);
                  operationLog.push({ backup: backupName, changes: okChanges.map((change) => ({ id: change.entry.id, prevEnabled: !change.want })) });
                  live = await recompose();
                }
                persisted = true;
              } catch (error) {
                persistError = error instanceof Error ? error.message : String(error);
              }
            } else {
              persistError = "patch file not found";
            }

            sendJson(res, 200, {
              ok: true,
              value: {
                changed: okChanges.length,
                failed: failures,
                persisted,
                live: live.ok,
                ...(persistError !== undefined ? { persistError } : {}),
              },
            });
          } finally {
            inFlight = false;
          }
          return;
        }

        if (pathname === "/plugin-switch/undo") {
          if (req.method !== "POST") {
            sendJson(res, 405, { ok: false, error: "method not allowed" });
            return;
          }
          if (inFlight) {
            sendJson(res, 409, { ok: false, error: "busy: another operation is in progress" });
            return;
          }
          if (patchPath === undefined || backupsDir === undefined) {
            sendJson(res, 500, { ok: false, error: "patch file not found" });
            return;
          }
          inFlight = true;
          try {
            const op = operationLog.pop();
            if (op !== undefined) {
              // 操作级撤销：恢复对应备份文件 → 主动重放 → 内存反向兜底。
              let restored;
              try {
                await restoreBackupContent(patchPath, backupsDir, op.backup);
                restored = op.backup;
              } catch {
                // 备份已被轮换清理 → 退回最新备份（纯文件语义）。
                restored = await restoreLatestBackup(patchPath, backupsDir);
              }
              const live = await recompose();
              let reverted = 0;
              for (const change of op.changes) {
                const matches = findMatches(ctx, change.id);
                if (matches.length !== 1) continue;
                try {
                  await matches[0].update({ disabled: !change.prevEnabled });
                  reverted += 1;
                } catch {
                  // 个别条目反向失败（如服务冲突）不影响整体撤销。
                }
              }
              sendJson(res, 200, { ok: true, value: { restored, reverted, total: op.changes.length, live: live.ok } });
              return;
            }
            // 无操作日志（如重启后）→ 纯文件恢复 + 主动重放。
            const restored = await restoreLatestBackup(patchPath, backupsDir);
            const live = await recompose();
            sendJson(res, 200, { ok: true, value: { restored, reverted: 0, total: 0, live: live.ok } });
          } catch (error) {
            sendJson(res, 500, { ok: false, error: error instanceof Error ? error.message : String(error) });
          } finally {
            inFlight = false;
          }
          return;
        }

        if (pathname === "/plugin-switch/toggle") {
          if (req.method !== "POST") {
            sendJson(res, 405, { ok: false, error: "method not allowed" });
            return;
          }
          if (inFlight) {
            sendJson(res, 409, { ok: false, error: "busy: another operation is in progress" });
            return;
          }
          const body = await readBody(req);
          let parsed;
          try {
            parsed = JSON.parse(body);
          } catch {
            sendJson(res, 400, { ok: false, error: "invalid JSON body" });
            return;
          }
          const { id, enabled } = parsed ?? {};
          if (typeof id !== "string" || id.trim() === "" || typeof enabled !== "boolean") {
            sendJson(res, 400, { ok: false, error: "body must be {id: string, enabled: boolean}" });
            return;
          }

          inFlight = true;
          try {
            const matches = findMatches(ctx, id);
            if (matches.length === 0) {
              sendJson(res, 404, { ok: false, error: `plugin entry not found: ${id}` });
              return;
            }
            if (matches.length > 1) {
              sendJson(res, 400, {
                ok: false,
                error: `ambiguous id "${id}": ${matches.map((entry) => entry.id).join(", ")}`,
              });
              return;
            }
            const entry = matches[0];
            const before = !entry.disabled;
            if (before === enabled) {
              sendJson(res, 200, {
                ok: true,
                value: { entryId: entry.id, enabled, before, after: before, persisted: true, changed: false },
              });
              return;
            }

            // 1) 内存热开关（立即生效，不写文件）。
            await entry.update({ disabled: !enabled });

            // 2) 持久化到补丁层（写前自动备份）。
            let persisted = false;
            let persistError;
            let live = { ok: false };
            if (patchPath !== undefined && backupsDir !== undefined) {
              try {
                const backupName = await writeBackup(patchPath, backupsDir);
                const content = await readFile(patchPath, "utf8");
                const next = applyPatchEdit(content, entry.options.id, !enabled);
                // 直接写原文件（tmp+rename 的原子替换不会触发 DSH 的 patch watcher，已实证）。
                await writeFile(patchPath, next, "utf8");
                persisted = true;
                scrubIds = new Set([...scrubIds, entry.options.id]);
                operationLog.push({ backup: backupName, changes: [{ id: entry.id, prevEnabled: before }] });
                live = await recompose();
              } catch (error) {
                persistError = error instanceof Error ? error.message : String(error);
              }
            } else {
              persistError = "patch file not found";
            }

            const after = !entry.disabled;
            sendJson(res, 200, {
              ok: true,
              value: {
                entryId: entry.id,
                enabled,
                before,
                after,
                persisted,
                live: live.ok,
                ...(persistError !== undefined ? { persistError } : {}),
              },
            });
          } finally {
            inFlight = false;
          }
          return;
        }

        sendJson(res, 404, { ok: false, error: "not found" });
      } catch (error) {
        sendJson(res, 500, {
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    },
  };

  ctx.effect(() => ctx.webServer.register(route), "plugin-switch: http route");
}

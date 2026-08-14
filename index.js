// dsh-profile-plugin-switch — host half (stage 3 draft).
// GUI 插件开关：GET /plugin-switch/list + POST /plugin-switch/toggle。
//
// 热开关原理：
//   1) 内存：entry.update({disabled}) 立即 dispose/start 对应 fiber（loader 原生热开关）。
//   2) 持久化：文本级改写 cordis.patch.yml（保留注释），由 DSH 的 patch watcher
//      (watchUserPatches) 通过 HMR 事务性重放；不使用 EntryTree.update 等会把补丁
//      行烘焙进基础配置文件的路径。
import { existsSync } from "node:fs";
import { readFile, rename, writeFile } from "node:fs/promises";
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

function listEntries(ctx) {
  const entries = [];
  for (const entry of ctx.loader.entries()) {
    if (entry.options.group) continue;
    entries.push({
      entryId: entry.id,
      moduleName: entry.options.name,
      enabled: !entry.disabled,
      fiberPhase: fiberPhaseOf(entry),
    });
  }
  return entries;
}

function findEntry(ctx, id) {
  const exact = [];
  const suffix = [];
  for (const entry of ctx.loader.entries()) {
    if (entry.options.group) continue;
    if (entry.id === id || entry.options.id === id) exact.push(entry);
    else if (entry.id.endsWith(":" + id)) suffix.push(entry);
  }
  if (exact.length === 1) return exact[0];
  if (exact.length > 1) return undefined; // 歧义交给调用方用 matches 报告
  if (suffix.length === 1) return suffix[0];
  return undefined;
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

// ── 插件主体 ──────────────────────────────────────────────────────────────
export function apply(ctx) {
  const patchPath = resolvePatchPath();
  if (patchPath === undefined) {
    ctx.logger?.error?.(
      "plugin-switch: cordis.patch.yml not found at either candidate location; toggle will fail",
    );
  }

  let inFlight = false;

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
          sendJson(res, 200, { ok: true, value: { entries: listEntries(ctx) } });
          return;
        }

        if (pathname === "/plugin-switch/toggle") {
          if (req.method !== "POST") {
            sendJson(res, 405, { ok: false, error: "method not allowed" });
            return;
          }
          if (inFlight) {
            sendJson(res, 409, { ok: false, error: "busy: another toggle is in progress" });
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

            // 2) 持久化到补丁层（HMR 重放保持状态一致）。
            let persisted = false;
            let persistError;
            if (patchPath !== undefined) {
              try {
                const content = await readFile(patchPath, "utf8");
                const next = applyPatchEdit(content, entry.options.id, !enabled);
                await writeFile(patchPath + ".tmp", next, "utf8");
                await rename(patchPath + ".tmp", patchPath);
                persisted = true;
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

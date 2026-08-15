#!/usr/bin/env node
// dsh-plugin-fix — CLI 恢复工具：GUI 不可用时直接操作 patch 文件。
// 用法（在本仓库根目录）：
//   node scripts/dsh-plugin-fix.mjs list                      列出补丁层条目
//   node scripts/dsh-plugin-fix.mjs enable  <id>              热启用（写入 patch 文件）
//   node scripts/dsh-plugin-fix.mjs disable <id>              热停用
//   node scripts/dsh-plugin-fix.mjs undo                      恢复最近一次备份
//   node scripts/dsh-plugin-fix.mjs backups                   列出备份
import { readFile, writeFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { homedir } from "node:os";
import { createRequire } from "node:module";
import { applyPatchEdit, isBackupFile, restoreLatestBackup } from "../index.js";

const require = createRequire(import.meta.url);
const yaml = require("js-yaml");

function patchPath() {
  const home = process.env.DSH_HOME || join(homedir(), ".dsh");
  const candidate = join(home, "profiles", "web", "cordis.patch.yml");
  if (!existsSync(candidate)) {
    throw new Error(`patch file not found: ${candidate} (set DSH_HOME if your Harness home differs)`);
  }
  return candidate;
}

function backupsDirOf(patch) {
  return join(dirname(patch), "backups");
}

async function atomicWrite(file, content) {
  // 直接写原文件（tmp+rename 的原子替换不会触发 DSH 的 patch watcher，已实证）。
  await writeFile(file, content, "utf8");
}

async function main() {
  const [command, ...args] = process.argv.slice(2);
  const patch = patchPath();

  if (command === "list") {
    const data = yaml.load(await readFile(patch, "utf8")) ?? [];
    const rows = [];
    const walk = (entries) => {
      for (const entry of entries ?? []) {
        if (!entry || typeof entry !== "object") continue;
        if (Array.isArray(entry.insert)) walk(entry.insert);
        if (typeof entry.id === "string") rows.push(entry);
      }
    };
    walk(data);
    if (rows.length === 0) console.log("(no entries in patch layer)");
    for (const row of rows) {
      console.log(`- id: ${row.id}  disabled: ${row.disabled === true ? "true" : "false"}  name: ${row.name ?? "(patch-only override)"}`);
    }
    return;
  }

  if (command === "enable" || command === "disable") {
    const id = args[0];
    if (!id) throw new Error(`usage: dsh-plugin-fix ${command} <id>`);
    const content = await readFile(patch, "utf8");
    const next = applyPatchEdit(content, id, command === "disable");
    await atomicWrite(patch, next);
    console.log(`${id}: disabled -> ${command === "disable" ? "true" : "false"} (written; the running Harness hot-replays it)`);
    return;
  }

  if (command === "undo") {
    const restored = await restoreLatestBackup(patch, backupsDirOf(patch));
    console.log(`restored ${restored} (the running Harness hot-replays it)`);
    return;
  }

  if (command === "backups") {
    let files = [];
    try {
      files = (await readdir(backupsDirOf(patch))).filter(isBackupFile).sort();
    } catch {
      files = [];
    }
    if (files.length === 0) console.log("(no backups)");
    for (const file of files) console.log(file);
    return;
  }

  throw new Error(`unknown command "${command}". Usage: node scripts/dsh-plugin-fix.mjs list|enable <id>|disable <id>|undo|backups`);
}

main().catch((error) => {
  console.error(`dsh-plugin-fix: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});

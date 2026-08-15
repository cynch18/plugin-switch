// plugin-switch test.mjs — unit tests for applyPatchEdit and backups.
// Run: npm test  (requires `npm install` once, for js-yaml)
import { strict as assert } from "node:assert";
import { createRequire } from "node:module";
import { mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { applyPatchEdit, backupFileName, isBackupFile, patchHasRow, pruneBackups } from "./index.js";

const require = createRequire(import.meta.url);
const yaml = require("js-yaml");

function parse(text) {
  return yaml.load(text);
}

let passed = 0;
function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`FAIL - ${name}`);
    console.error(error);
    process.exitCode = 1;
  }
}

const HEADER = "# user patch layer\n# keep comments\n";

// P0: append a top-level override row when the id is absent (the main path).
test("append top-level override when id absent", () => {
  const input = `${HEADER}- insert:\n    - id: auto-open-browser\n      name: ./auto-open-browser.mjs\n      disabled: false\n`;
  const out = applyPatchEdit(input, "web-app", true);
  assert.match(out, /- id: web-app\n  disabled: true/);
  assert.ok(out.includes("# keep comments"), "comments preserved");
  const data = parse(out);
  assert.ok(Array.isArray(data));
  const row = data.find((p) => p.id === "web-app");
  assert.ok(row, "appended row parses");
  assert.strictEqual(row.disabled, true);
});

// P0: re-applying the same value is idempotent (no duplicate rows).
test("append is idempotent", () => {
  const input = "- insert: []\n";
  const once = applyPatchEdit(input, "web-app", true);
  const twice = applyPatchEdit(once, "web-app", true);
  assert.strictEqual(twice, once);
  const flipped = applyPatchEdit(once, "web-app", false);
  assert.strictEqual((flipped.match(/- id: web-app/g) ?? []).length, 1, "no duplicate rows");
  assert.match(flipped, /disabled: false/);
  parse(flipped);
});

// Replace the value in a top-level row (no indent).
test("replace value in top-level row", () => {
  const input = `${HEADER}- id: plugin-inventory\n  disabled: true\n`;
  const out = applyPatchEdit(input, "plugin-inventory", false);
  assert.match(out, /- id: plugin-inventory\n  disabled: false/);
  assert.ok(!out.includes("disabled: true"));
  assert.strictEqual(out.split("\n").length, input.split("\n").length);
  parse(out);
});

// Replace the value in a nested insert row (4-space indent).
test("replace value in nested insert row", () => {
  const input = `${HEADER}- insert:\n    - id: auto-open-browser\n      name: ./auto-open-browser.mjs\n      disabled: true\n`;
  const out = applyPatchEdit(input, "auto-open-browser", false);
  assert.match(out, /- id: auto-open-browser\n      name: .+\n      disabled: false/);
  parse(out);
});

// Insert disabled into a top-level row (2-space indent) when absent.
test("insert disabled into top-level row", () => {
  const input = `${HEADER}- id: plugin-inventory\n  name: '@deepseek-ai/dsh-host-plugin-inventory'\n`;
  const out = applyPatchEdit(input, "plugin-inventory", true);
  assert.match(out, /- id: plugin-inventory\n  name: '[^']*'\n  disabled: true/);
  parse(out);
});

// Insert disabled into a nested row (6-space indent) without crossing the
// following sibling.
test("insert disabled into nested row with a following sibling", () => {
  const input = `${HEADER}- insert:\n    - id: first\n      name: ./first.mjs\n    - id: second\n      name: ./second.mjs\n`;
  const out = applyPatchEdit(input, "first", true);
  assert.match(out, /- id: first\n      name: .\/first\.mjs\n      disabled: true\n    - id: second/);
  const data = parse(out);
  const row = data[0].insert.find((p) => p.id === "first");
  assert.strictEqual(row.disabled, true);
  const second = data[0].insert.find((p) => p.id === "second");
  assert.strictEqual(second.disabled, undefined);
});

// A !!js disabled expression is refused (no destructive edit).
test("refuse !!js disabled expression", () => {
  const input = `${HEADER}- id: web-app\n  disabled: !!js someExpr\n`;
  let thrown;
  try {
    applyPatchEdit(input, "web-app", true);
  } catch (error) {
    thrown = error;
  }
  assert.ok(thrown !== undefined, "throws");
  assert.match(String(thrown.message), /JS expression/);
});

// Comments (header and inline) survive the edit.
test("comments preserved", () => {
  const input = "# header\n# another line\n- insert: # inline\n    # inside entry\n    - id: auto-open-browser\n      name: ./auto-open-browser.mjs\n";
  const out = applyPatchEdit(input, "auto-open-browser", false);
  assert.ok(out.includes("# header") && out.includes("# another line") && out.includes("# inline") && out.includes("# inside entry"));
  parse(out);
});

// Regex-special characters in the id are escaped for matching.
test("regex-special characters in id", () => {
  const input = `${HEADER}- insert:\n    - id: my.plugin+switch\n      name: ./x.mjs\n      disabled: true\n`;
  const out = applyPatchEdit(input, "my.plugin+switch", false);
  assert.match(out, /- id: my\.plugin\+switch\n      name: .+\n      disabled: false/);
  parse(out);
});

// A shorter id that prefixes another row must not match the longer row.
test("no false prefix match", () => {
  const input = `${HEADER}- id: web\n  disabled: true\n- id: web-app\n  disabled: true\n`;
  const out = applyPatchEdit(input, "web", false);
  assert.match(out, /- id: web\n  disabled: false/);
  assert.match(out, /- id: web-app\n  disabled: true/, "web-app untouched");
  parse(out);
});

console.log(`\n${passed} passed`);

// ── 备份（P2.1）──
test("backup file naming and recognition", () => {
  const name = backupFileName(new Date(2026, 0, 2, 3, 4, 5, 6));
  assert.strictEqual(name, "cordis.patch.20260102-030405-006.yml");
  assert.ok(isBackupFile(name));
  assert.ok(!isBackupFile("cordis.patch.yml"));
  assert.ok(!isBackupFile("other.txt"));
});

test("pruneBackups keeps the newest 20", async () => {
  const dir = await mkdtemp(join(tmpdir(), "psw-test-"));
  try {
    for (let i = 0; i < 25; i++) {
      const name = `cordis.patch.20260101-0000${String(i).padStart(2, "0")}-000.yml`;
      await writeFile(join(dir, name), "x");
    }
    const removed = await pruneBackups(dir, 20);
    assert.strictEqual(removed.length, 5, "removes 5 oldest");
    const remaining = (await readdir(dir)).filter(isBackupFile);
    assert.strictEqual(remaining.length, 20);
    assert.ok(remaining.includes("cordis.patch.20260101-000020-000.yml"), "newest kept");
    assert.ok(!remaining.includes("cordis.patch.20260101-000000-000.yml"), "oldest dropped");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

// ── 补丁来源判定（P3.3）──
test("patchHasRow detects top-level and nested rows", () => {
  assert.ok(patchHasRow("- id: x\n", "x"));
  assert.ok(patchHasRow("- insert:\n    - id: y\n", "y"));
  assert.ok(!patchHasRow("- id: xy\n", "x"), "no prefix false match");
  assert.ok(patchHasRow("- id: my.plugin\n", "my.plugin"), "regex-special id");
});

if (process.exitCode) {
  console.error("some tests failed");
}

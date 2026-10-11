/**
 * Exercise documented-command guardrails as a CLI in temporary Git repositories.
 * Assert diagnostics, scope, allowed commands, and CLI exit codes; no command
 * found inside a document is executed. Run with `pnpm verify` or Node's tests.
 */
import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { test } from "node:test";
import { gitRepository, runCommand } from "./test-support.ts";
import type { TestContext } from "node:test";

const script = resolve(import.meta.dirname, "check-doc-commands.ts");
const fixture = (context: TestContext, files: Record<string, string>) =>
  gitRepository(context, {
    "package.json": JSON.stringify({
      scripts: { verify: "node tools/verify.ts", qa: "node tools/qa.ts" },
    }),
    ...files,
  });
const run = (root: string) => runCommand(process.execPath, [script, root]);

test("missing pnpm scripts report every invocation with file, line and command", (context) => {
  const { root } = fixture(context, {
    "AGENTS.md":
      "# Rules\n`pnpm lint`\n`pnpm run removed` and `pnpm -s gone`\n",
  });
  const result = run(root);
  assert.equal(result.status, 1);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, /^出错：AGENTS\.md:2 doc-command .+pnpm lint$/m);
  assert.match(
    result.stderr,
    /^出错：AGENTS\.md:3 doc-command .+pnpm run removed$/m,
  );
  assert.match(
    result.stderr,
    /^出错：AGENTS\.md:3 doc-command .+pnpm -s gone$/m,
  );
  assert.equal(result.stderr.trim().split("\n").length, 3);
});

test("scripts, built-ins and placeholders pass in inline and fenced code", (context) => {
  const { root } = fixture(context, {
    "README.md": [
      "`pnpm verify` `pnpm run qa --help` `pnpm -s verify` `pnpm --silent run qa`",
      "`pnpm install --frozen-lockfile` `pnpm exec eslint .` `pnpm dlx tool`",
      "`pnpm add package` `pnpm i` `pnpm help` `pnpm --version`",
      "`pnpm <name>` `pnpm run <name>` `pnpm qa <subcommand> --help`",
      '`node <path>/script.ts` `node /absolute/external.ts` `node "$ROOT/script.ts"`',
      "`node --test` `pnpm 'verify'` ``pnpm qa``",
      "```bash",
      "pnpm install",
      "pnpm verify",
      "pnpm run <name>",
      "```",
    ].join("\n"),
  });
  const result = run(root);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, "");
});

test("explicit run requires a project script even when the name is a built-in", (context) => {
  const { root } = fixture(context, {
    "README.md": "`pnpm run install` `pnpm -s run exec`",
  });
  const result = run(root);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /pnpm run install/);
  assert.match(result.stderr, /pnpm -s run exec/);
});

test("fenced commands report their actual lines and placeholders only skip their invocation", (context) => {
  const { root } = fixture(context, {
    "docs/workflow/README.md": [
      "# Workflow",
      "```bash",
      "pnpm <name>",
      "  pnpm -s gone",
      "pnpm verify && pnpm run removed",
      "```",
    ].join("\n"),
  });
  const result = run(root);
  assert.equal(result.status, 1);
  assert.match(
    result.stderr,
    /^出错：docs\/workflow\/README\.md:4 doc-command .+pnpm -s gone$/m,
  );
  assert.match(
    result.stderr,
    /^出错：docs\/workflow\/README\.md:5 doc-command .+pnpm run removed$/m,
  );
  assert.equal(result.stderr.trim().split("\n").length, 2);
});

test("node checks root-relative files including quoted paths and rejects directories", (context) => {
  const { root } = fixture(context, {
    "tools/exists.ts": "export {};",
    "tools/with space.ts": "export {};",
    "docs/roles/engineering.md": [
      "`node tools/exists.ts --help` `node './tools/exists.ts'` `node \"tools/with space.ts\"`",
      "`node tools/missing.ts`",
      "`node tools/`",
      "`node tools/exists.ts/missing.ts`",
    ].join("\n"),
  });
  const result = run(root);
  assert.equal(result.status, 1);
  assert.match(
    result.stderr,
    /^出错：docs\/roles\/engineering\.md:2 doc-command .+node tools\/missing\.ts$/m,
  );
  assert.match(
    result.stderr,
    /^出错：docs\/roles\/engineering\.md:3 doc-command .+node tools\/$/m,
  );
  assert.match(
    result.stderr,
    /^出错：docs\/roles\/engineering\.md:4 doc-command .+node tools\/exists\.ts\/missing\.ts$/m,
  );
  assert.equal(result.stderr.trim().split("\n").length, 3);
});

test("rule scope includes new docs and Git-owned skill Markdown, irrespective of skill name", (context) => {
  const paths = [
    "AGENTS.md",
    "CLAUDE.md",
    "README.md",
    "docs/README.md",
    "docs/roadmap.md",
    "docs/roles/design.md",
    "docs/workflow/new.md",
    "docs/agents/issue-tracker.md",
    "docs/new-rule.md",
    ".claude/skills/studio-tickets/SKILL.md",
    ".claude/skills/run-spec/report.md",
  ];
  const { root } = fixture(
    context,
    Object.fromEntries(paths.map((path) => [path, "`pnpm missing`\n"])),
  );
  const result = run(root);
  assert.equal(result.status, 1);
  assert.equal(result.stderr.trim().split("\n").length, paths.length);
  for (const path of paths)
    assert.ok(result.stderr.includes(`${path}:1 doc-command`), result.stderr);
});

test("historical, reference, third-party and ignored untracked documents are excluded", (context) => {
  const { root, git } = fixture(context, {
    ".gitignore":
      "references/\nout/\n.agents/\n.claude/skills/*\n!.claude/skills/studio-tickets/\ndocs/ignored.md\n",
    "AGENTS.md": "`pnpm verify`",
    "docs/research/old.md": "`pnpm lint` `node tools/removed.ts`",
    "docs/reports/old.md": "`pnpm lint` `node tools/removed.ts`",
    "references/rules.md": "`pnpm missing`",
    "out/rules.md": "`pnpm missing`",
    ".agents/skills/custom/SKILL.md": "`pnpm missing`",
    ".claude/skills/third-party/SKILL.md": "`pnpm missing`",
    "docs/ignored.md": "`pnpm missing`",
  });
  git([
    "add",
    "--",
    "AGENTS.md",
    "docs/research/old.md",
    "docs/reports/old.md",
  ]);
  const result = run(root);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, "");
});

test("tracked rules remain checked even if ignored, and deleted tracked files are skipped", (context) => {
  const { root, git } = fixture(context, {
    ".gitignore": "docs/tracked.md\n",
    "docs/tracked.md": "`pnpm missing`",
    "docs/deleted.md": "`pnpm removed`",
  });
  git(["add", "--force", "--", "docs/tracked.md", "docs/deleted.md"]);
  rmSync(join(root, "docs/deleted.md"));
  const result = run(root);
  assert.equal(result.status, 1);
  assert.match(
    result.stderr,
    /^出错：docs\/tracked\.md:1 doc-command .+pnpm missing\n$/,
  );
});

test("help succeeds and invalid arguments or missing manifests exit with runtime code 2", (context) => {
  const help = runCommand(process.execPath, [script, "--help"]);
  assert.equal(help.status, 0);
  assert.match(help.stdout, /用法：/);
  assert.equal(help.stderr, "");
  for (const args of [["--unknown"], ["one", "two"]]) {
    const result = runCommand(process.execPath, [script, ...args]);
    assert.equal(result.status, 2);
    assert.match(result.stderr, /^出错：/);
  }
  const { root } = gitRepository(context);
  const missing = run(root);
  assert.equal(missing.status, 2);
  assert.match(missing.stderr, /^出错：文件或程序不存在：/);
});

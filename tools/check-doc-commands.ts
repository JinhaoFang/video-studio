/**
 * Run `node tools/check-doc-commands.ts [repository-root]` to check documented
 * pnpm scripts/built-ins and literal repository-relative node entry files.
 * Scan backtick spans (including fenced commands) in Git-visible root rules,
 * docs Markdown except research/reports, and repository-owned skill Markdown.
 * Git ignore rules define skill ownership, so renaming a tracked skill works.
 * Skip angle-bracket placeholders and dynamic/absolute node paths. Commands
 * are inspected as text, never executed; pnpm built-ins mirror CLI help.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";
import { reportError, usageError } from "./cli.ts";

const builtins = new Set(
  `access add adduser approve-builds audit bin bugs cache cat-file cat-index change
  ci clean clean-install completion config create dedupe deploy deprecate dislink
  dist-tag dist-tags dlx docs doctor edit env exec fetch find find-hash get help
  home i ic ignored-builds import info init install install-clean install-test
  issues it la lane licenses licences link list ll ln login logout ls m multi
  outdated owner owners pack pack-app patch patch-commit patch-remove peers ping
  pipeline pkg prefix profile prune publish purge rb rebuild recursive remove
  repo restart rm root rt run run-script runtime s sbom search se self-update
  server set set-script setup shim show ss stage star stars start stop store
  tasks team test t token tst un undeprecate uninstall uni unlink unpublish unstar
  up update upgrade v version view whoami with xmas`.split(/\s+/),
);

const isRuleDocument = (path: string): boolean =>
  ["AGENTS.md", "CLAUDE.md", "README.md"].includes(path) ||
  (path.endsWith(".md") &&
    ((path.startsWith("docs/") &&
      !/^docs\/(?:research|reports)\//.test(path)) ||
      /^\.claude\/skills\/[^/]+\//.test(path)));

const isFile = (path: string): boolean => {
  try {
    return statSync(path).isFile();
  } catch (error) {
    if (
      ["ENOENT", "ENOTDIR"].includes(
        (error as NodeJS.ErrnoException).code ?? "",
      )
    )
      return false;
    throw error;
  }
};

const main = (): void => {
  const usage = "node tools/check-doc-commands.ts [仓库根目录]";
  const [rootArg, ...extra] = process.argv.slice(2);
  if (rootArg === "--help" && extra.length === 0) {
    console.log(`用法：${usage}\n检查规则文档里的 pnpm 命令和 node 脚本路径。`);
    return;
  }
  if (extra.length || rootArg?.startsWith("-")) {
    throw usageError("最多提供一个仓库根目录。", usage);
  }
  const root = resolve(rootArg ?? process.cwd());
  const manifest = JSON.parse(
    readFileSync(resolve(root, "package.json"), "utf8"),
  );
  const scripts = new Set(Object.keys(manifest.scripts ?? {}));
  const paths = execFileSync(
    "git",
    ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
    { cwd: root, encoding: "utf8", stdio: "pipe" },
  ).split("\0");
  let failures = 0;

  for (const path of [...new Set(paths)].filter(isRuleDocument).sort()) {
    const absolute = resolve(root, path);
    if (!isFile(absolute)) continue;
    const text = readFileSync(absolute, "utf8");
    for (const span of text.matchAll(/(?<!`)(`+)(?!`)([\s\S]*?)\1(?!`)/g)) {
      const content = span[2];
      for (const invocation of content.matchAll(
        /(?:^|[\r\n]|&&|\|\||;)\s*(pnpm|node)\s+([^\r\n;&|]*)/g,
      )) {
        const command = `${invocation[1]} ${invocation[2].trim()}`;
        if (/<[^>\r\n]+>/.test(command)) continue;
        const tokens = invocation[2].match(/"[^"]*"|'[^']*'|[^\s]+/g) ?? [];
        let reason: string | undefined;
        if (invocation[1] === "pnpm") {
          while (
            [
              "-s",
              "--silent",
              "-w",
              "--workspace-root",
              "-r",
              "--recursive",
            ].includes(tokens[0] ?? "")
          ) {
            tokens.shift();
          }
          const explicitRun = ["run", "run-script"].includes(tokens[0] ?? "");
          if (explicitRun) tokens.shift();
          const name = tokens[0]?.replace(/^(?:"(.*)"|'(.*)')$/, "$1$2");
          if (
            name &&
            !name.startsWith("-") &&
            !scripts.has(name) &&
            (explicitRun || !builtins.has(name))
          ) {
            reason = `项目脚本${explicitRun ? "" : "或 pnpm 内置命令"}不存在：${command}`;
          }
        } else {
          const file = tokens[0]?.replace(/^(?:"(.*)"|'(.*)')$/, "$1$2");
          if (
            file &&
            !file.startsWith("-") &&
            !isAbsolute(file) &&
            !/[$`~*?{}]/.test(file) &&
            !isFile(resolve(root, file))
          ) {
            reason = `node 脚本文件不存在：${command}`;
          }
        }
        if (reason) {
          const offset =
            span.index +
            span[1].length +
            invocation.index +
            invocation[0].indexOf(invocation[1]);
          const line = text.slice(0, offset).split("\n").length;
          console.error(`出错：${path}:${line} doc-command ${reason}`);
          failures += 1;
        }
      }
    }
  }
  if (failures) process.exitCode = 1;
};

try {
  main();
} catch (error) {
  reportError(error);
}

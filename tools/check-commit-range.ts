/**
 * Check final messages in <base>..HEAD, excluding merge commits through Git.
 * Run `pnpm check:commits <base> <source-branch>` from the repository to reproduce
 * CI locally. The branch is mandatory, including when HEAD is detached in CI.
 * Reuse checkCommitMessage with stripComments=false and report every violation.
 */
import { execFileSync } from "node:child_process";
import { checkCommitMessage } from "./check-commit-message.ts";

const git = (args: string[]): string =>
  execFileSync("git", args, { encoding: "utf8", stdio: "pipe" });

try {
  const [base, branch, ...extra] = process.argv.slice(2);
  if (!base || !branch || extra.length > 0) {
    throw new Error(
      "用法：pnpm check:commits <起点> <来源分支名>；例如 pnpm check:commits origin/main spec/1-guardrails。",
    );
  }
  const start = git([
    "rev-parse",
    "--verify",
    "--end-of-options",
    `${base}^{commit}`,
  ]).trim();
  const commits = git(["rev-list", "--no-merges", `${start}..HEAD`])
    .trim()
    .split("\n")
    .filter(Boolean);
  let failed = 0;
  for (const commit of commits) {
    const message = git(["show", "--no-patch", "--format=%B", commit]);
    const violations = checkCommitMessage(message, branch, {
      stripComments: false,
    });
    const label = `${commit} ${message.split("\n")[0]}`;
    if (violations.length === 0) {
      console.log(`通过：${label}`);
      continue;
    }
    failed += 1;
    console.error(`未通过：${label}`);
    for (const violation of violations) {
      console.error(`- 规则 ${violation.rule}：${violation.message}`);
    }
  }
  const summary = `${commits.length} 个非合并提交（${base}..HEAD，分支 ${branch}）`;
  if (failed > 0) {
    console.error(`提交信息检查未通过：${failed}/${summary}。`);
    process.exitCode = 1;
  } else {
    console.log(`提交信息检查通过：${summary}。`);
  }
} catch (error) {
  console.error(
    `无法检查提交范围：${error instanceof Error ? error.message : String(error)}`,
  );
  process.exitCode = 1;
}

/**
 * Adapt Git's commit-msg file argument to the shared pure message checker.
 * Run as `node tools/commit-msg.ts <message-file>`; print all failures in Chinese.
 * Git's empty branch name in detached HEAD is passed through as a non-spec branch.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { checkCommitMessage } from "./check-commit-message.ts";

try {
  const path = process.argv[2];
  if (!path) throw new Error("缺少提交信息文件参数。");
  const branch = execFileSync("git", ["branch", "--show-current"], {
    encoding: "utf8",
  }).trim();
  const violations = checkCommitMessage(readFileSync(path, "utf8"), branch);
  if (violations.length > 0) {
    console.error("提交信息检查未通过：");
    for (const violation of violations) {
      console.error(`- 规则 ${violation.rule}：${violation.message}`);
    }
    process.exitCode = 1;
  }
} catch (error) {
  console.error(
    `无法检查提交信息：${error instanceof Error ? error.message : String(error)}`,
  );
  process.exitCode = 1;
}

/**
 * Shared verification input: tracked and non-ignored untracked code files.
 * Import listCodeFiles(root) from later guardrails; returned paths are relative
 * to root, sorted, unique, and limited to existing first-party code files.
 */
import { execFileSync } from "node:child_process";
import { statSync } from "node:fs";
import { join } from "node:path";

export const listCodeFiles = (root: string = process.cwd()): string[] => {
  const paths = execFileSync(
    "git",
    ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
    { cwd: root, encoding: "utf8" },
  ).split("\0");

  return [...new Set(paths)]
    .filter((path) => /\.(?:ts|tsx|js|mjs|cjs)$/.test(path))
    .filter(
      (path) =>
        !/(?:^|\/)(?:references|node_modules|out|dist|build|\.codex-runs|\.agents)(?:\/|$)/.test(
          path,
        ),
    )
    .filter(
      (path) =>
        !path.startsWith(".claude/") ||
        /^\.claude\/skills\/studio-[^/]+\//.test(path),
    )
    .filter((path) => {
      try {
        return statSync(join(root, path)).isFile();
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
          return false;
        }
        throw error;
      }
    })
    .sort();
};

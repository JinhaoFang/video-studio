/**
 * Install the versioned commit-msg hook via package.json's prepare lifecycle.
 * Run with `node tools/install-hooks.ts`; no verification runs before commits.
 */
import { execFileSync } from "node:child_process";

execFileSync("git", ["config", "--local", "core.hooksPath", ".githooks"], {
  cwd: new URL("..", import.meta.url),
  stdio: "inherit",
});

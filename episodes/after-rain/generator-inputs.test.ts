/** 对照事件汇总和混音入口运行时实际加载的仓库源码，验证生成清单足以使旧事件表和混音失效。 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { relative, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

test("事件表和混音的全部运行时源码都登记在生成清单中", async () => {
  const root = resolve(import.meta.dirname, "../..");
  const manifest = JSON.parse(readFileSync(new URL("./data/generated.json", import.meta.url), "utf8"));
  const inputs = new Set(manifest.inputs.map(({ path }: { path: string }) => path));
  const loaded = new Set<string>();
  const hook = registerHooks({
    load(url, context, nextLoad) {
      if (url.startsWith("file:")) loaded.add(relative(root, fileURLToPath(url)));
      return nextLoad(url, context);
    },
  });
  try {
    await import("./shots/timings.ts");
    await import("./sound/render.ts");
  } finally {
    hook.deregister();
  }
  assert.ok(loaded.has("episodes/after-rain/flock.ts"));
  assert.ok(loaded.has("episodes/after-rain/title/timing.ts"));
  assert.deepEqual([...loaded].filter((path) => !inputs.has(path)), []);
});

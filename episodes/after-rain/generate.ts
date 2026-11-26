/**
 * 《雨后》正片底图烘焙生成器：运行 `node episodes/after-rain/generate.ts [--force] [--help]`。
 * 使用最多 4 个并发工作线程烘焙全片 24 张水粉底图（10 张共用院子五层雨/夕光底图 + 14 张正片新机位与近景虚化底图）到 `public/episodes/after-rain/`，
 * 并将源码输入与产物 SHA-256 哈希写入 `episodes/after-rain/data/generated.json`；命中缓存时跳过重绘直接退出。
 * 退出码：0 通过，2 参数错误或运行出错。待定事项：全片装配（#185）与声音（#193）落地后并入事件表与混音登记。
 */
import { mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { Worker, isMainThread, parentPort, workerData } from "node:worker_threads";
import { bakePlate } from "../../src/kit/generation/bake.ts";
import { generation } from "../../src/kit/generation/manifest.ts";
import { reportError, usageError } from "../../tools/cli.ts";
import { paintPlate } from "./plates.ts";
import type { LightState } from "./plates.ts";
import { paintViewPlate } from "./plates-views.ts";
import { plates, viewPlates } from "./scene.ts";
import type { PlateId, ViewPlateId } from "./scene.ts";

type BakeJob =
  | { kind: "shared"; id: PlateId; state: LightState; name: string; output: string }
  | { kind: "view"; id: ViewPlateId; name: string; output: string };

type BakeResult = { name: string; width: number; height: number; seconds: number };

const CONCURRENCY = 4;
const root = resolve(import.meta.dirname, "../..");
const episode = "episodes/after-rain";
const data = join(root, episode, "data");
const publicDirectory = join(root, "public", episode);
const generator = `${episode}/generate.ts`;
const usage = `node ${generator} [--force] [--help]`;

const runJob = (job: BakeJob): BakeResult => {
  const started = performance.now();
  const painted =
    job.kind === "shared"
      ? paintPlate(plates.find((p) => p.id === job.id)!, job.state)
      : paintViewPlate(viewPlates.find((p) => p.id === job.id)!);
  bakePlate(painted, job.output);
  return {
    name: job.name,
    width: painted.width,
    height: painted.height,
    seconds: (performance.now() - started) / 1000,
  };
};

const runPool = async (jobs: BakeJob[]): Promise<BakeResult[]> => {
  const workerCount = Math.min(CONCURRENCY, jobs.length);
  const weight = (job: BakeJob) => {
    if (job.name.includes("paddy-wide") || job.name.includes("far-dusk")) return 10;
    if (job.name.includes("far-rain") || job.name.includes("eaves")) return 6;
    if (job.name.includes("low-s")) return 4;
    return 2;
  };
  const ordered = jobs.slice().sort((a, b) => weight(b) - weight(a));
  const buckets: BakeJob[][] = Array.from({ length: workerCount }, () => []);
  const loads = new Array(workerCount).fill(0);
  for (const job of ordered) {
    let best = 0;
    for (let i = 1; i < workerCount; i++) if (loads[i] < loads[best]) best = i;
    buckets[best].push(job);
    loads[best] += weight(job);
  }
  const scriptUrl = new URL(import.meta.url);
  const batches = await Promise.all(
    buckets.map(
      (batch) =>
        new Promise<BakeResult[]>((resolvePromise, rejectPromise) => {
          const worker = new Worker(scriptUrl, { workerData: batch });
          const results: BakeResult[] = [];
          worker.on("message", (item: BakeResult) => {
            console.log(`底图 ${item.name}：${item.width}×${item.height}，${item.seconds.toFixed(2)} 秒`);
            results.push(item);
          });
          worker.on("error", rejectPromise);
          worker.on("exit", (code) => {
            if (code !== 0) rejectPromise(new Error(`底图工作线程异常退出（退出码 ${code}）。`));
            else resolvePromise(results);
          });
        }),
    ),
  );
  return batches.flat();
};

const generate = async (force: boolean) => {
  const plateSources = [
    generator,
    "src/kit/generation/bake.ts",
    "src/kit/generation/manifest.ts",
    ...["plates", "plates-views", "scene", "tokens"].map(
      (name) => `${episode}/${name}.ts`,
    ),
    ...["paint", "random", "camera", "figure"].map(
      (name) => `src/kit/engine/${name}.ts`,
    ),
  ];
  const cache = generation({
    root,
    generator,
    manifestPath: join(data, "generated.json"),
    entry: `${episode}/plates-views.ts`,
    plateSources,
    sources: ["tools/cli.ts"],
    dataSources: [],
  });
  const sharedJobs: BakeJob[] = plates.flatMap((plate) =>
    (["rain", "dusk"] as const).map((state) => {
      const name = `plate-${plate.id}-${state}.png`;
      return {
        kind: "shared" as const,
        id: plate.id,
        state,
        name,
        output: join(publicDirectory, name),
      };
    }),
  );
  const viewJobs: BakeJob[] = viewPlates.map((plate) => {
    const name = `plate-${plate.id}.png`;
    return {
      kind: "view" as const,
      id: plate.id,
      name,
      output: join(publicDirectory, name),
    };
  });
  const allJobs = [...sharedJobs, ...viewJobs];
  const publicPath = (name: string) => `${episode}/${name}`;
  const allPaths = allJobs.map(({ name }) => publicPath(name));
  if (!force && cache.cached(allPaths)) {
    console.log(`底图缓存命中（共 ${allPaths.length} 张）：${cache.cacheKey}`);
    return;
  }
  mkdirSync(data, { recursive: true });
  mkdirSync(publicDirectory, { recursive: true });
  const totalStart = performance.now();
  await runPool(allJobs);
  cache.save("complete", allPaths, {
    eventTables: [],
    audio: {},
  });
  console.log(
    `全部 ${allPaths.length} 张正片底图烘焙完成，总耗时 ${((performance.now() - totalStart) / 1000).toFixed(2)} 秒。\n生成清单：${join(data, "generated.json")}\n缓存键：${cache.cacheKey}`,
  );
};

if (!isMainThread) {
  const batch = workerData as BakeJob[];
  for (const job of batch) {
    parentPort?.postMessage(runJob(job));
  }
} else {
  try {
    let values: { help?: boolean; force?: boolean };
    try {
      ({ values } = parseArgs({
        options: { help: { type: "boolean" }, force: { type: "boolean" } },
        allowPositionals: false,
      }));
    } catch (error) {
      throw usageError(
        error instanceof Error ? error.message : String(error),
        usage,
      );
    }
    if (values.help) {
      console.log(
        `用法：${usage}\n烘焙《雨后》全片 24 张水粉底图到 public/episodes/after-rain/，并在 episodes/after-rain/data/generated.json 记录哈希与缓存键。\n--force 忽略缓存强制重绘。`,
      );
    } else {
      await generate(Boolean(values.force));
    }
  } catch (error) {
    reportError(error);
  }
}

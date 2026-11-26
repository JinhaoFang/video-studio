/**
 * 《雨后》正片唯一生成入口：运行 `node episodes/after-rain/generate.ts [--force] [--help]`。
 * 1. 使用最多 4 个并发工作线程烘焙全片 24 张水粉底图到 `public/episodes/after-rain/`（命中 plateKey 缓存时跳过重绘）；
 * 2. 汇总 12 个镜头的画面事件表写入 `episodes/after-rain/data/events.json` 与 `public/episodes/after-rain/events.json`；
 * 3. 调用 `episodes/after-rain/sound/render.ts` 生成 48 kHz 双声道临时混音并复制到 `public/episodes/after-rain/mix.wav`；
 * 4. 将入口 `episodes/after-rain/AfterRain.tsx`、全部输入与产物 SHA-256 哈希写入 `episodes/after-rain/data/generated.json`。
 * 退出码：0 通过，1 声音响度验收不通过，2 参数错误或运行出错。
 * 待定事项：#193 替换正式声音配方与参数后沿用本入口刷新清单。
 */
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { Worker, isMainThread, parentPort, workerData } from "node:worker_threads";
import { bakePlate } from "../../src/kit/generation/bake.ts";
import { digest, generation, json } from "../../src/kit/generation/manifest.ts";
import { collectEvents } from "../../src/kit/shots.ts";
import { MeasurementFailure } from "../../src/kit/sound/measure.ts";
import { reportError, usageError } from "../../tools/cli.ts";
import { fps, shotTable } from "./model.ts";
import { paintPlate } from "./plates.ts";
import type { LightState } from "./plates.ts";
import { paintViewPlate } from "./plates-views.ts";
import { plates, viewPlates } from "./scene.ts";
import type { PlateId, ViewPlateId } from "./scene.ts";
import { shotTimings } from "./shots/timings.ts";
import { soundSources } from "./sound/inputs.ts";

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

const timingSources = [
  `${episode}/shots/timings.ts`,
  `${episode}/shots/s01-02/timing.ts`,
  `${episode}/shots/s03/timing.ts`,
  `${episode}/shots/s04-06/timing.ts`,
  `${episode}/shots/s07-09/timing.ts`,
  `${episode}/shots/s10-11/timing.ts`,
  `${episode}/shots/s12/timing.ts`,
  "episodes/pure-code-sample/shots/s1/timing.ts",
];

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
    entry: `${episode}/AfterRain.tsx`,
    plateSources,
    sources: [
      ...soundSources,
      `${episode}/model.ts`,
      "src/kit/engine/timing.ts",
      ...timingSources,
    ],
    dataSources: [`${episode}/score.json`],
  });

  const eventsText = json({
    fps,
    sampleRate: 48000,
    shotTable,
    events: collectEvents(shotTable, shotTimings),
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
  const platePaths = allJobs.map(({ name }) => publicPath(name));
  const nonAudioPaths = [publicPath("events.json"), ...platePaths];
  const allPaths = [...nonAudioPaths, publicPath("mix.wav")];

  if (
    !force &&
    cache.cached(allPaths) &&
    existsSync(join(data, "events.json")) &&
    readFileSync(join(data, "events.json"), "utf8") === eventsText
  ) {
    console.log(`正片生成缓存命中（共 ${allPaths.length} 个产物）：${cache.cacheKey}`);
    return;
  }

  mkdirSync(data, { recursive: true });
  mkdirSync(publicDirectory, { recursive: true });
  writeFileSync(join(data, "events.json"), eventsText);
  writeFileSync(join(publicDirectory, "events.json"), eventsText);

  const totalStart = performance.now();
  if (!force && cache.platesCached(platePaths)) {
    console.log(`底图缓存命中（共 ${platePaths.length} 张）。`);
  } else {
    await runPool(allJobs);
  }

  const eventTables = [
    {
      path: `${episode}/data/events.json`,
      sha256: digest(eventsText),
    },
  ];
  cache.save("audio-pending", nonAudioPaths, {
    eventTables,
    audio: {},
  });

  const soundOut = "out/qa/spec-168/185/sound";
  const soundCommand = [
    `${episode}/sound/render.ts`,
    "--events",
    `${episode}/data/events.json`,
    "--out",
    soundOut,
    "--seed",
    "185",
  ];
  const soundResult = spawnSync(process.execPath, soundCommand, {
    cwd: root,
    stdio: "inherit",
  });
  if (soundResult.error || soundResult.status !== 0) {
    const message = `正片临时声音生成失败（退出码 ${soundResult.status}）：${soundResult.error?.message ?? "见上方声音命令输出；清单保持 audio-pending。"}`;
    if (soundResult.status === 1) throw new MeasurementFailure(message);
    throw new Error(message);
  }
  copyFileSync(join(root, soundOut, "mix.wav"), join(publicDirectory, "mix.wav"));
  const reportPath = `${soundOut}/measurements.json`;
  const report = JSON.parse(readFileSync(join(root, reportPath), "utf8"));

  cache.save("complete", allPaths, {
    eventTables,
    audio: {
      main: {
        command: ["node", ...soundCommand],
        sampleRate: report.sampleRate,
        channels: 2,
        master: report.master,
        measurements: reportPath,
      },
    },
  });
  console.log(
    `正片全部 ${allPaths.length} 个生成物完成，总耗时 ${((performance.now() - totalStart) / 1000).toFixed(2)} 秒。\n生成清单：${join(data, "generated.json")}\n缓存键：${cache.cacheKey}`,
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
        `用法：${usage}\n烘焙《雨后》全片 24 张水粉底图、汇总事件表并生成 48 kHz 临时混音到 public/episodes/after-rain/，记录哈希到 episodes/after-rain/data/generated.json。\n--force 忽略缓存强制重绘。`,
      );
    } else {
      await generate(Boolean(values.force));
    }
  } catch (error) {
    reportError(error);
    if (error instanceof MeasurementFailure) process.exitCode = 1;
  }
}

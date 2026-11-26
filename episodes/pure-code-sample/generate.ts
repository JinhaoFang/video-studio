/** 用 node episodes/pure-code-sample/generate.ts 烘焙底图、汇总事件并生成两版混音。--force 跳过缓存，声音失败时清单保留 audio-pending。 */
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
import { reportError } from "../../tools/cli.ts";
import { bakePlate } from "../../src/kit/generation/bake.ts";
import { digest, generation, json } from "../../src/kit/generation/manifest.ts";
import { collectEvents } from "../../src/kit/shots.ts";
import { MeasurementFailure } from "../../src/kit/sound/measure.ts";
import { paintPlate } from "../after-rain/plates.ts";
import { plates } from "../after-rain/scene.ts";
import { fps, shotTable } from "./model.ts";
import { s1Timing } from "./shots/s1/timing.ts";
import { s2Timing as s2a } from "./shots/s2-a/timing.ts";
import { s2Timing as s2b } from "./shots/s2-b/timing.ts";
import { soundSources } from "./sound/inputs.ts";

const root = resolve(import.meta.dirname, "../..");
const episode = "episodes/pure-code-sample";
const data = join(root, episode, "data");
const publicDirectory = join(root, "public", episode);
const generator = `${episode}/generate.ts`;

const generate = (force: boolean) => {
  const cache = generation({
    root,
    generator,
    manifestPath: join(data, "generated.json"),
    entry: `${episode}/PureCodeSample.tsx`,
    plateSources: [
      generator,
      "src/kit/generation/bake.ts",
      "src/kit/generation/manifest.ts",
      ...["plates", "scene", "tokens"].map(
        (name) => `episodes/after-rain/${name}.ts`,
      ),
      ...["paint", "random", "camera", "figure"].map(
        (name) => `src/kit/engine/${name}.ts`,
      ),
    ],
    sources: [
      ...soundSources,
      `${episode}/model.ts`,
      "src/kit/engine/timing.ts",
      ...["s1", "s2-a", "s2-b"].map(
        (shot) => `${episode}/shots/${shot}/timing.ts`,
      ),
    ],
    dataSources: [`${episode}/score.json`, `${episode}/sound.json`],
  });
  const variants = [
    { id: "a", timing: s2a },
    { id: "b", timing: s2b },
  ].map(({ id, timing }) => ({
    id,
    name: `events-${id}.json`,
    text: json({
      fps,
      sampleRate: 48000,
      shotTable,
      events: collectEvents(shotTable, [s1Timing, timing]),
    }),
  }));
  const layers = plates.flatMap((plate) =>
    (["rain", "dusk"] as const).map((state) => ({
      plate,
      state,
      name: `plate-${plate.id}-${state}.png`,
    })),
  );
  const publicPath = (name: string) => `${episode}/${name}`;
  const platePaths = layers.map(({ name }) => publicPath(name));
  const files = [
    ...variants.map(({ name }) => publicPath(name)),
    ...platePaths,
  ];
  if (
    !force &&
    cache.cached([
      ...files,
      ...variants.map(({ id }) => publicPath(`mix-${id}.wav`)),
    ]) &&
    variants.every(
      ({ name, text }) =>
        existsSync(join(data, name)) &&
        readFileSync(join(data, name), "utf8") === text,
    )
  ) {
    console.log(`缓存命中：${cache.cacheKey}`);
    return;
  }
  mkdirSync(data, { recursive: true });
  mkdirSync(publicDirectory, { recursive: true });
  for (const { name, text } of variants) {
    writeFileSync(join(data, name), text);
    writeFileSync(join(publicDirectory, name), text);
  }
  if (!force && cache.platesCached(platePaths)) console.log("底图缓存命中。");
  else
    for (const { plate, state, name } of layers) {
      const started = performance.now();
      const painted = paintPlate(plate, state);
      bakePlate(painted, join(publicDirectory, name));
      console.log(
        `底图 ${name}：${painted.width}×${painted.height}，${((performance.now() - started) / 1000).toFixed(1)} 秒`,
      );
    }
  const audio: Record<string, unknown> = {};
  const eventTables = variants.map(({ id, name, text }) => ({
    variant: id,
    path: `${episode}/data/${name}`,
    sha256: digest(text),
  }));
  cache.save("audio-pending", files, { audio, eventTables });
  for (const { id, name } of variants) {
    const directory = `out/qa/spec-147/159/sound-${id}`;
    const command = [
      `${episode}/sound/render.ts`,
      "--events",
      `${episode}/data/${name}`,
      "--out",
      directory,
      "--seed",
      "158",
    ];
    const result = spawnSync(process.execPath, command, {
      cwd: root,
      stdio: "inherit",
    });
    if (result.error || result.status !== 0) {
      const message = `版本 ${id.toUpperCase()} 声音生成失败（退出码 ${result.status}）：${result.error?.message ?? "见上方声音命令诊断；清单保持 audio-pending。"}`;
      if (result.status === 1) throw new MeasurementFailure(message);
      throw new Error(message);
    }
    copyFileSync(
      join(root, directory, "mix.wav"),
      join(publicDirectory, `mix-${id}.wav`),
    );
    files.push(publicPath(`mix-${id}.wav`));
    const measurements = `${directory}/measurements.json`;
    const report = JSON.parse(readFileSync(join(root, measurements), "utf8"));
    audio[id] = {
      command: ["node", ...command],
      sampleRate: report.sampleRate,
      channels: 2,
      master: report.master,
      measurements,
    };
  }
  cache.save("complete", files, { audio, eventTables });
  console.log(
    `已生成两版事件与混音：${publicDirectory}\n生成清单：${join(data, "generated.json")}\n缓存键：${cache.cacheKey}`,
  );
};

try {
  const { values } = parseArgs({
    options: { help: { type: "boolean" }, force: { type: "boolean" } },
  });
  if (values.help)
    console.log(
      `用法：node ${generator} [--force] [--help]\n生成本期十张底图、A/B 全片事件表及 48 kHz 双声道混音；声音验收写入 out/qa/spec-147/159/sound-{a,b}。--force 忽略缓存。`,
    );
  else generate(Boolean(values.force));
} catch (error) {
  reportError(error);
  if (error instanceof MeasurementFailure) process.exitCode = 1;
}

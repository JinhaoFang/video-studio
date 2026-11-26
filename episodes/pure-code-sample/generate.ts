/** 用 node episodes/pure-code-sample/generate.ts 烘焙十张底图、两版真实事件表，再串行调用 #158 声音命令生成各版混音；清单明确记录声音待生成或全部完成，源码、设计数据、运行版本或产物哈希变化即重建。 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { reportError } from "../../tools/cli.ts";
import { collectEvents, fps, shotTable } from "./model.ts";
import { toBytes } from "./engine/paint.ts";
import { paintPlate } from "./plates.ts";
import { plates } from "./scene.ts";
import { MeasurementFailure } from "./sound/measure.ts";
import { s1Timing } from "./shots/s1/timing.ts";
import { s2Timing as s2aTiming } from "./shots/s2-a/timing.ts";
import { s2Timing as s2bTiming } from "./shots/s2-b/timing.ts";

const root = resolve(import.meta.dirname, "../..");
const data = resolve(import.meta.dirname, "data");
const publicDirectory = resolve(root, "public/episodes/pure-code-sample");
const qa = resolve(root, "out/qa/spec-147/159");
const digest = (value: Uint8Array | string) =>
  createHash("sha256").update(value).digest("hex");
const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;
const run = (args: string[], input?: Uint8Array) => {
  const result = spawnSync("ffmpeg", args, {
    input,
    maxBuffer: 32 * 1024 * 1024,
  });
  if (result.error || result.status !== 0)
    throw new Error(
      `FFmpeg 生成失败：${result.error?.message ?? result.stderr.toString()}`,
    );
  return result;
};

try {
  const { values } = parseArgs({
    options: { help: { type: "boolean" }, force: { type: "boolean" } },
  });
  if (values.help) {
    console.log(
      "用法：node episodes/pure-code-sample/generate.ts [--force] [--help]\n生成本期十张底图、A/B 全片事件表及 48 kHz 双声道混音；声音验收写入 out/qa/spec-147/159/sound-{a,b}，清单以 status 标明是否全部完成。--force 忽略缓存。",
    );
  } else {
    const inputPaths = [
      "generate.ts",
      "model.ts",
      "plates.ts",
      "scene.ts",
      "tokens.ts",
      "engine/paint.ts",
      "engine/random.ts",
      "engine/camera.ts",
      "engine/figure.ts",
      "engine/timing.ts",
      "shots/s1/timing.ts",
      "shots/s2-a/timing.ts",
      "shots/s2-b/timing.ts",
      ...["types", "dsp", "score", "sfx", "mix", "measure", "render"].map(
        (name) => `sound/${name}.ts`,
      ),
    ]
      .map((name) => `episodes/pure-code-sample/${name}`)
      .concat("tools/cli.ts");
    const fingerprint = (path: string) => ({
      path,
      sha256: digest(readFileSync(resolve(root, path))),
    });
    const inputs = inputPaths.map(fingerprint);
    const dataInputs = ["score.json", "sound.json"].map((name) =>
      fingerprint(`episodes/pure-code-sample/${name}`),
    );
    const ffmpegVersion = run(["-version"]).stdout.toString().split("\n")[0];
    const runtime = { node: process.version, ffmpegVersion };
    const cacheKey = digest(json({ inputs, dataInputs, runtime }));
    const plateInputs = inputs.filter((input) =>
      /\/(?:generate|plates|scene|tokens|engine\/(?:paint|random|camera|figure))\.ts$/.test(
        input.path,
      ),
    );
    const plateKey = digest(json({ plateInputs, runtime }));
    const manifestPath = resolve(data, "generated.json");
    const previous = existsSync(manifestPath)
      ? JSON.parse(readFileSync(manifestPath, "utf8"))
      : null;
    const variants = [
      { id: "a", timing: s2aTiming },
      { id: "b", timing: s2bTiming },
    ].map(({ id, timing }) => ({
      id,
      text: json({
        fps,
        sampleRate: 48000,
        shotTable,
        events: collectEvents(shotTable, [s1Timing, timing]),
      }),
    }));
    const matches = (file: { path: string; sha256: string }) => {
      const path = resolve(root, "public", file.path);
      return existsSync(path) && digest(readFileSync(path)) === file.sha256;
    };
    const cached =
      previous?.status === "complete" &&
      previous?.cacheKey === cacheKey &&
      previous.files.every(matches) &&
      variants.every(
        ({ id, text }) =>
          existsSync(resolve(data, `events-${id}.json`)) &&
          readFileSync(resolve(data, `events-${id}.json`), "utf8") === text,
      );
    if (!values.force && cached) {
      console.log(`缓存命中：${cacheKey}`);
    } else {
      mkdirSync(data, { recursive: true });
      mkdirSync(publicDirectory, { recursive: true });
      const names: string[] = [];
      for (const { id, text } of variants) {
        writeFileSync(resolve(data, `events-${id}.json`), text);
        writeFileSync(resolve(publicDirectory, `events-${id}.json`), text);
        names.push(`events-${id}.json`);
      }
      const plateNames = plates.flatMap((plate) =>
        ["rain", "dusk"].map((state) => `plate-${plate.id}-${state}.png`),
      );
      const platesCached =
        !values.force &&
        previous?.plateKey === plateKey &&
        plateNames.every((name) => {
          const file = previous.files.find(
            (item: { path: string }) =>
              item.path === `episodes/pure-code-sample/${name}`,
          );
          return file && matches(file);
        });
      if (platesCached) console.log("底图缓存命中。");
      else
        for (const [plate, state] of plates.flatMap((p) =>
          (["rain", "dusk"] as const).map((st) => [p, st] as const),
        )) {
          const started = performance.now();
          const painted = paintPlate(plate, state);
          const name = `plate-${plate.id}-${state}.png`;
          run(
            [
              "-hide_banner",
              "-loglevel",
              "error",
              "-nostdin",
              "-y",
              "-f",
              "rawvideo",
              "-pixel_format",
              "rgba",
              "-video_size",
              `${painted.width}x${painted.height}`,
              "-i",
              "pipe:0",
              "-frames:v",
              "1",
              "-threads",
              "1",
              "-update",
              "1",
              resolve(publicDirectory, name),
            ],
            toBytes(painted),
          );
          console.log(
            `底图 ${name}：${painted.width}×${painted.height}，${((performance.now() - started) / 1000).toFixed(1)} 秒`,
          );
        }
      names.push(...plateNames);
      const audio: Record<string, unknown> = {};
      const saveManifest = (status: "audio-pending" | "complete") =>
        writeFileSync(
          manifestPath,
          json({
            entry: "episodes/pure-code-sample/PureCodeSample.tsx",
            generator: "episodes/pure-code-sample/generate.ts",
            command: ["node", "episodes/pure-code-sample/generate.ts"],
            status,
            cacheKey,
            plateKey,
            inputs,
            dataInputs,
            runtime,
            files: names.map((name) => ({
              path: `episodes/pure-code-sample/${name}`,
              sha256: digest(readFileSync(resolve(publicDirectory, name))),
            })),
            eventTables: variants.map(({ id, text }) => ({
              variant: id,
              path: `episodes/pure-code-sample/data/events-${id}.json`,
              sha256: digest(text),
            })),
            audio,
          }),
        );
      saveManifest("audio-pending");
      for (const { id } of variants) {
        const directory = resolve(qa, `sound-${id}`);
        const command = [
          "episodes/pure-code-sample/sound/render.ts",
          "--events",
          `episodes/pure-code-sample/data/events-${id}.json`,
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
          resolve(directory, "mix.wav"),
          resolve(publicDirectory, `mix-${id}.wav`),
        );
        names.push(`mix-${id}.wav`);
        const report = JSON.parse(
          readFileSync(resolve(directory, "measurements.json"), "utf8"),
        );
        audio[id] = {
          command: [process.execPath, ...command],
          sampleRate: report.sampleRate,
          channels: 2,
          master: report.master,
          measurements: `out/qa/spec-147/159/sound-${id}/measurements.json`,
        };
      }
      saveManifest("complete");
      console.log(
        `已生成两版事件与混音：${publicDirectory}\n生成清单：${manifestPath}\n缓存键：${cacheKey}`,
      );
    }
  }
} catch (error) {
  reportError(error);
  if (error instanceof MeasurementFailure) process.exitCode = 1;
}

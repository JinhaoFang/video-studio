/** 用 node episodes/pure-code-sample/generate.ts 烘焙占位底图、《雨后》各层水粉底图（plates.ts，雨色和夕光两种状态）、事件表、音效与混音；输入源码、FFmpeg 版本或产物哈希变化即重建缓存。 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { color, hud } from "../../src/styles/nasa-punk/tokens.ts";
import { reportError } from "../../tools/cli.ts";
import {
  collectEvents,
  durationInFrames,
  fps,
  height,
  placeholder,
  seed,
  shotTable,
  width,
} from "./model.ts";
import { mixEvents, sampleRate, synthesizeImpact, wav } from "./audio.ts";
import { toBytes } from "./engine/paint.ts";
import { paintPlate } from "./plates.ts";
import { plates } from "./scene.ts";

const root = resolve(import.meta.dirname, "../..");
const data = resolve(import.meta.dirname, "data");
const publicDirectory = resolve(root, "public/episodes/pure-code-sample");
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
      "用法：node episodes/pure-code-sample/generate.ts [--force] [--help]\n生成本期底图、事件表、PCM16 音效与 -16 LUFS 混音；--force 忽略缓存。",
    );
  } else {
    const inputs = [
      "episodes/pure-code-sample/generate.ts",
      "episodes/pure-code-sample/model.ts",
      "episodes/pure-code-sample/audio.ts",
      "src/styles/nasa-punk/tokens.ts",
      "episodes/pure-code-sample/plates.ts",
      "episodes/pure-code-sample/scene.ts",
      "episodes/pure-code-sample/tokens.ts",
      "episodes/pure-code-sample/engine/paint.ts",
      "episodes/pure-code-sample/engine/random.ts",
      "episodes/pure-code-sample/engine/camera.ts",
      "episodes/pure-code-sample/engine/figure.ts",
    ].map((path) => ({
      path,
      sha256: digest(readFileSync(resolve(root, path))),
    }));
    const ffmpegVersion = run(["-version"]).stdout.toString().split("\n")[0];
    const cacheKey = digest(json({ inputs, ffmpegVersion }));
    const manifestPath = resolve(data, "generated.json");
    const previous = existsSync(manifestPath)
      ? JSON.parse(readFileSync(manifestPath, "utf8"))
      : null;
    const eventsPath = resolve(data, "events.json");
    const events = collectEvents(shotTable, [placeholder]);
    const eventText = json({ fps, sampleRate, shotTable, events });
    const cached =
      previous?.cacheKey === cacheKey &&
      previous.files.every((file: { path: string; sha256: string }) => {
        const path = resolve(root, "public", file.path);
        return existsSync(path) && digest(readFileSync(path)) === file.sha256;
      }) &&
      existsSync(eventsPath) &&
      readFileSync(eventsPath, "utf8") === eventText;
    if (!values.force && cached) {
      console.log(`缓存命中：${cacheKey}`);
    } else {
      mkdirSync(data, { recursive: true });
      mkdirSync(publicDirectory, { recursive: true });
      const rgb = Buffer.alloc(width * height * 3);
      const channels = (hex: string) =>
        [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16));
      const paper = channels(color.paper);
      const floor = channels(color.panel);
      const line = channels(color.ink);
      for (let y = 0; y < height; y++) {
        const pixel =
          y < height - hud.edgeInset
            ? paper
            : y < height - hud.edgeInset + Math.round(hud.bracketStroke)
              ? line
              : floor;
        for (let x = 0; x < width; x++) {
          const offset = (y * width + x) * 3;
          rgb[offset] = pixel[0];
          rgb[offset + 1] = pixel[1];
          rgb[offset + 2] = pixel[2];
        }
      }
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
          "rgb24",
          "-video_size",
          `${width}x${height}`,
          "-i",
          "pipe:0",
          "-frames:v",
          "1",
          "-threads",
          "1",
          "-update",
          "1",
          resolve(publicDirectory, "background.png"),
        ],
        rgb,
      );
      const plateNames: string[] = [];
      for (const [plate, state] of plates.flatMap((p) => (["rain", "dusk"] as const).map((st) => [p, st] as const))) {
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
        plateNames.push(name);
        console.log(`底图 ${name}：${painted.width}×${painted.height}，${((performance.now() - started) / 1000).toFixed(1)} 秒`);
      }
      const sound = synthesizeImpact(seed);
      writeFileSync(resolve(publicDirectory, "impact.wav"), wav(sound.samples));
      const mix = mixEvents(events, sound, durationInFrames, fps);
      const measurement = run(
        [
          "-hide_banner",
          "-nostats",
          "-i",
          "pipe:0",
          "-af",
          "loudnorm=I=-16:TP=-1:LRA=11:print_format=json",
          "-f",
          "null",
          "-",
        ],
        wav(mix, 1, 2),
      ).stderr.toString();
      const measured = JSON.parse(
        measurement.slice(measurement.lastIndexOf("{")),
      );
      const gain = Math.pow(10, (-16 - Number(measured.input_i)) / 20);
      writeFileSync(resolve(publicDirectory, "mix.wav"), wav(mix, gain, 2));
      writeFileSync(eventsPath, eventText);
      const files = ["background.png", "impact.wav", "mix.wav", ...plateNames].map((name) => ({
        path: `episodes/pure-code-sample/${name}`,
        sha256: digest(readFileSync(resolve(publicDirectory, name))),
      }));
      writeFileSync(
        manifestPath,
        json({
          entry: "episodes/pure-code-sample/PureCodeSample.tsx",
          generator: "episodes/pure-code-sample/generate.ts",
          command: ["node", "episodes/pure-code-sample/generate.ts"],
          cacheKey,
          inputs,
          ffmpegVersion,
          files,
          audio: {
            sampleRate,
            channels: 2,
            alignmentSample: sound.alignmentSample,
            gain,
            measuredInputLufs: Number(measured.input_i),
            targetLufs: -16,
          },
        }),
      );
      console.log(
        `已生成：${publicDirectory}\n事件表：${eventsPath}\n缓存键：${cacheKey}\n混音增益：${gain.toFixed(6)}`,
      );
    }
  }
} catch (error) {
  reportError(error);
}

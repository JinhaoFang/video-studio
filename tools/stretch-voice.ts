/**
 * Stretch original sentence MP3s with `node tools/stretch-voice.ts --help`.
 * Verify synthesis manifests, keep pitch at 1, and write a separate directory
 * atomically without replacing originals or an existing destination. Derived
 * manifests retain synthesis provenance for the existing `pnpm qa voice` scorer
 * and add the source hash, actual per-sentence tempo and exact ffmpeg argument
 * array. Repeat --tempo-override L008=1.15 to override selected sentences.
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, join, resolve, sep } from "node:path";
import { parseArgs } from "node:util";
import { reportError, usageError } from "./cli.ts";

const usage =
  "node tools/stretch-voice.ts <原始MP3目录> --tempo <倍率> [--tempo-override <L008=1.15>]… --out <新目录>";
const sha256 = (path: string) =>
  createHash("sha256").update(readFileSync(path)).digest("hex");
const validTempo = (value: string): boolean =>
  /^\d+(?:\.\d+)?$/.test(value) &&
  Number.isFinite(Number(value)) &&
  Number(value) >= 0.01 &&
  Number(value) <= 100;

try {
  const args = process.argv.slice(2);
  if (args.includes("--help")) {
    console.log(
      `用法：${usage}\n读取 L001.mp3 等逐句 MP3 和同名合成 JSON，用 ffmpeg rubberband 等比变速、保持音高。\n倍率范围 0.01～100，大于 1 为加快；输出为 44.1kHz/128kbps MP3，原文件不覆盖。\n--tempo-override 可多次指定不同句子；每句只能指定一次，编号必须存在，倍率范围与 --tempo 相同。\n输出目录必须不存在；改倍率时仍以原始目录为输入，并选择新的输出目录。\n输出 JSON 保留合成记录，并附原始 SHA256、每句实际倍率、音高和参数数组，可直接交给 pnpm qa voice 复核。\n退出码：0 完成，2 参数或运行错误。`,
    );
  } else {
    let parsed;
    try {
      parsed = parseArgs({
        args,
        options: {
          tempo: { type: "string" },
          "tempo-override": { type: "string", multiple: true },
          out: { type: "string" },
        },
        allowPositionals: true,
        tokens: true,
      });
    } catch {
      throw usageError("参数无效，请检查选项名称和值。", usage);
    }
    const { positionals, values, tokens } = parsed;
    const tempoText = values.tempo ?? "";
    const tempo = Number(tempoText);
    if (
      positionals.length !== 1 ||
      !values.out ||
      values.out.startsWith("--") ||
      !validTempo(tempoText) ||
      ["tempo", "out"].some(
        (name) =>
          tokens.filter(
            (token) => token.kind === "option" && token.name === name,
          ).length !== 1,
      )
    )
      throw usageError("请提供原始目录、有效倍率和新输出目录。", usage);
    const overrides = new Map<string, number>();
    for (const value of values["tempo-override"] ?? []) {
      const match = /^(L\d{3,})=(.+)$/.exec(value);
      if (!match || !validTempo(match[2]))
        throw usageError(
          "逐句倍率必须为 L008=1.15 格式，倍率范围 0.01～100。",
          usage,
        );
      if (overrides.has(match[1]))
        throw usageError(`${match[1]} 的逐句倍率只能指定一次。`, usage);
      overrides.set(match[1], Number(match[2]));
    }
    const input = realpathSync(positionals[0]);
    const requestedOutput = resolve(values.out);
    if (existsSync(requestedOutput))
      throw new Error("输出目录已存在，请选择新目录以保留原始文件和已有结果。");
    mkdirSync(dirname(requestedOutput), { recursive: true });
    const output = join(
      realpathSync(dirname(requestedOutput)),
      basename(requestedOutput),
    );
    if (
      output === input ||
      output.startsWith(input + sep) ||
      input.startsWith(output + sep)
    )
      throw new Error("输入和输出必须是互不包含的独立目录。");
    const files = readdirSync(input)
      .filter((name) => /^L\d{3,}\.mp3$/.test(name))
      .sort();
    if (!files.length) throw new Error("输入目录没有逐句 MP3 文件。");
    for (const id of overrides.keys())
      if (!files.includes(`${id}.mp3`))
        throw usageError(`逐句倍率的编号 ${id} 不在输入目录中。`, usage);
    const sentences = files.map((name) => {
      const id = basename(name, ".mp3");
      const source = join(input, name);
      const manifest = JSON.parse(
        readFileSync(join(input, `${id}.json`), "utf8"),
      );
      if (
        manifest.kind !== "elevenlabs-sentence" ||
        manifest.version !== 1 ||
        manifest.id !== id ||
        manifest.postProcessing ||
        manifest.sha256 !== sha256(source)
      )
        throw new Error(`${id} 不是校验通过的原始逐句合成文件。`);
      return { id, name, source, manifest };
    });
    const temporary = mkdtempSync(join(dirname(output), ".stretch-voice-"));
    try {
      for (const { id, name, source, manifest } of sentences) {
        const sentenceTempo = overrides.get(id) ?? tempo;
        const args = [
          "-hide_banner",
          "-loglevel",
          "error",
          "-nostdin",
          "-n",
          "-i",
          source,
          "-map",
          "0:a:0",
          "-af",
          `rubberband=tempo=${sentenceTempo}:pitch=1`,
          "-ar",
          "44100",
          "-c:a",
          "libmp3lame",
          "-b:a",
          "128k",
          join(temporary, name),
        ];
        const result = spawnSync("ffmpeg", args, { encoding: "utf8" });
        if (result.error || result.status !== 0)
          throw new Error(
            `${id} 的 ffmpeg rubberband 处理失败，请检查滤镜和输入。`,
          );
        writeFileSync(
          join(temporary, `${id}.json`),
          JSON.stringify(
            {
              ...manifest,
              audio: join(output, name),
              sha256: sha256(join(temporary, name)),
              postProcessing: {
                kind: "rubberband",
                tempo: sentenceTempo,
                pitch: 1,
                sourceAudio: source,
                sourceSha256: manifest.sha256,
                command: ["ffmpeg", ...args],
              },
            },
            null,
            2,
          ) + "\n",
        );
      }
      renameSync(temporary, output);
    } finally {
      rmSync(temporary, { recursive: true, force: true });
    }
    console.log(
      `已用 rubberband 按默认 ${tempo} 倍变速 ${sentences.length} 句，逐句覆盖 ${overrides.size} 句，音高保持 1：${output}`,
    );
  }
} catch (error) {
  reportError(error);
}

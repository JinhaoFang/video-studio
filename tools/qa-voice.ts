/**
 * Dispatch local GPU Whisper scoring for sentence manifests from `pnpm tts`.
 * `pnpm qa voice --help` lists explicit transcript, cache/interpreter and output
 * inputs. Verify hashes before scoring so replacement audio cannot reuse stale
 * metadata. The Python worker writes raw ASR, measurements and a one-page table.
 * Pass synthesis overrides explicitly to validate changed speech and context;
 * scoring always compares ASR against the original transcript.
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseOptions } from "./qa-common.ts";
import { usageError } from "./cli.ts";
import {
  readSynthesisOverrides,
  readTranscript,
  sentenceIndex,
  synthesisText,
} from "./tts-input.ts";

export const voiceUsage =
  "pnpm qa voice <试听目录> --transcript <台本.md> --ledger <账本.json> --out <报告目录> [--from <L001>] [--to <L003>] [--python <解释器>] [--whisper-model <本地模型或large-v3>] [--overrides <改写.json>]";

export const runVoice = (args: string[]): void => {
  const { positional, options, help } = parseOptions(
    args,
    [
      "--transcript",
      "--ledger",
      "--out",
      "--from",
      "--to",
      "--python",
      "--whisper-model",
      "--overrides",
    ],
    voiceUsage,
  );
  if (help) {
    console.log(
      `用法：${voiceUsage}\n读取每句 MP3 旁的 JSON，检查台本、上下文和 SHA256；每组必须覆盖完整句子范围。\n--overrides 与 pnpm tts 使用同一份改写文件；CER 仍对照原始台本，年月数字和 NASA／纳萨／娜萨／娜莎视为等价。\nPython 需要 faster-whisper；只用本机缓存、CUDA/float16，不下载模型、不调用外部识别。\n输出每组原始 Whisper JSON/Markdown、逐句音频检测记录和 comparison.md。\n检测阈值：句中静音 >0.4 秒（-40 dBFS）；边缘留白 <20 毫秒提示截断风险；真峰值 >=0 dBTP 提示爆音。\n退出码：0 无检测风险，1 检出风险，2 参数或运行错误。`,
    );
    return;
  }
  const required = (name: string) => {
    const value = options.get(name);
    if (!value) throw usageError(`缺少 ${name}。`, voiceUsage);
    return value;
  };
  if (positional.length !== 1)
    throw usageError("请提供一个试听素材目录。", voiceUsage);
  const rows = readTranscript(resolve(required("--transcript")));
  const overrides = readSynthesisOverrides(options.get("--overrides"), rows);
  const start = sentenceIndex(options.get("--from") ?? "L001");
  const end = sentenceIndex(options.get("--to") ?? "L003");
  if (end < start || end >= rows.length)
    throw new Error("句子范围倒置或超出台本。");
  const input = resolve(positional[0]);
  const groups = new Map<string, object[]>();
  for (const path of readdirSync(input, { recursive: true })
    .map(String)
    .filter((name) => name.endsWith(".json"))
    .sort()) {
    const manifest = JSON.parse(readFileSync(join(input, path), "utf8"));
    if (manifest.kind !== "elevenlabs-sentence") continue;
    const index = sentenceIndex(manifest.id);
    if (index < start || index > end) continue;
    const expected = synthesisText(rows, index, overrides);
    if (
      manifest.request.text !== expected.text ||
      manifest.request.previous_text !== expected.previous_text ||
      manifest.request.next_text !== expected.next_text ||
      (manifest.referenceText !== undefined &&
        manifest.referenceText !== rows[index].text)
    )
      throw new Error(`${manifest.id} 台本或上下文与合成记录不一致。`);
    const audio = resolve(input, path, "..", `${manifest.id}.mp3`);
    if (
      createHash("sha256").update(readFileSync(audio)).digest("hex") !==
      manifest.sha256
    )
      throw new Error(`${manifest.id} 音频校验失败，请核对合成记录。`);
    const key = `${manifest.voice}/${manifest.model}`;
    const group = groups.get(key) ?? [];
    group.push({ ...manifest, referenceText: rows[index].text, audio });
    groups.set(key, group);
  }
  if (!groups.size) throw new Error("没有找到句子合成记录。");
  for (const [name, items] of groups) {
    const ids = items.map((item) => (item as { id: string }).id);
    if (items.length !== end - start + 1 || new Set(ids).size !== ids.length)
      throw new Error(`${name} 缺少句子或有重复记录。`);
  }
  const out = resolve(required("--out"));
  mkdirSync(out, { recursive: true });
  const job = join(out, "voice-job.json");
  writeFileSync(
    job,
    JSON.stringify(
      {
        groups: Object.fromEntries(groups),
        ledger: JSON.parse(readFileSync(resolve(required("--ledger")), "utf8")),
        out,
      },
      null,
      2,
    ),
  );
  const result = spawnSync(
    options.get("--python") ?? "python3",
    [
      resolve(import.meta.dirname, "qa-voice.py"),
      "--job",
      job,
      "--whisper-model",
      options.get("--whisper-model") ?? "large-v3",
    ],
    { stdio: "inherit" },
  );
  if (
    result.error ||
    result.status === null ||
    ![0, 1, 2].includes(result.status)
  )
    throw new Error(
      "Whisper 打分进程无法完成，请检查解释器、faster-whisper 和 CUDA 环境。",
    );
  process.exitCode = result.status;
};

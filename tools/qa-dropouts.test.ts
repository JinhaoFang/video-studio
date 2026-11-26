/** 从真实 QA 入口检查 RMS、电平段、骤降、阈值边界和报告。夹具按帧生成 44.1 kHz 左右反相的立体声，也用变帧率视频和延迟音轨验证时间码。 */
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import {
  media,
  numberedVideo,
  runCommand,
  temporaryDirectory,
} from "./test-support.ts";

const cli = join(import.meta.dirname, "qa.ts");
const run = (cwd: string, args: string[]) =>
  runCommand(process.execPath, [cli, "dropouts", ...args], { cwd });
const readReport = (out: string) =>
  JSON.parse(readFileSync(join(out, "dropouts.json"), "utf8")) as {
    frameCount: number;
    passed: boolean | null;
    checkedFrames: { first: number; last: number };
    findings: {
      type: string;
      startFrame: number;
      endFrame: number;
      startTimecode: string;
      endTimecode: string;
      previousDbfs: number;
      minDbfs: number | string;
      maxDbfs: number | string;
      dropDb: number | string;
    }[];
  };
const stereo = (root: string, amplitudes: number[], fps = 24) => {
  const rate = 44100;
  const boundary = (frame: number) => Math.round((frame * rate) / fps);
  const pcm = Buffer.alloc(boundary(amplitudes.length) * 8);
  amplitudes.forEach((amplitude, i) => {
    for (let s = boundary(i); s < boundary(i + 1); s++) {
      const value = s % 2 ? amplitude : -amplitude;
      pcm.writeFloatLE(value, s * 8);
      pcm.writeFloatLE(-value, s * 8 + 4);
    }
  });
  const raw = join(root, "stereo.f32"),
    wav = join(root, "stereo.wav");
  writeFileSync(raw, pcm);
  media([
    "-f",
    "f32le",
    "-ar",
    String(rate),
    "-ac",
    "2",
    "-i",
    raw,
    "-c:a",
    "pcm_f32le",
    wav,
  ]);
  return wav;
};

test("反相立体声按能量检测单帧骤降、数字静音和持续低电平，片头片尾与临界时长按约定排除", (context) => {
  const root = temporaryDirectory(context),
    out = join(root, "验收 图");
  const amplitudes = Array<number>(48).fill(0.5);
  amplitudes
    .fill(0, 0, 5)
    .fill(0.002, 6, 9)
    .fill(0.002, 12, 13)
    .fill(0, 18, 24)
    .fill(0.0003, 29, 32)
    .fill(0, 42);
  const wav = stereo(root, amplitudes);
  const args = [wav, "--out", out];
  const result = run(root, args);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /结果：仅报告/);
  const { passed, frameCount, checkedFrames, findings } = readReport(out);
  assert.equal(passed, null);
  assert.equal(frameCount, 48);
  assert.deepEqual(checkedFrames, { first: 6, last: 41 });
  assert.deepEqual(
    findings.map((f) => [f.type, f.startFrame, f.endFrame]),
    [
      ["drop", 12, 12],
      ["drop", 18, 18],
      ["silence", 18, 23],
      ["drop", 29, 29],
    ],
  );
  const [hardCut, intoSilence, silence] = findings;
  assert.deepEqual(
    [hardCut.startTimecode, hardCut.endTimecode],
    ["00:00.500", "00:00.542"],
  );
  assert.ok(Math.abs(hardCut.previousDbfs - 20 * Math.log10(0.5)) < 1e-5);
  assert.ok(
    Math.abs(Number(hardCut.dropDb) - 20 * Math.log10(0.5 / 0.002)) < 1e-5,
  );
  assert.equal(intoSilence.dropDb, "Infinity");
  assert.deepEqual(
    [
      silence.startTimecode,
      silence.endTimecode,
      silence.minDbfs,
      silence.maxDbfs,
    ],
    ["00:00.750", "00:01.000", "-Infinity", "-Infinity"],
  );
  const svg = readFileSync(join(out, "levels.svg"), "utf8");
  assert.match(svg, /<polyline/);
  assert.match(svg, /<title>F18–F23<\/title>/);
  assert.doesNotMatch(svg, /NaN|Infinity/);
  const gated = run(root, [...args, "--min-duration", "0.12"]);
  assert.equal(gated.status, 1, gated.stdout);
  assert.match(gated.stderr, /^出错：/);
  const shorter = readReport(out);
  assert.equal(shorter.passed, false);
  assert.ok(
    shorter.findings.some(
      (f) =>
        f.type === "silence" &&
        f.startFrame === 29 &&
        f.endFrame === 31 &&
        typeof f.maxDbfs === "number",
    ),
  );
  const edges = run(root, [
    ...args,
    "--ignore-head",
    "0",
    "--ignore-tail",
    "0",
  ]);
  assert.equal(edges.status, 0, edges.stderr);
  assert.deepEqual(
    readReport(out)
      .findings.filter((f) => f.type === "silence")
      .map((f) => [f.startFrame, f.endFrame]),
    [
      [0, 4],
      [18, 23],
      [42, 47],
    ],
  );
});

test("自然转静并保持底声通过，突降落点仍响也通过", (context) => {
  const root = temporaryDirectory(context);
  const amplitudes = Array<number>(48).fill(0.002);
  amplitudes
    .fill(0.5, 0, 14)
    .fill(0.02, 14, 16)
    .fill(0.012, 16, 18)
    .fill(0.006, 18, 20);
  const result = run(root, [stereo(root, amplitudes), "--floor", "-60"]);
  assert.equal(result.status, 0, result.stderr);
  const report = readReport(join(root, "out", "qa", "dropouts", "stereo"));
  assert.deepEqual(report.findings, []);
  assert.equal(report.passed, true);
});

test("按变帧率视频的实际帧编号和时间码读延迟的第一条音轨", (context) => {
  const root = temporaryDirectory(context);
  const picture = numberedVideo(root, { duration: 2, vfr: true });
  const amplitudes = Array<number>(18).fill(0.5);
  amplitudes[5] = 0.002;
  const audio = stereo(root, amplitudes, 10),
    video = join(root, "two-tracks.mkv");
  media([
    "-i",
    picture,
    "-itsoffset",
    "0.2",
    "-i",
    audio,
    "-f",
    "lavfi",
    "-i",
    "anullsrc=r=44100:d=2",
    "-map",
    "0:v:0",
    "-map",
    "1:a:0",
    "-map",
    "2:a:0",
    "-c:v",
    "copy",
    "-c:a",
    "pcm_f32le",
    video,
  ]);
  const result = run(root, [video, "--out", root]);
  assert.equal(result.status, 0, result.stderr);
  const report = readReport(root);
  assert.equal(report.frameCount, 17);
  assert.deepEqual(
    report.findings.map((f) => [
      f.type,
      f.startFrame,
      f.startTimecode,
      f.endTimecode,
    ]),
    [["drop", 4, "00:00.700", "00:00.800"]],
  );
  const missing = run(root, [picture]);
  assert.equal(missing.status, 2);
  assert.match(missing.stderr, /^出错：没有音轨/);
});

test("按音频包时间戳保留丢失一帧造成的空隙", (context) => {
  const root = temporaryDirectory(context);
  const input = join(root, "gap.mkv");
  media([
    "-f",
    "lavfi",
    "-i",
    "aevalsrc=0.1:s=48000:d=2",
    "-af",
    "asetnsamples=n=2000,aselect=not(eq(n\\,24))",
    "-c:a",
    "pcm_f32le",
    input,
  ]);
  const result = run(root, [input, "--out", root]);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(
    readReport(root).findings.map((f) => [
      f.type,
      f.startFrame,
      f.startTimecode,
    ]),
    [["drop", 24, "00:01.000"]],
  );
});

test("帮助列全参数并以 0 退出，参数错误以 2 退出", (context) => {
  const root = temporaryDirectory(context),
    help = run(root, ["--help"]);
  assert.equal(help.status, 0);
  assert.match(help.stdout, /用法：/);
  for (const option of [
    "--floor",
    "--max-drop",
    "--min-duration",
    "--ignore-head",
    "--ignore-tail",
    "--fps",
    "--out",
  ])
    assert.ok(help.stdout.includes(option));
  for (const args of [
    [],
    ["input", "--floor", "2"],
    ["input", "--max-drop", "NaN"],
    ["input", "--ignore-tail", "-1"],
    ["input", "--fps", "0"],
  ]) {
    const result = run(root, args);
    assert.equal(result.status, 2);
    assert.match(result.stderr, /^出错：/);
  }
});

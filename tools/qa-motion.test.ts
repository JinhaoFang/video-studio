/**
 * Exercise the motion CLI using ffmpeg-generated temporary media, never checked
 * in. Cover quiet/noisy holds, single-frame and faded return flashes, flashes
 * after cuts and at range ends, sustained cuts, slow push/pull, native VFR timing,
 * range clipping, configurable inclusive thresholds, optional evidence images,
 * help and argument/runtime failures.
 * Run with `node --test tools/qa-motion.test.ts` or `pnpm verify`.
 */
import assert from "node:assert/strict";
import { readFileSync, readdirSync, symlinkSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { test } from "node:test";
import {
  commandOutput,
  image,
  media,
  runCommand,
  temporaryDirectory,
} from "./test-support.ts";

const cli = resolve(import.meta.dirname, "qa.ts");
type Finding = {
  type: "still" | "flash";
  startSeconds: number;
  endSeconds: number;
  durationSeconds: number;
  maxDifference: number;
  returnDifference: number | null;
  keyframes: { role: string; seconds: number; path: string }[];
};
type Report = {
  input: string;
  range: { fromSeconds: number; toSeconds: number };
  thresholds: {
    stillSeconds: number;
    stillDiff: number;
    flashSeconds: number;
    flashDiff: number;
    noiseFloor: number;
  };
  analysis: {
    frameCount: number;
    maxAdjacentDifference: number;
    maxFrameGapSeconds: number;
  };
  findings: Finding[];
  passed: boolean;
};
const run = (root: string, args: string[], path = process.env.PATH) =>
  runCommand(process.execPath, [cli, "motion", ...args], {
    cwd: root,
    env: { ...process.env, PATH: path },
  });
const reportFrom = (stdout: string): { path: string; report: Report } => {
  const path = stdout.trim().split("\n").at(-1)!;
  return { path, report: JSON.parse(readFileSync(path, "utf8")) };
};
const makeVideo = (
  root: string,
  filter: string,
  name = "fixture ' $ ;.mkv",
  extra: string[] = [],
): string => {
  const path = join(root, name);
  media([
    "-f",
    "lavfi",
    "-i",
    filter,
    ...extra,
    "-vsync",
    "0",
    "-c:v",
    "ffv1",
    "-threads",
    "1",
    path,
  ]);
  return path;
};
const near = (actual: number, expected: number): void =>
  assert.ok(Math.abs(actual - expected) < 0.002, `${actual} != ${expected}`);

test("quiet and grainy holds are reported for their full duration with default thresholds", (context) => {
  const root = temporaryDirectory(context);
  for (const noisy of [false, true]) {
    const input = makeVideo(
      root,
      `smptebars=s=640x360:r=30:d=4${noisy ? ",noise=alls=20:allf=t+u:all_seed=42" : ""}`,
    );
    const result = run(root, [input]);
    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.match(result.stderr, /^出错：动态自检/);
    const { path, report } = reportFrom(result.stdout);
    assert.equal(path, join(root, "out/qa/motion/fixture ' $ ;/motion.json"));
    assert.equal(report.input, input);
    assert.equal(report.passed, false);
    assert.deepEqual(report.thresholds, {
      stillSeconds: 3,
      stillDiff: 0.003,
      flashSeconds: 0.25,
      flashDiff: 0.03,
      noiseFloor: 2,
    });
    assert.equal(report.analysis.frameCount, 120);
    assert.equal(report.findings.length, 1);
    const finding = report.findings[0];
    assert.equal(finding.type, "still");
    near(finding.startSeconds, 0);
    near(finding.endSeconds, 4);
    assert.ok(finding.maxDifference <= report.thresholds.stillDiff);
    assert.deepEqual(finding.keyframes, []);
    writeFileSync(path, "overwrite me");
    assert.deepEqual(reportFrom(run(root, [input]).stdout).report, report);
  }
});

test("one-frame return flashes retain native timing and optional before/peak/after JPGs", (context) => {
  const root = temporaryDirectory(context);
  const input = makeVideo(
    root,
    "color=black:s=320x180:r=30:d=2,drawbox=color=white:t=fill:enable='eq(n,15)'",
  );
  const result = run(root, [
    input,
    "--out",
    "custom report",
    "--keyframes",
    "evidence ' $ ;",
  ]);
  assert.equal(result.status, 1, result.stderr);
  const { path, report } = reportFrom(result.stdout);
  assert.equal(path, join(root, "custom report/motion.json"));
  assert.equal(report.findings.length, 1);
  const flash = report.findings[0];
  assert.equal(flash.type, "flash");
  near(flash.startSeconds, 0.5);
  near(flash.endSeconds, 16 / 30);
  assert.ok(flash.maxDifference > 0.9);
  assert.equal(flash.returnDifference, 0);
  assert.deepEqual(
    flash.keyframes.map((frame) => frame.role),
    ["before", "peak", "after"],
  );
  const levels = flash.keyframes.map((frame) => image(frame.path).at(160, 90));
  assert.ok(levels[0] < 5 && levels[1] > 250 && levels[2] < 5);
  near(flash.keyframes[0].seconds, 14 / 30);
  near(flash.keyframes[1].seconds, 0.5);
  near(flash.keyframes[2].seconds, 16 / 30);
});

test("brief faded excursions are found even when no adjacent step reaches the flash threshold", (context) => {
  const root = temporaryDirectory(context);
  const input = makeVideo(
    root,
    "nullsrc=s=320x180:r=30:d=2,geq=lum='16+if(between(N,15,19),12*(3-abs(N-17)),0)':cb=128:cr=128",
  );
  const result = run(root, [input, "--flash-diff", "0.1"]);
  assert.equal(result.status, 1, result.stdout + result.stderr);
  const report = reportFrom(result.stdout).report;
  assert.ok(report.analysis.maxAdjacentDifference < 0.1);
  assert.equal(report.findings.length, 1);
  assert.equal(report.findings[0].type, "flash");
  near(report.findings[0].startSeconds, 0.5);
  near(report.findings[0].endSeconds, 20 / 30);
});

test("a persistent cut does not hide a following one-frame return flash", (context) => {
  const root = temporaryDirectory(context);
  const input = makeVideo(
    root,
    "color=black:s=320x180:r=30:d=1,trim=end_frame=22,drawbox=color=gray:t=fill:enable='gte(n,15)',drawbox=color=white:t=fill:enable='eq(n,18)'",
  );
  const result = run(root, [input]);
  assert.equal(result.status, 1, result.stdout + result.stderr);
  const report = reportFrom(result.stdout).report;
  assert.equal(report.analysis.frameCount, 22);
  assert.equal(report.findings.length, 1);
  const flash = report.findings[0];
  assert.equal(flash.type, "flash");
  near(flash.startSeconds, 0.6);
  near(flash.endSeconds, 19 / 30);
  assert.equal(flash.returnDifference, 0);
});

test("a flash after a cut is reported when its recovery frame is the last frame of the scan", (context) => {
  const root = temporaryDirectory(context);
  for (const frames of [20, 22]) {
    const input = makeVideo(
      root,
      `color=black:s=320x180:r=30:d=1,trim=end_frame=${frames},drawbox=color=gray:t=fill:enable='gte(n,15)',drawbox=color=white:t=fill:enable='eq(n,18)'`,
    );
    const result = run(
      root,
      frames === 20 ? [input] : [input, "--to", String(20 / 30)],
    );
    assert.equal(result.status, 1, result.stdout + result.stderr);
    const report = reportFrom(result.stdout).report;
    assert.equal(report.analysis.frameCount, 20);
    assert.equal(report.findings.length, 1);
    const flash = report.findings[0];
    assert.equal(flash.type, "flash");
    near(flash.startSeconds, 0.6);
    near(flash.endSeconds, 19 / 30);
    assert.equal(flash.returnDifference, 0);
  }
});

test("persistent cuts and long excursions pass; flash duration is configurable and inclusive", (context) => {
  const root = temporaryDirectory(context);
  const cut = makeVideo(
    root,
    "color=black:s=320x180:r=20:d=2,drawbox=color=white:t=fill:enable='gte(n,10)'",
    "cut.mkv",
  );
  assert.equal(run(root, [cut]).status, 0);
  const input = makeVideo(
    root,
    "color=black:s=320x180:r=20:d=2,drawbox=color=white:t=fill:enable='between(n,10,15)'",
  );
  const normal = run(root, [input]);
  assert.equal(normal.status, 0, normal.stderr);
  assert.equal(reportFrom(normal.stdout).report.passed, true);
  const extended = run(root, [input, "--flash-seconds", "0.3"]);
  assert.equal(extended.status, 1, extended.stderr);
  const flash = reportFrom(extended.stdout).report.findings[0];
  assert.equal(flash.type, "flash");
  near(flash.durationSeconds, 0.3);
  assert.equal(run(root, [input, "--flash-seconds", "0.299"]).status, 0);
});

test("sustained slow push and pull pass even with subthreshold adjacent differences", (context) => {
  const root = temporaryDirectory(context);
  for (const zoom of ["1+0.0005*on", "1.08-0.0005*on"]) {
    const input = makeVideo(
      root,
      `smptebars=s=1280x720:r=30:d=0.03,zoompan=z='${zoom}':d=120:s=320x180:fps=30`,
    );
    const result = run(root, [input]);
    assert.equal(result.status, 0, result.stdout + result.stderr);
    const report = reportFrom(result.stdout).report;
    assert.equal(report.analysis.frameCount, 120);
    assert.ok(
      report.analysis.maxAdjacentDifference < report.thresholds.stillDiff,
    );
    assert.deepEqual(report.findings, []);
  }
});

test("VFR gaps and cropped ranges use presentation time, not frame count or sampled FPS", (context) => {
  const root = temporaryDirectory(context);
  const input = makeVideo(root, "color=black:s=160x90:r=10:d=4", "vfr.mkv", [
    "-vf",
    "select='not(between(n,1,5))'",
  ]);
  const result = run(root, [
    input,
    "--from",
    "00:00.15",
    "--to",
    "0:03.15",
    "--keyframes",
    "frames",
  ]);
  assert.equal(result.status, 1, result.stderr);
  const report = reportFrom(result.stdout).report;
  assert.deepEqual(report.range, { fromSeconds: 0.15, toSeconds: 3.15 });
  assert.equal(report.findings.length, 1);
  near(report.findings[0].startSeconds, 0.15);
  near(report.findings[0].endSeconds, 3.15);
  near(report.findings[0].durationSeconds, 3);
  assert.ok(report.analysis.maxFrameGapSeconds > 0.449);
  assert.equal(report.findings[0].keyframes[0].seconds, 0);
  const short = run(root, [input, "--from", "0.15", "--to", "3.149"]);
  assert.equal(short.status, 0, short.stderr);
  const tuned = run(root, [
    input,
    "--from",
    "1",
    "--to",
    "3",
    "--still-seconds",
    "2",
    "--still-diff",
    "0",
    "--noise-floor",
    "0",
  ]);
  assert.equal(tuned.status, 1, tuned.stderr);
  near(reportFrom(tuned.stdout).report.findings[0].durationSeconds, 2);
});

test("still evidence has start/middle/end images and numeric threshold overrides affect results", (context) => {
  const root = temporaryDirectory(context);
  const input = makeVideo(
    root,
    "nullsrc=s=160x90:r=10:d=4,geq=lum='16+N':cb=128:cr=128",
  );
  const moving = run(root, [input]);
  assert.equal(moving.status, 0, moving.stderr);
  const quiet = run(root, [
    input,
    "--still-diff",
    "0.2",
    "--flash-diff",
    "0.3",
    "--noise-floor",
    "3",
    "--keyframes",
    "frames",
  ]);
  assert.equal(quiet.status, 1, quiet.stderr);
  const report = reportFrom(quiet.stdout).report;
  assert.equal(report.thresholds.stillDiff, 0.2);
  assert.equal(report.thresholds.flashDiff, 0.3);
  assert.equal(report.thresholds.noiseFloor, 3);
  assert.deepEqual(
    report.findings[0].keyframes.map((frame) => frame.role),
    ["start", "middle", "end"],
  );
});

test("invalid arguments and bad media fail with Chinese diagnostics and help bypasses validation", (context) => {
  const root = temporaryDirectory(context);
  const input = makeVideo(root, "color=s=160x90:r=10:d=1");
  for (const args of [
    [],
    [input, input],
    [input, "--unknown"],
    [input, "--out"],
    [input, "--out", "a", "--out", "b"],
    [input, "--still-seconds", "0"],
    [input, "--flash-seconds", "-1"],
    [input, "--still-diff", "NaN"],
    [input, "--flash-diff", "Infinity"],
    [input, "--noise-floor", "255"],
    [input, "--still-diff", "1.1"],
    [input, "--flash-diff", "1.1"],
    [input, "--flash-diff", "0.003"],
    [input, "--still-seconds", "1oops"],
    [input, "--still-diff", " "],
    [input, "--from", "1", "--to", "1"],
    [input, "--from", "0.5", "--to", "0.4"],
    [input, "--from", "-1"],
    [input, "--to", "2"],
    [input, "--to", "not-a-time"],
  ]) {
    const result = run(root, args);
    assert.equal(result.status, 2, JSON.stringify(args));
    assert.match(result.stderr, /^出错：/);
  }
  assert.equal(readdirSync(root).length, 1);
  for (const args of [["--help"], [input, "--unknown", "--help"]]) {
    const result = run(root, args);
    assert.equal(result.status, 0);
    for (const text of [
      "--still-seconds",
      "默认 3",
      "默认 0.003",
      "默认 0.25",
      "默认 0.03",
      "默认 2",
      "--keyframes",
      "退出码",
    ]) {
      assert.ok(result.stdout.includes(text), text);
    }
  }
  const missing = run(root, [join(root, "missing.mp4")]);
  assert.equal(missing.status, 2);
  assert.match(missing.stderr, /^出错：文件或程序不存在/);
  const corrupt = join(root, "corrupt.mp4");
  writeFileSync(corrupt, "not a video");
  const bad = run(root, [corrupt]);
  assert.equal(bad.status, 2);
  assert.match(bad.stderr, /^出错：ffprobe 运行失败/);
  const audio = join(root, "audio.wav");
  media(["-f", "lavfi", "-i", "anullsrc=r=8000:cl=mono:d=1", audio]);
  const noVideo = run(root, [audio]);
  assert.equal(noVideo.status, 2);
  assert.match(noVideo.stderr, /^出错：没有可解码的视频帧/);
});

test("missing media programs fail without reports and explain installation", (context) => {
  const root = temporaryDirectory(context);
  const isolated = temporaryDirectory(context);
  const input = makeVideo(root, "color=s=160x90:r=10:d=1");
  const noFfmpeg = run(root, [input], isolated);
  assert.equal(noFfmpeg.status, 2);
  assert.match(noFfmpeg.stderr, /^出错：未安装 ffmpeg .*请安装 ffmpeg/);
  symlinkSync(
    commandOutput("which", ["ffmpeg"]).trim(),
    join(isolated, "ffmpeg"),
  );
  const noFfprobe = run(root, [input], isolated);
  assert.equal(noFfprobe.status, 2);
  assert.match(noFfprobe.stderr, /^出错：未安装 ffprobe .*请安装 ffmpeg/);
  assert.equal(readdirSync(root).length, 1);
});

/**
 * Shared node:test fixtures: disposable directories/Git repositories, command
 * runners, lavfi media and grayscale image inspection. No real network or source
 * media is required. Pass a TestContext to register cleanup or clean manually.
 * Repository helpers disable signing and hooks only in their temporary clones.
 */
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import type {
  ExecFileSyncOptionsWithStringEncoding,
  SpawnSyncOptionsWithStringEncoding,
} from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import type { TestContext } from "node:test";

export const temporaryDirectory = (context?: TestContext): string => {
  const root = mkdtempSync(join(tmpdir(), "studio-test-"));
  context?.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
};

export const runCommand = (
  program: string,
  args: string[],
  options: Omit<SpawnSyncOptionsWithStringEncoding, "encoding"> & {
    encoding?: BufferEncoding;
  } = {},
) => spawnSync(program, args, { timeout: 30000, ...options, encoding: "utf8" });

export const commandOutput = (
  program: string,
  args: string[],
  options: Omit<ExecFileSyncOptionsWithStringEncoding, "encoding"> & {
    encoding?: BufferEncoding;
  } = {},
): string =>
  execFileSync(program, args, { timeout: 30000, ...options, encoding: "utf8" });

export const gitRepository = (
  context?: TestContext,
  files: Record<string, string> = {},
) => {
  const root = temporaryDirectory(context);
  const git = (args: string[]): string =>
    commandOutput("git", args, {
      cwd: root,
      encoding: "utf8",
      stdio: "pipe",
    }).trim();
  git(["init", "--quiet", "--initial-branch=main"]);
  git(["config", "core.hooksPath", join(root, "no-hooks")]);
  git(["config", "commit.gpgSign", "false"]);
  git(["config", "user.name", "Studio Test"]);
  git(["config", "user.email", "studio-test@example.com"]);
  for (const [path, contents] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), contents);
  }
  return { root, git };
};

export const media = (args: string[]): Buffer =>
  execFileSync(
    "ffmpeg",
    ["-hide_banner", "-loglevel", "error", "-nostdin", "-y", ...args],
    { timeout: 30000, maxBuffer: 32 * 1024 * 1024 },
  );

export const numberedVideo = (
  root: string,
  options: {
    width?: number;
    height?: number;
    duration?: number;
    step?: number;
    vfr?: boolean;
    offset?: number;
    audio?: boolean;
    name?: string;
  } = {},
): string => {
  const {
    width = 160,
    height = 90,
    duration = 3.2,
    step = 7,
    vfr = false,
    offset = 0,
    audio = false,
  } = options;
  const path = join(
    root,
    options.name ?? `${width}x${height} ' $ ; ${vfr}.mkv`,
  );
  media([
    "-itsoffset",
    String(offset),
    "-f",
    "lavfi",
    "-i",
    `nullsrc=s=${width}x${height}:r=10:d=${duration},format=gray,geq=lum='20+${step}*N'`,
    ...(audio
      ? [
          "-f",
          "lavfi",
          "-i",
          `anullsrc=r=48000:cl=mono:d=${duration + offset}`,
          "-map",
          "0:v:0",
          "-map",
          "1:a:0",
          "-c:a",
          "pcm_s16le",
        ]
      : []),
    ...(vfr ? ["-vf", "select='not(eq(n,1)+eq(n,3)+eq(n,6))'"] : []),
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

export const tone = (
  root: string,
  frequency = 1000,
  amplitude = 0.1,
): string => {
  const path = join(root, `tone ${frequency} ${amplitude} ' $ ;.wav`);
  const expression = `${amplitude}*sin(2*PI*${frequency}*t)`;
  media([
    "-f",
    "lavfi",
    "-i",
    `aevalsrc=${expression}|${expression}:s=48000:d=5:c=stereo`,
    "-c:a",
    "pcm_f32le",
    path,
  ]);
  return path;
};

export const image = (path: string) => {
  const { width, height } = JSON.parse(
    commandOutput("ffprobe", [
      "-v",
      "error",
      "-show_entries",
      "stream=width,height",
      "-of",
      "json",
      path,
    ]),
  ).streams[0] as { width: number; height: number };
  const pixels = media([
    "-i",
    path,
    "-frames:v",
    "1",
    "-pix_fmt",
    "gray",
    "-threads",
    "1",
    "-f",
    "rawvideo",
    "pipe:1",
  ]);
  return { width, height, at: (x: number, y: number) => pixels[y * width + x] };
};

export const frameIs = (value: number, frame: number, step = 7): void => {
  assert.ok(
    Math.abs(value - (20 + frame * step)) <= 2,
    `Expected frame ${frame}, got gray ${value}`,
  );
};

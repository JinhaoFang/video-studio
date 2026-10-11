/**
 * Exercise loudness through the real QA CLI with temporary lavfi media.
 * Theory: ITU-R BS.1770-4, Annex 1 (48 kHz K-weighting biquad coefficients),
 * https://www.itu.int/rec/R-REC-BS.1770-4-201510-I/en . For identical stereo
 * sine channels of peak amplitude A, each mean square is A^2/2. Channel
 * weights are 1, so Integrated = -0.691 + 10*log10(A^2*|H_K(f)|^2).
 * The steady tones remain above the absolute/relative gates. True Peak is
 * 20*log10(A); integer-period tones below Nyquist reconstruct to amplitude A.
 * Assert both measurements within 0.1 of theory, not another meter's output.
 * Also check report schema, silence, inclusive optional thresholds, exit codes,
 * missing audio/programs, invalid arguments, output paths and overwrite.
 * Run with `pnpm verify` or `node --test tools/qa-loudness.test.ts`.
 */
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "node:test";
import type { TestContext } from "node:test";

type Report = {
  input: string;
  measurements: {
    integratedLufs: number | "-Infinity";
    loudnessRangeLu: number;
    truePeakDbtp: number | "-Infinity";
  };
  thresholds: {
    targetLufs: number | null;
    toleranceLu: number | null;
    maxTruePeakDbtp: number | null;
  };
  checks: { integrated: boolean | null; truePeak: boolean | null };
  passed: boolean | null;
};

const cli = resolve(import.meta.dirname, "qa.ts");

const fixture = (context: TestContext): string => {
  const root = mkdtempSync(join(tmpdir(), "studio-loudness-"));
  context.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
};

const run = (root: string, args: string[], path = process.env.PATH) =>
  spawnSync(process.execPath, [cli, "loudness", ...args], {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, PATH: path },
    timeout: 30000,
  });

const media = (args: string[]): void => {
  execFileSync(
    "ffmpeg",
    ["-hide_banner", "-loglevel", "error", "-nostdin", "-y", ...args],
    { timeout: 30000 },
  );
};

const tone = (root: string, frequency = 1000, amplitude = 0.1): string => {
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

const reportFrom = (stdout: string): { path: string; report: Report } => {
  const path = stdout.trim().split("\n").at(-1)!;
  return { path, report: JSON.parse(readFileSync(path, "utf8")) };
};

const powerGain = (coefficients: number[], frequency: number): number => {
  const angle = (2 * Math.PI * frequency) / 48000;
  const real = coefficients.reduce(
    (sum, coefficient, index) => sum + coefficient * Math.cos(index * angle),
    0,
  );
  const imaginary = coefficients.reduce(
    (sum, coefficient, index) => sum - coefficient * Math.sin(index * angle),
    0,
  );
  return real ** 2 + imaginary ** 2;
};

const theoreticalLufs = (frequency: number, amplitude: number): number => {
  const shelf =
    powerGain(
      [1.53512485958697, -2.69169618940638, 1.19839281085285],
      frequency,
    ) / powerGain([1, -1.69065929318241, 0.73248077421585], frequency);
  const highpass =
    powerGain([1, -2, 1], frequency) /
    powerGain([1, -1.99004745483398, 0.99007225036621], frequency);
  return -0.691 + 10 * Math.log10(amplitude ** 2 * shelf * highpass);
};

test("stereo sine Integrated and True Peak match BS.1770 theory within 0.1", (context) => {
  const root = fixture(context);
  for (const [frequency, amplitude] of [
    [1000, 0.1],
    [100, 0.2],
  ]) {
    const input = tone(root, frequency, amplitude);
    const result = run(root, [input]);
    assert.equal(result.error, undefined);
    assert.equal(result.status, 0, result.stdout + result.stderr);
    const { path, report } = reportFrom(result.stdout);
    const expectedLufs = theoreticalLufs(frequency, amplitude);
    const expectedPeak = 20 * Math.log10(amplitude);
    assert.equal(typeof report.measurements.integratedLufs, "number");
    assert.equal(typeof report.measurements.truePeakDbtp, "number");
    assert.ok(
      Math.abs(Number(report.measurements.integratedLufs) - expectedLufs) <=
        0.1,
      `${frequency} Hz: expected ${expectedLufs}, got ${report.measurements.integratedLufs}`,
    );
    assert.ok(
      Math.abs(Number(report.measurements.truePeakDbtp) - expectedPeak) <= 0.1,
    );
    assert.equal(report.measurements.loudnessRangeLu, 0);
    assert.equal(report.input, input);
    assert.deepEqual(report.thresholds, {
      targetLufs: null,
      toleranceLu: null,
      maxTruePeakDbtp: null,
    });
    assert.deepEqual(report.checks, { integrated: null, truePeak: null });
    assert.equal(report.passed, null);
    assert.equal(
      path,
      join(
        root,
        "out",
        "qa",
        "loudness",
        `tone ${frequency} ${amplitude} ' $ ;`,
        "loudness.json",
      ),
    );
    assert.match(
      result.stdout,
      /Integrated: .* LUFS\nLRA: .* LU\nTrue Peak: .* dBTP/,
    );
    assert.match(result.stdout, /Result: REPORT ONLY/);
    writeFileSync(path, "overwrite me");
    const again = run(root, [input]);
    assert.equal(again.status, 0, again.stderr);
    assert.deepEqual(reportFrom(again.stdout).report, report);
  }
});

test("optional thresholds pass inclusively or fail independently with reports and exit codes", (context) => {
  const root = fixture(context);
  const input = tone(root);
  const initial = run(root, [input]);
  assert.equal(initial.status, 0, initial.stderr);
  const measured = reportFrom(initial.stdout).report.measurements;
  const cases = [
    {
      args: [
        "--target-lufs",
        String(Number(measured.integratedLufs) - 0.1),
        "--tolerance",
        "0.1",
      ],
      integrated: true,
      truePeak: null,
    },
    {
      args: [
        "--target-lufs",
        String(measured.integratedLufs),
        "--tolerance",
        "0",
      ],
      integrated: true,
      truePeak: null,
    },
    {
      args: ["--target-lufs", "-20", "--tolerance", "0.1"],
      integrated: true,
      truePeak: null,
    },
    {
      args: ["--target-lufs", "-16", "--tolerance", "0.1"],
      integrated: false,
      truePeak: null,
    },
    {
      args: ["--max-true-peak", String(measured.truePeakDbtp)],
      integrated: null,
      truePeak: true,
    },
    { args: ["--max-true-peak", "-21"], integrated: null, truePeak: false },
    {
      args: [
        "--target-lufs",
        "-20",
        "--tolerance",
        "0.1",
        "--max-true-peak",
        "-19",
      ],
      integrated: true,
      truePeak: true,
    },
    {
      args: [
        "--target-lufs",
        "-16",
        "--tolerance",
        "0.1",
        "--max-true-peak",
        "-21",
      ],
      integrated: false,
      truePeak: false,
    },
  ];
  for (const item of cases) {
    const result = run(root, [input, ...item.args, "--out", "custom report"]);
    const passed = item.integrated !== false && item.truePeak !== false;
    assert.equal(result.error, undefined);
    assert.equal(result.status, passed ? 0 : 1, result.stdout + result.stderr);
    const { path, report } = reportFrom(result.stdout);
    assert.equal(path, join(root, "custom report", "loudness.json"));
    assert.deepEqual(report.checks, {
      integrated: item.integrated,
      truePeak: item.truePeak,
    });
    assert.equal(report.passed, passed);
    for (const [option, key] of [
      ["--target-lufs", "targetLufs"],
      ["--tolerance", "toleranceLu"],
      ["--max-true-peak", "maxTruePeakDbtp"],
    ] as const) {
      const index = item.args.indexOf(option);
      assert.equal(
        report.thresholds[key],
        index < 0 ? null : Number(item.args[index + 1]),
      );
    }
    if (item.integrated !== null) {
      assert.match(
        result.stdout,
        new RegExp(`Integrated check: ${item.integrated ? "PASS" : "FAIL"}`),
      );
    }
    if (item.truePeak !== null) {
      assert.match(
        result.stdout,
        new RegExp(`True Peak check: ${item.truePeak ? "PASS" : "FAIL"}`),
      );
    }
  }
});

test("video audio is measured and video without audio fails clearly without a report", (context) => {
  const root = fixture(context);
  const input = tone(root);
  const video = join(root, "with audio.mkv");
  media([
    "-f",
    "lavfi",
    "-i",
    "color=s=32x32:r=1:d=5",
    "-i",
    input,
    "-c:v",
    "ffv1",
    "-threads",
    "1",
    "-c:a",
    "pcm_f32le",
    video,
  ]);
  const result = run(root, [video]);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(
    reportFrom(result.stdout).report.measurements,
    reportFrom(run(root, [input]).stdout).report.measurements,
  );
  const silentVideo = join(root, "no audio.mkv");
  media(["-i", video, "-map", "0:v:0", "-c:v", "copy", silentVideo]);
  const failure = run(root, [silentVideo, "--out", "should not exist"]);
  assert.equal(failure.status, 1);
  assert.match(failure.stderr, /No audio stream/);
  assert.ok(!readdirSync(root).includes("should not exist"));
});

test("silent audio keeps negative infinity in valid JSON and threshold comparisons", (context) => {
  const root = fixture(context);
  const input = join(root, "silence.wav");
  media(["-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo", "-t", "5", input]);
  for (const thresholds of [
    [],
    ["--max-true-peak", "-1"],
    ["--target-lufs", "-16", "--tolerance", "1"],
  ]) {
    const result = run(root, [input, ...thresholds]);
    assert.equal(
      result.status,
      thresholds.includes("--target-lufs") ? 1 : 0,
      result.stderr,
    );
    assert.deepEqual(reportFrom(result.stdout).report.measurements, {
      integratedLufs: "-Infinity",
      loudnessRangeLu: 0,
      truePeakDbtp: "-Infinity",
    });
  }
});

test("invalid arguments are rejected before measuring or creating output", (context) => {
  const root = fixture(context);
  const input = tone(root);
  for (const args of [
    [],
    [input, input],
    [input, "--unknown"],
    [input, "--out"],
    [input, "--out", "x", "--out", "y"],
    [input, "--target-lufs", "-16"],
    [input, "--tolerance", "1"],
    [input, "--target-lufs", "-16", "--tolerance", "-1"],
    [input, "--target-lufs", "NaN", "--tolerance", "1"],
    [input, "--target-lufs", "-16", "--tolerance", "Infinity"],
    [input, "--max-true-peak", "1oops"],
    [input, "--max-true-peak", " "],
    [input, "--max-true-peak", "-1", "--max-true-peak", "-2"],
  ]) {
    const result = run(root, args);
    assert.equal(result.status, 1, JSON.stringify(args));
    assert.match(result.stderr, /qa:/);
  }
  assert.equal(readdirSync(root).length, 1);
  const help = run(root, ["--help"]);
  assert.equal(help.status, 0);
  assert.match(help.stdout, /pnpm qa loudness/);
  assert.match(help.stdout, /No default thresholds/);
});

test("missing ffmpeg and ffprobe explain how to install them", (context) => {
  const root = fixture(context);
  const input = tone(root);
  const isolated = fixture(context);
  const noFfprobe = run(root, [input], isolated);
  assert.equal(noFfprobe.status, 1);
  assert.match(noFfprobe.stderr, /ffprobe is not installed.*Install ffmpeg/);
  const ffprobe = execFileSync("which", ["ffprobe"], {
    encoding: "utf8",
  }).trim();
  symlinkSync(ffprobe, join(isolated, "ffprobe"));
  const noFfmpeg = run(root, [input], isolated);
  assert.equal(noFfmpeg.status, 1);
  assert.match(noFfmpeg.stderr, /ffmpeg is not installed.*Install ffmpeg/);
});

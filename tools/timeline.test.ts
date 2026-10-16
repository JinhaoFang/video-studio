/**
 * Test the pure timeline seam: cumulative fractional durations/pauses, invalid
 * IDs and missing audio, provenance-independent schema, and direct timestamps.
 * Run with `node --test tools/timeline.test.ts` or `pnpm verify`.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { generateReferenceTimeline, generateTimeline } from "./timeline.ts";
import type { ScriptLine, TimelineSource } from "./timeline.ts";

const source: TimelineSource = {
  kind: "temporary",
  description: "本机参考音轨",
};
const script: ScriptLine[] = [
  { id: "L001", text: "第一句", pauseAfterSeconds: 0.08 },
  { id: "L002", text: "第二句", pauseAfterSeconds: 0.24 },
  { id: "L003", text: "第三句", pauseAfterSeconds: 0.84 },
];
const audio = [
  { id: "L001", durationSeconds: 1.22, src: "temporary/L001.wav" },
  { id: "L002", durationSeconds: 1.9, src: "temporary/L002.wav" },
  { id: "L003", durationSeconds: 2.64, src: "temporary/L003.wav" },
];

test("measured audio and reference timestamps agree without mutating their inputs", () => {
  const before = structuredClone({ script, audio });
  const measured = generateTimeline(script, [...audio].reverse(), source, 0.37);
  const direct = generateReferenceTimeline(
    script,
    [
      { startSeconds: 0.37, endSeconds: 1.59 },
      { startSeconds: 1.67, endSeconds: 3.57 },
      { startSeconds: 3.81, endSeconds: 6.45 },
    ],
    "转写",
  );
  assert.deepEqual(
    measured.lines.map((line) => [line.startFrame, line.endFrame]),
    [
      [11, 48],
      [50, 107],
      [114, 194],
    ],
  );
  assert.deepEqual(
    direct.lines.map((line) => [line.startFrame, line.endFrame]),
    [
      [11, 48],
      [50, 107],
      [114, 194],
    ],
  );
  assert.equal(measured.durationInFrames, 219);
  assert.equal(direct.durationInFrames, 219);
  assert.deepEqual({ script, audio }, before);
});

test("fractional durations and pauses round absolute boundaries without cumulative drift", () => {
  const many = Array.from({ length: 800 }, (_, index) => ({
    id: `L${String(index + 1).padStart(3, "0")}`,
    text: "句",
    pauseAfterSeconds: 0.015,
  }));
  const clips = many.map((line) => ({
    id: line.id,
    durationSeconds: 0.04,
    src: `${line.id}.wav`,
  }));
  const result = generateTimeline(many, clips, source, 0.015);
  assert.equal(result.lines[0].startFrame, 0);
  assert.equal(result.lines[1].startFrame, 2);
  assert.equal(result.lines[799].startFrame, 1319);
  assert.equal(result.durationInFrames, 1320);
  const half = generateTimeline(
    [{ ...script[0], pauseAfterSeconds: 0 }],
    [{ ...audio[0], durationSeconds: 0.1 }],
    source,
    0.35,
  );
  assert.equal(half.lines[0].startFrame, 11);
  assert.equal(half.lines[0].endFrame, 14);
});

test("duplicate, discontinuous or missing IDs and invalid audio fail with useful diagnostics", () => {
  assert.throws(
    () =>
      generateTimeline([script[0], script[0]], audio.slice(0, 1), source, 0),
    /编号重复/,
  );
  assert.throws(
    () => generateTimeline([script[0], script[2]], audio, source, 0),
    /不连续/,
  );
  assert.throws(
    () => generateTimeline(script.slice(1), audio, source, 0),
    /从 L001/,
  );
  assert.throws(
    () => generateTimeline(script, audio.slice(1), source, 0),
    /缺少音频：L001/,
  );
  assert.throws(
    () => generateTimeline(script, [...audio, audio[0]], source, 0),
    /音频编号重复/,
  );
  for (const invalid of [-1, NaN, Infinity]) {
    assert.throws(
      () =>
        generateTimeline(
          [{ ...script[0], pauseAfterSeconds: invalid }],
          audio.slice(0, 1),
          source,
          0,
        ),
      /非负秒数/,
    );
    assert.throws(
      () =>
        generateTimeline(
          script,
          [{ ...audio[0], durationSeconds: invalid }, ...audio.slice(1)],
          source,
          0,
        ),
      /非负秒数/,
    );
  }
  assert.throws(
    () =>
      generateTimeline(
        script,
        [{ ...audio[0], durationSeconds: 0 }, ...audio.slice(1)],
        source,
        0,
      ),
    /大于零/,
  );
  assert.throws(
    () =>
      generateReferenceTimeline(
        script,
        [
          { startSeconds: 0.37, endSeconds: 1.59 },
          { startSeconds: 1.8, endSeconds: 3.7 },
          { startSeconds: 3.94, endSeconds: 6.58 },
        ],
        "转写",
      ),
    /停顿不一致/,
  );
});

test("temporary and ElevenLabs audio produce identical schema and timing, retaining provenance", () => {
  const temporary = generateTimeline(script, audio, source, 0.37);
  const formal = generateTimeline(
    script,
    audio,
    { kind: "elevenlabs", description: "Alice / eleven_multilingual_v2" },
    0.37,
  );
  assert.deepEqual({ ...formal, source }, temporary);
  assert.equal(formal.source.kind, "elevenlabs");
  assert.equal(formal.lines[0].text, "第一句");
  assert.equal(formal.lines[0].pauseAfterSeconds, 0.08);
});

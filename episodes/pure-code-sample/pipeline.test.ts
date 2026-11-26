/** 本期纯逻辑验收：非零镜头起点换算、音效内部对齐点、采样舍入误差与固定种子 PCM 字节确定性。 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { collectEvents, frameToSample } from "./model.ts";
import { mixEvents, synthesizeImpact, wav } from "./audio.ts";

const event = (frame: number) => ({
  frame,
  localFrame: frame,
  shotId: "second",
  kind: "impact",
  description: "触地",
});

test("镜头内事件按时间表换算并按全片帧排序", () => {
  const shots = [
    {
      id: "first",
      durationInFrames: 36,
      events: [{ frame: 35, kind: "end", description: "尾帧" }],
    },
    {
      id: "second",
      durationInFrames: 24,
      events: [
        { frame: 0, kind: "start", description: "首帧" },
        { frame: 12, kind: "impact", description: "中间" },
      ],
    },
  ];
  const events = collectEvents(
    [
      { id: "second", startFrame: 36, durationInFrames: 24 },
      { id: "first", startFrame: 0, durationInFrames: 36 },
    ],
    shots,
  );
  assert.deepEqual(
    events.map(({ frame, localFrame, shotId }) => ({
      frame,
      localFrame,
      shotId,
    })),
    [
      { frame: 35, localFrame: 35, shotId: "first" },
      { frame: 36, localFrame: 0, shotId: "second" },
      { frame: 48, localFrame: 12, shotId: "second" },
    ],
  );
  assert.throws(
    () =>
      collectEvents(
        [{ id: "first", startFrame: 0, durationInFrames: 37 }],
        shots,
      ),
    /不匹配/,
  );
  assert.throws(
    () =>
      collectEvents(
        [{ id: "bad", startFrame: 0, durationInFrames: 24 }],
        [
          {
            id: "bad",
            durationInFrames: 24,
            events: [{ frame: 24, kind: "bad", description: "越界" }],
          },
        ],
      ),
    /超出/,
  );
});

test("音效内部对齐点落在事件帧的采样位置，容差不超过半个采样", () => {
  for (const frameRate of [24, 29.97]) {
    const rate = 48000;
    const samples = Float64Array.from([0.1, 0.2, 0.9, 0.3]);
    const mix = mixEvents(
      [event(48)],
      { samples, alignmentSample: 2 },
      60,
      frameRate,
      rate,
    );
    const expected = (48 * rate) / frameRate;
    const aligned = mix.indexOf(0.9);
    assert.ok(
      Math.abs(aligned - expected) <= 0.5,
      `实际 ${aligned}，理论 ${expected}，允许 ±0.5 个采样`,
    );
    assert.equal(mix[aligned - 2], 0.1);
    assert.equal(mix[aligned + 1], 0.3);
  }
  const actual = synthesizeImpact(149);
  const mix = mixEvents([event(48)], actual, 240, 24);
  const target = frameToSample(48, 48000, 24);
  assert.equal(target, 96000);
  assert.equal(mix[target], actual.samples[actual.alignmentSample]);
  const clipped = mixEvents(
    [event(0)],
    { samples: Float64Array.from([0.1, 0.2, 0.9, 0.3]), alignmentSample: 2 },
    1,
    24,
  );
  assert.equal(clipped[0], 0.9);
  assert.equal(clipped[1], 0.3);
});

test("同一种子两次合成的音效和全片 WAV 字节完全一致", () => {
  const render = (seed: number) => {
    const sound = synthesizeImpact(seed);
    return {
      sound: wav(sound.samples),
      mix: wav(mixEvents([event(48)], sound, 240, 24), 1, 2),
    };
  };
  const first = render(149);
  const second = render(149);
  assert.deepEqual(first.sound, second.sound);
  assert.deepEqual(first.mix, second.mix);
  assert.notDeepEqual(first.sound, render(150).sound);
  assert.equal(first.mix.readUInt32LE(24), 48000);
  assert.equal(first.mix.readUInt16LE(22), 2);
  assert.equal(first.mix.length, 44 + 48000 * 10 * 4);
});

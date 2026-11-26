/** 时间和噪声的公开行为测试。用 node --test 运行。待定事项：无。 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { drawing, hold, tween } from "./timing.ts";
import { fbm2, noise1, noise2, rng } from "./random.ts";

test("一张画内沿用起始帧，关键姿势硬停到下一个键", () => {
  assert.deepEqual(drawing(5, 2), { index: 2, frame: 4 });
  assert.deepEqual(drawing(4, 2), drawing(5, 2));
  const keys: [number, string][] = [
    [0, "a"],
    [6, "b"],
  ];
  assert.equal(hold(5, keys), "a");
  assert.equal(hold(6, keys), "b");
  assert.equal(
    tween(5, [
      { frame: 0, value: 0 },
      { frame: 10, value: 20 },
    ]),
    10,
  );
});

test("打乱帧顺序后，同一种子得到相同的随机序列和平滑噪声", () => {
  const sample = (frame: number) => {
    const generator = rng(71, frame);
    return [
      generator.next(),
      generator.next(),
      noise1(frame + 0.1, 71),
      noise2(0.3, frame, 71),
      fbm2(frame, 0.3, 71),
    ];
  };
  const frames = [1, 3, 8];
  assert.deepEqual(
    frames.map(sample),
    frames.slice().reverse().map(sample).reverse(),
  );
  assert.notDeepEqual(sample(1), sample(3));
});

/** 在全片事件汇总的接缝对亮灯、四点、盖印与淡出逐项对点，首个可见变化必须在事件当帧。 */
import assert from "node:assert/strict";
import test from "node:test";
import { collectFilmEvents, shotRow, shotTable } from "../../model.ts";
import { SEAL_PRESS_FRAME, titleDropTimings } from "../../title/timing.ts";
import { shotTimings } from "../timings.ts";
import { fadeAmount, lampIntensity, S12_TITLE_START } from "./timing.ts";

test("全片片尾事件对应第一个非零灯光、笔点触纸、压印和第一帧淡出", () => {
  const { startFrame, durationInFrames } = shotRow(shotTable, "s12");
  const frames = Array.from({ length: durationInFrames }, (_, f) => f);
  const expected = [
    ["lamp_on", frames.findIndex((f) => lampIntensity(f) > 0)],
    ...titleDropTimings.map((drop) => ["title_dot", S12_TITLE_START + drop.landFrame]),
    ["seal_press", S12_TITLE_START + SEAL_PRESS_FRAME],
    ["fade_out", frames.findIndex((f) => fadeAmount(f) > 0)],
  ];
  const events = collectFilmEvents(shotTable, shotTimings).filter((event) => event.shotId === "s12");
  assert.deepEqual(events.map(({ kind, frame }) => [kind, frame - startFrame]), expected);
  assert.equal(fadeAmount(durationInFrames - 1), 1);
});

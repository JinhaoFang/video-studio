/** 镜头时间表与事件换算的纯逻辑测试。用 node --test 运行。待定事项：无。 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { collectEvents, filmDuration, locateShot } from "./shots.ts";

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

test("时间表的接缝和末尾", () => {
  const table = [
    { id: "a", startFrame: 0, durationInFrames: 4 },
    { id: "b", startFrame: 4, durationInFrames: 7 },
  ];
  assert.equal(filmDuration(table), 11);
  assert.deepEqual(locateShot(table, 4), { row: table[1], localFrame: 0 });
  assert.equal(locateShot(table, 10).localFrame, 6);
  assert.throws(() => locateShot(table, 11));
});

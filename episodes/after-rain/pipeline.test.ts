/**
 * 《雨后》全片装配事件汇总、时间表与后期参数测试（#185 测试接缝）：
 * 1. 验证 12 镜时间表总长 1620 帧（67.5 秒）、s11→s12 的 24 帧叠化区间激活查询；
 * 2. 验证 collectEvents 汇总的全部画面事件 kind 都在 contract.md 第 4 节表内，且全部 12 种带 ★ 种类全片恰好出现一次；
 * 3. 验证第 3 镜保留小样 S1 的 4 条事件并追加第 158 帧的 mud_step；
 * 4. 验证 score.json（除去 hum_voice 乐句）能按真实事件表通过 kit compileScore 全部 mustEndBefore 约束；
 * 5. 验证 grade.ts 各场后期参数与第 3 镜 30–100 帧过渡。
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "node:test";
import { collectEvents } from "../../src/kit/shots.ts";
import { compileScore } from "../../src/kit/sound/score.ts";
import type { EventTable, Score } from "../../src/kit/sound/types.ts";
import { s1Timing } from "../pure-code-sample/shots/s1/timing.ts";
import { moodPosts, postForShot } from "./grade.ts";
import {
  activeShots,
  durationInFrames,
  EVENT_KINDS,
  fps,
  shotTable,
  STAR_EVENT_KINDS,
} from "./model.ts";
import { MUD_STEP_PRELAP, s03Timing } from "./shots/s03/timing.ts";
import { shotTimings } from "./shots/timings.ts";

const root = resolve(import.meta.dirname, "../..");

test("时间表共 12 镜 1620 帧，且叠化区间 1404–1427 同时激活 s11 和 s12", () => {
  assert.equal(shotTable.length, 12);
  assert.equal(durationInFrames, 1620);
  assert.equal(fps, 24);

  const beforeDissolve = activeShots(shotTable, 1403);
  assert.equal(beforeDissolve.length, 1);
  assert.equal(beforeDissolve[0].row.id, "s11");
  assert.equal(beforeDissolve[0].localFrame, 167);

  const dissolveStart = activeShots(shotTable, 1404);
  assert.deepEqual(
    dissolveStart.map((h) => [h.row.id, h.localFrame]),
    [
      ["s11", 168],
      ["s12", 0],
    ],
  );

  const dissolveEnd = activeShots(shotTable, 1427);
  assert.deepEqual(
    dissolveEnd.map((h) => [h.row.id, h.localFrame]),
    [
      ["s11", 191],
      ["s12", 23],
    ],
  );

  const afterDissolve = activeShots(shotTable, 1428);
  assert.equal(afterDissolve.length, 1);
  assert.equal(afterDissolve[0].row.id, "s12");
  assert.equal(afterDissolve[0].localFrame, 24);
});

test("全片所有画面事件的 kind 都在约定第 4 节表里，带 ★ 的种类全片恰好出现一次", () => {
  const events = collectEvents(shotTable, shotTimings);
  assert.ok(events.length > 0);
  const allowed = new Set<string>(EVENT_KINDS);
  const counts = new Map<string, number>();

  for (const event of events) {
    assert.ok(
      allowed.has(event.kind),
      `发现未在 contract.md 第 4 节登记的事件种类：${event.kind}（${event.shotId} 第 ${event.localFrame} 帧）`,
    );
    counts.set(event.kind, (counts.get(event.kind) ?? 0) + 1);
  }

  for (const starKind of STAR_EVENT_KINDS) {
    assert.equal(
      counts.get(starKind) ?? 0,
      1,
      `带 ★ 的事件种类「${starKind}」全片必须恰好出现一次，实际出现 ${counts.get(starKind) ?? 0} 次`,
    );
  }

  for (let i = 1; i < events.length; i++) {
    assert.ok(events[i].frame >= events[i - 1].frame, "事件表必须按全片帧单调排序");
  }
});

test("第 3 镜保留小样 S1 的 4 条事件并追加第 158 帧的 mud_step", () => {
  assert.equal(s03Timing.id, "s03");
  assert.equal(s03Timing.durationInFrames, s1Timing.durationInFrames);
  assert.equal(s03Timing.events.length, s1Timing.events.length + 1);
  assert.deepEqual(s03Timing.events.slice(0, s1Timing.events.length), s1Timing.events);
  const last = s03Timing.events[s03Timing.events.length - 1];
  assert.equal(last.frame, MUD_STEP_PRELAP);
  assert.equal(last.kind, "mud_step");
});

test("score.json（不含 hum_voice）按真实汇总事件表能通过 compileScore 全部锚点与 mustEndBefore 约束", () => {
  const events = collectEvents(shotTable, shotTimings);
  const table: EventTable = {
    fps,
    sampleRate: 48000,
    shotTable: [...shotTable],
    events,
  };
  const raw = JSON.parse(readFileSync(resolve(root, "episodes/after-rain/score.json"), "utf8"));
  const score: Score = {
    fps: raw.fps,
    instruments: {
      piano_felt: raw.instruments.piano_felt,
      strings_pad: raw.instruments.strings_pad,
      harp: raw.instruments.harp,
      glockenspiel: raw.instruments.glockenspiel,
    },
    sections: raw.sections,
    phrases: raw.phrases.filter((p: { id: string }) => p.id !== "hum"),
  };
  const voices = compileScore(score, table, 185);
  assert.ok(voices.length > 50, `预期编译出完整配乐音符，实际 ${voices.length}`);
});

test("grade.ts 按 art.md 输出各场后期参数与第 3 镜 30–100 帧过渡", () => {
  assert.equal(postForShot("s01", 0).darkest, "#1c1e2c");
  assert.equal(postForShot("s02", 50).glow, 0.18);
  assert.equal(postForShot("s03", 0).darkest, moodPosts.rain.darkest);
  assert.equal(postForShot("s03", 100).darkest, moodPosts.dusk.darkest);
  assert.ok(postForShot("s03", 65).glow > moodPosts.rain.glow);
  assert.ok(postForShot("s03", 65).glow < moodPosts.dusk.glow);
  assert.equal(postForShot("s08", 0).glow, 0.45);
  assert.equal(postForShot("s10", 0).glow, 0.38);
  assert.equal(postForShot("s12", 0).grain, 0.07);
  assert.equal(postForShot("s12", 0).darkest, "#1f1b30");
});

/**
 * 第 4–6 镜事件汇总的 Node 测试（#188 测试接缝）：事件帧和动画用的是同一份时间数据。
 * 1. 第 4 镜的脚步落在泥地循环的画张上（第 3 镜第 158 帧那一脚之后每 24 帧一脚），水花最高的一帧是末帧，拔泥和竹篮的事件从步态参数推出来；
 * 2. 第 5 镜的喜剧时机五步和事件帧一致，竹竿弹回的第一下在掉回之后半个周期；
 * 3. 第 6 镜的脚尖转向事件就是停步表里每一小步踩实的那一帧，接着走的步频和着地帧对上；
 * 4. 第 6 镜停住看的那一段，两只脚尖都朝栖点、投影朝画右下（和 person.test.ts 同一判据，换成新时间表）；人物模块按 URL 载入，Canvas 类型留在浏览器的类型检查里。
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { rotateZ, toView, viewBasis } from "../../../../src/kit/engine/figure.ts";

const { personAtPath, personRoute, placePerson, stopTurnPose } = await import(new URL("../../person.ts", import.meta.url).href);
import { collectFilmEvents, shotRow, shotTable } from "../../model.ts";
import { perchPoint, shotCameras } from "../../scene.ts";
import { MUD_STEP_PRELAP, s03Timing } from "../s03/timing.ts";
import {
  S04_BASKET_CREAKS,
  S04_MUD_PULLS,
  S04_MUD_STEPS,
  S04_POSE_OFFSET,
  S04_PUDDLE_STEP,
  S04_SPLASH_PEAK,
  S04_STEP_FRAMES,
  S05_BALANCE_FLAPS,
  S05_CALL_SMALL,
  S05_DROP,
  S05_FALL_BACK,
  S05_FLAPS,
  S05_HUSH,
  S05_POLE_SPRING,
  S05_PUSH_OFF,
  S05_STEADY,
  S05_WINDUP,
  s04Timing,
  s05Timing,
  S06_BASKET_CREAKS,
  S06_HUM_START,
  S06_PULLS,
  S06_STEP_STOP,
  S06_STEPS,
  S06_STOP_TIMING,
  S06_TOE_TURNS,
  s06Timing,
} from "./timing.ts";

const framesOf = (timing: { events: readonly { kind: string; frame: number }[] }, kind: string) =>
  timing.events.filter((event) => event.kind === kind).map((event) => event.frame);

test("第 4 镜：脚步落在泥地循环的画张上，J 切之后每 24 帧一脚，水花最高是末帧", () => {
  const landings = [-S04_POSE_OFFSET, ...S04_MUD_STEPS, S04_PUDDLE_STEP];
  for (const landing of landings) assert.equal((landing + S04_POSE_OFFSET) % S04_STEP_FRAMES, 0, `第 ${landing} 帧不在循环的着地画张上`);
  assert.deepEqual(framesOf(s04Timing, "mud_step"), [...S04_MUD_STEPS]);
  assert.deepEqual(S04_MUD_PULLS, S04_MUD_STEPS.map((landing) => landing + 12));
  assert.equal(S04_PUDDLE_STEP, S04_MUD_STEPS[S04_MUD_STEPS.length - 1] + S04_STEP_FRAMES);
  assert.equal(S04_SPLASH_PEAK, s04Timing.durationInFrames - 1);
  assert.deepEqual(S04_BASKET_CREAKS, [7, 31, 55]);
  assert.equal(s04Timing.durationInFrames, 72);

  const prelap = s03Timing.events.find((event) => event.kind === "mud_step");
  assert.equal(prelap?.frame, MUD_STEP_PRELAP);
  const firstInShot = S04_MUD_STEPS[0];
  assert.equal(firstInShot - MUD_STEP_PRELAP + s03Timing.durationInFrames, S04_STEP_FRAMES, "第 3 镜的声音先行和本镜第一脚应隔一步");
});

test("第 5 镜：五步喜剧时机的帧号和事件一致，竹竿弹回在掉回之后半个周期", () => {
  assert.deepEqual(framesOf(s05Timing, "flinch"), [0]);
  assert.deepEqual(framesOf(s05Timing, "windup"), [S05_WINDUP]);
  assert.deepEqual(framesOf(s05Timing, "push_off"), [S05_PUSH_OFF]);
  assert.deepEqual(S05_FLAPS, [24, 27, 30, 33]);
  assert.ok(S05_FLAPS[0] > S05_PUSH_OFF && S05_FLAPS[S05_FLAPS.length - 1] < S05_HUSH);
  assert.deepEqual(framesOf(s05Timing, "hush"), [S05_HUSH]);
  assert.ok(S05_HUSH < S05_DROP && S05_DROP < S05_FALL_BACK);
  assert.equal(S05_POLE_SPRING - S05_FALL_BACK, 5);
  assert.ok(S05_FALL_BACK < S05_BALANCE_FLAPS[0] && S05_BALANCE_FLAPS[S05_BALANCE_FLAPS.length - 1] < S05_STEADY);
  assert.ok(S05_STEADY < S05_CALL_SMALL && S05_CALL_SMALL < s05Timing.durationInFrames);
  assert.equal(s05Timing.durationInFrames, 108);
});

test("第 6 镜：脚尖转向事件就是每一小步踩实的帧，接着走的步频对着停步表", () => {
  assert.equal(s06Timing.durationInFrames, 96);
  assert.equal(S06_STEP_STOP, S06_STOP_TIMING.settle);
  assert.deepEqual(S06_TOE_TURNS, [
    S06_STOP_TIMING.turnIn[0][1],
    S06_STOP_TIMING.turnIn[1][1],
    S06_STOP_TIMING.turnOut[0][1],
    S06_STOP_TIMING.turnOut[1][1],
  ]);
  assert.deepEqual(S06_TOE_TURNS, [10, 20, 44, 52]);
  assert.equal(S06_HUM_START, S06_STOP_TIMING.resume);
  assert.deepEqual(S06_STEPS, [S06_STOP_TIMING.firstStep, S06_STOP_TIMING.firstStep + S06_STOP_TIMING.stepFrames]);
  assert.deepEqual(S06_PULLS, S06_STEPS.map((landing) => landing + 9));
  for (const frame of [...S06_TOE_TURNS, ...S06_STEPS, ...S06_PULLS, ...S06_BASKET_CREAKS, S06_HUM_START]) {
    assert.ok(frame < s06Timing.durationInFrames, `第 ${frame} 帧超出镜头`);
  }
  const sorted = s06Timing.events.map((event) => event.frame);
  assert.deepEqual(sorted, [...sorted].sort((a, b) => a - b));
});

test("全片事件表里第 4–6 镜的事件落在各自的镜头区间内", () => {
  const rows = shotTable.filter((row) => ["s04", "s05", "s06"].includes(row.id));
  const events = collectFilmEvents(rows, [s04Timing, s05Timing, s06Timing]);
  for (const id of ["s04", "s05", "s06"]) {
    const row = shotRow(shotTable, id);
    const mine = events.filter((event) => event.shotId === id);
    assert.ok(mine.length > 0);
    for (const event of mine) {
      assert.ok(event.frame >= row.startFrame && event.frame < row.startFrame + row.durationInFrames);
    }
  }
  const hum = events.filter((event) => event.kind === "hum_start");
  assert.equal(hum.length, 1);
  assert.equal(hum[0].frame, shotRow(shotTable, "s06").startFrame + S06_HUM_START);
});

test("第 6 镜停住看的那一段（新时间表 22–37 帧），两脚尖更接近栖点、投影朝画右下", () => {
  const [stop, next] = personRoute.courtyard.slice(3, 5);
  const { position, azimuth } = personAtPath(0, [stop, next]);
  const [x, y] = position;
  const camera = shotCameras.s6;
  const bearing = Math.atan2(x - camera.position[0], y - camera.position[1]);
  const perch = Math.atan2(perchPoint[0] - x, perchPoint[1] - y);
  const signed = (radians: number) => Math.atan2(Math.sin(radians), Math.cos(radians));
  const turnToPerch = signed(perch - azimuth);
  const view = placePerson(camera, position, azimuth);
  const basis = viewBasis(view.yaw, view.pitch);
  const [holdStart, holdEnd] = S06_STOP_TIMING.hold;
  for (let frame = holdStart; frame <= holdEnd; frame++) {
    const pose = stopTurnPose(frame, {}, S06_STOP_TIMING);
    for (const side of ["left", "right"] as const) {
      const localAxis = rotateZ([1, 0, 0], pose.pelvisYaw + pose[side].footYaw);
      const [right, down, depth] = toView(basis, localAxis);
      const toe = bearing + Math.atan2(right, depth * Math.cos(view.pitch) - down * Math.sin(view.pitch));
      assert.ok(signed(toe - azimuth) * turnToPerch > 0, `第 ${frame} 帧 ${side} 脚尖转离栖点`);
      assert.ok(Math.abs(signed(perch - toe)) < Math.abs(turnToPerch), `第 ${frame} 帧 ${side} 脚尖未接近栖点`);
      assert.ok(right > 0 && down > 0, `第 ${frame} 帧 ${side} 鞋底纵轴没有指向画右下`);
    }
  }
});

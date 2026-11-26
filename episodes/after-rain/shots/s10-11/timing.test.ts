/**
 * 第 10–11 镜（合）的 Node 端回归：画面事件落在动作真正发生的那一帧、和动画用同一份时间数据；
 * 一拍二与一拍一的分布、关键姿势停住、脚爪离杆的帧、波浪式飞行的起伏和落地减速、邻鸟错开离线；
 * 相机三段不对称、跟拍晚半拍、停稳、摇速上限和末帧落点。用 node --test 运行。
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { project } from "../../../../src/kit/engine/camera.ts";
import { S10_DOLLY, S10_FOLLOW_START, S11_OVERSHOOT_END, s10CameraAt, s11CameraAt, s11CameraTrace } from "./camera.ts";
import {
  s10Drawing,
  s10FacingDeg,
  s10OnPole,
  s10Origin,
  s10Pose,
  S10_PASS_Z,
  s11FlightProgress,
  s11HeroPosition,
  s11WirePoint,
} from "./motion.ts";
import {
  S10_COVERED,
  S10_FLAPS,
  S10_LAST,
  S10_TAKEOFF,
  S10_WING_PASS,
  S10_WING_START,
  S11_FLIGHT_PERIOD,
  S11_FLIGHT_START,
  S11_LAND,
  S11_LAND_X,
  S11_REVEAL_END,
  S11_WING_OFFSET,
  s10FlapAt,
  s10Timing,
  s10WingbeatFrames,
  s11Companions,
  s11CompanionState,
  s11HeroState,
  s11HopStarts,
  s11Timing,
  s11WingbeatFrames,
} from "./timing.ts";
import { WING_PASS_FULL_FROM, WING_PASS_FULL_TO, WING_PASS_STEPS } from "./wing-pass.ts";

const framesOf = (kind: string, events: readonly { frame: number; kind: string }[]) =>
  events.filter((event) => event.kind === kind).map((event) => event.frame);

test("第 10 镜：压身、离杆、竹竿弹回和每一下下扑的事件落在动作真正发生的那一帧", () => {
  assert.deepEqual(framesOf("crouch", s10Timing.events), [12]);
  assert.deepEqual(framesOf("takeoff", s10Timing.events), [S10_TAKEOFF]);
  assert.deepEqual(framesOf("pole_spring", s10Timing.events), [S10_TAKEOFF + 1]);
  assert.deepEqual(framesOf("wing_pass", s10Timing.events), [S10_WING_PASS]);
  assert.ok(s10OnPole(S10_TAKEOFF - 1) && !s10OnPole(S10_TAKEOFF));
  assert.deepEqual(s10Origin(S10_TAKEOFF), s10Origin(0), "56 帧脚趾刚离杆，身体还在栖点");
  assert.notDeepEqual(s10Origin(S10_TAKEOFF + 1), s10Origin(0), "57 帧身体冲出去");
  assert.ok(Math.abs(s10Pose(S10_TAKEOFF - 1).legReach ?? 0) < 0.05, "55 帧脚爪还包着竹竿");
  assert.ok((s10Pose(S10_TAKEOFF).legReach ?? 0) < -0.5, "56 帧腿向后蹬直，脚趾离杆");

  const beats = framesOf("wingbeat", s10Timing.events);
  assert.deepEqual(beats, s10WingbeatFrames());
  assert.deepEqual(
    beats,
    S10_FLAPS.map(([start]) => start + 1),
  );
  for (const frame of beats) {
    const flap = s10FlapAt(frame);
    assert.equal(flap?.phase, 1, `第 ${frame} 帧应是下扑的那一张`);
    assert.ok(s10Pose(frame).wingFlap < 0 && s10Pose(frame - 1).wingFlap >= 0, `第 ${frame} 帧翅膀应刚开始往下扑`);
  }
  assert.ok(s10Pose(S10_TAKEOFF).stretch > 0.2, "腿蹬那一张带拉长的拖影");
});

test("第 10 镜：转脸和压身一拍二，腿蹬到冲向镜头一拍一，压身停住时画张不换", () => {
  for (let frame = 0; frame < 54; frame += 2) {
    assert.deepEqual(s10Pose(frame), s10Pose(frame + 1), `第 ${frame}、${frame + 1} 帧应是同一张画`);
  }
  for (let frame = 55; frame <= S10_WING_START - 1; frame++) {
    assert.notDeepEqual(s10Pose(frame), s10Pose(frame - 1), `第 ${frame} 帧应是一拍一`);
  }
  const holdDrawings = new Set([44, 46, 48, 50, 52].map((frame) => s10Drawing(frame)));
  assert.equal(holdDrawings.size, 1, "停住的 10 帧沿用同一张画");
  assert.ok(s10FacingDeg(0) < s10FacingDeg(12), "0–12 帧转脸朝镜头");
  assert.ok(Math.abs(s10FacingDeg(12) - s10FacingDeg(44)) < 1e-9, "转完脸后朝向不变");
});

test("第 11 镜：扑翅事件从翅膀下扑的状态里推出来，落地前减速，落点在电线上", () => {
  const beats = s11WingbeatFrames();
  assert.equal(beats[0], S11_FLIGHT_START + 1);
  assert.ok(beats.every((frame) => frame >= S11_REVEAL_END && frame < S11_LAND));
  for (const frame of beats) {
    assert.ok(s11HeroState(frame).wingFlap < 0 && s11HeroState(frame - 1).wingFlap >= 0, `第 ${frame} 帧`);
  }
  const perCycle = beats.filter((frame) => frame < S11_FLIGHT_START + S11_FLIGHT_PERIOD).length;
  assert.equal(perCycle, 6, "一个周期 6 下");
  assert.equal(beats.length, 7 * 6 + 5, "7 个周期、第八个周期的两下和落地前的三下刹车扑");
  assert.deepEqual(
    beats.filter((frame) => frame >= 140),
    [141, 143, 145],
  );
  assert.deepEqual(framesOf("wingbeat", s11Timing.events), beats);
  assert.deepEqual(framesOf("land", s11Timing.events), [S11_LAND]);

  let previous = 0;
  let previousStep = Infinity;
  for (let frame = S11_FLIGHT_START; frame <= S11_LAND; frame++) {
    const current = s11FlightProgress(frame);
    const step = current - previous;
    assert.ok(step >= -1e-12, `第 ${frame} 帧一直往前`);
    if (frame > 136) assert.ok(step <= previousStep + 1e-12, `第 ${frame} 帧的间距应一帧比一帧短`);
    else if (frame > S11_FLIGHT_START + 1 && frame <= 136) assert.ok(Math.abs(step - previousStep) < 1e-12, "巡航段速度不变");
    previous = current;
    previousStep = step;
  }
  const land = s11HeroPosition(S11_LAND);
  const wire = s11WirePoint(S11_LAND_X);
  assert.ok(Math.hypot(land[0] - wire[0], land[1] - wire[1], land[2] - wire[2]) < 0.01, "第 150 帧脚踩在电线上");
  const heights = Array.from({ length: 128 }, (_, i) => s11HeroPosition(S11_FLIGHT_START + i)[2]);
  assert.ok(Math.max(...heights) - Math.min(...heights) >= 0.2, "一个周期的起伏约两个体长");
});

test("第 11 镜：邻鸟从同一份鸟群状态里推出离线帧，两两不同，没有两只一模一样", () => {
  const hops = s11HopStarts();
  assert.deepEqual(
    hops.map(({ frame }) => frame).sort((a, b) => a - b),
    [156, 160, 162],
  );
  assert.equal(new Set(hops.map(({ frame }) => frame)).size, hops.length);
  for (const { id, frame } of hops) {
    const member = s11Companions.find((item) => item.id === id)!;
    assert.ok(!s11CompanionState(member, frame).legs && s11CompanionState(member, frame - 1).legs);
  }
  assert.deepEqual(
    framesOf("flock_shift", s11Timing.events),
    hops.map(({ frame }) => frame).sort((a, b) => a - b),
  );
  const signatures = s11Companions.map((member) => `${member.scale.toFixed(3)}|${member.bodyColor}|${member.facing}|${member.idleKind}|${member.basePitch.toFixed(3)}`);
  assert.equal(new Set(signatures).size, s11Companions.length);
  for (let frame = 150; frame < 192; frame += 2) {
    assert.deepEqual(s11CompanionState(s11Companions[0], frame), s11CompanionState(s11Companions[0], frame + 1), "鸟群一拍二");
  }
});

test("遮挡转场：满屏只有 4 帧（第 10 镜第 81–83 帧和第 11 镜第 0 帧），第 11 镜第 9 帧移开", () => {
  assert.equal(WING_PASS_FULL_TO - WING_PASS_FULL_FROM + 1, 4);
  assert.equal(S10_WING_START + WING_PASS_FULL_FROM, S10_COVERED);
  assert.equal(S10_LAST - S10_WING_START + 1, S11_WING_OFFSET, "切点两侧是相邻的两步");
  assert.equal(S11_REVEAL_END - 1 + S11_WING_OFFSET, WING_PASS_STEPS - 1);
  assert.ok(S10_WING_START < S10_WING_PASS && S10_WING_PASS < S10_COVERED);
});

test("相机：第 10 镜推轨三段不对称、起飞后晚几拍才起摇；第 11 镜切进来已在走、停稳、摇速不超上限、末帧落点 71%,70%", () => {
  const start = s10CameraAt(0);
  const stopped = s10CameraAt(S10_DOLLY.decelEnd);
  assert.notDeepEqual(start.position, stopped.position, "起飞前推轨");
  assert.deepEqual(stopped.position, s10CameraAt(83).position, "推轨在起飞前停住，起飞后机位不动");
  assert.equal(start.focal, stopped.focal, "不变焦");
  for (let frame = 0; frame <= S10_FOLLOW_START; frame++) {
    assert.equal(s10CameraAt(frame).yaw, start.yaw, `第 ${frame} 帧还没起摇`);
  }
  assert.ok(s10CameraAt(83).yaw > start.yaw, "晚几拍跟着麻雀往右摇");
  assert.ok(S10_DOLLY.decelEnd - S10_DOLLY.uniformEnd > S10_DOLLY.accelEnd, "停稳比起步长");

  const s11Start = s11CameraAt(0);
  assert.notEqual(s11CameraAt(1).pitch, s11Start.pitch, "切进来时相机已经在走");
  const final = s11CameraAt(191);
  const trace = s11CameraTrace();
  assert.ok(Math.abs(trace.pitch[191] - trace.pitch[174]) < 0.02, "172 帧前后停稳（之后总共不到半像素）");
  assert.ok(Math.max(...trace.pitch) > trace.pitch[191] + 0.004, "停稳前略过头再回正");
  assert.ok(trace.pitch.indexOf(Math.max(...trace.pitch)) > 150 && trace.pitch.indexOf(Math.max(...trace.pitch)) < S11_OVERSHOOT_END);
  for (const traceValues of [trace.yaw, trace.pitch]) {
    for (let frame = 1; frame < traceValues.length; frame++) {
      assert.ok(Math.abs(traceValues[frame] - traceValues[frame - 1]) < 0.61, `第 ${frame} 帧摇速超过上限（每帧不到 0.61 度）`);
    }
  }
  const land = project(final, s11WirePoint(S11_LAND_X));
  assert.ok(Math.abs(land.x / 1920 - 0.71) < 0.015, `末帧落点横向 ${(land.x / 1920 * 100).toFixed(1)}%`);
  assert.ok(Math.abs(land.y / 1080 - 0.7) < 0.015, `末帧落点纵向 ${(land.y / 1080 * 100).toFixed(1)}%`);
  assert.ok(S10_PASS_Z > 1.95, "麻雀从镜头右上方掠过");
});

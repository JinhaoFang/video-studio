/** 用装配实际交给声音的事件回查那一张画，覆盖甩水变向、蓬起、眼光、挪脚和开喙，也核对两道切口的干湿状态。 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { collectFilmEvents, shotTable } from "../../model.ts";
import { shotTimings } from "../timings.ts";
import { baskPose, lookBeat, shakePose } from "./performance.ts";

const events = collectFilmEvents(shotTable, shotTimings);
const local = (shot: string, kind: string) => events
  .filter((event) => event.shotId === shot && event.kind === kind)
  .map((event) => event.localFrame);

test("三阵甩水的每一声都在躯干或头的转折画上，末张圆球接下一镜", () => {
  const shakes = local("s07", "shake");
  assert.equal(shakes.length, 14);
  for (const [i, frame] of shakes.entries()) {
    const angle = (f: number) => i < 2 ? shakePose(f).pose.headRoll : shakePose(f).pose.bodyPitch;
    assert.ok((angle(frame) - angle(frame - 1)) * (angle(frame + 1) - angle(frame)) < 0, `甩水第 ${frame} 帧要变向`);
  }
  const [puff] = local("s07", "puff");
  assert.ok(shakePose(puff - 1).pose.ruffle! < 1);
  assert.equal(shakePose(puff).pose.ruffle, baskPose(0).ruffle);
  assert.equal(shakePose(puff).pose.wet, baskPose(0).wet);
});

test("静默里连续晒干，切到特写后先抬头亮眼，再挪脚开喙", () => {
  const [hush] = local("s08", "hush");
  assert.deepEqual([hush, 60, 110].map((f) => baskPose(f).wet), [1, 0.5, 0]);
  const last = baskPose(shotTable.find((shot) => shot.id === "s08")!.durationInFrames - 1);
  const start = lookBeat(0).pose;
  for (const prop of ["wet", "ruffle", "puff", "eyeOpen", "headPitch"] as const) assert.equal(start[prop], last[prop]);
  const [look] = local("s09", "look_up");
  assert.equal(lookBeat(look - 1).pose.sparkle, 0);
  assert.equal(lookBeat(look).pose.sparkle, 1);
  assert.ok(lookBeat(look).pose.headPitch > lookBeat(look - 1).pose.headPitch);
  const [shift] = local("s09", "claw_shift");
  assert.equal(lookBeat(shift - 1).pose.crouch, 0);
  assert.ok(lookBeat(shift).pose.crouch > 0);
  const [call] = local("s09", "call_clear");
  assert.equal(lookBeat(call - 1).pose.beakOpen, 0);
  assert.ok(lookBeat(call).pose.beakOpen > 0);
});

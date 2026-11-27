/** 在独立测试进程里先把第 10、11 镜各延长一帧，再载入镜头，验证真实切点两侧的画步和相机末帧。 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { shotRow, shotTable } from "../../model.ts";

test("第 10、11 镜各加长一帧，翅膀跨切点继续下一步，相机都走到新的末帧", async () => {
  const ten = shotRow(shotTable, "s10");
  const eleven = shotRow(shotTable, "s11");
  ten.durationInFrames++;
  eleven.startFrame++;
  eleven.durationInFrames++;
  shotRow(shotTable, "s12").startFrame += 2;

  const { S10_WING_START, S11_WING_OFFSET } = await import("./timing.ts");
  const { S10_PAN_DEG, s10CameraAt, s11CameraAt } = await import("./camera.ts");
  const last = ten.durationInFrames - 1;
  assert.equal(eleven.startFrame - ten.startFrame - 1, last);
  assert.equal(S11_WING_OFFSET, last - S10_WING_START + 1);
  assert.equal(s10CameraAt(last).yaw, s10CameraAt(0).yaw + S10_PAN_DEG * Math.PI / 180);
  assert.ok(s10CameraAt(last - 1).yaw < s10CameraAt(last).yaw);
  const end = eleven.durationInFrames - 1;
  assert.notEqual(s11CameraAt(end).pitch, s11CameraAt(end - 1).pitch);
  assert.deepEqual(s11CameraAt(end + 1), s11CameraAt(end));
});

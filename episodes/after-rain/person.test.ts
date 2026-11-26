/** 用 Node 实测第 6 镜双脚方位。人物绘制模块按 URL 载入，让 Canvas 类型留在浏览器的类型检查里。 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { rotateZ, toView, viewBasis } from "../../src/kit/engine/figure.ts";
import { paddyWorld, perchPoint, puddleW1, shotCameras, yardPath } from "./scene.ts";

const { personAtPath, personRoute, placePerson, stopTurnPose } = await import(new URL("./person.ts", import.meta.url).href);

const signedAngle = (radians: number) => Math.atan2(Math.sin(radians), Math.cos(radians));

test("转脚分两步，支撑脚的方位不随骨盆提前转动", () => {
  const plantedYaw = (frame: number, side: "left" | "right") => {
    const pose = stopTurnPose(frame);
    return pose.pelvisYaw + pose[side].footYaw;
  };
  for (let frame = 14; frame <= 22; frame++) {
    assert.ok(Math.abs(plantedYaw(frame, "left") - plantedYaw(0, "left")) < 1e-10);
    assert.ok(Math.abs(plantedYaw(frame, "right") - plantedYaw(34, "right")) < 1e-10);
  }
});

test("人的院内路线与院外田埂取自场景", () => {
  assert.deepEqual(personRoute.courtyard, yardPath.map(([x, y]) => [x, y, 0]));
  assert.deepEqual(personRoute.puddleW1, [puddleW1.x, puddleW1.y, 0]);
  assert.deepEqual(personRoute.stopPoint, [...yardPath[3], 0]);
  assert.deepEqual(personRoute.sparrowPerch, perchPoint);
  assert.deepEqual(personRoute.distantRidgeStart, [paddyWorld.farmerRidgeXMin, paddyWorld.farmerRidgeY, 0]);
  assert.deepEqual(personRoute.distantRidgeEnd, [paddyWorld.farmerRidgeXMax, paddyWorld.farmerRidgeY, 0]);
});

test("第 6 镜停步的第 34–60 帧，两脚尖的世界方位都更接近栖点，投影朝画右下", () => {
  const [stop, next] = personRoute.courtyard.slice(3, 5);
  const { position, azimuth } = personAtPath(0, [stop, next]);
  const [x, y] = position;
  const camera = shotCameras.s6;
  const bearing = Math.atan2(x - camera.position[0], y - camera.position[1]);
  const perch = Math.atan2(perchPoint[0] - x, perchPoint[1] - y);
  const turnToPerch = signedAngle(perch - azimuth);
  const view = placePerson(camera, position, azimuth);
  const basis = viewBasis(view.yaw, view.pitch);

  for (let frame = 34; frame <= 60; frame++) {
    const pose = stopTurnPose(frame);
    for (const side of ["left", "right"] as const) {
      const localAxis = rotateZ([1, 0, 0], pose.pelvisYaw + pose[side].footYaw);
      const [right, down, depth] = toView(basis, localAxis);
      const groundDepth = depth * Math.cos(view.pitch) - down * Math.sin(view.pitch);
      const toe = bearing + Math.atan2(right, groundDepth);
      const label = `第 ${frame} 帧 ${side}`;
      assert.ok(signedAngle(toe - azimuth) * turnToPerch > 0, `${label} 脚尖转离栖点`);
      assert.ok(Math.abs(signedAngle(perch - toe)) < Math.abs(turnToPerch), `${label} 脚尖未接近栖点`);
      assert.ok(right > 0 && down > 0, `${label} 鞋底纵轴没有指向画右下`);
    }
  }
});

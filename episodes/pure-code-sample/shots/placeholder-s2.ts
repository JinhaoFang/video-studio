/** S2 占位用的两台近景机位：在麻雀前方偏左约 1 米，长焦，看向竹竿上的麻雀。#155、#156 的正式镜头可以照抄后自行调整，不要改这个文件。 */
import type { Camera, Vec3 } from "../engine/camera.ts";
import { poleAt, reference } from "../scene.ts";
import { perch } from "./placeholder.ts";

const target = poleAt(perch);

const aim = (offset: Vec3, focal: number): Camera => {
  const position: Vec3 = [target[0] + offset[0], target[1] + offset[1], target[2] + offset[2]];
  const dx = target[0] - position[0];
  const dy = target[1] - position[1];
  const dz = target[2] + 0.05 - position[2];
  return { ...reference, position, yaw: Math.atan2(dx, dy), pitch: Math.atan2(dz, Math.hypot(dx, dy)), focal };
};

export const s2Start = aim([-0.2, -1.15, 0.08], 62);
export const s2Close = aim([-0.18, -1.05, 0.08], 64);

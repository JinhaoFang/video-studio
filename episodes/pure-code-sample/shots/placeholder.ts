/**
 * 镜头占位（#152 留给 #153 和 #155、#156 替换）：五层夕光底图、竹竿、竹竿上停着的湿麻雀，相机在两个机位之间慢慢推，没有画面事件。
 * 同时是引擎用法的最小示例：按相机摆底图（drawPlate）、画竹竿（drawPole）、把麻雀放到竹竿上（placeSparrow → drawSparrow）。
 * perchAt 给出麻雀落在竹竿上的参数 t，使它在某台相机的画面里位于给定的横向比例处。
 */
import type { Camera, Vec3 } from "../engine/camera.ts";
import { drawing, ease, progress } from "../engine/timing.ts";
import type { Shot } from "../model.ts";
import { drawPole, poleScreen } from "../pole.ts";
import { pole, poleAt, reference } from "../scene.ts";
import { backlight, drawSparrow, restPose } from "../sparrow.ts";
import { drawPlate, placeSparrow } from "../stage.ts";
import type { Surface } from "../stage.ts";

export const perchAt = (camera: Camera, fraction: number) => {
  let best = 0;
  let bestErr = Infinity;
  for (let i = 0; i <= 400; i++) {
    const t = i / 400;
    const err = Math.abs(poleScreen(camera, t).x - camera.width * fraction);
    if (err < bestErr) {
      bestErr = err;
      best = t;
    }
  }
  return best;
};

export const s1End: Camera = { ...reference, position: [0.5, 1.25, 1.95], pitch: 0.035, focal: 46 };

export const perch = perchAt(s1End, 0.62);

const lerpCamera = (a: Camera, b: Camera, t: number): Camera => ({
  ...a,
  position: [0, 1, 2].map((i) => a.position[i] + (b.position[i] - a.position[i]) * t) as Vec3,
  yaw: a.yaw + (b.yaw - a.yaw) * t,
  pitch: a.pitch + (b.pitch - a.pitch) * t,
  focal: a.focal + (b.focal - a.focal) * t,
});

export const placeholderShot = (id: string, durationInFrames: number, from: Camera, to: Camera, eaves: boolean): Shot<Surface> => ({
  id,
  durationInFrames,
  events: [],
  post: {},
  draw: ({ context, plates }, frame) => {
    const camera = lerpCamera(from, to, ease(progress(frame, 0, durationInFrames - 1)));
    const { index } = drawing(frame, 2);
    drawPlate(context, plates.far, "far", camera);
    drawPlate(context, plates.field, "field", camera);
    drawPlate(context, plates.hedge, "hedge", camera);
    drawPlate(context, plates.yard, "yard", camera);
    drawPole(context, camera, { state: "dusk", drawing: index });
    const top = poleAt(perch);
    const feet: Vec3 = [top[0], top[1], top[2] + pole.radius];
    const place = placeSparrow(camera, feet, 0.55);
    drawSparrow(
      context,
      { x: place.x, y: place.y, ppu: place.ppu, yaw: place.yaw, pitch: place.pitch, lighting: { ...backlight, direction: place.light }, drawing: index, seed: 153 },
      { ...restPose, wet: 0.75, bodyPitch: 0.3, headPitch: 0.05, headYaw: 0.25 },
    );
    if (eaves) drawPlate(context, plates.eaves, "eaves", camera);
  },
});

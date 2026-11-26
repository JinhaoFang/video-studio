/**
 * S2 B 版的舞台：麻雀停在镜头 1 末尾机位里竹竿约 62% 宽处的同一点（perch，照 placeholder.ts 的 perchAt 在这里复算，不依赖占位文件）；
 * 近景机位在它前方偏左约 1.15 米、比它高 0.2 米（略俯视，和镜头 1 末尾的俯角相近，也让角色衬在明亮的稻田前而不是青灰的树篱前）、
 * 84 mm 长焦（比占位机位的 62 mm 再近一档：镜头 1 末尾麻雀已推到约 300 像素高，这里取约 460 像素高，切过来才是近景），取景点在麻雀左侧 4 厘米，让它落在画面约 56% 宽处（镜头 1 末尾在 62% 宽处，同在画面右侧），
 * 整段极慢推近、略向右跟（每帧都动，停稳后仍留一点漂移），起飞后略向上摇，第 114 帧摇停（和画面事件 settle 同一帧；乐谱最后一个音锚在 settle，取 118 会越过 S2 的末帧）。cameraAt 给出每帧的相机。
 * poleSag 给出竹竿在停点处的竖直位移（米）：压身时略弯，被蹬到最低点后按衰减振动弹回；bendAt 把它摊到整根竹竿（两端固定的第一振型）。
 * 只由帧号决定。待定（设计）：推近和上摇的幅度是本版按镜头剧本「极慢」「略」自定的。
 */
import type { Camera, Vec3 } from "../../../../src/kit/engine/camera.ts";
import { ease, progress, tween } from "../../../../src/kit/engine/timing.ts";
import { pole, poleAt, reference } from "../../../after-rain/scene.ts";
import { poleScreen } from "../../../after-rain/pole.ts";

const s1End: Camera = { ...reference, position: [0.5, 1.25, 1.95], pitch: 0.035, focal: 46 };

const perchAt = (camera: Camera, fraction: number) => {
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

export const shotFrames = 144;

export const perch = perchAt(s1End, 0.62);

const axis = poleAt(perch);

export const perchTop: Vec3 = [axis[0], axis[1], axis[2] + pole.radius];

const rest = 0.05;
const tiltEnd = 114;
const push = (frame: number) => ease(progress(frame, 0, shotFrames - 1));

export const cameraAt = (frame: number): Camera => {
  const aimX = tween(frame, [
    { frame: 0, value: -0.04 },
    { frame: 60, value: -0.035 },
    { frame: 120, value: -0.03 },
    { frame: 220, value: -0.016 },
  ]);
  const aimZ = tween(frame, [
    { frame: 0, value: rest },
    { frame: 77, value: rest },
    { frame: tiltEnd, value: 0.088 },
  ]);
  const dist = 1.15 - 0.1 * push(frame);
  const position: Vec3 = [perchTop[0] - 0.2, perchTop[1] - dist, perchTop[2] + 0.2];
  const dx = perchTop[0] + aimX - position[0];
  const dy = perchTop[1] - position[1];
  const dz = perchTop[2] + aimZ - position[2];
  return {
    ...reference,
    position,
    yaw: Math.atan2(dx, dy),
    pitch: Math.atan2(dz, Math.hypot(dx, dy)),
    focal: 84,
  };
};

const springStart = 76;
const dip = 0.016;
const decay = 11.5;
const omega = (2 * Math.PI) / 4.8;

export const poleSag = (frame: number): number => {
  if (frame < 64) return 0;
  if (frame < 73) return -0.004 * ease(progress(frame, 64, 70));
  if (frame < springStart) return -0.004 - 0.012 * ease(progress(frame, 73, springStart), 1.6, 1);
  const t = frame - springStart;
  return -dip * Math.exp(-t / decay) * Math.cos(omega * t);
};

const modeAtPerch = Math.sin(Math.PI * perch);

export const bendAt = (frame: number) => {
  const sag = poleSag(frame);
  return sag === 0 ? undefined : (t: number) => (sag * Math.sin(Math.PI * t)) / modeAtPerch;
};

export const poleBoil = (frame: number) => Math.floor(frame / 2);

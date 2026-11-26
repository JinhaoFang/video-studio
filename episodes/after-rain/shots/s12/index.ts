/**
 * 第 12 镜（尾）的全片装配预演（#185）：从第 1 镜末机位起幅（空栖点 71%,70% 与第 11 镜末落点重合供 24 帧叠化），缓慢后拉上仰露出暮色老屋与天空。
 * 第 40 帧前用暮色檐暗遮住底图里烘焙的格子门亮灯与地面反光，第 40 帧亮灯揭示暖光；片名组件（#183）未合并，左侧天空片名位先留空；第 196–215 帧淡出到暮色最暗色 #1f1b30。
 * 待定事项：片名与印章渲染由 #191 在 #183 合并后接入。
 */
import { project } from "../../../../src/kit/engine/camera.ts";
import type { Camera } from "../../../../src/kit/engine/camera.ts";
import { mix, progress } from "../../../../src/kit/engine/timing.ts";
import type { Shot } from "../../../../src/kit/shots.ts";
import { drawPole } from "../../pole.ts";
import { house, shotCameras } from "../../scene.ts";
import { drawViewPlate, viewImage } from "../../stage.ts";
import type { Surface } from "../../stage.ts";
import { darkestByMood, houseTwilight } from "../../tokens.ts";
import {
  S12_DURATION,
  S12_FADE_OUT,
  S12_LAMP_ON,
  s12CameraProgress,
  s12Timing,
} from "./timing.ts";

const mixCamera = (a: Camera, b: Camera, t: number): Camera => ({
  position: [
    mix(a.position[0], b.position[0], t),
    mix(a.position[1], b.position[1], t),
    mix(a.position[2], b.position[2], t),
  ],
  yaw: mix(a.yaw, b.yaw, t),
  pitch: mix(a.pitch, b.pitch, t),
  focal: mix(a.focal, b.focal, t),
  width: a.width,
  height: a.height,
});

const s12CameraAt = (frame: number): Camera =>
  mixCamera(shotCameras.s12Start, shotCameras.s12End, s12CameraProgress(frame));

const eveningBreezeBend = (frame: number) => (t: number) => {
  const weight = Math.sin(Math.PI * Math.max(0, Math.min(1, t)));
  const amp = 0.005 * (0.75 + 0.25 * Math.sin((frame * Math.PI * 2) / 96));
  return amp * Math.sin((frame * Math.PI * 2) / 40) * weight;
};

const drawS12 = (surface: Surface, frame: number) => {
  const ctx = surface.context;
  const camera = s12CameraAt(frame);

  ctx.fillStyle = houseTwilight.skyHigh;
  ctx.fillRect(0, 0, camera.width, camera.height);
  drawViewPlate(ctx, viewImage(surface, "house-sky-twilight"), "house-sky-twilight", camera);
  drawViewPlate(ctx, viewImage(surface, "house-front-twilight"), "house-front-twilight", camera);

  if (frame < S12_LAMP_ON) {
    const coverAlpha = 1 - progress(frame, S12_LAMP_ON - 2, S12_LAMP_ON);
    const r = house.litRoom;
    const padX = 0.28;
    const padZ = 0.14;
    const tl = project(camera, [r.xMax + padX, house.wallY, r.zMax + padZ]);
    const tr = project(camera, [r.xMin - padX, house.wallY, r.zMax + padZ]);
    const br = project(camera, [r.xMin - padX, house.wallY, r.zMin - 0.08]);
    const bl = project(camera, [r.xMax + padX, house.wallY, r.zMin - 0.08]);

    ctx.save();
    ctx.globalAlpha = coverAlpha;
    ctx.fillStyle = houseTwilight.eavesDark;
    ctx.beginPath();
    ctx.moveTo(tl.x, tl.y);
    ctx.lineTo(tr.x, tr.y);
    ctx.lineTo(br.x, br.y);
    ctx.lineTo(bl.x, bl.y);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = houseTwilight.wall;
    ctx.globalAlpha = coverAlpha * 0.28;
    ctx.lineWidth = 1.6;
    for (let i = 1; i <= 5; i++) {
      const u = i / 6;
      const top = project(camera, [mix(r.xMax, r.xMin, u), house.wallY, r.zMax]);
      const bot = project(camera, [mix(r.xMax, r.xMin, u), house.wallY, r.zMin]);
      ctx.beginPath();
      ctx.moveTo(top.x, top.y);
      ctx.lineTo(bot.x, bot.y);
      ctx.stroke();
    }
    for (let j = 1; j <= 4; j++) {
      const v = j / 5;
      const left = project(camera, [r.xMax, house.wallY, mix(r.zMin, r.zMax, v)]);
      const right = project(camera, [r.xMin, house.wallY, mix(r.zMin, r.zMax, v)]);
      ctx.beginPath();
      ctx.moveTo(left.x, left.y);
      ctx.lineTo(right.x, right.y);
      ctx.stroke();
    }

    const s0 = project(camera, [r.xMax + 1.4, house.verandaY + 1.8, 0]);
    const s1 = project(camera, [r.xMin - 1.4, house.verandaY + 1.8, 0]);
    ctx.fillStyle = houseTwilight.yard;
    ctx.globalAlpha = coverAlpha * 0.92;
    ctx.beginPath();
    ctx.moveTo(bl.x, bl.y);
    ctx.lineTo(br.x, br.y);
    ctx.lineTo(s1.x, s1.y);
    ctx.lineTo(s0.x, s0.y);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  drawPole(ctx, camera, {
    state: "rain",
    drawing: Math.floor(frame / 4),
    bend: eveningBreezeBend(frame),
    drops: 0,
  });

  if (frame >= S12_FADE_OUT) {
    const fade = progress(frame, S12_FADE_OUT, S12_DURATION - 1);
    ctx.save();
    ctx.globalAlpha = fade;
    ctx.fillStyle = darkestByMood.twilight;
    ctx.fillRect(0, 0, camera.width, camera.height);
    ctx.restore();
  }
};

export const s12: Shot<Surface> = {
  ...s12Timing,
  post: {},
  draw: drawS12,
};

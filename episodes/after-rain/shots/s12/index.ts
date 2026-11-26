/**
 * 第 12 镜（尾）的全片装配预演（#185，#200 换用灭灯版底图加独立灯层）：从第 1 镜末机位起幅（空栖点 71%,70% 与第 11 镜末落点重合供 24 帧叠化），缓慢后拉上仰露出暮色老屋与天空。
 * 第 0–39 帧只画灭灯版暮色屋正面底图；第 40 帧（lamp_on）起通过 drawTwilightLamp 按帧淡入独立亮灯层（格子门亮面、灯晕、檐廊与院子暖光）；片名组件（#183）待 #191 接入；第 196–215 帧淡出到暮色最暗色 #1f1b30。
 * 待定事项：片名与印章渲染由 #191 接入。
 */
import type { Camera } from "../../../../src/kit/engine/camera.ts";
import { progress } from "../../../../src/kit/engine/timing.ts";
import type { Shot } from "../../../../src/kit/shots.ts";
import { drawPole } from "../../pole.ts";
import { shotCameras } from "../../scene.ts";
import { drawTwilightLamp, drawViewPlate, mixCamera, viewImage } from "../../stage.ts";
import type { Surface } from "../../stage.ts";
import { darkestByMood, houseTwilight } from "../../tokens.ts";
import {
  S12_FADE_OUT,
  S12_LAMP_ON,
  s12CameraProgress,
  s12Timing,
} from "./timing.ts";

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

  if (frame >= S12_LAMP_ON) {
    const lampAlpha = Math.min(1, 0.48 + 0.52 * progress(frame, S12_LAMP_ON, S12_LAMP_ON + 3));
    drawTwilightLamp(ctx, surface, camera, lampAlpha);
  }

  drawPole(ctx, camera, {
    state: "rain",
    drawing: Math.floor(frame / 4),
    bend: eveningBreezeBend(frame),
    drops: 0,
  });

  if (frame >= S12_FADE_OUT) {
    const fade = progress(frame, S12_FADE_OUT, s12Timing.durationInFrames - 1);
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

/** 第 12 镜从电线上最后的落点拉回空竿与灯窗。广角停稳后，树梢和空竿继续受风，左侧粉紫天光里写字、盖印，最后整幅一起淡去。 */
import { layer } from "../../../../src/kit/engine/camera.ts";
import { hash } from "../../../../src/kit/engine/random.ts";
import { clamp01 } from "../../../../src/kit/engine/timing.ts";
import type { Shot } from "../../../../src/kit/shots.ts";
import { DISSOLVE_FRAMES } from "../../model.ts";
import { drawPole, poleScreen } from "../../pole.ts";
import { pole, shotCameras, viewReferences } from "../../scene.ts";
import { drawTwilightLamp, drawViewPlate, mixCamera, viewImage, type Surface } from "../../stage.ts";
import { houseTwilight, props } from "../../tokens.ts";
import { drawEndTitle } from "./title.ts";
import { drawBreezyFront } from "./canopy.ts";
import { fadeAmount, lampIntensity, S12_TITLE_START, s12Timing } from "./timing.ts";

const cameraTravel = (frame: number) => {
  const start = DISSOLVE_FRAMES - 4, cruise = start + 8, brake = cruise + 8, stop = S12_TITLE_START - 12;
  const distance = (cruise - start) / 2 + (brake - cruise) + (stop - brake) / 2;
  if (frame <= cruise) return Math.max(0, frame - start) ** 2 / (2 * (cruise - start) * distance);
  if (frame < brake) return ((cruise - start) / 2 + frame - cruise) / distance;
  return 1 - Math.max(0, stop - frame) ** 2 / (2 * (stop - brake) * distance);
};

const eveningBreezeBend = (frame: number) => {
  const amplitude = 0.005 * (0.75 + 0.25 * Math.sin((frame * Math.PI * 2) / 96));
  const displacement = amplitude * Math.sin((frame * Math.PI * 2) / 40);
  return (t: number) => displacement * Math.sin(Math.PI * clamp01(t));
};

export const s12: Shot<Surface> = {
  ...s12Timing,
  post: {},
  draw: (surface, frame) => {
    const ctx = surface.context;
    const camera = mixCamera(shotCameras.s12Start, shotCameras.s12End, cameraTravel(frame));
    ctx.fillStyle = houseTwilight.skyHigh;
    ctx.fillRect(0, 0, camera.width, camera.height);
    const sky = layer(viewReferences.houseReverse, camera, 3000);
    const horizon = sky.dy + 490 * sky.scale;
    ctx.save();
    ctx.translate(0, horizon);
    ctx.scale(1, 2.4);
    ctx.translate(0, -horizon);
    drawViewPlate(ctx, viewImage(surface, "house-sky-twilight"), "house-sky-twilight", camera);
    ctx.restore();
    drawBreezyFront(ctx, viewImage(surface, "house-front-twilight"), camera, frame);
    drawTwilightLamp(ctx, surface, camera, lampIntensity(frame));
    const bend = eveningBreezeBend(frame);
    drawPole(ctx, camera, { state: "twilight", drawing: 0, bend, drops: 0 });
    ctx.save();
    ctx.fillStyle = props.pole.twilight.shade;
    ctx.globalAlpha = 0.55;
    for (let n = 0; n < 44; n++) {
      const t = 0.02 + 0.94 * hash(191, n, 1);
      const p = poleScreen(camera, t, bend);
      const r = p.scale * pole.radius;
      const y = p.y - r * (0.1 + 0.48 * hash(191, n, 2));
      ctx.beginPath();
      ctx.ellipse(p.x, y, r * (0.26 + hash(191, n, 3)), r * 0.13, 0.06, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    drawEndTitle(ctx, frame - S12_TITLE_START);
    const fade = fadeAmount(frame);
    if (fade > 0) {
      ctx.save();
      ctx.filter = `brightness(${1 - fade})`;
      ctx.drawImage(ctx.canvas, 0, 0);
      ctx.restore();
    }
  },
};

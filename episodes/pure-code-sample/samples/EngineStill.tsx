/**
 * 引擎静帧样张（#152）：S1 推近后的机位，夕光下的各层水粉底图、晾衣竹竿和停在竹竿约 62% 宽处的湿麻雀，经摄影后期。
 * 两帧一张画，用来看线条抖动和每帧耗时；这一帧也是 #153 镜头 1 末尾的构图参考。
 */
import { ShotPreview } from "../../../src/kit/samples/ShotPreview.tsx";
import type { Shot } from "../../../src/kit/shots.ts";
import type { Camera } from "../../../src/kit/engine/camera.ts";
import { defaultPost } from "../../after-rain/tokens.ts";
import { drawing } from "../../../src/kit/engine/timing.ts";
import { drawPole, poleScreen } from "../../after-rain/pole.ts";
import { poleAt, reference, pole } from "../../after-rain/scene.ts";
import { backlight, drawSparrow, restPose } from "../../after-rain/sparrow.ts";
import { drawPlate, placeSparrow } from "../../after-rain/stage.ts";
import type { PlateImages, Surface } from "../../after-rain/stage.ts";
import { surface, usePlates } from "./usePlates.ts";

import { sampleSize as stillSize } from "../model.ts";

export const stillCamera: Camera = { ...reference, position: [0.5, 1.25, 1.95], pitch: 0.035, focal: 46 };

const post = { ...defaultPost, glow: 0.38, softFocus: 0.38 };

const perch = (() => {
  let best = 0;
  let bestErr = Infinity;
  for (let i = 0; i <= 400; i++) {
    const t = i / 400;
    const err = Math.abs(poleScreen(stillCamera, t).x - stillSize.width * 0.62);
    if (err < bestErr) {
      bestErr = err;
      best = t;
    }
  }
  return best;
})();

const paint = (ctx: CanvasRenderingContext2D, frame: number, images: PlateImages) => {
  const { index } = drawing(frame, 2);
  drawPlate(ctx, images.far, "far", stillCamera);
  drawPlate(ctx, images.field, "field", stillCamera);
  drawPlate(ctx, images.hedge, "hedge", stillCamera);
  drawPlate(ctx, images.yard, "yard", stillCamera);
  drawPole(ctx, stillCamera, { state: "dusk", drawing: index });
  const top = poleAt(perch);
  const feet: [number, number, number] = [top[0], top[1], top[2] + pole.radius];
  const place = placeSparrow(stillCamera, feet, 0.55);
  const contact = poleScreen(stillCamera, perch);
  ctx.save();
  ctx.fillStyle = "rgba(40, 32, 48, 0.35)";
  ctx.beginPath();
  ctx.ellipse(contact.x, contact.y - pole.radius * contact.scale * 0.55, place.ppu * 0.9, pole.radius * contact.scale * 0.35, -0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  drawSparrow(
    ctx,
    { x: place.x, y: place.y, ppu: place.ppu, yaw: place.yaw, pitch: place.pitch, lighting: { ...backlight, direction: place.light }, drawing: index, seed: 153 },
    { ...restPose, wet: 0.75, bodyPitch: 0.3, headPitch: 0.05, headYaw: 0.25, eyeOpen: 0.85 },
  );
  drawPlate(ctx, images.eaves, "eaves", stillCamera);
};

const shot: Shot<Surface> = {
  id: "still", durationInFrames: stillSize.durationInFrames, events: [], post,
  draw: ({ context, plates }, frame) => paint(context, frame, plates),
};

export const EngineStill: React.FC = () => {
  const inputs = usePlates();
  return <ShotPreview shot={shot} defaults={defaultPost} inputs={inputs} surface={surface} />;
};

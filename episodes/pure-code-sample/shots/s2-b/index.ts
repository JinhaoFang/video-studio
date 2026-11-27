/**
 * 镜头 S2「抖水起飞」B 版（#156）：近景，麻雀四分之三侧面朝右停在竹竿上，背景是同一个院子虚焦后的暖色光斑。
 * 每帧的画法：虚焦背景（background.ts）→ 竹竿（传入下沉回弹；不画它自带的水珠，改画 drops.ts 里位置固定的；经 fx.ts 的 limitLineWidth 绕开相机背后的取样点）
 * → 竹竿上挂的水珠 → 接触阴影 →
 * 麻雀（拖影帧先衬上一两张画的残影、画速度线，fx.ts）→ 甩出的水珠（drops.ts）。相机、竹竿运动和表演表见 staging.ts、acting.ts。
 * 导出名 s2 和登记表 shots/index.ts 对应；画面事件由 timing.ts 提供，保持原表演与弹道计算的帧号。
 * 待定（设计）：后期只沿用引擎静帧（PureCodeEngineStill）的两个覆盖值；镜头 1 定稿后如有自己的后期参数，这里跟着对齐。
 */
import type { Camera, Vec3 } from "../../../../src/kit/engine/camera.ts";
import type { Point } from "../../../../src/kit/engine/figure.ts";
import type { Shot } from "../../../../src/kit/shots.ts";
import { drawPole, poleScreen } from "../../../after-rain/pole.ts";
import { pole, poleAt } from "../../../after-rain/scene.ts";
import { backlight, drawSparrow } from "../../../after-rain/sparrow.ts";
import type { SparrowView } from "../../../after-rain/sparrow.ts";
import { placeSparrow } from "../../../after-rain/stage.ts";
import type { Surface } from "../../../after-rain/stage.ts";
import { actingAt, anchorsAt, drawingAt, flightHeading, smearAt } from "./acting.ts";
import type { Acting, Anchors, Drawing } from "./acting.ts";
import { drawBackground } from "./background.ts";
import { drawPoleDrops, drawSpray, sprayAt } from "./drops.ts";
import { ghostAlpha, ghostLayer, limitLineWidth, paintGhost, shakeGhostAlpha, speedLines } from "./fx.ts";
import { bendAt, cameraAt, perch, perchTop, poleBoil, poleSag } from "./staging.ts";
import { s2Timing } from "./timing.ts";

type Framed = { view: SparrowView; acting: Acting; anchors: Anchors; offscreen: boolean };

const feetAt = (frame: number, acting: Acting): Vec3 => {
  const axis = poleAt(perch);
  if (acting.flight) {
    const flight = acting.flight;
    return [axis[0] + flight[0], axis[1] + flight[1], perchTop[2] + flight[2]];
  }
  return [axis[0], axis[1], perchTop[2] + poleSag(frame)];
};

const frameBird = (camera: Camera, drawing: Drawing, frame: number): Framed => {
  const acting = actingAt(drawing.frame);
  const place = placeSparrow(camera, feetAt(frame, acting), 0);
  const view: SparrowView = {
    x: place.x + acting.shift[0],
    y: place.y + acting.shift[1],
    ppu: place.ppu,
    yaw: acting.flight ? -flightHeading - camera.yaw : place.yaw - camera.yaw + acting.facing + acting.turn,
    pitch: place.pitch,
    roll: acting.roll,
    lighting: { ...backlight, direction: place.light },
    drawing: drawing.serial,
    seed: 156,
  };
  return { view, acting, anchors: anchorsAt(acting.pose, view), offscreen: view.y < -240 };
};

const draw: Shot<Surface>["draw"] = ({ context, plates }, frame) => {
  const camera = cameraAt(frame);
  const bend = bendAt(frame);
  drawBackground(context, plates, camera);
  drawPole(limitLineWidth(context), camera, { state: "dusk", drawing: poleBoil(frame), bend, drops: 0 });
  const current = frameBird(camera, drawingAt(frame), frame);
  drawPoleDrops(context, camera, frame, bend, [current.view.lighting.direction[0], current.view.lighting.direction[1]]);
  if (!current.acting.flight) {
    const contact = poleScreen(camera, perch, bend);
    context.save();
    context.fillStyle = "rgba(40, 32, 48, 0.35)";
    context.beginPath();
    context.ellipse(
      contact.x,
      contact.y - pole.radius * contact.scale * 0.55,
      current.view.ppu * 0.9,
      pole.radius * contact.scale * 0.35,
      -0.12,
      0,
      Math.PI * 2,
    );
    context.fill();
    context.restore();
  }
  if (current.offscreen) return;
  const smear = smearAt(frame);
  if (smear) {
    const size = { width: context.canvas.width, height: context.canvas.height };
    for (let g = smear.ghosts; g >= 1; g--) {
      const previous = frameBird(camera, drawingAt(frame - g), frame);
      const ghost = ghostLayer(size.width, size.height);
      drawSparrow(ghost.ctx, previous.view, previous.acting.pose);
      paintGhost(context, ghost, smear.kind === "shake" || smear.kind === "flinch" ? shakeGhostAlpha : ghostAlpha[Math.min(g, ghostAlpha.length - 1)]);
    }
    const near = frameBird(camera, drawingAt(frame - 1), frame);
    const ppu = current.view.ppu;
    const seed = 900 + frame;
    if (smear.kind === "flinch" || smear.kind === "shake")
      speedLines(context, near.anchors.head, current.anchors.head, ppu * 0.62, ppu * 1.35, 10, seed);
    else if (smear.kind === "push") speedLines(context, near.anchors.body, current.anchors.body, ppu * 0.9, ppu * 0.15, 5, seed);
    else
      for (const side of [1, -1])
        speedLines(context, near.anchors.wing(side), current.anchors.wing(side), ppu * 0.4, ppu * 0.12, 4, seed + side);
  }
  drawSparrow(context, current.view, current.acting.pose);
  const light: Point = [current.view.lighting.direction[0], current.view.lighting.direction[1]];
  const spray = sprayAt(
    frame,
    (at) => frameBird(cameraAt(at), drawingAt(at), at).anchors,
    current.view.ppu,
  );
  for (const look of spray) drawSpray(context, look, light);
};

export const s2: Shot<Surface> = {
  ...s2Timing,
  post: { glow: 0.38, softFocus: 0.38 },
  draw,
};

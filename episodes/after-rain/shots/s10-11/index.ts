/**
 * 第 10–11 镜（合）的正式镜头：迎面中景里麻雀转脸、压身、停住、蹬离竹竿，竹竿被蹬得下沉又弹回，它迎着镜头冲过来，翅膀从镜头右侧掠过遮满画面（遮挡转场）；
 * 切进稻田上空的大远景，翅膀往画右移开，麻雀波浪式飞过金色稻田、风吹稻浪、田埂上的人影朝右走，最后落进电线上一排各不相同的同伴中间，旁边三只错开挪动。
 * 动作的帧号和翅拍相位全部取自 timing.ts 与 motion.ts，相机取自 camera.ts；只属于这两个镜头的特效（翅膀遮挡、尘、草、稻浪、雾、云）在 wing-pass.ts 和 ambient.ts。
 * 待定事项：无。
 */
import { directionToView, project } from "../../../../src/kit/engine/camera.ts";
import type { Camera } from "../../../../src/kit/engine/camera.ts";
import { boil, drawStrokes, strokes } from "../../../../src/kit/engine/ink.ts";
import { hash } from "../../../../src/kit/engine/random.ts";
import { drawing } from "../../../../src/kit/engine/timing.ts";
import type { Shot } from "../../../../src/kit/shots.ts";
import { drawFlockBird } from "../../flock.ts";
import { drawDistantPerson, placeDistantPerson } from "../../person.ts";
import { drawPole, poleScreen } from "../../pole.ts";
import { perchT, sunLow, viewPlates } from "../../scene.ts";
import type { ViewPlate } from "../../scene.ts";
import { drawSparrow, sparrowLight } from "../../sparrow.ts";
import type { SparrowView } from "../../sparrow.ts";
import { drawViewPlate, viewImage } from "../../stage.ts";
import type { Surface } from "../../stage.ts";
import { houseTakeoff, ink, paddyWide } from "../../tokens.ts";
import { flockColors } from "../../tokens-sparrow.ts";
import {
  drawCloudDrift,
  drawDust,
  drawFarMist,
  drawPaddyWaves,
  drawPoleContactShadow,
  drawVerandaGrass,
} from "./ambient.ts";
import type { WaveCaches } from "./ambient.ts";
import { s10CameraAt, s11CameraAt } from "./camera.ts";
import {
  S10_CROUCH_DEPTH,
  s10Drawing,
  s10FacingDeg,
  s10OnPole,
  s10Origin,
  s10Pose,
  s11HeroPosition,
  S11_PERSON_HEIGHT,
  s11PersonPosition,
  s11WirePoint,
} from "./motion.ts";
import {
  S10_POLE_SPRING,
  S10_PUSH,
  S10_TAKEOFF,
  S10_WING_START,
  S11_CALL_HOME,
  S11_REVEAL_END,
  S11_WING_OFFSET,
  s10Timing,
  s11Companions,
  s11CompanionState,
  s11HeroState,
  s11Timing,
} from "./timing.ts";
import { drawWingPass } from "./wing-pass.ts";

const deg = (value: number) => (value * Math.PI) / 180;

const s10PoleBend = (frame: number) => (t: number) => {
  if (frame < S10_POLE_SPRING) return 0;
  const elapsed = frame - S10_POLE_SPRING;
  const weight = Math.sin(Math.PI * Math.max(0, Math.min(1, t)));
  const amp = 0.02 * Math.exp(-elapsed / 9);
  return -amp * Math.cos((elapsed * Math.PI * 2) / 10) * weight;
};

const drawS10Sparrow = (ctx: CanvasRenderingContext2D, camera: Camera, frame: number) => {
  const origin = s10Origin(frame);
  const p = project(camera, origin);
  if (p.depth <= 0.05) return;
  const horizontal = Math.hypot(origin[0] - camera.position[0], origin[1] - camera.position[1]);
  const elevation = Math.atan2(camera.position[2] - origin[2], horizontal);
  const bearing = Math.atan2(origin[0] - camera.position[0], origin[1] - camera.position[1]);
  const view: SparrowView = {
    x: p.x,
    y: p.y,
    ppu: p.scale * 0.042,
    yaw: deg(s10FacingDeg(frame)) - bearing - Math.PI / 2,
    pitch: elevation,
    lighting: sparrowLight("lowDusk", directionToView(camera, sunLow)),
    drawing: s10Drawing(frame),
    seed: 18510,
  };
  drawSparrow(ctx, view, s10Pose(frame));
};

const drawLaunchSmear = (ctx: CanvasRenderingContext2D, camera: Camera, frame: number) => {
  if (frame !== S10_TAKEOFF) return;
  const from = poleScreen(camera, perchT);
  const origin = s10Origin(frame);
  const p = project(camera, origin);
  for (let k = 0; k < 5; k++) {
    const r = (n: number) => hash(1905, k, n);
    const startX = p.x + (r(1) - 0.5) * 70;
    const startY = p.y + 24 + r(2) * 44;
    const endX = from.x + (r(3) - 0.5) * 90;
    const endY = from.y - 4 - r(4) * 30;
    const pts = boil(
      [
        [startX, startY] as [number, number],
        [(startX + endX) / 2 + (r(5) - 0.5) * 10, (startY + endY) / 2 - 14] as [number, number],
        [endX, endY] as [number, number],
      ],
      19050 + k,
      0.6,
    );
    drawStrokes(
      ctx,
      strokes(pts, false, {
        seed: 19051 + k,
        base: 2.6,
        min: 1.2,
        max: 3.2,
        light: [0.5, -0.86],
        breakEvery: [1e4, 1e4],
        cornerAngle: 1.2,
        gap: [0, 0],
        litThin: 1,
        dropLit: 0,
        minLength: 12,
      }),
      ink.color,
    );
  }
};

const drawS10 = (surface: Surface, frame: number) => {
  const ctx = surface.context;
  const camera = s10CameraAt(frame);
  const { width, height } = camera;

  ctx.fillStyle = houseTakeoff.wallLit;
  ctx.fillRect(0, 0, width, height);
  drawViewPlate(ctx, viewImage(surface, "house-takeoff"), "house-takeoff", camera);
  drawVerandaGrass(ctx, camera, frame);

  const poleDrawing = frame < S10_PUSH ? s10Drawing(frame) : drawing(frame, 2).index;
  drawPole(ctx, camera, { state: "lowDusk", drawing: poleDrawing, bend: s10PoleBend(frame), drops: 0 });

  if (s10OnPole(frame)) {
    const contact = poleScreen(camera, perchT);
    const ahead = poleScreen(camera, perchT + 0.02);
    const ux = ahead.x - contact.x;
    const uy = ahead.y - contact.y;
    const length = Math.hypot(ux, uy) || 1;
    drawPoleContactShadow(ctx, camera, contact, [ux / length, uy / length], s10Pose(frame).crouch / S10_CROUCH_DEPTH);
  }

  drawDust(ctx, camera, s10CameraAt(0), frame, false);
  if (frame < S10_WING_START) {
    drawS10Sparrow(ctx, camera, frame);
    drawLaunchSmear(ctx, camera, frame);
  }
  drawDust(ctx, camera, s10CameraAt(0), frame, true);

  if (frame >= S10_WING_START) {
    drawWingPass(ctx, frame - S10_WING_START);
  }
};

export const s10: Shot<Surface> = {
  ...s10Timing,
  post: {},
  draw: drawS10,
};

const paddyPlate: ViewPlate = viewPlates.find((p) => p.id === "paddy-wide")!;
const waveCaches: WaveCaches = {
  maskA: { current: null },
  maskB: { current: null },
  lit: { current: null },
  tint: { current: null },
};

export const S11_BIRD_OVERSCALE = 5;

const birdScale = (depth: number) => {
  const f = (24 / 36) * 1920;
  return Math.max(6.6, Math.min(17, ((f * 0.042 * S11_BIRD_OVERSCALE) / depth)));
};

const drawS11 = (surface: Surface, frame: number) => {
  const ctx = surface.context;
  const camera = s11CameraAt(frame);
  const { width, height } = camera;

  ctx.fillStyle = paddyWide.skyCool;
  ctx.fillRect(0, 0, width, height);
  const paddyImg = viewImage(surface, "paddy-wide");
  drawViewPlate(ctx, paddyImg, "paddy-wide", camera);
  drawCloudDrift(ctx, paddyImg, paddyPlate, camera, frame);
  drawPaddyWaves(ctx, paddyImg, paddyPlate, camera, frame, waveCaches);
  drawFarMist(ctx, camera, frame);

  const person = s11PersonPosition(frame, s11Timing.durationInFrames - 1);
  const placed = placeDistantPerson(camera, person, S11_PERSON_HEIGHT);
  if (placed.x > -60 && placed.x < width + 60 && placed.y > -20 && placed.y < height + 120) {
    drawDistantPerson(
      ctx,
      {
        x: placed.x,
        y: placed.y,
        heightPx: placed.heightPx,
        facingRight: true,
        light: "lowDusk",
        drawing: drawing(frame, 2).index,
        seed: 18511,
      },
      frame,
    );
  }

  for (const member of s11Companions) {
    const p = project(camera, s11WirePoint(member.x));
    drawFlockBird(
      ctx,
      {
        x: p.x,
        y: p.y,
        scale: birdScale(p.depth),
        plumpness: member.plumpness,
        bodyColor: member.bodyColor,
        rimTier: member.rimTier,
        seed: member.seed,
      },
      s11CompanionState(member, frame),
    );
  }

  if (frame >= S11_REVEAL_END - 2) {
    const hero = s11HeroPosition(frame);
    const hp = project(camera, hero);
    const base = s11HeroState(frame);
    const calling = frame >= S11_CALL_HOME && frame < S11_CALL_HOME + 4;
    drawFlockBird(
      ctx,
      {
        x: hp.x,
        y: hp.y,
        scale: birdScale(hp.depth),
        plumpness: 1,
        bodyColor: flockColors.bodies[0],
        rimTier: "near",
        seed: 185110,
      },
      calling
        ? { ...base, headPitch: base.headPitch - 0.5, bodyPitch: base.bodyPitch - 0.06, tailLift: base.tailLift + 0.08 }
        : base,
    );
  }

  if (frame < S11_REVEAL_END) {
    drawWingPass(ctx, frame + S11_WING_OFFSET);
  }
};

export const s11: Shot<Surface> = {
  ...s11Timing,
  post: {},
  draw: drawS11,
};

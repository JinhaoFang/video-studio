/**
 * 第 10–11 镜（合）的全片装配预演（#185）：真机位、正式角色设定的关键姿势停格（blocking，不补中间画）、已有烘焙底图。
 * 第 10 镜迎面中景，背后是被低夕阳照亮的老屋与开着的玄关门洞；麻雀压身蓄力、蹬竿冲向镜头并在第 76–83 帧以翅膀遮满画面（10→11 遮挡转场），竹竿物理弹动；
 * 第 11 镜稻田上空大远景，第 0–9 帧承接遮挡转场移开翅膀，露出金色稻田、田埂上提竹篮的小人影与电线上一排同伴；主角波浪式飞向电线并在第 150 帧落于画面约 71%,70% 处，与第 12 镜首帧空栖点重合供叠化。
 * 待定事项：正式飞行中间画、稻浪特效与细化遮挡羽翼由 #190 替换。
 */
import { layer, project } from "../../../../src/kit/engine/camera.ts";
import type { Camera, Vec3 } from "../../../../src/kit/engine/camera.ts";
import { hold, mix, progress } from "../../../../src/kit/engine/timing.ts";
import type { Shot } from "../../../../src/kit/shots.ts";
import {
  createFlock,
  drawFlockBird,
  flockFlightState,
  flockMemberState,
} from "../../flock.ts";
import { drawDistantPerson, placeDistantPerson } from "../../person.ts";
import { drawPole, poleScreen } from "../../pole.ts";
import {
  paddyWorld,
  perchT,
  plateSize,
  pole,
  poleAt,
  shotCameras,
  sunLow,
  viewPlates,
} from "../../scene.ts";
import { drawSparrow, restPose, sparrowLight, sparrowPoses } from "../../sparrow.ts";
import type { Pose } from "../../sparrow.ts";
import { drawViewPlate, placeSparrow, viewImage } from "../../stage.ts";
import type { Surface } from "../../stage.ts";
import { darkestByMood, houseTakeoff, paddyWide } from "../../tokens.ts";
import { flockColors, sparrowCommon, sparrowPalettes } from "../../tokens-sparrow.ts";
import {
  S10_CROUCH,
  S10_DURATION,
  S10_HOLD,
  S10_POLE_SPRING,
  S10_PUSH,
  S10_TAKEOFF,
  S10_WINGBEATS,
  S10_WING_PASS,
  s10CameraProgress,
  s10Timing,
  S11_DURATION,
  S11_LAND,
  S11_WIPE_END,
  s11CameraProgress,
  s11Timing,
} from "./timing.ts";

const deg = (v: number) => (v * Math.PI) / 180;

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

const viewYawForAzimuth = (camera: Camera, target: Vec3, azimuthRad: number) => {
  const bearing = Math.atan2(target[0] - camera.position[0], target[1] - camera.position[1]);
  return azimuthRad - bearing - Math.PI / 2;
};

const drawWingWipe = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  sweep: number,
) => {
  const centerX = mix(-width * 0.95, width * 1.95, sweep);
  const halfW = width * 1.12;
  ctx.save();
  ctx.fillStyle = sparrowCommon.silhouetteFill;
  ctx.beginPath();
  ctx.moveTo(centerX - halfW, -height * 0.14);
  ctx.lineTo(centerX + halfW * 0.92, -height * 0.14);
  ctx.quadraticCurveTo(centerX + halfW * 1.14, height * 0.08, centerX + halfW * 0.96, height * 0.24);
  ctx.quadraticCurveTo(centerX + halfW * 1.18, height * 0.44, centerX + halfW * 0.98, height * 0.62);
  ctx.quadraticCurveTo(centerX + halfW * 1.12, height * 0.84, centerX + halfW * 0.94, height * 1.14);
  ctx.lineTo(centerX - halfW * 0.94, height * 1.14);
  ctx.quadraticCurveTo(centerX - halfW * 1.12, height * 0.82, centerX - halfW * 0.96, height * 0.56);
  ctx.quadraticCurveTo(centerX - halfW * 1.14, height * 0.28, centerX - halfW, -height * 0.14);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = sparrowPalettes.lowDuskDry.mantle.shade;
  ctx.globalAlpha = 0.48;
  ctx.beginPath();
  ctx.moveTo(centerX - halfW * 0.72, -height * 0.06);
  ctx.quadraticCurveTo(centerX + halfW * 0.25, -height * 0.12, centerX + halfW * 0.78, height * 0.02);
  ctx.quadraticCurveTo(centerX + halfW * 0.86, height * 0.45, centerX + halfW * 0.66, height * 0.84);
  ctx.quadraticCurveTo(centerX - halfW * 0.15, height * 0.96, centerX - halfW * 0.78, height * 0.86);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
};

const s10StartCam: Camera = shotCameras.s10;
const s10HoldCam: Camera = { ...shotCameras.s10, focal: 38.5 };

const s10CameraAt = (frame: number): Camera =>
  mixCamera(s10StartCam, s10HoldCam, s10CameraProgress(frame));

const s10PoleBend = (frame: number) => (t: number) => {
  if (frame < S10_POLE_SPRING) return 0;
  const elapsed = frame - S10_POLE_SPRING;
  const weight = Math.sin(Math.PI * Math.max(0, Math.min(1, t)));
  const amp = 0.02 * Math.exp(-elapsed / 9);
  return -amp * Math.cos((elapsed * Math.PI * 2) / 10) * weight;
};

const perchPt = poleAt(perchT);

const flightPoint = (u: number): Vec3 => [
  mix(perchPt[0], 1.78, u),
  mix(perchPt[1], 3.45, u),
  mix(perchPt[2] + pole.radius, 1.92, u),
];

type S10Beat = { pose: Pose; feet: Vec3; drawing: number; perched: boolean };

const dryPush: Pose = { ...sparrowPoses.failPush, wet: 0, ruffle: 0, glint: 0.9 };

const s10Beats: readonly [number, S10Beat][] = [
  [
    0,
    {
      pose: { ...restPose, wet: 0, bodyPitch: 0.44, headPitch: 0.08, eyeOpen: 1, glint: 0.9 },
      feet: flightPoint(0),
      drawing: 1,
      perched: true,
    },
  ],
  [S10_CROUCH, { pose: sparrowPoses.takeoffCrouch, feet: flightPoint(0), drawing: 2, perched: true }],
  [
    S10_HOLD,
    {
      pose: { ...sparrowPoses.takeoffCrouch, crouch: 0.94, wingSpread: 0.36 },
      feet: flightPoint(0),
      drawing: 3,
      perched: true,
    },
  ],
  [S10_PUSH, { pose: dryPush, feet: flightPoint(0.06), drawing: 4, perched: false }],
  [S10_TAKEOFF, { pose: sparrowPoses.flightDown, feet: flightPoint(0.18), drawing: 5, perched: false }],
  [S10_WINGBEATS[0], { pose: sparrowPoses.flightDown, feet: flightPoint(0.32), drawing: 6, perched: false }],
  [S10_WINGBEATS[1], { pose: sparrowPoses.flightUp, feet: flightPoint(0.48), drawing: 7, perched: false }],
  [S10_WINGBEATS[2], { pose: sparrowPoses.flightDown, feet: flightPoint(0.64), drawing: 8, perched: false }],
  [S10_WINGBEATS[3], { pose: sparrowPoses.flightUp, feet: flightPoint(0.78), drawing: 9, perched: false }],
  [S10_WINGBEATS[4], { pose: sparrowPoses.flightDown, feet: flightPoint(0.9), drawing: 10, perched: false }],
];

const drawS10 = (surface: Surface, frame: number) => {
  const ctx = surface.context;
  const camera = s10CameraAt(frame);

  ctx.fillStyle = houseTakeoff.wallLit;
  ctx.fillRect(0, 0, camera.width, camera.height);
  drawViewPlate(ctx, viewImage(surface, "house-takeoff"), "house-takeoff", camera);

  const beat = hold(frame, s10Beats);
  const bend = s10PoleBend(frame);
  drawPole(ctx, camera, { state: "dusk", drawing: beat.drawing, bend, drops: 0 });

  if (beat.perched) {
    const contact = poleScreen(camera, perchT, bend);
    const placed = placeSparrow(camera, beat.feet, 0, sunLow);
    ctx.save();
    ctx.globalAlpha = 0.32;
    ctx.fillStyle = darkestByMood.lowDusk;
    ctx.beginPath();
    ctx.ellipse(
      contact.x,
      contact.y - pole.radius * contact.scale * 0.55,
      placed.ppu * 0.82,
      pole.radius * contact.scale * 0.34,
      0.08,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.restore();
  }

  if (frame < S10_WING_PASS + 4) {
    const place = placeSparrow(camera, beat.feet, 0, sunLow);
    const yaw = viewYawForAzimuth(camera, beat.feet, deg(57));
    drawSparrow(
      ctx,
      {
        x: place.x,
        y: place.y,
        ppu: place.ppu,
        yaw,
        pitch: place.pitch,
        lighting: sparrowLight("lowDusk", place.light),
        drawing: beat.drawing,
        seed: 18510,
      },
      beat.pose,
    );
  }

  if (frame >= S10_WING_PASS) {
    const u = progress(frame, S10_WING_PASS, S10_DURATION - 1);
    drawWingWipe(ctx, camera.width, camera.height, mix(0.18, 0.5, u));
  }
};

export const s10: Shot<Surface> = {
  ...s10Timing,
  post: {},
  draw: drawS10,
};

const s11StartCam: Camera = shotCameras.s11Start;
const s11EndCam: Camera = {
  ...shotCameras.s11End,
  yaw: deg(41.5),
  pitch: deg(8.3),
  focal: 24,
};

const s11CameraAt = (frame: number): Camera =>
  mixCamera(s11StartCam, s11EndCam, s11CameraProgress(frame));

const WIRE_X0 = paddyWorld.powerLineXStart;
const WIRE_X1 = paddyWorld.powerLineXStart + paddyWorld.poleSpacing;
const WIRE_Y = paddyWorld.powerLineY;
const LAND_X = 47.5;

const wireZAt = (x: number, sagExtra = 0) => {
  const u = Math.max(0, Math.min(1, (x - WIRE_X0) / (WIRE_X1 - WIRE_X0)));
  const catenary = 4 * u * (1 - u);
  return (
    paddyWorld.wireHeight -
    (paddyWorld.wireHeight - paddyWorld.wireSag + sagExtra) * catenary
  );
};

const flockMembers = createFlock(6, 180);
const companionXs = [41.2, 43.4, 45.3, 49.6, 51.9, 54.4] as const;

const heroPathPos = (frame: number): Vec3 => {
  if (frame >= S11_LAND) return [LAND_X, WIRE_Y, wireZAt(LAND_X)];
  const u = progress(frame, S11_WIPE_END, S11_LAND);
  const stepIndex = Math.floor(u * 10);
  const snapped = Math.min(1, stepIndex / 10);
  const wave = Math.sin(stepIndex * 1.45) * 0.42;
  return [
    mix(16.0, LAND_X, snapped),
    mix(21.5, WIRE_Y, snapped),
    mix(5.6, wireZAt(LAND_X), snapped) + wave * (1 - snapped * 0.5),
  ];
};

const paddyPlateSpec = viewPlates.find((p) => p.id === "paddy-wide")!;

const drawS11 = (surface: Surface, frame: number) => {
  const ctx = surface.context;
  const camera = s11CameraAt(frame);

  ctx.fillStyle = paddyWide.skyCool;
  ctx.fillRect(0, 0, camera.width, camera.height);

  const paddyImg = viewImage(surface, "paddy-wide");
  const ptLayer = layer(paddyPlateSpec.reference, camera, paddyPlateSpec.distance);
  const pSize = plateSize(paddyPlateSpec);
  const dstX = paddyPlateSpec.rect.x0 * ptLayer.scale + ptLayer.dx;
  const dstY = paddyPlateSpec.rect.y0 * ptLayer.scale + ptLayer.dy;
  const dstW = (pSize.width / paddyPlateSpec.k) * ptLayer.scale;
  if (dstY > 0) {
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(paddyImg, 0, 0, paddyImg.width, 28, dstX, 0, dstW, dstY + 2);
    ctx.restore();
  }
  drawViewPlate(ctx, paddyImg, "paddy-wide", camera);

  const personStep = Math.floor(progress(frame, 0, S11_DURATION - 1) * 8) / 8;
  const personPos: Vec3 = [mix(20.0, 31.0, personStep), paddyWorld.farmerRidgeY, 0];
  const distant = placeDistantPerson(camera, personPos, 1.55);
  if (distant.x > -40 && distant.x < camera.width + 40 && distant.y > -40 && distant.y < camera.height - 20) {
    drawDistantPerson(
      ctx,
      {
        x: distant.x,
        y: distant.y,
        heightPx: Math.min(28, Math.max(14, distant.heightPx * 0.45)),
        facingRight: true,
        light: "lowDusk",
        drawing: Math.floor(frame / 16),
        seed: 18511,
      },
      frame,
    );
  }

  const landDip =
    frame >= S11_LAND && frame < S11_LAND + 12
      ? 0.08 * Math.exp(-(frame - S11_LAND) / 4)
      : 0;

  ctx.save();
  ctx.strokeStyle = flockColors.wire;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  for (let i = 0; i <= 36; i++) {
    const x = mix(WIRE_X0, WIRE_X1, i / 36);
    const p = project(camera, [x, WIRE_Y, wireZAt(x, landDip)]);
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  }
  ctx.stroke();
  ctx.restore();

  const landSlot = (LAND_X - WIRE_X0) / (WIRE_X1 - WIRE_X0);
  for (let i = 0; i < flockMembers.length; i++) {
    const member = flockMembers[i];
    const x = companionXs[i];
    const p = project(camera, [x, WIRE_Y, wireZAt(x, landDip)]);
    const state = flockMemberState(
      { ...member, slot: (x - WIRE_X0) / (WIRE_X1 - WIRE_X0) },
      Math.floor(frame / 12) * 12,
      { frame: S11_LAND, slot: landSlot },
    );
    drawFlockBird(
      ctx,
      {
        x: p.x,
        y: p.y,
        scale: Math.max(5.5, p.scale * 0.28 * member.scale),
        plumpness: member.plumpness,
        bodyColor: member.bodyColor,
        rimTier: member.rimTier,
        seed: member.seed,
      },
      state,
    );
  }

  const heroPos = heroPathPos(frame);
  const heroProj = project(camera, heroPos);
  const heroState = flockFlightState(frame, { landingFrame: S11_LAND, facing: 1 });
  drawFlockBird(
    ctx,
    {
      x: heroProj.x,
      y: heroProj.y,
      scale: Math.min(18, Math.max(6.2, heroProj.scale * 0.085)),
      plumpness: 1,
      bodyColor: flockColors.bodies[0],
      rimTier: "near",
      seed: 185110,
    },
    heroState,
  );

  if (frame < S11_WIPE_END) {
    const u = progress(frame, 0, S11_WIPE_END);
    drawWingWipe(ctx, camera.width, camera.height, mix(0.5, 1.0, u));
  }
};

export const s11: Shot<Surface> = {
  ...s11Timing,
  post: {},
  draw: drawS11,
};

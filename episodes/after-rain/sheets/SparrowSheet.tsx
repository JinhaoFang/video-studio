/**
 * 麻雀与远处鸟群设定图（#180），对应 Root.tsx 登记的 AfterRainSparrowSheet（96 帧、24fps、1920×1080）。
 * 96 帧按页组织全部验收内容，全部通过 kit 的 ModelSheet 渲染：
 * - f0–11：转面表（湿 / 甩乱 / 干三行 × 正、3/4前、侧、3/4后、背五角度，同一比例，眼/肩/脚水平参考线对齐）；
 * - f12–23：光照色指定（雨色·湿、夕光·湿、夕光·干、低夕光·干、暮色，受光与阴影约各半便于抽色核对）+ 湿→甩乱→干连续过渡 + 眼睛表（侧与 3/4 前 × 睁/半闭/闭/瞪大 × 光点有/无）；
 * - f24–31：姿势表 A（12 个关键姿势，按镜头实际角度）；
 * - f32–39：姿势表 B（同 12 个姿势的侧面对照）；
 * - f40–47：剪影测试（同 12 个关键姿势涂深色检查剪影可读性）；
 * - f48–71：飞行循环与刹车落地连续动画（24 帧，供 pnpm qa strip 逐帧检验上举→宽翅下扑拖影→屈腕上挥→收翅滑行→张翅展尾伸脚落地）；
 * - f72–95：远处鸟群设定（电线上 7 只各不相同的同伴错开动作、主角飞来落地触发邻鸟错开挪动、以及远景逆光剪影与 2 帧振翅循环）。
 * 待定事项：无。
 */
import { useCurrentFrame } from "remotion";
import { ModelSheet as Sheet } from "../../../src/kit/samples/ModelSheet.tsx";
import { drawing } from "../../../src/kit/engine/timing.ts";
import {
  drawSparrow,
  FOOT_Z,
  restPose,
  sparrowLight,
  sparrowPoses,
  sparrowStates,
  transitionSparrowState,
  type Lighting,
  type Pose,
} from "../sparrow.ts";
import {
  createFlock,
  drawFlockBird,
  flockFlightState,
  flockMemberState,
  type FlockBirdState,
  type FlockBirdView,
} from "../flock.ts";
import { defaultPost, sheet } from "../tokens.ts";
import { flockColors, sparrowCommon } from "../tokens-sparrow.ts";

const post = {
  ...defaultPost,
  grain: 0.025,
  grainHighlight: 0.008,
  vignette: 0.1,
  glow: 0.12,
  softFocus: 0.16,
};

type SparrowCell = {
  kind: "sparrow";
  x: number;
  y: number;
  ppu: number;
  yaw: number;
  pitch: number;
  roll?: number;
  lighting: Lighting;
  pose: Pose;
  seed: number;
  onOnes?: boolean;
  silhouetteOnly?: string;
};

type FlockWireCell = {
  kind: "wire";
  y: number;
  x0: number;
  x1: number;
  sag: number;
  width: number;
};

type FlockBirdCell = {
  kind: "flock";
  view: FlockBirdView;
  state: FlockBirdState;
};

type SheetCell = SparrowCell | FlockWireCell | FlockBirdCell;

const TURNAROUND_YAWS = [Math.PI / 2, 0.7, 0, -0.7, -Math.PI / 2] as const;
const SHEET_LIGHT_DIR: [number, number, number] = [0.55, -0.6, -0.6];
const DUSK_SHEET = sparrowLight("dusk", SHEET_LIGHT_DIR, { rimAlpha: 0 });
const RAIN_KEY = sparrowLight("rain", [0.25, -0.82, -0.52]);
const DUSK_KEY = sparrowLight("dusk", [0.58, -0.55, -0.58]);
const DUSK_BACK = sparrowLight("dusk", [0.62, -0.5, 0.58]);
const LOW_DUSK_KEY = sparrowLight("lowDusk", [0.65, -0.48, -0.56]);
const TWILIGHT_KEY = sparrowLight("twilight", [0.42, -0.62, -0.64]);

const guideYs = (y: number, ppu: number, pitch = 0.1) =>
  [1.42, 0.88, 0.35, FOOT_Z].map((g) => y - g * ppu * Math.cos(pitch));

const turnaroundRows = (): { guides: number[]; views: SheetCell[] }[] => {
  const ppu = 58;
  const rowsSpec = [
    { y: 205, state: sparrowStates.wet, seedBase: 100 },
    { y: 555, state: sparrowStates.ruffled, seedBase: 200 },
    { y: 905, state: sparrowStates.dry, seedBase: 300 },
  ];
  return rowsSpec.map(({ y, state, seedBase }) => ({
    guides: guideYs(y, ppu, 0.1),
    views: TURNAROUND_YAWS.map((yaw, i): SparrowCell => ({
      kind: "sparrow",
      x: 240 + i * 360,
      y,
      ppu,
      yaw,
      pitch: 0.1,
      lighting: DUSK_SHEET,
      pose: { ...restPose, ...state },
      seed: seedBase + i,
    })),
  }));
};

const lightAndEyeRows = (): { guides: number[]; views: SheetCell[] }[] => {
  const lightSpecs: { lighting: Lighting; pose: Pose }[] = [
    { lighting: RAIN_KEY, pose: { ...restPose, wet: 1, glint: 0.24 } },
    { lighting: DUSK_KEY, pose: { ...restPose, wet: 1, glint: 0.7 } },
    { lighting: DUSK_KEY, pose: { ...restPose, wet: 0, glint: 0.78 } },
    { lighting: LOW_DUSK_KEY, pose: { ...restPose, wet: 0, glint: 0.94 } },
    { lighting: TWILIGHT_KEY, pose: { ...restPose, wet: 0, glint: 0.2 } },
  ];
  const transitionSpecs = [
    sparrowStates.wet,
    transitionSparrowState(sparrowStates.wet, sparrowStates.ruffled, 0.55),
    sparrowStates.ruffled,
    transitionSparrowState(sparrowStates.ruffled, sparrowStates.dry, 0.5),
    sparrowStates.dry,
  ];
  const eyeSpecs: { yaw: number; pose: Partial<Pose> }[] = [
    { yaw: 0.05, pose: { eyeOpen: 1, glint: 0 } },
    { yaw: 0.05, pose: { eyeOpen: 1, glint: 1, sparkle: 1 } },
    { yaw: 0.05, pose: { eyeOpen: 1.28, glint: 0.82 } },
    { yaw: 0.05, pose: { eyeOpen: 0.46, glint: 0.5 } },
    { yaw: 0.05, pose: { eyeOpen: 0, eyeClosedCurve: 0.85 } },
    { yaw: 0.65, pose: { eyeOpen: 1, glint: 1, sparkle: 1 } },
    { yaw: 0.65, pose: { eyeOpen: 0.46, glint: 0.5 } },
    { yaw: 0.65, pose: { eyeOpen: 1.28, glint: 0.82 } },
  ];

  return [
    {
      guides: [225 - FOOT_Z * 56 * Math.cos(0.1)],
      views: lightSpecs.map((spec, i): SparrowCell => ({
        kind: "sparrow",
        x: 240 + i * 360,
        y: 225,
        ppu: 56,
        yaw: 0.35,
        pitch: 0.1,
        lighting: spec.lighting,
        pose: spec.pose,
        seed: 410 + i,
      })),
    },
    {
      guides: [575 - FOOT_Z * 56 * Math.cos(0.1)],
      views: transitionSpecs.map((st, i): SparrowCell => ({
        kind: "sparrow",
        x: 240 + i * 360,
        y: 575,
        ppu: 56,
        yaw: 0.25,
        pitch: 0.1,
        lighting: DUSK_SHEET,
        pose: { ...restPose, ...st },
        seed: 460 + i,
      })),
    },
    {
      guides: [925 - 0.88 * 68 * Math.cos(0.08)],
      views: eyeSpecs.map((spec, i): SparrowCell => ({
        kind: "sparrow",
        x: 165 + i * 227,
        y: 925,
        ppu: 68,
        yaw: spec.yaw,
        pitch: 0.08,
        lighting: DUSK_SHEET,
        pose: { ...restPose, ...spec.pose },
        seed: 510 + i,
      })),
    },
  ];
};

const POSE_ITEMS: { key: keyof typeof sparrowPoses; shotYaw: number }[] = [
  { key: "startled", shotYaw: 0.55 },
  { key: "failCrouch", shotYaw: 0.5 },
  { key: "failPush", shotYaw: 0.45 },
  { key: "failFlapDown", shotYaw: 0.42 },
  { key: "failHover", shotYaw: 0.45 },
  { key: "failDrop", shotYaw: 0.45 },
  { key: "failTipForward", shotYaw: 0.32 },
  { key: "failRecover", shotYaw: 0.18 },
  { key: "sunbathe", shotYaw: 0.08 },
  { key: "lookUp", shotYaw: 0.18 },
  { key: "flightDown", shotYaw: 0.38 },
  { key: "landingBrake", shotYaw: 0.28 },
];

const poseRows = (
  mode: "shot" | "side" | "silhouette",
): { guides: number[]; views: SheetCell[] }[] => {
  const ppu = 56;
  const buildRow = (start: number, y: number) => ({
    guides: [y - FOOT_Z * ppu * Math.cos(0.1)],
    views: POSE_ITEMS.slice(start, start + 6).map((item, i): SparrowCell => ({
      kind: "sparrow",
      x: 195 + i * 306,
      y,
      ppu,
      yaw: mode === "side" ? 0 : item.shotYaw,
      pitch: 0.1,
      lighting: DUSK_SHEET,
      pose: sparrowPoses[item.key],
      seed: 600 + start + i,
      silhouetteOnly:
        mode === "silhouette" ? sparrowCommon.silhouetteFill : undefined,
    })),
  });
  return [buildRow(0, 315), buildRow(6, 795)];
};

const flightAnimationPose = (local: number): { pose: Pose; dx: number; dy: number } => {
  if (local < 12) {
    const cycle = local % 3;
    const stepX = local * 22;
    if (cycle === 0) {
      return {
        pose: {
          ...sparrowPoses.flightUp,
          wingFlap: 0.94,
          wingFold: 0.66,
        },
        dx: stepX,
        dy: -16,
      };
    }
    if (cycle === 1) {
      return {
        pose: {
          ...sparrowPoses.flightDown,
          wingFlap: -0.92,
          wingSmear: 0.85,
        },
        dx: stepX,
        dy: 8,
      };
    }
    return {
      pose: {
        ...sparrowPoses.flightUp,
        wingFlap: 0.24,
        wingFold: 0.82,
        wingSweep: -0.35,
      },
      dx: stepX,
      dy: -6,
    };
  }
  if (local < 18) {
    const t = (local - 12) / 5;
    const arcY = -36 + 52 * t * t;
    return {
      pose: {
        ...sparrowPoses.flightBound,
        bodyPitch: 0.14 - 0.24 * t,
      },
      dx: 264 + (local - 12) * 26,
      dy: arcY,
    };
  }
  const lt = local - 18;
  const landingSeq: { pose: Pose; dx: number; dy: number }[] = [
    { pose: { ...sparrowPoses.landingBrake, bodyPitch: 0.72, wingFlap: -0.3 }, dx: 410, dy: -22 },
    { pose: { ...sparrowPoses.landingBrake, bodyPitch: 0.86, wingFlap: 0.74 }, dx: 432, dy: -12 },
    { pose: { ...sparrowPoses.landingBrake, bodyPitch: 0.94, wingFlap: 0.65, legReach: 1, toeSpread: 1 }, dx: 446, dy: -4 },
    {
      pose: {
        ...restPose,
        bodyPitch: 0.08,
        crouch: 0.45,
        tailLift: 0.3,
        tailSpread: 0.45,
        wingSpread: 0.68,
        wingFlap: 0.48,
      },
      dx: 454,
      dy: 0,
    },
    {
      pose: {
        ...restPose,
        bodyPitch: 0.28,
        crouch: 0.18,
        tailLift: 0.14,
        wingSpread: 0.24,
        wingFlap: 0.16,
      },
      dx: 456,
      dy: 0,
    },
    { pose: { ...restPose, bodyPitch: 0.42, beakOpen: 0.35 }, dx: 456, dy: 0 },
  ];
  return landingSeq[Math.min(landingSeq.length - 1, lt)];
};

const flightRows = (frame: number): { guides: number[]; views: SheetCell[] }[] => {
  const local = Math.max(0, frame - 48);
  const anim = flightAnimationPose(local);
  const keySequence: { pose: Pose; x: number }[] = [
    { pose: sparrowPoses.flightUp, x: 220 },
    { pose: sparrowPoses.flightDown, x: 580 },
    { pose: { ...sparrowPoses.flightUp, wingFlap: 0.25, wingFold: 0.82 }, x: 940 },
    { pose: sparrowPoses.flightBound, x: 1300 },
    { pose: sparrowPoses.landingBrake, x: 1660 },
  ];
  return [
    {
      guides: [280],
      views: [
        {
          kind: "sparrow",
          x: 340 + anim.dx * 1.15,
          y: 280 + anim.dy,
          ppu: 70,
          yaw: 0.05,
          pitch: 0.08,
          lighting: DUSK_BACK,
          pose: anim.pose,
          seed: 710,
          onOnes: true,
        },
        {
          kind: "sparrow",
          x: 1180 + anim.dx * 0.95,
          y: 280 + anim.dy,
          ppu: 66,
          yaw: 0.58,
          pitch: 0.12,
          lighting: DUSK_BACK,
          pose: anim.pose,
          seed: 711,
          onOnes: true,
        },
      ],
    },
    {
      guides: [805 - FOOT_Z * 60 * Math.cos(0.1)],
      views: keySequence.map((item, i): SparrowCell => ({
        kind: "sparrow",
        x: item.x,
        y: 805,
        ppu: 60,
        yaw: 0.18,
        pitch: 0.1,
        lighting: DUSK_SHEET,
        pose: item.pose,
        seed: 740 + i,
      })),
    },
  ];
};

const FLOCK_ROW = createFlock(7, 180);

const flockRows = (frame: number): { guides: number[]; views: SheetCell[] }[] => {
  const local = Math.max(0, frame - 72);
  const wireY1 = 340;
  const wireY2 = 665;
  const landSlot = 0.5;
  const landLocal = 8;

  const wireSag = (slot: number, sag: number) => 4 * sag * slot * (1 - slot);
  const FLOCK_SLOTS = [0.06, 0.18, 0.31, 0.41, 0.6, 0.74, 0.89];

  const closeBirds: SheetCell[] = [
    { kind: "wire", y: wireY1, x0: 110, x1: 1810, sag: 28, width: 3.2 },
  ];
  for (let i = 0; i < FLOCK_ROW.length; i++) {
    const m = FLOCK_ROW[i];
    const slot = FLOCK_SLOTS[i % FLOCK_SLOTS.length];
    const x = 190 + slot * 1540;
    const y = wireY1 + wireSag(slot, 28);
    const st = flockMemberState(
      { ...m, slot },
      local,
      { frame: landLocal, slot: landSlot },
    );
    closeBirds.push({
      kind: "flock",
      view: {
        x,
        y,
        scale: 34 * m.scale,
        plumpness: m.plumpness,
        bodyColor: m.bodyColor,
        rimTier: m.rimTier,
        rimLight: [-0.65, -0.76],
        seed: m.seed,
        outline: true,
      },
      state: st,
    });
  }
  const heroApproach = flockFlightState(local, { landingFrame: landLocal, facing: 1 });
  const heroProgress = Math.min(1, local / landLocal);
  const heroTargetX = 190 + landSlot * 1540;
  const heroX = heroTargetX - 360 * (1 - heroProgress);
  const heroY =
    wireY1 +
    wireSag(landSlot, 28) -
    (1 - heroProgress) * 155 +
    heroApproach.waveY * 22 * (1 - heroProgress);
  closeBirds.push({
    kind: "flock",
    view: {
      x: heroX,
      y: heroY,
      scale: 34,
      plumpness: 1,
      bodyColor: flockColors.bodies[0],
      rimTier: "near",
      rimLight: [-0.65, -0.76],
      seed: 999,
      outline: true,
    },
    state: heroApproach,
  });

  const distantBirds: SheetCell[] = [
    { kind: "wire", y: wireY2, x0: 180, x1: 1740, sag: 18, width: 2 },
  ];
  for (let i = 0; i < FLOCK_ROW.length; i++) {
    const m = FLOCK_ROW[i];
    const slot = FLOCK_SLOTS[i % FLOCK_SLOTS.length];
    const x = 360 + slot * 1200;
    const y = wireY2 + wireSag(slot, 18);
    const st = flockMemberState(
      { ...m, slot },
      local + 8,
      { frame: landLocal, slot: landSlot },
    );
    distantBirds.push({
      kind: "flock",
      view: {
        x,
        y,
        scale: 13 * m.scale,
        plumpness: m.plumpness,
        bodyColor: m.bodyColor,
        rimTier: m.rimTier,
        rimLight: [-0.65, -0.76],
        seed: m.seed + 50,
      },
      state: st,
    });
  }

  const flyingRow: SheetCell[] = [];
  for (let i = 0; i < 6; i++) {
    const st = flockFlightState(local, {
      phaseOffset: i * 4,
      facing: i % 3 === 2 ? -0.85 : 0.95,
    });
    const x = 230 + i * 290 + local * 6 * (st.facing >= 0 ? 1 : -0.6);
    const y = 925 + st.waveY * 26 + (i % 2 === 0 ? -12 : 14);
    flyingRow.push({
      kind: "flock",
      view: {
        x,
        y,
        scale: (17 + (i % 3) * 3) * (0.94 + i * 0.025),
        plumpness: 0.95 + (i % 3) * 0.05,
        bodyColor: flockColors.bodies[i % flockColors.bodies.length],
        rimTier: i % 2 === 0 ? "near" : "far",
        rimLight: [-0.65, -0.76],
        seed: 880 + i * 19,
      },
      state: st,
    });
  }

  return [
    { guides: [wireY1], views: closeBirds },
    { guides: [wireY2], views: distantBirds },
    { guides: [925], views: flyingRow },
  ];
};

const drawCell = (
  ctx: CanvasRenderingContext2D,
  frame: number,
  cell: SheetCell,
) => {
  if (cell.kind === "wire") {
    ctx.save();
    ctx.strokeStyle = flockColors.wire;
    ctx.lineWidth = cell.width;
    ctx.beginPath();
    ctx.moveTo(cell.x0, cell.y);
    ctx.quadraticCurveTo(
      (cell.x0 + cell.x1) * 0.5,
      cell.y + cell.sag * 2,
      cell.x1,
      cell.y,
    );
    ctx.stroke();
    ctx.restore();
    return;
  }
  if (cell.kind === "flock") {
    drawFlockBird(ctx, cell.view, cell.state);
    return;
  }
  drawSparrow(
    ctx,
    {
      x: cell.x,
      y: cell.y,
      ppu: cell.ppu,
      yaw: cell.yaw,
      pitch: cell.pitch,
      roll: cell.roll,
      lighting: cell.lighting,
      drawing: cell.onOnes ? frame : drawing(frame, 2).index,
      seed: cell.seed,
      silhouetteOnly: cell.silhouetteOnly,
    },
    cell.pose,
  );
};

export const SparrowSheet = () => {
  const frame = useCurrentFrame();
  const rows =
    frame < 12
      ? turnaroundRows()
      : frame < 24
        ? lightAndEyeRows()
        : frame < 32
          ? poseRows("shot")
          : frame < 40
            ? poseRows("side")
            : frame < 48
              ? poseRows("silhouette")
              : frame < 72
                ? flightRows(frame)
                : flockRows(frame);

  return (
    <Sheet
      rows={rows}
      draw={drawCell}
      ground={sheet.ground}
      guide={sheet.guide}
      margin={60}
      lineWidth={1.2}
      post={post}
    />
  );
};

/** 麻雀的转面和姿势表。位置、参考线、光照与摄影参数沿用小样定稿。 */
import { ModelSheet as Sheet } from "../../../src/kit/samples/ModelSheet.tsx";
import { drawing } from "../../../src/kit/engine/timing.ts";
import {
  drawSparrow,
  FOOT_Z,
  restPose,
  sheetLight,
  type Pose,
} from "../../after-rain/sparrow.ts";
import { defaultPost, sheet } from "../../after-rain/tokens.ts";

const post = {
  ...defaultPost,
  grain: 0.03,
  grainHighlight: 0.01,
  vignette: 0.12,
  glow: 0.15,
  softFocus: 0.2,
};
const turnaround = [Math.PI / 2, 0.7, 0, -0.7, -Math.PI / 2];
const poses: Partial<Pose>[] = [
  { wet: 1, bodyPitch: 0.25, headPitch: -0.2, eyeOpen: 0.75 },
  {
    wet: 0.8,
    eyeOpen: 0,
    eyeClosedCurve: -0.9,
    stretch: -0.08,
    headPitch: -0.25,
  },
  { puff: 1, eyeOpen: 0.85, headPitch: 0.05 },
  { headPitch: 0.6, headYaw: 0.15, sparkle: 1, bodyPitch: 0.55 },
  {
    crouch: 1,
    bodyPitch: 0.15,
    headPitch: 0.05,
    tailLift: 0.25,
    stretch: -0.12,
  },
  { wingSpread: 1, wingFlap: 0.6, legs: false, bodyPitch: 0.15, lift: 0.4 },
];
const rows = [
  {
    guides: [1.62, 0.88, FOOT_Z].map((g) => 330 - g * 78 * Math.cos(0.12)),
    views: turnaround.map((yaw, i) => ({
      x: 230 + i * 365,
      y: 330,
      ppu: 78,
      yaw,
      seed: 152 + i,
      pose: restPose,
    })),
  },
  {
    guides: [820 - FOOT_Z * 64 * Math.cos(0.12)],
    views: poses.map((pose, i) => ({
      x: 190 + i * 305,
      y: 820,
      ppu: 64,
      yaw: 0.45,
      seed: 260 + i,
      pose: { ...restPose, ...pose },
    })),
  },
];
const draw = (
  ctx: CanvasRenderingContext2D,
  frame: number,
  { pose, ...view }: (typeof rows)[number]["views"][number],
) =>
  drawSparrow(
    ctx,
    {
      ...view,
      pitch: 0.12,
      lighting: sheetLight,
      drawing: drawing(frame, 2).index,
    },
    pose,
  );

export const ModelSheet = () => (
  <Sheet
    rows={rows}
    draw={draw}
    ground={sheet.ground}
    guide={sheet.guide}
    margin={60}
    lineWidth={1.2}
    post={post}
  />
);

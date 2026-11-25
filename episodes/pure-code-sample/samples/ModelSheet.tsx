/**
 * 主角设定样张（#152）：标准底色上排五个角度的转面（正面、四分之三前、侧面、四分之三后、背面）和六个表情与姿势，
 * 水平参考线标出头顶、眼睛、脚的高度，用来核对不同角度下造型一致。每两帧换一张画，用来看线条抖动。
 */
import { useCallback, useRef } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { drawing } from "../engine/timing.ts";
import { defaultPost } from "../engine/post.ts";
import { drawSparrow, FOOT_Z, restPose, sheetLight } from "../sparrow.ts";
import type { Pose } from "../sparrow.ts";
import { sheet } from "../tokens.ts";
import { useFrame } from "./useFrame.ts";

export const sheetSize = { width: 1920, height: 1080, durationInFrames: 4 };

const post = { ...defaultPost, grain: 0.03, grainHighlight: 0.01, vignette: 0.12, glow: 0.15, softFocus: 0.2 };

const turnaround = [Math.PI / 2, 0.7, 0, -0.7, -Math.PI / 2];

const poses: { pose: Partial<Pose>; yaw: number }[] = [
  { pose: { wet: 1, bodyPitch: 0.25, headPitch: -0.2, eyeOpen: 0.75 }, yaw: 0.45 },
  { pose: { wet: 0.8, eyeOpen: 0, eyeClosedCurve: -0.9, stretch: -0.08, headPitch: -0.25 }, yaw: 0.45 },
  { pose: { puff: 1, eyeOpen: 0.85, headPitch: 0.05 }, yaw: 0.45 },
  { pose: { headPitch: 0.6, headYaw: 0.15, sparkle: 1, bodyPitch: 0.55 }, yaw: 0.45 },
  { pose: { crouch: 1, bodyPitch: 0.15, headPitch: 0.05, tailLift: 0.25, stretch: -0.12 }, yaw: 0.45 },
  { pose: { wingSpread: 1, wingFlap: 0.6, legs: false, bodyPitch: 0.15, lift: 0.4 }, yaw: 0.45 },
];

const paint = (ctx: CanvasRenderingContext2D, frame: number) => {
  const { index } = drawing(frame, 2);
  ctx.fillStyle = sheet.ground;
  ctx.fillRect(0, 0, sheetSize.width, sheetSize.height);
  const rowA = { y: 330, ppu: 78 };
  const guides = [1.62, 0.88, FOOT_Z];
  ctx.strokeStyle = sheet.guide;
  ctx.lineWidth = 1.2;
  for (const g of guides) {
    const y = rowA.y - g * rowA.ppu * Math.cos(0.12);
    ctx.beginPath();
    ctx.moveTo(60, y);
    ctx.lineTo(sheetSize.width - 60, y);
    ctx.stroke();
  }
  turnaround.forEach((yaw, i) => {
    drawSparrow(
      ctx,
      { x: 230 + i * 365, y: rowA.y, ppu: rowA.ppu, yaw, pitch: 0.12, lighting: sheetLight, drawing: index, seed: 152 + i },
      restPose,
    );
  });
  const rowB = { y: 820, ppu: 64 };
  ctx.strokeStyle = sheet.guide;
  ctx.beginPath();
  ctx.moveTo(60, rowB.y - FOOT_Z * rowB.ppu * Math.cos(0.12));
  ctx.lineTo(sheetSize.width - 60, rowB.y - FOOT_Z * rowB.ppu * Math.cos(0.12));
  ctx.stroke();
  poses.forEach(({ pose, yaw }, i) => {
    drawSparrow(
      ctx,
      { x: 190 + i * 305, y: rowB.y, ppu: rowB.ppu, yaw, pitch: 0.12, lighting: sheetLight, drawing: index, seed: 260 + i },
      { ...restPose, ...pose },
    );
  });
};

export const ModelSheet: React.FC = () => {
  const frame = useCurrentFrame();
  const canvas = useRef<HTMLCanvasElement>(null);
  const render = useCallback((ctx: CanvasRenderingContext2D, f: number) => paint(ctx, f), []);
  useFrame(canvas, frame, true, render, post);
  return (
    <AbsoluteFill>
      <canvas ref={canvas} width={sheetSize.width} height={sheetSize.height} />
    </AbsoluteFill>
  );
};

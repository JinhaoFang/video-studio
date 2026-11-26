/**
 * 走过院子的人的设定图（合成 AfterRainPersonSheet，1920×1080，24 fps，96 帧）。
 * 帧 0–47 展示：第一行腰以下四个转面（正、四分之三前、侧、背，同比例同地面基线与膝/踝参考线对齐）+ 同比例竹篮三视图（正、侧、俯视）+ 远处小人影大远景样条与放大；
 * 第二行走路四个关键姿势（接触、下沉陷泥、经过拔泥、上升前摆）+ 实时泥地走路循环（侧面与第 4 镜逆光低机位）。
 * 帧 48–95 展示：第一行四种光照（雨色、夕光、夕光逆光、低夕光逆光、暮色）色指定对照 + 第 11 镜稻田宽幅小人影走动条；
 * 第二行停步转向三张关键姿势（停下、转向、站住）+ 第 6 镜实时停步转向完整节奏（0–47 帧与 48–95 帧并列）。
 * 待定事项：无。
 */
import { useCallback, useRef } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { drawing } from "../../../src/kit/engine/timing.ts";
import { useFrame } from "../../../src/kit/samples/useFrame.ts";
import {
  ANKLE_Z,
  BOOT_TOP_Z,
  CUFF_Z,
  KNEE_Z,
  WAIST_Z,
  drawBasket,
  drawDistantPerson,
  drawPerson,
  mudWalkPose,
  personBacklight,
  personSheetLight,
  restPersonPose,
  stopTurnPose,
} from "../person.ts";
import type { PersonLight, PersonLighting } from "../person.ts";
import { defaultPost, sheet } from "../tokens.ts";
import { distantPersonColors } from "../tokens-person.ts";

const post = {
  ...defaultPost,
  grain: 0.03,
  grainHighlight: 0.01,
  vignette: 0.12,
  glow: 0.15,
  softFocus: 0.2,
};

const drawGuides = (ctx: CanvasRenderingContext2D, x0: number, x1: number, ys: readonly number[]) => {
  ctx.save();
  ctx.strokeStyle = sheet.guide;
  ctx.lineWidth = 1.2;
  for (const y of ys) {
    ctx.beginPath();
    ctx.moveTo(x0, y);
    ctx.lineTo(x1, y);
    ctx.stroke();
  }
  ctx.restore();
};

const drawDistantStrip = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  frame: number,
  heightPx: number,
  travel: boolean,
) => {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();

  const horizon = y + h * 0.36;
  const gradSky = ctx.createLinearGradient(x, y, x, horizon);
  gradSky.addColorStop(0, distantPersonColors.paddySkyCool);
  gradSky.addColorStop(0.55, distantPersonColors.paddyMist);
  gradSky.addColorStop(1, distantPersonColors.paddySkyWarm);
  ctx.fillStyle = gradSky;
  ctx.fillRect(x, y, w, horizon - y);

  ctx.fillStyle = distantPersonColors.paddyFar;
  ctx.fillRect(x, horizon, w, h * 0.28);

  const ridgeY = y + h * 0.64;
  ctx.fillStyle = distantPersonColors.paddyNear;
  ctx.fillRect(x, ridgeY, w, y + h - ridgeY);

  ctx.fillStyle = distantPersonColors.paddyShadow;
  ctx.fillRect(x, ridgeY - 3, w, 6);

  const d = drawing(frame, 2);
  const px = travel ? x + 28 + ((d.frame * 2.1) % Math.max(40, w - 56)) : x + w * 0.5;
  drawDistantPerson(
    ctx,
    {
      x: px,
      y: ridgeY + 1,
      heightPx,
      facingRight: true,
      rimColor: distantPersonColors.rimNear,
      rimAlpha: 0.9,
      drawing: d.index,
      seed: 181,
    },
    frame,
  );

  ctx.strokeStyle = sheet.guide;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x, y, w, h);
  ctx.restore();
};

const turnaroundAngles = [Math.PI / 2, 0.68, 0, -Math.PI / 2];

const lightingSamples: { light: PersonLight; lighting: PersonLighting }[] = [
  { light: "rain", lighting: { light: "rain", direction: [0.15, -0.92, -0.35], rim: { alpha: 0.45 }, threshold: 0.14 } },
  { light: "dusk", lighting: { light: "dusk", direction: [0.55, -0.58, -0.6], threshold: 0.08 } },
  { light: "dusk", lighting: personBacklight("dusk", [0.46, -0.32, 0.83]) },
  { light: "lowDusk", lighting: personBacklight("lowDusk", [0.4, -0.22, 0.89]) },
  { light: "twilight", lighting: { light: "twilight", direction: [0.35, -0.45, -0.82], threshold: 0.18 } },
];

export const PersonSheet = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const canvas = useRef<HTMLCanvasElement>(null);

  const paint = useCallback(
    (ctx: CanvasRenderingContext2D, local: number) => {
      ctx.fillStyle = sheet.ground;
      ctx.fillRect(0, 0, width, height);
      const drawIdx = drawing(local, 2).index;

      if (local < 48) {
        const row1Base = 472;
        const row1Ppu = 355;
        const row1Pitch = 0.08;
        const cos1 = Math.cos(row1Pitch);
        drawGuides(
          ctx,
          56,
          1640,
          [WAIST_Z, KNEE_Z, CUFF_Z, BOOT_TOP_Z, ANKLE_Z, 0].map((z) => row1Base - z * row1Ppu * cos1),
        );

        turnaroundAngles.forEach((yaw, i) => {
          drawPerson(
            ctx,
            {
              x: 175 + i * 268,
              y: row1Base,
              ppu: row1Ppu,
              yaw,
              pitch: row1Pitch,
              lighting: personSheetLight,
              drawing: drawIdx,
              seed: 181 + i * 7,
            },
            restPersonPose,
          );
        });

        const basketBaseY = row1Base - KNEE_Z * row1Ppu * cos1;
        drawBasket(ctx, {
          x: 1210,
          y: basketBaseY,
          ppu: row1Ppu,
          yaw: Math.PI / 2,
          pitch: row1Pitch,
          lighting: personSheetLight,
          drawing: drawIdx,
          seed: 311,
        });
        drawBasket(ctx, {
          x: 1385,
          y: basketBaseY,
          ppu: row1Ppu,
          yaw: 0,
          pitch: row1Pitch,
          lighting: personSheetLight,
          drawing: drawIdx,
          seed: 317,
        });
        drawBasket(ctx, {
          x: 1555,
          y: basketBaseY - 68,
          ppu: row1Ppu,
          yaw: 0.25,
          pitch: 1.32,
          lighting: personSheetLight,
          drawing: drawIdx,
          seed: 323,
        });

        drawDistantStrip(ctx, 1675, 110, 195, 130, local, 22, true);
        drawDistantStrip(ctx, 1675, 265, 195, 207, local, 86, false);

        const row2Base = 995;
        const row2Ppu = 325;
        const row2Pitch = 0.06;
        const cos2 = Math.cos(row2Pitch);
        drawGuides(ctx, 56, 1864, [WAIST_Z, KNEE_Z, ANKLE_Z, 0].map((z) => row2Base - z * row2Ppu * cos2));

        const keyWalkFrames = [0, 4, 15, 19];
        keyWalkFrames.forEach((kf, i) => {
          drawPerson(
            ctx,
            {
              x: 175 + i * 265,
              y: row2Base,
              ppu: row2Ppu,
              yaw: 0,
              pitch: row2Pitch,
              lighting: personSheetLight,
              drawing: drawIdx,
              seed: 410 + i * 5,
            },
            mudWalkPose(kf, { stepFrames: 24, muddy: 1, seed: 181, ones: true }),
          );
        });

        drawPerson(
          ctx,
          {
            x: 1305,
            y: row2Base,
            ppu: row2Ppu,
            yaw: 0,
            pitch: row2Pitch,
            lighting: personSheetLight,
            drawing: drawIdx,
            seed: 501,
          },
          mudWalkPose(local, { stepFrames: 24, muddy: 1, seed: 181 }),
        );

        drawPerson(
          ctx,
          {
            x: 1665,
            y: row2Base,
            ppu: row2Ppu,
            yaw: 0.22,
            pitch: -0.14,
            lighting: personBacklight("dusk", [0.48, -0.3, 0.82]),
            drawing: drawIdx,
            seed: 509,
          },
          mudWalkPose(local, { stepFrames: 24, muddy: 1, seed: 181 }),
        );
      } else {
        const t = local - 48;
        const row1Base = 472;
        const row1Ppu = 335;
        const row1Pitch = 0.08;
        const cos1 = Math.cos(row1Pitch);
        drawGuides(ctx, 56, 1435, [WAIST_Z, KNEE_Z, ANKLE_Z, 0].map((z) => row1Base - z * row1Ppu * cos1));

        lightingSamples.forEach((item, i) => {
          drawPerson(
            ctx,
            {
              x: 180 + i * 280,
              y: row1Base,
              ppu: row1Ppu,
              yaw: 0.52,
              pitch: row1Pitch,
              lighting: item.lighting,
              drawing: drawIdx,
              seed: 601 + i * 7,
            },
            restPersonPose,
          );
        });

        drawDistantStrip(ctx, 1475, 110, 390, 145, local, 20, true);
        drawDistantStrip(ctx, 1475, 275, 390, 197, local, 86, false);

        const row2Base = 995;
        const row2Ppu = 325;
        const row2Pitch = 0.06;
        const cos2 = Math.cos(row2Pitch);
        drawGuides(ctx, 56, 1864, [WAIST_Z, KNEE_Z, ANKLE_Z, 0].map((z) => row2Base - z * row2Ppu * cos2));

        const stopKeyFrames = [4, 12, 36];
        stopKeyFrames.forEach((kf, i) => {
          drawPerson(
            ctx,
            {
              x: 205 + i * 285,
              y: row2Base,
              ppu: row2Ppu,
              yaw: -0.18,
              pitch: row2Pitch,
              lighting: personSheetLight,
              drawing: drawIdx,
              seed: 701 + i * 11,
            },
            stopTurnPose(kf, { seed: 186, ones: true }),
          );
        });

        drawPerson(
          ctx,
          {
            x: 1185,
            y: row2Base,
            ppu: row2Ppu,
            yaw: -0.18,
            pitch: -0.08,
            lighting: personBacklight("dusk", [0.22, -0.35, 0.91]),
            drawing: drawIdx,
            seed: 751,
          },
          stopTurnPose(t, { seed: 186 }),
        );

        drawPerson(
          ctx,
          {
            x: 1590,
            y: row2Base,
            ppu: row2Ppu,
            yaw: -0.18,
            pitch: -0.08,
            lighting: personBacklight("dusk", [0.22, -0.35, 0.91]),
            drawing: drawIdx,
            seed: 757,
          },
          stopTurnPose(t + 48, { seed: 186 }),
        );
      }
    },
    [height, width],
  );

  useFrame(canvas, frame, true, paint, post);
  return (
    <AbsoluteFill>
      <canvas ref={canvas} width={width} height={height} />
    </AbsoluteFill>
  );
};

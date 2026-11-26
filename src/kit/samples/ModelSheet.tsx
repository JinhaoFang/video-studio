/** 设定图。每行传入参考线的画面坐标、角色的各个视图和绘制函数，颜色与线宽由调用方指定。待定事项：无。 */
import { useCallback, useRef } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import type { Post } from "../engine/post-settings.ts";
import { useFrame } from "./useFrame.ts";

type SheetProps<View> = {
  rows: readonly { guides: readonly number[]; views: readonly View[] }[];
  draw: (ctx: CanvasRenderingContext2D, frame: number, view: View) => void;
  ground: string;
  guide: string;
  margin: number;
  lineWidth: number;
  post: Post;
};

export function ModelSheet<View>({
  rows,
  draw,
  ground,
  guide,
  margin,
  lineWidth,
  post,
}: SheetProps<View>) {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const canvas = useRef<HTMLCanvasElement>(null);
  const paint = useCallback(
    (ctx: CanvasRenderingContext2D, local: number) => {
      ctx.fillStyle = ground;
      ctx.fillRect(0, 0, width, height);
      for (const row of rows) {
        ctx.strokeStyle = guide;
        ctx.lineWidth = lineWidth;
        for (const y of row.guides) {
          ctx.beginPath();
          ctx.moveTo(margin, y);
          ctx.lineTo(width - margin, y);
          ctx.stroke();
        }
        for (const view of row.views) draw(ctx, local, view);
      }
    },
    [draw, ground, guide, height, lineWidth, margin, rows, width],
  );
  useFrame(canvas, frame, true, paint, post);
  return (
    <AbsoluteFill>
      <canvas ref={canvas} width={width} height={height} />
    </AbsoluteFill>
  );
}

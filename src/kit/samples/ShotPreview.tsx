/** 镜头预览与引擎静帧。传任意 Shot、后期基准、已解码的输入和构造 surface 的函数。frame 可指定镜头内帧，省略时跟随合成。待定事项：无。 */
import { useCallback, useMemo, useRef } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import type { Post } from "../engine/post-settings.ts";
import type { Shot } from "../shots.ts";
import { useFrame } from "./useFrame.ts";

type PreviewProps<I, S> = {
  shot: Shot<S>;
  defaults: Post;
  inputs: I | null;
  surface: (context: CanvasRenderingContext2D, inputs: I) => S;
  frame?: number;
};

export function ShotPreview<I, S>({
  shot,
  defaults,
  inputs,
  surface,
  frame,
}: PreviewProps<I, S>) {
  const playhead = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const canvas = useRef<HTMLCanvasElement>(null);
  const post = useMemo(() => ({ ...defaults, ...shot.post }), [defaults, shot]);
  const render = useCallback(
    (ctx: CanvasRenderingContext2D, local: number, data: I) =>
      shot.draw(surface(ctx, data), local),
    [shot, surface],
  );
  useFrame(canvas, frame ?? playhead, inputs, render, post);
  return (
    <AbsoluteFill>
      <canvas ref={canvas} width={width} height={height} />
    </AbsoluteFill>
  );
}

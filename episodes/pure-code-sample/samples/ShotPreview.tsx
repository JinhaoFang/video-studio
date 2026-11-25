/**
 * 单镜头预览合成：按 props.shot 从镜头登记表取一个镜头，逐帧调用它的 draw，再按镜头的 post 覆盖值走摄影后期。
 * Root.tsx 为每个镜头各注册一个（PureCodeS1、PureCodeS2A、PureCodeS2B），时长取镜头自己的 durationInFrames；
 * 自查、出静帧、量每帧耗时都用它，例如 `pnpm exec remotion still PureCodeS2A out/qa/x.png --frame=40 --gl=swangle`。
 */
import { useCallback, useMemo, useRef } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { defaultPost } from "../engine/post.ts";
import { shots } from "../shots/index.ts";
import type { ShotKey } from "../shots/index.ts";
import { useFrame } from "./useFrame.ts";
import { usePlates } from "./usePlates.ts";
import type { PlateSets } from "./usePlates.ts";

export type ShotPreviewProps = { shot: ShotKey };

export const ShotPreview: React.FC<ShotPreviewProps> = ({ shot }) => {
  const frame = useCurrentFrame();
  const canvas = useRef<HTMLCanvasElement>(null);
  const plates = usePlates();
  const current = shots[shot];
  const post = useMemo(() => ({ ...defaultPost, ...current.post }), [current]);
  const render = useCallback(
    (context: CanvasRenderingContext2D, f: number, images: PlateSets) => current.draw({ context, ...images }, f),
    [current],
  );
  useFrame(canvas, frame, plates, render, post);
  return (
    <AbsoluteFill>
      <canvas ref={canvas} width={1920} height={1080} />
    </AbsoluteFill>
  );
};

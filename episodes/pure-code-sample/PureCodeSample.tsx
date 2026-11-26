/** 两版 312 帧成片的 Canvas → WebGL 入口；镜头内帧驱动画面和摄影，镜头切换同时应用各自后期覆盖，声音读取对应全片事件表生成的混音。 */
import { useCallback, useMemo, useRef } from "react";
import { Audio } from "@remotion/media";
import { AbsoluteFill, staticFile, useCurrentFrame } from "remotion";
import { defaultPost } from "./engine/post.ts";
import { height, shotTable, width } from "./model.ts";
import { shots } from "./shots/index.ts";
import { useFrame } from "./samples/useFrame.ts";
import { usePlates } from "./samples/usePlates.ts";
import type { PlateSets } from "./samples/usePlates.ts";

export type PureCodeSampleProps = { variant: "a" | "b" };

export const PureCodeSample: React.FC<PureCodeSampleProps> = ({ variant }) => {
  const frame = useCurrentFrame();
  const canvas = useRef<HTMLCanvasElement>(null);
  const plates = usePlates();
  const row = shotTable.find(
    (item) =>
      frame >= item.startFrame &&
      frame < item.startFrame + item.durationInFrames,
  );
  if (!row) throw new Error("当前帧不属于镜头时间表。");
  const current =
    row.id === "S1" ? shots.s1 : shots[variant === "a" ? "s2-a" : "s2-b"];
  const localFrame = frame - row.startFrame;
  const post = useMemo(() => ({ ...defaultPost, ...current.post }), [current]);
  const render = useCallback(
    (context: CanvasRenderingContext2D, f: number, images: PlateSets) =>
      current.draw({ context, ...images }, f),
    [current],
  );
  useFrame(canvas, localFrame, plates, render, post);
  return (
    <AbsoluteFill>
      <canvas ref={canvas} width={width} height={height} />
    </AbsoluteFill>
  );
};

export const PureCodeSampleA: React.FC = () => (
  <AbsoluteFill>
    <PureCodeSample variant="a" />
    <Audio src={staticFile("episodes/pure-code-sample/mix-a.wav")} />
  </AbsoluteFill>
);

export const PureCodeSampleB: React.FC = () => (
  <AbsoluteFill>
    <PureCodeSample variant="b" />
    <Audio src={staticFile("episodes/pure-code-sample/mix-b.wav")} />
  </AbsoluteFill>
);

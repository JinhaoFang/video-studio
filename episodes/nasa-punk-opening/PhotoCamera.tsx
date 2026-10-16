/**
 * One continuous virtual camera over a large photo. A `CameraPath` starts at a
 * framing (photo pixel `focus` placed at screen `anchor`, at `scale`) and lists
 * eased moves to later framings; between moves the camera keeps a slow linear
 * push of `motion.pushPerSecond`, and each move starts from the camera's actual
 * state, so the image never jumps or dissolves within a shot. Scale eases in log
 * space so pull-outs and push-ins read at an even rate. Children render in photo
 * pixel units and receive the current camera, so pinned overlays (HUD, paper)
 * move with it and can divide screen-constant strokes by `camera.scale`.
 * Applies the warm grade.
 */
import type { ReactNode } from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { finish, motion } from "../../src/styles/nasa-punk/tokens";

type Point = { x: number; y: number };

export type Framing = { anchor: Point; scale: number };

export type CameraMove = {
  start: number;
  durationInFrames: number;
  to: Framing;
  easing: (t: number) => number;
};

export type CameraPath = { from: Framing; moves: CameraMove[] };

export const easeInOutSine = Easing.inOut(Easing.sin);
export const easeInOutCubic = Easing.inOut(Easing.cubic);

const drift = (framing: Framing, frames: number, fps: number): Framing => ({
  anchor: framing.anchor,
  scale: framing.scale * (1 + (motion.pushPerSecond * Math.max(0, frames)) / fps),
});

export const cameraAt = (
  path: CameraPath,
  frame: number,
  fps: number,
): Framing => {
  let settled = path.from;
  let settledAt = 0;
  for (const move of path.moves) {
    if (frame < move.start) break;
    const begin = drift(settled, move.start - settledAt, fps);
    const end = move.start + move.durationInFrames;
    if (frame < end) {
      const t = move.easing((frame - move.start) / move.durationInFrames);
      return {
        anchor: {
          x: interpolate(t, [0, 1], [begin.anchor.x, move.to.anchor.x]),
          y: interpolate(t, [0, 1], [begin.anchor.y, move.to.anchor.y]),
        },
        scale: Math.exp(
          interpolate(t, [0, 1], [Math.log(begin.scale), Math.log(move.to.scale)]),
        ),
      };
    }
    settled = move.to;
    settledAt = end;
  }
  return drift(settled, frame - settledAt, fps);
};

export const PhotoCamera = ({
  src,
  width,
  height,
  focus,
  path,
  children,
}: {
  src: string;
  width: number;
  height: number;
  focus: Point;
  path: CameraPath;
  children?: (camera: Framing) => ReactNode;
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const camera = cameraAt(path, frame, fps);
  const x = camera.anchor.x - focus.x * camera.scale;
  const y = camera.anchor.y - focus.y * camera.scale;
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width,
          height,
          transformOrigin: "0 0",
          transform: `translate(${x}px, ${y}px) scale(${camera.scale})`,
        }}
      >
        <Img
          src={staticFile(src)}
          style={{
            width,
            height,
            display: "block",
            filter: finish.photoFilter,
          }}
        />
        {children?.(camera)}
      </div>
    </AbsoluteFill>
  );
};

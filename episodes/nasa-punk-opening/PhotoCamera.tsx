/**
 * Virtual camera over a large photo: places photo pixel `focus` at screen point
 * `anchor`, scaled from `scaleFrom` to `scaleTo` across `durationInFrames` (slow
 * push). Children are drawn in photo pixel units, so overlays pinned to the photo
 * (HUD brackets, labels) move and scale with the camera. Applies the warm grade.
 */
import type { ReactNode } from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { finish } from "../../src/styles/nasa-punk/tokens";

export type CameraMove = {
  focus: { x: number; y: number };
  anchor: { x: number; y: number };
  scaleFrom: number;
  scaleTo: number;
  durationInFrames: number;
};

export const PhotoCamera = ({
  src,
  width,
  height,
  move,
  children,
}: {
  src: string;
  width: number;
  height: number;
  move: CameraMove;
  children?: ReactNode;
}) => {
  const frame = useCurrentFrame();
  const scale = interpolate(
    frame,
    [0, move.durationInFrames],
    [move.scaleFrom, move.scaleTo],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const x = move.anchor.x - move.focus.x * scale;
  const y = move.anchor.y - move.focus.y * scale;
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
          transform: `translate(${x}px, ${y}px) scale(${scale})`,
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
        {children}
      </div>
    </AbsoluteFill>
  );
};

export const pushScaleTo = (
  scaleFrom: number,
  durationInFrames: number,
  fps: number,
  pushPerSecond: number,
): number => scaleFrom * (1 + (pushPerSecond * durationInFrames) / fps);

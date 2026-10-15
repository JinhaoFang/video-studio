/**
 * Episode-local red annotations for S06 and #68: circle, underline, strike and
 * arrow. Position and dimensions are in parent units; start/durationInFrames use
 * the current Sequence's frame origin. SVG dash length reveals the actual path,
 * with the sample's eight-frame cubic ease-out and parent-coordinate stroke.
 * Optional stroke/color/rotation let callers use approved tokens in new shots.
 * TODO(design): confirm these conservative hand-drawn unit-space SVG curves.
 */
import { interpolate, useCurrentFrame } from "remotion";
import { color, hud, motion } from "../../src/styles/nasa-punk/tokens";

const paths = {
  circle:
    "M 94 33 C 85 9 57 -2 31 6 C 7 14 -1 42 5 67 C 10 92 35 103 61 96 C 87 91 103 66 96 42 C 94 35 91 29 86 25",
  underline: "M 3 73 Q 26 69 49 73 T 97 71",
  strike: "M 3 53 Q 29 48 53 51 T 97 47",
  arrow: "M 4 88 Q 45 48 92 12 M 68 15 L 92 12 L 90 36",
} as const;

export type RedAnnotationProps = {
  shape: keyof typeof paths;
  left: number;
  top: number;
  width: number;
  height: number;
  start: number;
  durationInFrames?: number;
  stroke?: number;
  color?: string;
  rotation?: number;
};

export const RedAnnotation = ({
  shape,
  left,
  top,
  width,
  height,
  start,
  durationInFrames = motion.lineDrawFrames,
  stroke = hud.bracketStroke,
  color: strokeColor = color.accentRed,
  rotation = 0,
}: RedAnnotationProps) => {
  const frame = useCurrentFrame();
  const progress = interpolate(
    frame,
    [start, start + durationInFrames],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: (t) => 1 - (1 - t) ** 3,
    },
  );
  let coordinate = 0;
  const path = paths[shape].replace(/-?\d+(?:\.\d+)?/g, (value) =>
    String((Number(value) * (coordinate++ % 2 === 0 ? width : height)) / 100),
  );
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      width={width}
      height={height}
      style={{
        position: "absolute",
        left,
        top,
        rotate: `${rotation}deg`,
        overflow: "visible",
      }}
    >
      {progress > 0 ? (
        <path
          d={path}
          fill="none"
          stroke={strokeColor}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={1 - progress}
        />
      ) : null}
    </svg>
  );
};

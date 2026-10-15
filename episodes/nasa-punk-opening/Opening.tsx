/**
 * Minimal sentence-synchronized opening: near-black, centered text and local
 * reference clips. One data-driven template owns all lines. Colors follow
 * research/style.md; font size scales the existing qa-images.ts 24px at 540p.
 * TODO(design): Confirm the provisional 48px size; the formal subtitle treatment
 * and all scene visuals belong to later tickets. No animation is added here.
 */
import { Fragment } from "react";
import { Audio } from "@remotion/media";
import { loadFont } from "@remotion/google-fonts/NotoSansSC";
import { AbsoluteFill, Sequence, staticFile, useVideoConfig } from "remotion";
import type { Timeline } from "../../tools/timeline-types";
import { sentenceFrame } from "./sentence-timing";

const { fontFamily } = loadFont("normal", {
  weights: ["400"],
  subsets: ["chinese-simplified", "latin"],
});

export type OpeningProps = { timeline: Timeline };

export const Opening = ({ timeline }: OpeningProps) => {
  const { fps, height } = useVideoConfig();
  if (fps !== timeline.fps) throw new Error("合成帧率必须与时间轴一致。");
  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0D0B09",
        color: "white",
        fontFamily,
        fontSize: (24 * height) / 540,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {timeline.lines.map((line) => (
        <Fragment key={line.id}>
          <Sequence
            name={line.id}
            from={sentenceFrame(timeline, line.id)}
            durationInFrames={line.endFrame - line.startFrame}
            premountFor={fps}
            style={{ justifyContent: "center", alignItems: "center" }}
          >
            <div style={{ whiteSpace: "pre" }}>{line.text}</div>
          </Sequence>
          {line.audioSrc ? (
            <Audio
              name={`${line.id} 临时配音`}
              src={staticFile(line.audioSrc)}
              from={sentenceFrame(timeline, line.id)}
              durationInFrames={line.endFrame - line.startFrame}
              premountFor={fps}
            />
          ) : null}
        </Fragment>
      ))}
    </AbsoluteFill>
  );
};

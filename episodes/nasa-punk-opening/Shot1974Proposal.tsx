/**
 * S05-S07, L008-L014: chapter black, 2020-to-1974 clock, taped meatball study
 * sheet and a camera pull/downward move revealing Inter Bold NASA on the grid.
 * Place in a Sequence spanning shot1974ProposalSpan(timeline). Every event is a
 * sentence anchor plus sample motion frames, so replacing voiceover is safe.
 * The incoming opaque black dissolves over the previous chapter; #66 supplies
 * that chapter's outgoing dissolve. Finish and subtitles stay in Opening.
 * TODO(design): confirm reference-sampled geometry and the conservative timing
 * offsets documented in this episode's README, and #62's texture-grain strength.
 */
import {
  AbsoluteFill,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { Timeline } from "../../tools/timeline-types";
import { color, motion, proposal } from "../../src/styles/nasa-punk/tokens";
import { FlipYearClock } from "./FlipYearClock";
import { ProposalPaper } from "./ProposalPaper";
import { sentenceFrame } from "./sentence-timing";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const easeOut = (t: number) => 1 - (1 - t) ** 3;

export const shot1974ProposalSpan = (timeline: Timeline) => {
  const start = sentenceFrame(timeline, "L008", -motion.chapterDissolveFrames);
  return { start, durationInFrames: sentenceFrame(timeline, "L015") - start };
};

export const Shot1974Proposal = ({ timeline }: { timeline: Timeline }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { start } = shot1974ProposalSpan(timeline);
  const at = (id: string, offset = 0) =>
    sentenceFrame(timeline, id, offset) - start;
  const clockStart = at("L008", motion.chapterDissolveFrames);
  const paperStart = at("L010", motion.dissolveFrames);
  const moveStart = at("L013", -motion.dissolveFrames);
  const moveEnd = moveStart + motion.barDrawFrames;
  const move = interpolate(frame, [moveStart, moveEnd], [0, 1], {
    ...clamp,
    easing: easeOut,
  });
  const closePush =
    1 +
    (motion.pushPerSecond *
      Math.max(0, Math.min(frame, moveStart) - paperStart)) /
      fps;
  const widePush =
    1 + (motion.pushPerSecond * Math.max(0, frame - moveEnd)) / fps;
  const paper = proposal.paper;
  const scale = interpolate(
    move,
    [0, 1],
    [paper.close.scale * closePush, paper.wide.scale * widePush],
  );
  const baseScale = interpolate(
    move,
    [0, 1],
    [paper.close.scale, paper.wide.scale],
  );
  const left =
    interpolate(move, [0, 1], [paper.close.left, paper.wide.left]) -
    ((scale - baseScale) * paper.width) / 2;
  const top =
    interpolate(move, [0, 1], [paper.close.top, paper.wide.top]) -
    ((scale - baseScale) * paper.height) / 2;
  return (
    <AbsoluteFill
      style={{
        opacity: interpolate(
          frame,
          [0, motion.chapterDissolveFrames],
          [0, 1],
          clamp,
        ),
        backgroundColor: color.nearBlack,
        overflow: "hidden",
      }}
    >
      <AbsoluteFill
        style={{
          opacity: interpolate(
            frame,
            [clockStart, clockStart + motion.dissolveFrames],
            [0, 1],
            clamp,
          ),
        }}
      >
        <FlipYearClock
          start={clockStart + motion.dissolveFrames}
          targetYear={1974}
        />
      </AbsoluteFill>
      {frame >= paperStart ? (
        <AbsoluteFill
          style={{
            opacity: interpolate(
              frame,
              [paperStart, paperStart + motion.dissolveFrames],
              [0, 1],
              clamp,
            ),
            backgroundColor: color.desk,
          }}
        >
          <Img
            src={staticFile(
              "episodes/nasa-punk-opening/textures/desktop-warm-generated.png",
            )}
            style={{
              position: "absolute",
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
          <div
            style={{
              position: "absolute",
              left,
              top,
              scale: String(scale),
              transformOrigin: "0 0",
            }}
          >
            <ProposalPaper
              circleStart={at("L011")}
              nicknameStart={at("L011", motion.barDrawFrames)}
              gridStart={moveStart}
              logotypeStart={at("L013", motion.dissolveFrames)}
            />
          </div>
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};

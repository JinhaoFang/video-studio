/**
 * NASA-punk opening composition: near-black base, sentence-anchored shots, the
 * grain/vignette finish, the subtitle bar and per-line voice audio from the
 * timeline. Shots so far: S01-S04 (L001-L007); other shots join here as their
 * tickets land, each in a Sequence built from sentence anchors.
 */
import { Audio } from "@remotion/media";
import { AbsoluteFill, Sequence, staticFile, useVideoConfig } from "remotion";
import type { Timeline } from "../../tools/timeline-types";
import { color } from "../../src/styles/nasa-punk/tokens";
import { FilmFinish } from "./FilmFinish";
import { ShotFirstChapter, shotFirstChapterSpan } from "./ShotFirstChapter";
import { Shot1974Proposal, shot1974ProposalSpan } from "./Shot1974Proposal";
import { ShotWormHud, shotWormHudSpan } from "./ShotWormHud";
import { ShotWormStudy, shotWormStudySpan } from "./ShotWormStudy";
import { Subtitles } from "./Subtitles";
import { sentenceFrame } from "./sentence-timing";

export type OpeningProps = { timeline: Timeline };

export const Opening = ({ timeline }: OpeningProps) => {
  const { fps } = useVideoConfig();
  if (fps !== timeline.fps) throw new Error("合成帧率必须与时间轴一致。");
  const wormHud = shotWormHudSpan(timeline);
  const firstChapter = shotFirstChapterSpan(timeline);
  const proposal = shot1974ProposalSpan(timeline);
  const wormStudy = shotWormStudySpan(timeline);
  return (
    <AbsoluteFill style={{ backgroundColor: color.nearBlack }}>
      <Sequence
        name="S02 worm HUD"
        from={wormHud.start}
        durationInFrames={wormHud.durationInFrames}
        premountFor={fps}
      >
        <ShotWormHud timeline={timeline} />
      </Sequence>
      <Sequence
        name="S01/S03/S04 first chapter"
        from={firstChapter.start}
        durationInFrames={firstChapter.durationInFrames}
        premountFor={fps}
      >
        <ShotFirstChapter timeline={timeline} />
      </Sequence>
      <Sequence
        name="S05-S07 1974 proposal"
        from={proposal.start}
        durationInFrames={proposal.durationInFrames}
        premountFor={fps}
      >
        <Shot1974Proposal timeline={timeline} />
      </Sequence>
      <Sequence
        name="S08-S11 worm study"
        from={wormStudy.start}
        durationInFrames={wormStudy.durationInFrames}
        premountFor={fps}
      >
        <ShotWormStudy timeline={timeline} />
      </Sequence>
      <FilmFinish />
      <Subtitles timeline={timeline} />
      {timeline.lines.map((line) =>
        line.audioSrc ? (
          <Audio
            key={line.id}
            name={`${line.id} 配音`}
            src={staticFile(line.audioSrc)}
            from={sentenceFrame(timeline, line.id)}
            durationInFrames={line.endFrame - line.startFrame}
            premountFor={fps}
          />
        ) : null,
      )}
    </AbsoluteFill>
  );
};

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
import { ShotWormHud, shotWormHudSpan } from "./ShotWormHud";
import { Subtitles } from "./Subtitles";
import { sentenceFrame } from "./sentence-timing";

export type OpeningProps = { timeline: Timeline };

export const Opening = ({ timeline }: OpeningProps) => {
  const { fps } = useVideoConfig();
  if (fps !== timeline.fps) throw new Error("合成帧率必须与时间轴一致。");
  const wormHud = shotWormHudSpan(timeline);
  const firstChapter = shotFirstChapterSpan(timeline);
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

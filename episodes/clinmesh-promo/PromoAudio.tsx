/**
 * Timeline-level audio bus for ClinMesh promo: sentence voiceover clips with full
 * natural tail decay, dual-offset compensated Freesound CC0 foley/impacts, and
 * Clinical AI Underscore.wav balanced across its four musical movements without
 * speech-triggered ducking (smooth opening fade-in and continuous S08 curve fade-out).
 */
import { useMemo } from "react";
import { Audio } from "@remotion/media";
import { Sequence, interpolate, staticFile, useVideoConfig } from "remotion";
import { sentenceFrame } from "../../src/kit/sentence-timing";
import type { Timeline } from "../../tools/timeline-types";
import { clamp01 } from "./motion-utils";
import { buildSfxSchedule } from "./sfx-schedule";
import { BGM_FADE_IN_F, BGM_FADE_OUT_F, BGM_STEADY_VOLUME } from "./tokens";

const cosineRamp = (t: number): number =>
  0.5 * (1 - Math.cos(Math.PI * clamp01(t)));

const bgmScoreBalance = (sec: number): number => {
  const r11 = cosineRamp((sec - 10.2) / 2.2);
  const r35 = cosineRamp((sec - 34.2) / 2.4);
  const r60 = cosineRamp((sec - 59.4) / 2.4);
  return (
    1.48 * (1 - r11) +
    0.84 * r11 * (1 - r35) +
    0.53 * r35 * (1 - r60) +
    1.62 * r60
  );
};

export const PromoAudio: React.FC<{
  timeline: Timeline;
  bgm: boolean;
}> = ({ timeline, bgm }) => {
  const { fps } = useVideoConfig();
  const sfxCues = useMemo(() => buildSfxSchedule(timeline), [timeline]);

  const bgmVolumeAt = (f: number): number => {
    const scoreBalance = bgmScoreBalance(f / fps);
    const fadeIn = cosineRamp(f / BGM_FADE_IN_F);
    const fadeOut = cosineRamp(
      (timeline.durationInFrames - f) / BGM_FADE_OUT_F,
    );
    return BGM_STEADY_VOLUME * scoreBalance * fadeIn * fadeOut;
  };

  return (
    <>
      {bgm ? (
        <Audio
          name="BGM Clinical AI Underscore"
          src={staticFile(
            "episodes/clinmesh-promo/music/Clinical AI Underscore.wav",
          )}
          volume={bgmVolumeAt}
          premountFor={fps}
        />
      ) : null}
      {timeline.lines.map((line) =>
        line.audioSrc ? (
          <Audio
            key={line.id}
            name={`${line.id} 配音`}
            src={staticFile(line.audioSrc)}
            from={sentenceFrame(timeline, line.id)}
            premountFor={fps}
          />
        ) : null,
      )}
      {sfxCues.map((cue) => (
        <Sequence
          key={cue.id}
          name={`SFX ${cue.id}`}
          from={cue.from}
          durationInFrames={cue.durationInFrames}
          premountFor={fps}
        >
          <Audio
            src={staticFile(`episodes/clinmesh-promo/sfx/${cue.src}`)}
            volume={(f) => {
              if (!cue.durationInFrames || !cue.fadeOutFrames) {
                return cue.volume;
              }
              return interpolate(
                f,
                [
                  cue.durationInFrames - cue.fadeOutFrames,
                  cue.durationInFrames,
                ],
                [cue.volume, 0],
                { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
              );
            }}
          />
        </Sequence>
      ))}
    </>
  );
};

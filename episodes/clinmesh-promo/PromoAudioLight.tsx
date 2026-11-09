/**
 * Timeline-level audio bus for ClinMeshPromoLight and ClinMeshPromoLightPro:
 * renders sentence voiceover clips, dual-offset compensated Light-Theme UI
 * foley/impacts, and the calm, neutral medical underscore
 * clinical-neutral-underscore.wav balanced across its four macro movements.
 */
import { useMemo } from "react";
import { Audio } from "@remotion/media";
import { Sequence, interpolate, staticFile, useVideoConfig } from "remotion";
import { sentenceFrame } from "../../src/kit/sentence-timing";
import type { Timeline } from "../../tools/timeline-types";
import { clamp01 } from "./motion-utils";
import { type SfxCue } from "./sfx-schedule";
import { buildLightSfxSchedule } from "./sfx-schedule-light";
import { BGM_FADE_IN_F, BGM_FADE_OUT_F, BGM_STEADY_VOLUME } from "./tokens";

const cosineRamp = (t: number): number =>
  0.5 * (1 - Math.cos(Math.PI * clamp01(t)));

const bgmScoreBalance = (sec: number): number => {
  const r19 = cosineRamp((sec - 18.2) / 2.4);
  const r48 = cosineRamp((sec - 47.0) / 2.6);
  const r80 = cosineRamp((sec - 79.4) / 2.6);
  return (
    0.78 * (1 - r19) +
    0.66 * r19 * (1 - r48) +
    0.62 * r48 * (1 - r80) +
    0.8 * r80
  );
};

export const PromoAudioLight: React.FC<{
  timeline: Timeline;
  bgm: boolean;
  sfxBuilder?: (timeline: Timeline) => SfxCue[];
}> = ({ timeline, bgm, sfxBuilder = buildLightSfxSchedule }) => {
  const { fps } = useVideoConfig();
  const sfxCues = useMemo(() => sfxBuilder(timeline), [sfxBuilder, timeline]);

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
          name="BGM Clinical Neutral Underscore"
          src={staticFile(
            "episodes/clinmesh-promo/music/clinical-neutral-underscore.wav",
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

/**
 * First-chapter photo shot, L001-L007 (reference 0:00-0:13): one camera over the
 * night rollout photo (NHQ202005210001) from the leading silence to L008. It opens
 * on a tight worm close-up, pulls out through L002 to the wide framing, and at
 * L004 pushes in to the close framing; every reframe is one eased camera move on
 * the same image (#74), never a dissolve between crops. The top HUD bar and credit
 * draw on the wide framing and fade out during the push; corner brackets and the
 * label are pinned to the photo and scale with it, the 1975 — 1992 — 2020 timeline
 * types as the push lands. `overlays` render in photo pixels on the same camera
 * (S03/S04 paper and stripes). The whole shot dissolves out before L008.
 * Every time is a sentence anchor plus frames; place inside a Sequence spanning
 * rolloutSpan(timeline).
 */
import type { ReactNode } from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import type { Timeline } from "../../tools/timeline-types";
import {
  firstChapter,
  hud,
  motion,
} from "../../src/styles/nasa-punk/tokens";
import { HudBox, HudTopBar, PhotoCredit } from "./Hud";
import {
  type CameraPath,
  PhotoCamera,
  easeInOutCubic,
  easeInOutSine,
} from "./PhotoCamera";
import { sentenceFrame } from "./sentence-timing";

export const rolloutPhoto = {
  src: "episodes/nasa-punk-opening/photos/demo2-rollout-NHQ202005210001.jpg",
  width: 6283,
  height: 3844,
  worm: { x: 3558, y: 2201 },
  hudBox: { left: 3321, top: 2110, width: 475, height: 182 },
  credit: "PHOTO: NASA / BILL INGALLS",
} as const;

export const wormHudStyle = {
  labelSize: 20,
  labelGap: 34,
  timelineSize: 24,
  timelineGap: 56,
  label: "NASA LOGOTYPE",
  labelMuted: "· WORM · 1975",
  timeline: "1975 — 1992 — 2020",
} as const;

export const wideFraming = { anchor: { x: 931, y: 540 }, scale: 0.58 };
export const closeFraming = { anchor: { x: 950, y: 459 }, scale: 1.19 };

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export const rolloutSpan = (timeline: Timeline) => {
  const start =
    sentenceFrame(timeline, "L001") -
    Math.round(timeline.leadingSilenceSeconds * timeline.fps);
  const end = sentenceFrame(timeline, "L008");
  return { start, durationInFrames: end - start };
};

export const rolloutCamera = (timeline: Timeline): CameraPath => {
  const { start } = rolloutSpan(timeline);
  const pullStart = sentenceFrame(timeline, "L002") - start;
  const pullEnd = sentenceFrame(timeline, "L003", -4) - start;
  return {
    from: firstChapter.tightFraming,
    moves: [
      {
        start: pullStart,
        durationInFrames: pullEnd - pullStart,
        to: wideFraming,
        easing: easeInOutSine,
      },
      {
        start: sentenceFrame(timeline, "L004") - start,
        durationInFrames: motion.pushInFrames,
        to: closeFraming,
        easing: easeInOutCubic,
      },
    ],
  };
};

export const ShotWormHud = ({
  timeline,
  overlays,
}: {
  timeline: Timeline;
  overlays?: ReactNode;
}) => {
  const frame = useCurrentFrame();
  const { start, durationInFrames } = rolloutSpan(timeline);
  const at = (id: string, offset: number) =>
    sentenceFrame(timeline, id, offset) - start;
  const pushStart = at("L004", 0);
  const screenHud = interpolate(
    frame,
    [pushStart, pushStart + motion.pushInFrames],
    [1, 0],
    clamp,
  );
  const style = wormHudStyle;
  return (
    <AbsoluteFill
      style={{
        opacity: interpolate(
          frame,
          [durationInFrames - motion.chapterDissolveFrames, durationInFrames],
          [1, 0],
          clamp,
        ),
      }}
    >
      <PhotoCamera
        src={rolloutPhoto.src}
        width={rolloutPhoto.width}
        height={rolloutPhoto.height}
        focus={rolloutPhoto.worm}
        path={rolloutCamera(timeline)}
      >
        {(camera) => (
          <>
            <HudBox
              box={rolloutPhoto.hudBox}
              stroke={hud.bracketStroke / camera.scale}
              bracketStart={at("L003", 24)}
              label={style.label}
              labelMuted={style.labelMuted}
              labelStart={at("L003", 36)}
              labelSize={style.labelSize}
              labelGap={style.labelGap}
              timeline={style.timeline}
              timelineStart={at("L004", 9)}
              timelineSize={style.timelineSize}
              timelineGap={style.timelineGap}
            />
            {overlays}
          </>
        )}
      </PhotoCamera>
      {screenHud > 0 ? (
        <AbsoluteFill style={{ opacity: screenHud }}>
          <HudTopBar
            items={[
              "FALCON 9 · CREW DRAGON · DEMO-2",
              "LC-39A · KENNEDY SPACE CENTER",
              "ROLLOUT · 2020.05.21",
            ]}
            start={at("L003", 6)}
          />
          <PhotoCredit text={rolloutPhoto.credit} start={at("L003", 6)} />
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};

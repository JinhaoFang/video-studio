/**
 * S02 sample shot, L003-L005 (reference 0:04-0:09), the design reference for all
 * other shots. Night rollout photo (NHQ202005210001) dissolves in with a slow push;
 * the top HUD bar draws, corner brackets frame the worm and the label types; at
 * L004 a short dissolve cuts to a closer framing of the same photo where the
 * 1975 — 1992 — 2020 timeline types. Every time is a sentence anchor plus frames.
 * Place inside a Sequence spanning shotWormHudSpan(timeline).
 * Exports the photo geometry and close framing so S03/S04 can continue the shot.
 * #66 extends only the close hold through the L007-L008 pause and adds the
 * chapter-end dissolve over the last chapterDissolveFrames before L008;
 * the camera's linear push and every L003-L005 event keep the sample timing.
 */
import {
  AbsoluteFill,
  Sequence,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { Timeline } from "../../tools/timeline-types";
import { hud, motion } from "../../src/styles/nasa-punk/tokens";
import { HudBox, HudTopBar, PhotoCredit } from "./Hud";
import { PhotoCamera, pushScaleTo } from "./PhotoCamera";
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

const fade = (frame: number, start: number, length: number) =>
  interpolate(frame, [start, start + length], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

export const shotWormHudSpan = (timeline: Timeline) => {
  const start = sentenceFrame(timeline, "L003", -4);
  const end = sentenceFrame(timeline, "L008");
  return { start, durationInFrames: end - start };
};

export const ShotWormHud = ({ timeline }: { timeline: Timeline }) => {
  const local = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { start, durationInFrames } = shotWormHudSpan(timeline);
  const at = (id: string, offset: number) =>
    sentenceFrame(timeline, id, offset) - start;
  const closeCut = at("L004", 9);
  const wideLength = closeCut + motion.dissolveFrames;
  const closeLength = durationInFrames - closeCut;
  const style = wormHudStyle;
  return (
    <AbsoluteFill
      style={{
        opacity:
          fade(local, 0, motion.dissolveFrames) *
          (1 -
            fade(
              local,
              durationInFrames - motion.chapterDissolveFrames,
              motion.chapterDissolveFrames,
            )),
      }}
    >
      <Sequence durationInFrames={wideLength} name="S02 wide">
        <PhotoCamera
          src={rolloutPhoto.src}
          width={rolloutPhoto.width}
          height={rolloutPhoto.height}
          move={{
            focus: rolloutPhoto.worm,
            anchor: wideFraming.anchor,
            scaleFrom: wideFraming.scale,
            scaleTo: pushScaleTo(
              wideFraming.scale,
              wideLength,
              fps,
              motion.pushPerSecond,
            ),
            durationInFrames: wideLength,
          }}
        >
          <HudBox
            box={rolloutPhoto.hudBox}
            stroke={hud.bracketStroke / wideFraming.scale}
            bracketStart={at("L003", 24)}
            label={style.label}
            labelMuted={style.labelMuted}
            labelStart={at("L003", 36)}
            labelSize={style.labelSize}
            labelGap={style.labelGap}
          />
        </PhotoCamera>
        <HudTopBar
          items={[
            "FALCON 9 · CREW DRAGON · DEMO-2",
            "LC-39A · KENNEDY SPACE CENTER",
            "ROLLOUT · 2020.05.21",
          ]}
          start={at("L003", 6)}
        />
        <PhotoCredit text={rolloutPhoto.credit} start={at("L003", 6)} />
      </Sequence>
      <Sequence from={closeCut} durationInFrames={closeLength} name="S02 close">
        <AbsoluteFill
          style={{ opacity: fade(local, closeCut, motion.dissolveFrames) }}
        >
          <PhotoCamera
            src={rolloutPhoto.src}
            width={rolloutPhoto.width}
            height={rolloutPhoto.height}
            move={{
              focus: rolloutPhoto.worm,
              anchor: closeFraming.anchor,
              scaleFrom: closeFraming.scale,
              scaleTo: pushScaleTo(
                closeFraming.scale,
                closeLength,
                fps,
                motion.pushPerSecond,
              ),
              durationInFrames: closeLength,
            }}
          >
            <HudBox
              box={rolloutPhoto.hudBox}
              stroke={hud.bracketStroke / closeFraming.scale}
              bracketStart={-motion.lineDrawFrames}
              label={style.label}
              labelMuted={style.labelMuted}
              labelStart={-100}
              labelSize={style.labelSize}
              labelGap={style.labelGap}
              timeline={style.timeline}
              timelineStart={0}
              timelineSize={style.timelineSize}
              timelineGap={style.timelineGap}
            />
          </PhotoCamera>
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};

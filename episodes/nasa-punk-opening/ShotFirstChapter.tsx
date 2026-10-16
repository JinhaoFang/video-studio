/**
 * S03/S04 overlays for the first chapter (L005-L007): the `VOID · 1992` torn
 * paper stamp, its peel, and the stripe tag, drawn in photo pixels as overlays
 * of ShotWormHud so they ride the same continuous camera (#74). The chapter is
 * one Sequence spanning shotFirstChapterSpan(timeline); the photo, HUD, push-in
 * and chapter-end dissolve all come from ShotWormHud.
 * The torn-paper texture is cropped with Remotion <Img>, so every frame waits
 * for it to load; an SVG <image> raced the parallel render and dropped a frame.
 * Crop/strip geometry is sampled from reference frames at 1, 3, 9.6 and 12.5s.
 * TODO(design): approve the reference-derived strip tokens and conservative
 * 8-frame stamp/peel/slide easing; #62 supplies subtle horizontal tears with
 * straight vertical ends rather than the reference's prominent side tears.
 */
import { Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import type { Timeline } from "../../tools/timeline-types";
import { font } from "../../src/styles/nasa-punk/fonts";
import {
  color,
  firstChapter,
  hud,
  motion,
  typeScale,
} from "../../src/styles/nasa-punk/tokens";
import {
  ShotWormHud,
  rolloutPhoto,
  rolloutSpan,
  wormHudStyle,
} from "./ShotWormHud";
import { sentenceFrame } from "./sentence-timing";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const easeOut = (t: number) => 1 - (1 - t) ** 3;

const tornPaperTexture = {
  src: "episodes/nasa-punk-opening/textures/torn-paper-generated.png",
  width: 3344,
  height: 1080,
  cropTop: 300,
  cropHeight: 470,
} as const;

export const shotFirstChapterSpan = rolloutSpan;

const PaperAndStripes = ({ timeline }: { timeline: Timeline }) => {
  const frame = useCurrentFrame();
  const { start } = shotFirstChapterSpan(timeline);
  const at = (id: string, offset: number) =>
    sentenceFrame(timeline, id, offset) - start;
  const stampStart = at("L005", firstChapter.stampOffsetFrames);
  const peelStart = at("L006", firstChapter.peelOffsetFrames);
  const stripeStart = at("L007", firstChapter.stripeOffsetFrames);
  const stamp = interpolate(
    frame,
    [stampStart, stampStart + motion.dissolveFrames],
    [0, 1],
    { ...clamp, easing: easeOut },
  );
  const peel = interpolate(
    frame,
    [peelStart, peelStart + motion.dissolveFrames],
    [0, 1],
    { ...clamp, easing: (t) => t ** 3 },
  );
  const slide = interpolate(
    frame,
    [stripeStart, stripeStart + motion.dissolveFrames],
    [0, 1],
    { ...clamp, easing: easeOut },
  );
  const paper = firstChapter.paper;
  const box = rolloutPhoto.hudBox;
  const stripeTop =
    box.top +
    box.height +
    wormHudStyle.timelineGap +
    wormHudStyle.timelineSize +
    firstChapter.stripeGap;
  return (
    <>
      {frame >= stampStart && frame < peelStart + motion.dissolveFrames ? (
        <div
          style={{
            position: "absolute",
            left: rolloutPhoto.worm.x - paper.width / 2,
            top: rolloutPhoto.worm.y + paper.centerOffsetY - paper.height / 2,
            width: paper.width,
            height: paper.height,
            transformOrigin: "center",
            opacity: 1 - peel,
            scale: 1 + (1 - stamp) * hud.bracketArmRatio,
            rotate: `${paper.rotation * stamp * (1 - peel)}deg`,
            translate: `0px ${-wormHudStyle.labelGap * (1 - stamp) - paper.height * peel}px`,
            filter: `drop-shadow(0px ${paper.shadowBlur}px ${paper.shadowBlur}px ${color.inkSoft})`,
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              overflow: "hidden",
            }}
          >
            <Img
              src={staticFile(tornPaperTexture.src)}
              style={{
                position: "absolute",
                left: 0,
                top:
                  (-tornPaperTexture.cropTop * paper.height) /
                  tornPaperTexture.cropHeight,
                width: paper.width,
                height:
                  (tornPaperTexture.height * paper.height) /
                  tornPaperTexture.cropHeight,
              }}
            />
          </div>
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: font.mono,
              fontSize: paper.labelSize,
              fontWeight: typeScale.hudLabel.weight,
              letterSpacing: typeScale.hudLabel.letterSpacing,
              color: color.inkSoft,
            }}
          >
            VOID · 1992
          </div>
        </div>
      ) : null}
      {frame >= stripeStart ? (
        <div
          style={{
            position: "absolute",
            left: box.left,
            top: stripeTop,
            width: box.width,
            clipPath: `inset(0 ${(1 - slide) * 100}% 0 0)`,
            translate: `${-wormHudStyle.labelGap * (1 - slide)}px 0px`,
          }}
        >
          {[...color.stripe].reverse().map((stripe) => (
            <div
              key={stripe}
              style={{
                height: firstChapter.stripeHeight,
                backgroundColor: stripe,
              }}
            />
          ))}
          <div
            style={{
              marginTop: firstChapter.tagGap,
              padding: `${firstChapter.tagPaddingY}px ${firstChapter.tagPaddingX}px`,
              width: "max-content",
              backgroundColor: color.paper,
              color: color.ink,
              fontFamily: font.mono,
              fontSize: wormHudStyle.labelSize,
              fontWeight: typeScale.hudLabel.weight,
              letterSpacing: typeScale.hudLabel.letterSpacing,
              lineHeight: 1,
            }}
          >
            <span style={{ fontFamily: font.helvetica }}>→</span> NASA-PUNK ·
            2023
          </div>
        </div>
      ) : null}
    </>
  );
};

export const ShotFirstChapter = ({ timeline }: { timeline: Timeline }) => (
  <ShotWormHud
    timeline={timeline}
    overlays={<PaperAndStripes timeline={timeline} />}
  />
);

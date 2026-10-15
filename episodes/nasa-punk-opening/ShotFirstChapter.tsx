/**
 * #66: S01 photo crops and S03/S04 paper/stripe overlays, placed in one Sequence
 * spanning shotFirstChapterSpan(timeline), above S02 and below the shared finish.
 * S01 holds the identical wide camera over S02's initial dissolve, then unmounts
 * before its HUD draws. S03/S04 use S02's close-camera elapsed time and geometry;
 * no photo, HUD, subtitle or grain is redrawn over the continuing sample shot.
 * Crop/strip geometry is sampled from reference frames at 1, 3, 9.6 and 12.5s.
 * TODO(design): approve the reference-derived crop/strip tokens and conservative
 * 8-frame stamp/peel/slide easing; #62 supplies subtle horizontal tears with
 * straight vertical ends rather than the reference's prominent side tears.
 */
import {
  AbsoluteFill,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { Timeline } from "../../tools/timeline-types";
import { font } from "../../src/styles/nasa-punk/fonts";
import {
  color,
  firstChapter,
  hud,
  motion,
  typeScale,
} from "../../src/styles/nasa-punk/tokens";
import { PhotoCamera, pushScaleTo } from "./PhotoCamera";
import {
  closeFraming,
  rolloutPhoto,
  shotWormHudSpan,
  wideFraming,
  wormHudStyle,
} from "./ShotWormHud";
import { sentence, sentenceFrame } from "./sentence-timing";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const easeOut = (t: number) => 1 - (1 - t) ** 3;

const tornPaperTexture = {
  src: "episodes/nasa-punk-opening/textures/torn-paper-generated.png",
  width: 3344,
  height: 1080,
  cropTop: 300,
  cropHeight: 470,
} as const;

const progress = (frame: number, start: number) =>
  interpolate(frame, [start, start + motion.dissolveFrames], [0, 1], clamp);

export const shotFirstChapterSpan = (timeline: Timeline) => {
  const start =
    sentenceFrame(timeline, "L001") -
    Math.round(timeline.leadingSilenceSeconds * timeline.fps);
  const end =
    sentence(timeline, "L007").endFrame + motion.chapterDissolveFrames;
  return { start, durationInFrames: end - start };
};

const OpeningPhotos = ({ timeline }: { timeline: Timeline }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { start } = shotFirstChapterSpan(timeline);
  const reframe =
    sentenceFrame(timeline, "L002", firstChapter.reframeOffsetFrames) - start;
  const handoff = shotWormHudSpan(timeline).start - start;
  const wideCut = handoff - motion.dissolveFrames;
  const end = handoff + motion.dissolveFrames;
  const tightLength = reframe + motion.dissolveFrames;
  const middleLength = wideCut + motion.dissolveFrames - reframe;
  const wideLength = end - wideCut;
  const wideStart = pushScaleTo(
    wideFraming.scale,
    -motion.dissolveFrames,
    fps,
    motion.pushPerSecond,
  );
  return (
    <>
      <Sequence
        durationInFrames={tightLength}
        premountFor={fps}
        name="S01 tight"
      >
        <PhotoCamera
          src={rolloutPhoto.src}
          width={rolloutPhoto.width}
          height={rolloutPhoto.height}
          move={{
            focus: rolloutPhoto.worm,
            anchor: firstChapter.tightFraming.anchor,
            scaleFrom: firstChapter.tightFraming.scale,
            scaleTo: pushScaleTo(
              firstChapter.tightFraming.scale,
              tightLength,
              fps,
              motion.pushPerSecond,
            ),
            durationInFrames: tightLength,
          }}
        />
      </Sequence>
      <Sequence
        from={reframe}
        durationInFrames={middleLength}
        premountFor={fps}
        name="S01 middle"
      >
        <AbsoluteFill style={{ opacity: progress(frame, reframe) }}>
          <PhotoCamera
            src={rolloutPhoto.src}
            width={rolloutPhoto.width}
            height={rolloutPhoto.height}
            move={{
              focus: rolloutPhoto.worm,
              anchor: firstChapter.middleFraming.anchor,
              scaleFrom: firstChapter.middleFraming.scale,
              scaleTo: pushScaleTo(
                firstChapter.middleFraming.scale,
                middleLength,
                fps,
                motion.pushPerSecond,
              ),
              durationInFrames: middleLength,
            }}
          />
        </AbsoluteFill>
      </Sequence>
      <Sequence
        from={wideCut}
        durationInFrames={wideLength}
        premountFor={fps}
        name="S01 handoff to S02"
      >
        <AbsoluteFill style={{ opacity: progress(frame, wideCut) }}>
          <PhotoCamera
            src={rolloutPhoto.src}
            width={rolloutPhoto.width}
            height={rolloutPhoto.height}
            move={{
              focus: rolloutPhoto.worm,
              anchor: wideFraming.anchor,
              scaleFrom: wideStart,
              scaleTo: pushScaleTo(
                wideFraming.scale,
                motion.dissolveFrames,
                fps,
                motion.pushPerSecond,
              ),
              durationInFrames: wideLength,
            }}
          />
        </AbsoluteFill>
      </Sequence>
    </>
  );
};

const PaperAndStripes = ({ timeline }: { timeline: Timeline }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { start, durationInFrames } = shotFirstChapterSpan(timeline);
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
  const closeElapsed = Math.max(0, frame - at("L004", 9));
  const scale = pushScaleTo(
    closeFraming.scale,
    closeElapsed,
    fps,
    motion.pushPerSecond,
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
    <AbsoluteFill
      style={{
        overflow: "hidden",
        opacity:
          1 - progress(frame, durationInFrames - motion.chapterDissolveFrames),
      }}
    >
      <div
        style={{
          position: "absolute",
          left: closeFraming.anchor.x - rolloutPhoto.worm.x * scale,
          top: closeFraming.anchor.y - rolloutPhoto.worm.y * scale,
          width: rolloutPhoto.width,
          height: rolloutPhoto.height,
          transformOrigin: "0 0",
          scale,
        }}
      >
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
            <svg
              width={paper.width}
              height={paper.height}
              viewBox={`0 ${tornPaperTexture.cropTop} ${tornPaperTexture.width} ${tornPaperTexture.cropHeight}`}
              preserveAspectRatio="none"
              style={{ position: "absolute", inset: 0 }}
            >
              <image
                href={staticFile(tornPaperTexture.src)}
                width={tornPaperTexture.width}
                height={tornPaperTexture.height}
              />
            </svg>
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
      </div>
    </AbsoluteFill>
  );
};

export const ShotFirstChapter = ({ timeline }: { timeline: Timeline }) => (
  <>
    <OpeningPhotos timeline={timeline} />
    <PaperAndStripes timeline={timeline} />
  </>
);

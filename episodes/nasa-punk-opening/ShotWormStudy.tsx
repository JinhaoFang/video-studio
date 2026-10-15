/**
 * S08-S11, L015-L022: four discrete logotype stages, crossed-out A bars,
 * manual quote, drawn rockets/arrows and a traced black-to-red worm.
 * Place in shotWormStudySpan(timeline). The first frame exactly repeats #67's
 * final paper transform; the existing 1%/second push continues from there.
 * All events use sentence anchors and approved sample durations. ProposalPaper
 * supplies the unmodified sheet; its Inter text is replaced in the same grid SVG.
 * Finish, subtitles and voice remain in Opening. TODO(design): confirm the
 * reference-measured camera/quote geometry and conservative sentence offsets.
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
import { font } from "../../src/styles/nasa-punk/fonts";
import {
  color,
  motion,
  proposal,
  typeScale,
  wormStudy,
} from "../../src/styles/nasa-punk/tokens";
import { TypedText } from "./Hud";
import { ProposalPaper } from "./ProposalPaper";
import { RedAnnotation } from "./RedAnnotation";
import { sentenceFrame } from "./sentence-timing";
import { WormLogotype } from "./WormLogotype";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const easeOut = (t: number) => 1 - (1 - t) ** 3;

export const shotWormStudySpan = (timeline: Timeline) => {
  const start = sentenceFrame(timeline, "L015");
  return { start, durationInFrames: timeline.durationInFrames - start };
};

export const ShotWormStudy = ({ timeline }: { timeline: Timeline }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { start, durationInFrames } = shotWormStudySpan(timeline);
  const at = (id: string, offset = 0) =>
    sentenceFrame(timeline, id, offset) - start;
  const fade = (from: number, duration = motion.dissolveFrames) =>
    interpolate(frame, [from, from + duration], [0, 1], clamp);
  const paper = proposal.paper;
  const study = wormStudy;
  const grid = paper.grid;
  const logo = study.logotype;
  const quote = study.quote;
  const stage2 = at("L015", motion.barDrawFrames);
  const stage3 = at("L016");
  const strike = at("L017", motion.barDrawFrames);
  const stage4 = at("L017", 2 * motion.barDrawFrames + motion.lineDrawFrames);
  const quoteStart = at("L018", motion.dissolveFrames);
  const closeStart = at("L017", -motion.barDrawFrames);
  const quoteMove = at("L018", motion.barDrawFrames);
  const rocketMove = at("L020");
  const wideMove = at("L021");
  const previousWideStart =
    sentenceFrame(timeline, "L013", -motion.dissolveFrames) +
    motion.barDrawFrames;
  const firstScale =
    paper.wide.scale *
    (1 + (motion.pushPerSecond * (start - 1 - previousWideStart)) / fps);
  const wideScale =
    firstScale +
    (paper.wide.scale * motion.pushPerSecond * Math.min(frame, closeStart)) /
      fps;
  const cameraFrames = [
    0,
    closeStart,
    closeStart + motion.barDrawFrames,
    quoteMove,
    quoteMove + motion.barDrawFrames,
    rocketMove,
    rocketMove + motion.barDrawFrames,
    wideMove,
    wideMove + motion.barDrawFrames,
    durationInFrames,
  ];
  const pushed = (base: number, elapsed: number) =>
    base * (1 + (motion.pushPerSecond * Math.max(0, elapsed)) / fps);
  const poses = [
    { ...paper.wide, scale: wideScale },
    { ...paper.wide, scale: wideScale },
    study.close,
    {
      ...study.close,
      scale: pushed(
        study.close.scale,
        quoteMove - closeStart - motion.barDrawFrames,
      ),
    },
    study.quoteCamera,
    {
      ...study.quoteCamera,
      scale: pushed(
        study.quoteCamera.scale,
        rocketMove - quoteMove - motion.barDrawFrames,
      ),
    },
    study.rocketCamera,
    {
      ...study.rocketCamera,
      scale: pushed(
        study.rocketCamera.scale,
        wideMove - rocketMove - motion.barDrawFrames,
      ),
    },
    study.finishCamera,
    {
      ...study.finishCamera,
      scale: pushed(
        study.finishCamera.scale,
        durationInFrames - wideMove - motion.barDrawFrames,
      ),
    },
  ];
  const camera = (key: "left" | "top" | "scale") =>
    interpolate(
      frame,
      cameraFrames,
      poses.map((pose) => pose[key]),
      {
        ...clamp,
        easing: (value) =>
          (frame >= closeStart && frame < closeStart + motion.barDrawFrames) ||
          (frame >= quoteMove && frame < quoteMove + motion.barDrawFrames) ||
          (frame >= rocketMove && frame < rocketMove + motion.barDrawFrames) ||
          (frame >= wideMove && frame < wideMove + motion.barDrawFrames)
            ? easeOut(value)
            : value,
      },
    );
  const scale = camera("scale");
  const baseScale = interpolate(
    frame,
    cameraFrames,
    [
      paper.wide.scale,
      paper.wide.scale,
      study.close.scale,
      study.close.scale,
      study.quoteCamera.scale,
      study.quoteCamera.scale,
      study.rocketCamera.scale,
      study.rocketCamera.scale,
      study.finishCamera.scale,
      study.finishCamera.scale,
    ],
    { ...clamp, easing: easeOut },
  );
  const redStart = at("L021", motion.barDrawFrames);
  const redProgress = interpolate(frame, [redStart, at("L022")], [0, 1], clamp);
  const completed = -timeline.durationInFrames;
  return (
    <AbsoluteFill style={{ backgroundColor: color.desk, overflow: "hidden" }}>
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
          left: camera("left") - ((scale - baseScale) * paper.width) / 2,
          top: camera("top") - ((scale - baseScale) * paper.height) / 2,
          scale: String(scale),
          transformOrigin: "0 0",
        }}
      >
        <ProposalPaper
          circleStart={completed}
          nicknameStart={completed}
          gridStart={completed}
          logotypeStart={frame < stage2 ? completed : durationInFrames}
        />
        <div
          style={{
            position: "absolute",
            width: paper.width,
            height: paper.height,
            rotate: `${paper.rotation}deg`,
            transformOrigin: "0 0",
          }}
        >
          <svg
            width={grid.width}
            height={grid.height}
            style={{
              position: "absolute",
              left: grid.left,
              top: grid.top,
              overflow: "visible",
            }}
          >
            {frame >= stage2 ? (
              <WormLogotype stage={1} opacity={1 - fade(stage2)} />
            ) : null}
            <WormLogotype
              stage={2}
              opacity={fade(stage2) * (1 - fade(stage3))}
            />
            <WormLogotype
              stage={3}
              opacity={fade(stage3) * (1 - fade(stage4))}
            />
            <WormLogotype
              stage={4}
              opacity={fade(stage4)}
              redProgress={redProgress}
            />
          </svg>
          <div style={{ opacity: 1 - fade(stage4) }}>
            {logo.crossbars.map((bar, index) => (
              <RedAnnotation
                key={index}
                shape="strike"
                left={
                  grid.left +
                  logo.left +
                  (bar.x * logo.width) / logo.sourceWidth -
                  quote.padding
                }
                top={
                  grid.top + logo.top + (bar.y * logo.width) / logo.sourceWidth
                }
                width={
                  (bar.width * logo.width) / logo.sourceWidth +
                  2 * quote.padding
                }
                height={(bar.height * logo.width) / logo.sourceWidth}
                start={strike + index * motion.lineDrawFrames}
              />
            ))}
          </div>
          <div
            style={{
              position: "absolute",
              left: quote.left,
              top: quote.top,
              opacity: fade(quoteStart),
            }}
          >
            <div
              style={{
                width: quote.width,
                height: quote.height,
                boxSizing: "border-box",
                padding: quote.padding,
                backgroundColor: color.paper,
                boxShadow: `0 ${paper.shadowY}px ${paper.shadowBlur}px ${color.nearBlack}`,
                color: color.ink,
                fontFamily: font.body,
                fontSize: quote.size,
                lineHeight: quote.lineHeight,
                position: "relative",
              }}
            >
              <Img
                src={staticFile(
                  "episodes/nasa-punk-opening/textures/paper-ivory-generated.png",
                )}
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  opacity: paper.textureOpacity,
                  mixBlendMode: "multiply",
                }}
              />
              <div style={{ position: "relative" }}>
                <div>technical precision. Elimination of</div>
                <div>cross-strokes in the two “A” letters</div>
                <div>imparts a vertical thrust to the logo-</div>
                <div>type and lends it a quality of unique-</div>
                <div>ness and contemporary character.</div>
              </div>
              <RedAnnotation
                shape="underline"
                {...quote.underline}
                start={at("L019")}
              />
            </div>
          </div>
          {logo.aApices.map((apex, index) => {
            const x =
              grid.left + logo.left + (apex * logo.width) / logo.sourceWidth;
            const y = grid.top + logo.top;
            const draw = at(
              "L020",
              motion.barDrawFrames + index * motion.lineDrawFrames,
            );
            return (
              <div key={index}>
                <RedAnnotation
                  shape="upArrow"
                  left={x - study.arrow.width / 2}
                  top={y - study.arrow.height - study.arrow.gapAbove}
                  width={study.arrow.width}
                  height={study.arrow.height}
                  start={draw}
                />
                <RedAnnotation
                  shape="rocket"
                  left={x + study.rocket.offsetX - study.rocket.width / 2}
                  top={y - study.rocket.height - study.rocket.gapAbove}
                  width={study.rocket.width}
                  height={study.rocket.height}
                  start={draw + motion.lineDrawFrames}
                />
              </div>
            );
          })}
          <div
            style={{
              position: "absolute",
              left: grid.left + study.nickname.left,
              top: grid.top + study.nickname.top,
              fontFamily: font.mono,
              fontSize: study.nickname.size,
              fontWeight: typeScale.hudLabel.weight,
              letterSpacing: typeScale.credit.letterSpacing,
              color: color.wormRed,
            }}
          >
            <TypedText text={'"THE WORM"'} start={at("L022")} />
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

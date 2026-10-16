/**
 * Four-digit mission clock for S05. Configure fromYear/targetYear, local start
 * and scramble duration. Seeded, nonzero digit increments change every column
 * at each tick; columns settle left-to-right and then render static faces.
 * Split faces rotate around the center seam, driven only by Remotion frames.
 * Layout comes from reference-sampled proposal tokens; no sound is added here.
 */
import { AbsoluteFill, interpolate, random, useCurrentFrame } from "remotion";
import { font } from "../../src/styles/nasa-punk/fonts";
import { color, proposal, typeScale } from "../../src/styles/nasa-punk/tokens";

const clock = proposal.clock;

const rollingDigit = (initial: number, index: number, tick: number): number => {
  let value = initial;
  for (let step = 0; step < tick; step++) {
    value = (value + 1 + Math.floor(random(`year:${index}:${step}`) * 9)) % 10;
  }
  return value;
};

const DigitFace = ({ value }: { value: number }) => (
  <AbsoluteFill
    style={{
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: color.desk,
      color: color.paper,
      fontFamily: font.mono,
      fontWeight: typeScale.hudLabel.weight,
      fontSize: clock.digitSize,
      lineHeight: 1,
      fontVariantNumeric: "tabular-nums",
    }}
  >
    {value}
  </AbsoluteFill>
);

export const FlipYearClock = ({
  fromYear = 2020,
  targetYear = 1974,
  start,
  scrambleFrames = clock.scrambleFrames,
}: {
  fromYear?: number;
  targetYear?: number;
  start: number;
  scrambleFrames?: number;
}) => {
  const frame = useCurrentFrame();
  if (
    ![fromYear, targetYear].every(
      (year) => Number.isInteger(year) && year >= 0 && year <= 9999,
    )
  ) {
    throw new Error("翻牌钟年份必须是 0～9999 的整数。");
  }
  if (
    !Number.isSafeInteger(scrambleFrames) ||
    scrambleFrames <= 3 * clock.stopStaggerFrames
  ) {
    throw new Error("翻牌钟乱跳时长必须是大于逐位停稳跨度的整数帧。");
  }
  const from = `0000${fromYear}`.slice(-4);
  const target = `0000${targetYear}`.slice(-4);
  return (
    <div
      style={{
        position: "absolute",
        left: clock.left,
        top: clock.top,
        width: clock.width,
        height: clock.height,
        borderRadius: clock.radius,
        border: `${clock.border}px solid ${color.inkSoft}`,
        backgroundColor: color.deskCorner,
        boxShadow: `0 ${proposal.paper.shadowY}px ${proposal.paper.shadowBlur}px ${color.nearBlack}`,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: clock.labelLeft,
          right: clock.labelLeft,
          top: clock.labelTop,
          display: "flex",
          justifyContent: "space-between",
          fontFamily: font.mono,
          fontSize: typeScale.hudBar.size,
          letterSpacing: typeScale.hudBar.letterSpacing,
          color: color.inkMuted,
        }}
      >
        <span>MISSION CLOCK · YEAR</span>
        <span>NASA · KSC</span>
      </div>
      {[0, 1, 2, 3].map((index) => {
        const elapsed = frame - start;
        const stop = scrambleFrames - (3 - index) * clock.stopStaggerFrames;
        const rolling = elapsed >= 0 && elapsed < stop;
        const tick = Math.floor(Math.max(0, elapsed) / clock.stepFrames) + 1;
        const value =
          elapsed < 0
            ? Number(from[index])
            : elapsed >= stop
              ? Number(target[index])
              : rollingDigit(Number(from[index]), index, tick);
        const previous = rollingDigit(Number(from[index]), index, tick - 1);
        const phase = (elapsed % clock.stepFrames) / clock.stepFrames;
        return (
          <div
            key={index}
            style={{
              position: "absolute",
              left:
                clock.labelLeft + index * (clock.digitWidth + clock.digitGap),
              top: clock.digitTop,
              width: clock.digitWidth,
              height: clock.digitHeight,
              perspective: clock.height,
            }}
          >
            <DigitFace value={value} />
            {rolling ? (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  height: "50%",
                  overflow: "hidden",
                  transformOrigin: "center bottom",
                  transform: `rotateX(${interpolate(phase, [0, 0.5], [0, -90], { extrapolateRight: "clamp" })}deg)`,
                  backfaceVisibility: "hidden",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    height: clock.digitHeight,
                  }}
                >
                  <DigitFace value={previous} />
                </div>
              </div>
            ) : null}
            <div
              style={{
                position: "absolute",
                top: "50%",
                width: "100%",
                height: clock.seamWidth,
                backgroundColor: color.nearBlack,
              }}
            />
          </div>
        );
      })}
      {[false, true].map((right) =>
        [false, true].map((bottom) => (
          <div
            key={`${right}:${bottom}`}
            style={{
              position: "absolute",
              left: right ? undefined : clock.screwInset,
              right: right ? clock.screwInset : undefined,
              top: bottom ? undefined : clock.screwInset,
              bottom: bottom ? clock.screwInset : undefined,
              width: clock.screwSize,
              height: clock.screwSize,
              borderRadius: "50%",
              border: `${clock.border}px solid ${color.inkSoft}`,
              rotate: `${clock.screwRotation}deg`,
            }}
          >
            <div
              style={{
                position: "absolute",
                top: "50%",
                width: "100%",
                height: clock.border,
                backgroundColor: color.inkSoft,
              }}
            />
          </div>
        )),
      )}
    </div>
  );
};

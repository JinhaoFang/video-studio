/**
 * HUD pieces for photo scenes. `HudBox` draws four corner brackets around a box in
 * the parent's units (photo pixels inside PhotoCamera), with a typed label row
 * above and an optional typed timeline below. `HudTopBar` and `PhotoCredit` sit in
 * screen space. Em dashes in the timeline use the Helvetica stand-in, since the
 * Space Mono dash is too short. Progress values come from the caller's sentence-anchored timing.
 */
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { font } from "../../src/styles/nasa-punk/fonts";
import {
  color,
  hud,
  motion,
  typeScale,
} from "../../src/styles/nasa-punk/tokens";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export const typedCount = (frame: number, start: number): number =>
  Math.max(0, Math.floor((frame - start) * motion.typeCharsPerFrame));

const withDashFont = (text: string, dashFont?: string) =>
  dashFont === undefined
    ? text
    : text.split(/(—)/).map((part, index) =>
        part === "—" ? (
          <span key={index} style={{ fontFamily: dashFont }}>
            {part}
          </span>
        ) : (
          part
        ),
      );

export const TypedText = ({
  text,
  start,
  dashFont,
}: {
  text: string;
  start: number;
  dashFont?: string;
}) => {
  const frame = useCurrentFrame();
  const shown = text.slice(0, typedCount(frame, start));
  return (
    <span style={{ whiteSpace: "pre" }}>
      {withDashFont(shown, dashFont)}
      <span style={{ visibility: "hidden" }}>
        {withDashFont(text.slice(shown.length), dashFont)}
      </span>
    </span>
  );
};

type Box = { left: number; top: number; width: number; height: number };

const Bracket = ({
  box,
  corner,
  draw,
  stroke,
}: {
  box: Box;
  corner: "tl" | "tr" | "bl" | "br";
  draw: number;
  stroke: number;
}) => {
  const arm = box.width * hud.bracketArmRatio * draw;
  const right = corner === "tr" || corner === "br";
  const bottom = corner === "bl" || corner === "br";
  const x = right ? box.left + box.width : box.left;
  const y = bottom ? box.top + box.height : box.top;
  const common = { position: "absolute", backgroundColor: color.ink } as const;
  return (
    <>
      <div
        style={{
          ...common,
          left: right ? x - arm : x - stroke / 2,
          top: y - stroke / 2,
          width: arm + stroke / 2,
          height: stroke,
        }}
      />
      <div
        style={{
          ...common,
          left: x - stroke / 2,
          top: bottom ? y - arm : y - stroke / 2,
          width: stroke,
          height: arm + stroke / 2,
        }}
      />
    </>
  );
};

export const HudBox = ({
  box,
  stroke,
  bracketStart,
  label,
  labelMuted,
  labelStart,
  labelSize,
  labelGap,
  timeline,
  timelineStart,
  timelineSize,
  timelineGap,
}: {
  box: Box;
  stroke: number;
  bracketStart: number;
  label: string;
  labelMuted: string;
  labelStart: number;
  labelSize: number;
  labelGap: number;
  timeline?: string;
  timelineStart?: number;
  timelineSize?: number;
  timelineGap?: number;
}) => {
  const frame = useCurrentFrame();
  const draw = interpolate(
    frame,
    [bracketStart, bracketStart + motion.lineDrawFrames],
    [0, 1],
    { ...clamp, easing: (t) => 1 - (1 - t) ** 3 },
  );
  const mutedStart = labelStart + label.length / motion.typeCharsPerFrame;
  return (
    <>
      {draw > 0
        ? (["tl", "tr", "bl", "br"] as const).map((corner) => (
            <Bracket
              key={corner}
              box={box}
              corner={corner}
              draw={draw}
              stroke={stroke}
            />
          ))
        : null}
      <div
        style={{
          position: "absolute",
          left: box.left,
          width: box.width,
          top: box.top - labelGap - labelSize,
          display: "flex",
          justifyContent: "space-between",
          fontFamily: font.mono,
          fontSize: labelSize,
          lineHeight: 1,
          letterSpacing: typeScale.hudLabel.letterSpacing,
        }}
      >
        <span
          style={{ color: color.ink, fontWeight: typeScale.hudLabel.weight }}
        >
          <TypedText text={label} start={labelStart} />
        </span>
        <span
          style={{
            color: color.inkMuted,
            fontWeight: typeScale.hudLabel.mutedWeight,
          }}
        >
          <TypedText text={labelMuted} start={mutedStart} />
        </span>
      </div>
      {timeline !== undefined &&
      timelineStart !== undefined &&
      timelineSize !== undefined &&
      timelineGap !== undefined ? (
        <div
          style={{
            position: "absolute",
            left: box.left,
            top: box.top + box.height + timelineGap,
            fontFamily: font.mono,
            fontSize: timelineSize,
            lineHeight: 1,
            fontWeight: typeScale.hudTimeline.weight,
            letterSpacing: typeScale.hudTimeline.letterSpacing,
            color: color.inkSoft,
          }}
        >
          <TypedText
            text={timeline}
            start={timelineStart}
            dashFont={font.helvetica}
          />
        </div>
      ) : null}
    </>
  );
};

export const HudTopBar = ({
  items,
  start,
}: {
  items: [string, string, string];
  start: number;
}) => {
  const frame = useCurrentFrame();
  const draw = interpolate(
    frame,
    [start, start + motion.barDrawFrames],
    [0, 1],
    { ...clamp, easing: (t) => 1 - (1 - t) ** 3 },
  );
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          left: hud.edgeInset,
          top: hud.barLineY,
          width: (1920 - hud.edgeInset * 2) * draw,
          height: 1,
          backgroundColor: color.hudOnDarkLine,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: hud.edgeInset,
          right: hud.edgeInset,
          top: hud.barLineY - hud.barTextGap - typeScale.hudBar.size,
          display: "flex",
          justifyContent: "space-between",
          fontFamily: font.mono,
          fontSize: typeScale.hudBar.size,
          lineHeight: 1,
          letterSpacing: typeScale.hudBar.letterSpacing,
          color: color.hudOnDark,
        }}
      >
        {items.map((item, index) => (
          <TypedText
            key={item}
            text={item}
            start={start + index * (motion.barDrawFrames / 3)}
          />
        ))}
      </div>
    </AbsoluteFill>
  );
};

export const PhotoCredit = ({
  text,
  start,
}: {
  text: string;
  start: number;
}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(
    frame,
    [start, start + motion.dissolveFrames],
    [0, 1],
    clamp,
  );
  return (
    <div
      style={{
        position: "absolute",
        right: hud.edgeInset,
        bottom: hud.creditBottom,
        fontFamily: font.mono,
        fontSize: typeScale.credit.size,
        letterSpacing: typeScale.credit.letterSpacing,
        color: color.hudOnDarkFaint,
        opacity,
      }}
    >
      {text}
    </div>
  );
};

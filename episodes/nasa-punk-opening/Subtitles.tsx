/**
 * Subtitle bar: bottom-centered dark bar with a vertical four-color strip on the
 * left. Each line expands from the strip, collapses back to it after the line, and
 * joined lines swap text in place. Timing comes from subtitle-schedule.ts, look
 * from the nasa-punk tokens; display text gets CJK/Latin spacing.
 */
import { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { Timeline } from "../../tools/timeline-types";
import { font } from "../../src/styles/nasa-punk/fonts";
import { color, subtitle, typeScale } from "../../src/styles/nasa-punk/tokens";
import { buildSubtitleSchedule, subtitleState } from "./subtitle-schedule";
import { spaceMixedText } from "./text-spacing";

export const Subtitles = ({ timeline }: { timeline: Timeline }) => {
  const frame = useCurrentFrame();
  const schedule = useMemo(
    () => buildSubtitleSchedule(timeline.lines, subtitle),
    [timeline],
  );
  const state = subtitleState(schedule, frame);
  if (!state || (state.stripOpacity === 0 && state.reveal === 0)) return null;
  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-end",
        alignItems: "center",
        paddingBottom: subtitle.bottom,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          display: "flex",
          height: subtitle.height,
          opacity: state.stripOpacity,
        }}
      >
        <div style={{ display: "flex" }}>
          {color.stripe.map((stripe) => (
            <div
              key={stripe}
              style={{
                width: subtitle.stripeWidth,
                height: "100%",
                backgroundColor: stripe,
              }}
            />
          ))}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: `0 ${subtitle.paddingX}px`,
            backgroundColor: color.subtitleBg,
            color: color.subtitleText,
            fontFamily: font.cjk,
            fontSize: typeScale.subtitle.size,
            fontWeight: typeScale.subtitle.weight,
            letterSpacing: typeScale.subtitle.letterSpacing,
            whiteSpace: "pre",
            clipPath: `inset(0 ${(1 - state.reveal) * 100}% 0 0)`,
          }}
        >
          {spaceMixedText(state.slot.text)}
        </div>
      </div>
    </AbsoluteFill>
  );
};

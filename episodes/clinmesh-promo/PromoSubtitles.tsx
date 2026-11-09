/**
 * Bottom caption bar for ClinMesh promo: pairs timeline schedule with CJK/Latin
 * spacing, unclipped centered single-line pill, and automatic suppression on the
 * final brand poster hold in S08.
 */
import { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import {
  buildSubtitleSchedule,
  subtitleState,
} from "../../src/kit/subtitle-schedule";
import { sentenceFrame } from "../../src/kit/sentence-timing";
import type { Timeline } from "../../tools/timeline-types";
import { promoFont } from "./fonts";
import { clamp01 } from "./motion-utils";
import { promoColor, promoSubtitle } from "./tokens";

const spaceCjkLatin = (text: string): string =>
  text
    .replace(/([\u4e00-\u9fff])([A-Za-z0-9])/g, "$1 $2")
    .replace(/([A-Za-z0-9])([\u4e00-\u9fff])/g, "$1 $2");

export const PromoSubtitles: React.FC<{ timeline: Timeline }> = ({
  timeline,
}) => {
  const frame = useCurrentFrame();
  const schedule = useMemo(
    () => buildSubtitleSchedule(timeline.lines, promoSubtitle),
    [timeline],
  );
  const posterHideStart = useMemo(
    () => sentenceFrame(timeline, "L014", 44),
    [timeline],
  );
  const posterHide = 1 - clamp01((frame - posterHideStart) / 10);
  const state = subtitleState(schedule, frame);
  if (
    !state ||
    posterHide <= 0.01 ||
    (state.stripOpacity === 0 && state.reveal === 0)
  ) {
    return null;
  }
  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-end",
        alignItems: "center",
        paddingBottom: promoSubtitle.bottom,
        pointerEvents: "none",
        opacity: posterHide,
      }}
    >
      <div
        style={{
          display: "flex",
          flexShrink: 0,
          height: promoSubtitle.height,
          opacity: state.stripOpacity,
          filter: "drop-shadow(0 12px 28px rgba(0, 0, 0, 0.56))",
        }}
      >
        <div
          style={{
            width: promoSubtitle.stripeWidth,
            height: "100%",
            borderRadius: "8px 0 0 8px",
            background: `linear-gradient(180deg, ${promoColor.stageAccent} 0%, ${promoColor.info} 100%)`,
          }}
        />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: `0 ${promoSubtitle.paddingX}px`,
            borderRadius: "0 8px 8px 0",
            backgroundColor: promoColor.subtitleBg,
            borderTop: `1px solid ${promoColor.border}`,
            borderRight: `1px solid ${promoColor.border}`,
            borderBottom: `1px solid ${promoColor.border}`,
            color: promoColor.fg,
            fontFamily: promoFont.sans,
            fontSize: promoSubtitle.fontSize,
            fontWeight: 500,
            letterSpacing: "0.02em",
            whiteSpace: "pre",
            clipPath: `inset(0 ${(1 - state.reveal) * 100}% 0 0)`,
          }}
        >
          {spaceCjkLatin(state.slot.text)}
        </div>
      </div>
    </AbsoluteFill>
  );
};

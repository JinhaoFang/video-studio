/**
 * Shared visual primitives for ClinMesh promo: crisp CSS-zoom PageCam, tabular
 * DigitRoll, directional SpeedBlur, semantic badges, dashed provenance pill, and
 * letterpress dark chapter BreatherCard (B01-B03).
 */
import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { promoFont } from "./fonts";
import { EASE, lerp, ramp } from "./motion-utils";
import { promoColor, promoRadius } from "./tokens";

export type CamKey = {
  frame: number;
  cx: number;
  cy: number;
  zoom: number;
  rotX?: number;
  rotY?: number;
  rotZ?: number;
  persp?: number;
};

export const PageCam: React.FC<{
  keys: CamKey[];
  pageW?: number;
  pageH?: number;
  frameOverride?: number;
  children: ReactNode;
}> = ({ keys, pageW = 1920, pageH = 1080, frameOverride, children }) => {
  const curFrame = useCurrentFrame();
  const f = frameOverride ?? curFrame;
  let a = keys[0];
  let b = keys[keys.length - 1];
  for (let i = 0; i < keys.length - 1; i++) {
    if (f >= keys[i].frame && f <= keys[i + 1].frame) {
      a = keys[i];
      b = keys[i + 1];
      break;
    }
  }
  const t =
    a.frame === b.frame
      ? 1
      : interpolate(f, [a.frame, b.frame], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: EASE.snappy,
        });
  const cx = lerp(a.cx, b.cx, t);
  const cy = lerp(a.cy, b.cy, t);
  const zoom = lerp(a.zoom, b.zoom, t);
  const rotX = lerp(a.rotX ?? 0, b.rotX ?? 0, t);
  const rotY = lerp(a.rotY ?? 0, b.rotY ?? 0, t);
  const rotZ = lerp(a.rotZ ?? 0, b.rotZ ?? 0, t);
  const persp = lerp(a.persp ?? 1400, b.persp ?? 1400, t);
  return (
    <AbsoluteFill
      style={{
        perspective: `${persp * zoom}px`,
        perspectiveOrigin: "960px 540px",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          width: pageW,
          height: pageH,
          zoom,
          transform: `translate(${960 / zoom - cx}px, ${540 / zoom - cy}px) rotateY(${rotY}deg) rotateX(${rotX}deg) rotateZ(${rotZ}deg)`,
          transformOrigin: `${cx}px ${cy}px`,
          transformStyle: "preserve-3d",
        }}
      >
        {children}
      </div>
    </AbsoluteFill>
  );
};

const DIGITS = "0123456789";

export const DigitRoll: React.FC<{
  value: string;
  delay?: number;
  fontSize?: number;
  color?: string;
  fontWeight?: number;
}> = ({
  value,
  delay = 0,
  fontSize = 56,
  color = promoColor.success,
  fontWeight = 800,
}) => {
  const frame = useCurrentFrame();
  const lineH = Math.round(fontSize * 1.16);
  return (
    <span
      style={{
        display: "inline-flex",
        overflow: "hidden",
        height: lineH,
        verticalAlign: "bottom",
        fontFamily: promoFont.mono,
        fontWeight,
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {value.split("").map((ch, idx) => {
        const target = DIGITS.indexOf(ch);
        if (target < 0) {
          return (
            <span
              key={idx}
              style={{ fontSize, lineHeight: `${lineH}px`, color }}
            >
              {ch}
            </span>
          );
        }
        const t = interpolate(
          frame,
          [delay + idx * 3.5, delay + idx * 3.5 + 22],
          [0, 1],
          {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.bezier(0.25, 0.8, 0.25, 1),
          },
        );
        const offset = (10 + target) * t * lineH;
        return (
          <span key={idx} style={{ display: "inline-block", height: lineH }}>
            <span
              style={{
                display: "block",
                transform: `translateY(${-offset}px)`,
              }}
            >
              {(DIGITS + DIGITS).split("").map((d, j) => (
                <span
                  key={j}
                  style={{
                    display: "block",
                    fontSize,
                    lineHeight: `${lineH}px`,
                    color,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {d}
                </span>
              ))}
            </span>
          </span>
        );
      })}
    </span>
  );
};

export const SpeedBlur: React.FC<{
  vx: number;
  vy: number;
  id: string;
  amount?: number;
  max?: number;
  children: ReactNode;
}> = ({ vx, vy, id, amount = 0.08, max = 9, children }) => {
  const speed = Math.hypot(vx, vy);
  const sd = Math.min(max, speed * amount);
  if (sd < 0.35) return <>{children}</>;
  const angle = (Math.atan2(vy, vx) * 180) / Math.PI;
  return (
    <div
      style={{
        transform: `rotate(${angle}deg)`,
        filter: `url(#${id})`,
      }}
    >
      <svg width={0} height={0} style={{ position: "absolute" }}>
        <filter id={id} x="-25%" y="-25%" width="150%" height="150%">
          <feGaussianBlur stdDeviation={`${sd.toFixed(2)} 0`} />
        </filter>
      </svg>
      <div style={{ transform: `rotate(${-angle}deg)` }}>{children}</div>
    </div>
  );
};

export type BadgeTone = "info" | "success" | "warn" | "danger" | "neutral";

const TONE_MAP: Record<BadgeTone, { fg: string; bg: string; border: string }> =
  {
    info: {
      fg: promoColor.info,
      bg: "rgba(141, 187, 255, 0.15)",
      border: "rgba(141, 187, 255, 0.36)",
    },
    success: {
      fg: promoColor.success,
      bg: "rgba(125, 219, 164, 0.15)",
      border: "rgba(125, 219, 164, 0.36)",
    },
    warn: {
      fg: promoColor.warning,
      bg: "rgba(244, 202, 123, 0.15)",
      border: "rgba(244, 202, 123, 0.36)",
    },
    danger: {
      fg: promoColor.destructive,
      bg: "rgba(255, 155, 155, 0.15)",
      border: "rgba(255, 155, 155, 0.38)",
    },
    neutral: {
      fg: promoColor.fgMuted,
      bg: "rgba(255, 255, 255, 0.07)",
      border: "rgba(255, 255, 255, 0.18)",
    },
  };

export const StatusBadge: React.FC<{
  tone?: BadgeTone;
  children: ReactNode;
  style?: CSSProperties;
}> = ({ tone = "info", children, style }) => {
  const palette = TONE_MAP[tone];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "7px 18px",
        borderRadius: promoRadius.control,
        fontFamily: promoFont.sans,
        fontSize: 28,
        fontWeight: 600,
        lineHeight: 1.2,
        color: palette.fg,
        backgroundColor: palette.bg,
        border: `1px solid ${palette.border}`,
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {children}
    </span>
  );
};

export const ProvenancePill: React.FC<{
  label?: string;
  opacity?: number;
}> = ({ label = "·助手", opacity = 1 }) => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      padding: "4px 14px",
      borderRadius: promoRadius.control,
      border: "1.5px dashed rgba(141, 187, 255, 0.72)",
      backgroundColor: "rgba(141, 187, 255, 0.10)",
      color: promoColor.info,
      fontFamily: promoFont.sans,
      fontSize: 26,
      fontWeight: 600,
      opacity,
    }}
  >
    {label}
  </span>
);

export const BreatherCard: React.FC<{
  chapterNo: string;
  titlePrefix: string;
  accentWord: string;
  durationInFrames: number;
}> = ({ chapterNo, titlePrefix, accentWord, durationInFrames }) => {
  const f = useCurrentFrame();
  const enter = ramp(f, 0, 7, EASE.out);
  const exit = ramp(f, durationInFrames - 8, 8, EASE.exit);
  const cardOpacity = enter * (1 - exit);
  const tokens = [
    {
      text: chapterNo,
      isAccent: false,
      isMono: true,
    },
    {
      text: titlePrefix,
      isAccent: false,
      isMono: false,
    },
    {
      text: accentWord,
      isAccent: true,
      isMono: false,
    },
  ];
  const ruleScale = ramp(f, 14, 18, EASE.swift);
  return (
    <AbsoluteFill
      style={{
        background:
          "radial-gradient(1050px 680px at 50% 44%, rgba(124, 134, 255, 0.14), rgba(18, 18, 16, 0.99) 70%)",
        justifyContent: "center",
        alignItems: "center",
        opacity: cardOpacity,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 28,
          }}
        >
          {tokens.map((tok, i) => {
            const t = ramp(f, 3 + i * 4, 9, Easing.bezier(0.2, 0.75, 0.3, 1));
            const scale = 1.26 - 0.26 * t;
            const blur = (1 - t) * 6.5;
            return (
              <span
                key={tok.text}
                style={{
                  display: "inline-block",
                  opacity: t,
                  transform: `scale(${scale})`,
                  filter: blur > 0.2 ? `blur(${blur.toFixed(1)}px)` : undefined,
                  fontFamily: tok.isMono ? promoFont.mono : promoFont.serif,
                  fontSize: tok.isMono ? 58 : 88,
                  fontWeight: 600,
                  fontStyle: tok.isAccent ? "italic" : "normal",
                  color: tok.isAccent
                    ? promoColor.stageAccent
                    : tok.isMono
                      ? "#9CA4FF"
                      : "#F6F7FB",
                  letterSpacing: tok.isMono ? "0.04em" : "0.01em",
                }}
              >
                {tok.text}
              </span>
            );
          })}
        </div>
        <div
          style={{
            width: 248,
            height: 5,
            borderRadius: 3,
            backgroundColor: promoColor.stageAccent,
            marginTop: 34,
            transform: `scaleX(${ruleScale})`,
            transformOrigin: "50% 50%",
          }}
        />
      </div>
    </AbsoluteFill>
  );
};

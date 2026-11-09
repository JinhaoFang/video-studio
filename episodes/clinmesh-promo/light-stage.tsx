/**
 * Shared Light-Theme workstation stage primitive for Scenes S03-S06 in the
 * ClinMeshPromo composition: pairs a concise Chinese top header
 * and live step pills with a pure-white 1764x890 workstation frame, clamped
 * CSS-zoom camera, capture layer stack, focus callouts, tactile click ripples,
 * and a high-contrast dark pointer.
 */
import type { ReactNode } from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { promoFont } from "./fonts";
import { EASE, lerp, ramp } from "./motion-utils";
import { promoColor } from "./tokens";

export const LIGHT_VIEW_W = 1764;
export const LIGHT_VIEW_H = 890;
export const LIGHT_IMG_W = 1680;
export const LIGHT_IMG_H = 1020;

export type LightTone = "blue" | "emerald" | "amber";

export type LightStepPill = {
  num: string;
  idleLabel: string;
  doneLabel?: string;
  active: boolean;
  done: boolean;
  tone?: LightTone;
};

export type LightViewCamKey = {
  frame: number;
  cx: number;
  cy: number;
  zoom: number;
};

export type LightCaptureLayer = {
  src: string;
  fadeInStart: number;
  fadeInDur: number;
};

export type LightClickAction = {
  frame: number;
  cx: number;
  cy: number;
  rect: { left: number; top: number; width: number; height: number };
  tone?: LightTone;
};

export type LightCalloutBox = {
  id: string;
  startFrame: number;
  endFrame: number;
  rect: { left: number; top: number; width: number; height: number };
  label?: string;
  labelAlign?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  labelOutset?: number;
  tone?: LightTone;
};

export type LightCursorStop = {
  frame: number;
  x: number;
  y: number;
};

const TONE_STYLES: Record<
  LightTone,
  {
    stroke: string;
    glow: string;
    pillBg: string;
    pillFg: string;
    headerDoneBg: string;
    headerDoneBorder: string;
    headerDoneFg: string;
  }
> = {
  blue: {
    stroke: "#2563EB",
    glow: "rgba(37, 99, 235, 0.36)",
    pillBg: "#1D4ED8",
    pillFg: "#FFFFFF",
    headerDoneBg: "rgba(141, 187, 255, 0.18)",
    headerDoneBorder: "rgba(141, 187, 255, 0.54)",
    headerDoneFg: "#CFE2FF",
  },
  emerald: {
    stroke: "#187442",
    glow: "rgba(24, 116, 66, 0.42)",
    pillBg: "#166534",
    pillFg: "#FFFFFF",
    headerDoneBg: "rgba(125, 219, 164, 0.16)",
    headerDoneBorder: "rgba(125, 219, 164, 0.48)",
    headerDoneFg: promoColor.success,
  },
  amber: {
    stroke: "#D97706",
    glow: "rgba(217, 119, 6, 0.38)",
    pillBg: "#B45309",
    pillFg: "#FFFFFF",
    headerDoneBg: "rgba(245, 158, 11, 0.18)",
    headerDoneBorder: "rgba(251, 191, 36, 0.52)",
    headerDoneFg: "#FDE68A",
  },
};

export const LightViewportCam: React.FC<{
  keys: LightViewCamKey[];
  children: ReactNode;
}> = ({ keys, children }) => {
  const f = useCurrentFrame();
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
  const minZoom = Math.max(
    LIGHT_VIEW_W / LIGHT_IMG_W,
    LIGHT_VIEW_H / LIGHT_IMG_H,
  );
  const baseZoom = lerp(a.zoom, b.zoom, t);
  const isModalZoom = baseZoom > minZoom + 0.015;
  const microZoom = isModalZoom ? Math.sin(f * 0.085) * 0.0018 : 0;
  const zoom = Math.max(minZoom, baseZoom + microZoom);
  const halfW = LIGHT_VIEW_W / (2 * zoom);
  const halfH = LIGHT_VIEW_H / (2 * zoom);
  const driftX = isModalZoom ? Math.sin(f * 0.055) * 1.1 : 0;
  const driftY = isModalZoom ? Math.cos(f * 0.065) * 1.2 : 0;
  const rawCx = lerp(a.cx, b.cx, t) + driftX;
  const rawCy = lerp(a.cy, b.cy, t) + driftY;
  const cx = Math.min(LIGHT_IMG_W - halfW, Math.max(halfW, rawCx));
  const cy = Math.min(LIGHT_IMG_H - halfH, Math.max(halfH, rawCy));

  return (
    <div
      style={{
        position: "relative",
        width: LIGHT_VIEW_W,
        height: LIGHT_VIEW_H,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          width: LIGHT_IMG_W,
          height: LIGHT_IMG_H,
          zoom,
          transform: `translate(${LIGHT_VIEW_W / (2 * zoom) - cx}px, ${LIGHT_VIEW_H / (2 * zoom) - cy}px)`,
          transformOrigin: `${cx}px ${cy}px`,
        }}
      >
        {children}
      </div>
    </div>
  );
};

const cursorPosAt = (
  stops: LightCursorStop[],
  f: number,
): { x: number; y: number } => {
  let a = stops[0];
  let b = stops[stops.length - 1];
  for (let i = 0; i < stops.length - 1; i++) {
    if (f >= stops[i].frame && f <= stops[i + 1].frame) {
      a = stops[i];
      b = stops[i + 1];
      break;
    }
  }
  const t =
    a.frame === b.frame
      ? 1
      : interpolate(f, [a.frame, b.frame], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: EASE.smooth,
        });
  return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) };
};

export const LightWorkstationStage: React.FC<{
  title: string;
  steps: LightStepPill[];
  camKeys: LightViewCamKey[];
  layers: LightCaptureLayer[];
  clicks?: LightClickAction[];
  callouts?: LightCalloutBox[];
  cursorStops?: LightCursorStop[];
  cursorSpan?: [number, number];
  finalTone?: { progress: number; kind: LightTone };
  children?: ReactNode;
}> = ({
  title,
  steps,
  camKeys,
  layers,
  clicks = [],
  callouts = [],
  cursorStops = [],
  cursorSpan,
  finalTone,
  children,
}) => {
  const f = useCurrentFrame();
  const stageIn = ramp(f, 0, 13, EASE.snappy);

  const cursorOpacity =
    cursorStops.length > 0 && cursorSpan
      ? ramp(f, cursorSpan[0], 9, EASE.out) *
        (1 - ramp(f, cursorSpan[1], 10, EASE.exit))
      : 0;
  const cursor =
    cursorStops.length > 0 ? cursorPosAt(cursorStops, f) : { x: 0, y: 0 };

  let pressAmount = 0;
  for (const c of clicks) {
    const p =
      ramp(f, c.frame - 2, 2.5, EASE.out) *
      (1 - ramp(f, c.frame + 1, 4.5, EASE.out));
    if (p > pressAmount) pressAmount = p;
  }

  const endP = finalTone?.progress ?? 0;
  const endKind = finalTone?.kind ?? "emerald";
  const haloRgb =
    endKind === "emerald"
      ? "24, 116, 66"
      : endKind === "amber"
        ? "217, 119, 6"
        : "59, 130, 246";
  const borderRgb =
    endKind === "emerald"
      ? "125, 219, 164"
      : endKind === "amber"
        ? "251, 191, 36"
        : "141, 187, 255";

  return (
    <AbsoluteFill
      style={{
        backgroundColor: promoColor.stageBg,
        overflow: "hidden",
      }}
    >
      <AbsoluteFill
        style={{
          background:
            endP > 0.01
              ? `radial-gradient(1280px 760px at 50% 48%, rgba(${haloRgb}, ${(0.22 * endP).toFixed(3)}), rgba(59, 130, 246, ${(0.15 * (1 - endP)).toFixed(3)}) 45%, rgba(18, 18, 16, 0.98) 82%)`
              : "radial-gradient(1280px 760px at 50% 48%, rgba(59, 130, 246, 0.16), rgba(18, 18, 16, 0.98) 80%)",
        }}
      />

      <div
        style={{
          position: "absolute",
          left: 78,
          right: 78,
          top: 18,
          height: 52,
          opacity: stageIn,
          transform: `translateY(${(1 - stageIn) * 10}px)`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div
          style={{
            fontFamily: promoFont.sans,
            fontSize: 40,
            fontWeight: 700,
            color: promoColor.fg,
            letterSpacing: "0.01em",
            whiteSpace: "nowrap",
          }}
        >
          {title}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {steps.map((step) => {
            const doneTone = TONE_STYLES[step.tone ?? "emerald"];
            const activeTone = TONE_STYLES[step.tone ?? "blue"];
            const bg = step.done
              ? doneTone.headerDoneBg
              : step.active
                ? activeTone.headerDoneBg
                : "rgba(255, 255, 255, 0.06)";
            const border = step.done
              ? doneTone.headerDoneBorder
              : step.active
                ? activeTone.headerDoneBorder
                : "rgba(255, 255, 255, 0.14)";
            const color = step.done
              ? doneTone.headerDoneFg
              : step.active
                ? activeTone.headerDoneFg
                : promoColor.fgDim;
            return (
              <div
                key={step.num}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 16px",
                  borderRadius: 999,
                  backgroundColor: bg,
                  border: `1px solid ${border}`,
                  fontFamily: promoFont.sans,
                  fontSize: 23,
                  fontWeight: 600,
                  color,
                  whiteSpace: "nowrap",
                }}
              >
                <span
                  style={{
                    fontFamily: promoFont.mono,
                    fontSize: 20,
                    fontWeight: 700,
                  }}
                >
                  {step.done ? "✓" : step.num}
                </span>
                <span>
                  {step.done && step.doneLabel
                    ? step.doneLabel
                    : step.idleLabel}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          left: 78,
          top: 80,
          width: LIGHT_VIEW_W,
          height: LIGHT_VIEW_H,
          opacity: stageIn,
          transform: `translateY(${(1 - stageIn) * 14}px)`,
          borderRadius: 14,
          backgroundColor: "#FFFFFF",
          overflow: "hidden",
          boxShadow:
            endP > 0.02
              ? `0 28px 80px rgba(0, 0, 0, 0.64), 0 0 0 2px rgba(${borderRgb}, ${(0.22 + 0.36 * endP).toFixed(3)}), 0 0 36px rgba(${haloRgb}, ${(0.28 * endP).toFixed(3)})`
              : "0 28px 80px rgba(0, 0, 0, 0.64), 0 0 0 1.5px rgba(255, 255, 255, 0.24)",
        }}
      >
        <LightViewportCam keys={camKeys}>
          {layers.map((layer, idx) => {
            const opacity =
              layer.fadeInDur <= 0
                ? 1
                : ramp(f, layer.fadeInStart, layer.fadeInDur, EASE.out);
            const nextLayer = layers[idx + 1];
            const fullyCoveredByNext = nextLayer
              ? f >= nextLayer.fadeInStart + nextLayer.fadeInDur + 4
              : false;
            const notNeededYet =
              layer.fadeInDur > 0 && f < layer.fadeInStart - 16;
            if (fullyCoveredByNext || notNeededYet) {
              return null;
            }
            return (
              <Img
                key={`${idx}-${layer.src}`}
                src={staticFile(layer.src)}
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  width: LIGHT_IMG_W,
                  height: LIGHT_IMG_H,
                  opacity,
                }}
              />
            );
          })}

          {callouts.map((box) => {
            const enterT = ramp(f, box.startFrame, 10, EASE.snappy);
            const exitT = 1 - ramp(f, box.endFrame - 9, 9, EASE.exit);
            const boxOpacity = enterT * exitT;
            if (boxOpacity <= 0.01) return null;
            const styleTone = TONE_STYLES[box.tone ?? "blue"];
            const align = box.labelAlign ?? "top-right";
            const isTop = align.startsWith("top");
            const isRight = align.endsWith("right");
            const outset =
              box.labelOutset ?? (box.rect.height < 56 ? -28 : -15);
            return (
              <div
                key={box.id}
                style={{
                  position: "absolute",
                  left: box.rect.left - 4,
                  top: box.rect.top - 4,
                  width: box.rect.width + 8,
                  height: box.rect.height + 8,
                  borderRadius: 10,
                  border: `2.5px solid ${styleTone.stroke}`,
                  boxShadow: `0 0 22px ${styleTone.glow}`,
                  opacity: boxOpacity,
                  transform: `scale(${0.99 + 0.01 * enterT})`,
                  pointerEvents: "none",
                }}
              >
                {box.label ? (
                  <div
                    style={{
                      position: "absolute",
                      ...(isTop ? { top: outset } : { bottom: outset }),
                      ...(isRight ? { right: 12 } : { left: 12 }),
                      padding: "3px 12px",
                      borderRadius: 999,
                      backgroundColor: styleTone.pillBg,
                      color: styleTone.pillFg,
                      fontFamily: promoFont.sans,
                      fontSize: 15,
                      fontWeight: 700,
                      letterSpacing: "0.02em",
                      whiteSpace: "nowrap",
                      boxShadow: "0 6px 16px rgba(15, 23, 42, 0.24)",
                    }}
                  >
                    {box.label}
                  </div>
                ) : null}
              </div>
            );
          })}

          {clicks.map((c) => {
            const ringT = ramp(f, c.frame - 2, 10, EASE.out);
            const ringOpacity = interpolate(
              f,
              [c.frame - 2, c.frame + 1, c.frame + 9],
              [0, 0.92, 0],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
            );
            if (ringOpacity <= 0.01) return null;
            const styleTone = TONE_STYLES[c.tone ?? "blue"];
            return (
              <div key={`${c.frame}-${c.cx}`} style={{ pointerEvents: "none" }}>
                <div
                  style={{
                    position: "absolute",
                    left: c.rect.left - 4,
                    top: c.rect.top - 4,
                    width: c.rect.width + 8,
                    height: c.rect.height + 8,
                    borderRadius: 9,
                    border: `2.5px solid ${styleTone.stroke}`,
                    boxShadow: `0 0 18px ${styleTone.glow}`,
                    opacity: ringOpacity,
                    transform: `scale(${0.98 + 0.05 * ringT})`,
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    left: c.cx - 30,
                    top: c.cy - 30,
                    width: 60,
                    height: 60,
                    borderRadius: "50%",
                    border: `2.5px solid ${styleTone.stroke}`,
                    opacity: ringOpacity * 0.85,
                    transform: `scale(${0.35 + 1.15 * ringT})`,
                  }}
                />
              </div>
            );
          })}

          {children}

          {cursorOpacity > 0.01 ? (
            <div
              style={{
                position: "absolute",
                left: cursor.x - 5,
                top: cursor.y - 3,
                opacity: cursorOpacity,
                pointerEvents: "none",
              }}
            >
              <svg
                width={38}
                height={38}
                viewBox="0 0 24 24"
                style={{
                  transform: `scale(${1 - 0.14 * pressAmount})`,
                  transformOrigin: "5px 3px",
                  filter: "drop-shadow(0 5px 12px rgba(15, 23, 42, 0.36))",
                }}
              >
                <path
                  d="M4 2 L4 19 L8.8 14.5 L12.2 21 L15.2 19.5 L11.8 13 L19 13 Z"
                  fill="#0F172A"
                  stroke="#FFFFFF"
                  strokeWidth={2}
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          ) : null}
        </LightViewportCam>
      </div>
    </AbsoluteFill>
  );
};

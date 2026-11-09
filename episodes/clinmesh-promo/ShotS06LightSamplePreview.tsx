/**
 * Standalone Light-Theme real-UI sample preview for Scene S06: showcases
 * authentic ClinMesh outpatient light-theme workstation flows (diagnosis
 * candidate confirmation, prescription dosage completion & issuance, and
 * structured medical record confirmation signing) driven by clamped CSS-zoom
 * ViewportCam, real DOM button coordinates, BGM/foley, and updated caption copy.
 */
import type { ReactNode } from "react";
import { Audio } from "@remotion/media";
import {
  AbsoluteFill,
  Img,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { promoFont } from "./fonts";
import { EASE, clamp01, lerp, ramp } from "./motion-utils";
import { sfxFrom } from "./sfx-schedule";
import { BGM_STEADY_VOLUME, promoColor, promoSubtitle } from "./tokens";

export const S06_LIGHT_PREVIEW_DURATION_F = 276;

const VIEW_W = 1764;
const VIEW_H = 890;
const IMG_W = 1680;
const IMG_H = 1020;

type ViewCamKey = {
  frame: number;
  cx: number;
  cy: number;
  zoom: number;
};

const CAM_KEYS: ViewCamKey[] = [
  { frame: 0, cx: 840, cy: 420, zoom: 1.052 },
  { frame: 44, cx: 846, cy: 424, zoom: 1.058 },
  { frame: 76, cx: 840, cy: 420, zoom: 1.052 },
  { frame: 104, cx: 838, cy: 422, zoom: 1.054 },
  { frame: 118, cx: 748, cy: 492, zoom: 1.22 },
  { frame: 143, cx: 762, cy: 498, zoom: 1.23 },
  { frame: 156, cx: 844, cy: 426, zoom: 1.056 },
  { frame: 203, cx: 840, cy: 420, zoom: 1.052 },
  { frame: 212, cx: 840, cy: 492, zoom: 1.058 },
  { frame: 228, cx: 840, cy: 494, zoom: 1.064 },
  { frame: 250, cx: 840, cy: 432, zoom: 1.052 },
  { frame: 276, cx: 840, cy: 432, zoom: 1.052 },
];

const ViewportCam: React.FC<{
  keys: ViewCamKey[];
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
  const minZoom = Math.max(VIEW_W / IMG_W, VIEW_H / IMG_H) + 0.002;
  const zoom = Math.max(minZoom, lerp(a.zoom, b.zoom, t));
  const halfW = VIEW_W / (2 * zoom);
  const halfH = VIEW_H / (2 * zoom);
  const rawCx = lerp(a.cx, b.cx, t);
  const rawCy = lerp(a.cy, b.cy, t);
  const cx = Math.min(IMG_W - halfW, Math.max(halfW, rawCx));
  const cy = Math.min(IMG_H - halfH, Math.max(halfH, rawCy));

  return (
    <div
      style={{
        position: "relative",
        width: VIEW_W,
        height: VIEW_H,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          width: IMG_W,
          height: IMG_H,
          zoom,
          transform: `translate(${VIEW_W / (2 * zoom) - cx}px, ${VIEW_H / (2 * zoom) - cy}px)`,
          transformOrigin: `${cx}px ${cy}px`,
        }}
      >
        {children}
      </div>
    </div>
  );
};

type CaptureLayer = {
  file: string;
  fadeInStart: number;
  fadeInDur: number;
};

const CAPTURE_LAYERS: CaptureLayer[] = [
  { file: "01-diagnosis-candidate.png", fadeInStart: 0, fadeInDur: 0 },
  { file: "02-diagnosis-confirmed.png", fadeInStart: 45, fadeInDur: 5 },
  { file: "03-prescription-incomplete.png", fadeInStart: 76, fadeInDur: 7 },
  { file: "04-prescription-adjust-empty.png", fadeInStart: 103, fadeInDur: 6 },
  { file: "05-prescription-adjust-filled.png", fadeInStart: 116, fadeInDur: 5 },
  { file: "06-prescription-ready.png", fadeInStart: 143, fadeInDur: 6 },
  { file: "07-prescription-issued.png", fadeInStart: 169, fadeInDur: 5 },
  { file: "08-emr-before-sign.png", fadeInStart: 194, fadeInDur: 7 },
  { file: "09-emr-confirm-sign-dialog.png", fadeInStart: 204, fadeInDur: 6 },
  { file: "10-emr-signed.png", fadeInStart: 229, fadeInDur: 7 },
];

type ClickAction = {
  frame: number;
  cx: number;
  cy: number;
  rect: { left: number; top: number; width: number; height: number };
  emerald?: boolean;
};

const CLICKS: ClickAction[] = [
  {
    frame: 44,
    cx: 1543.5,
    cy: 525.0,
    rect: { left: 1459, top: 509, width: 169, height: 32 },
  },
  {
    frame: 102,
    cx: 166.5,
    cy: 483.0,
    rect: { left: 138, top: 469, width: 57, height: 28 },
  },
  {
    frame: 142,
    cx: 896.5,
    cy: 705.25,
    rect: { left: 833, top: 689.25, width: 127, height: 32 },
  },
  {
    frame: 168,
    cx: 1561.0,
    cy: 652.0,
    rect: { left: 1494, top: 636, width: 134, height: 32 },
  },
  {
    frame: 228,
    cx: 822.5,
    cy: 857.75,
    rect: { left: 749, top: 841.75, width: 147, height: 32 },
    emerald: true,
  },
];

type CursorStop = {
  frame: number;
  x: number;
  y: number;
};

const CURSOR_STOPS: CursorStop[] = [
  { frame: 0, x: 1320, y: 565 },
  { frame: 14, x: 1320, y: 565 },
  { frame: 40, x: 1543.5, y: 525.0 },
  { frame: 68, x: 1485, y: 518 },
  { frame: 98, x: 166.5, y: 483.0 },
  { frame: 104, x: 166.5, y: 483.0 },
  { frame: 118, x: 690, y: 565 },
  { frame: 138, x: 896.5, y: 705.25 },
  { frame: 145, x: 896.5, y: 705.25 },
  { frame: 164, x: 1561.0, y: 652.0 },
  { frame: 192, x: 1490, y: 642 },
  { frame: 222, x: 822.5, y: 857.75 },
  { frame: 246, x: 822.5, y: 857.75 },
];

const cursorPosAt = (f: number): { x: number; y: number } => {
  let a = CURSOR_STOPS[0];
  let b = CURSOR_STOPS[CURSOR_STOPS.length - 1];
  for (let i = 0; i < CURSOR_STOPS.length - 1; i++) {
    if (f >= CURSOR_STOPS[i].frame && f <= CURSOR_STOPS[i + 1].frame) {
      a = CURSOR_STOPS[i];
      b = CURSOR_STOPS[i + 1];
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

const PREVIEW_SFX = [
  { id: "diag-confirm", src: "fs-629979.mp3", peak: 44, volume: 0.24 },
  { id: "rx-open-adjust", src: "fs-278205.mp3", peak: 102, volume: 0.2 },
  {
    id: "rx-fill-fields",
    src: "fs-331656.mp3",
    peak: 116,
    volume: 0.16,
    dur: 12,
    fade: 4,
  },
  { id: "rx-keep-adjust", src: "fs-671375.mp3", peak: 142, volume: 0.22 },
  { id: "rx-issue", src: "fs-629979.mp3", peak: 168, volume: 0.26 },
  { id: "emr-sign-latch", src: "fs-815493.mp3", peak: 228, volume: 0.42 },
] as const;

const PREVIEW_SUBTITLE_TEXT =
  "而所有诊断确认、处方开具与病历签署，均须经医生人工核对后正式生效";

const cosineRamp = (t: number): number =>
  0.5 * (1 - Math.cos(Math.PI * clamp01(t)));

export const ShotS06LightSamplePreview: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();

  const stageIn = ramp(f, 0, 14, EASE.snappy);
  const finalSignedT = ramp(f, 229, 16, EASE.snappy);

  const cursorOpacity =
    ramp(f, 8, 10, EASE.out) * (1 - ramp(f, 234, 10, EASE.exit));
  const cursor = cursorPosAt(f);

  let pressAmount = 0;
  for (const c of CLICKS) {
    const p =
      ramp(f, c.frame - 2, 2.5, EASE.out) *
      (1 - ramp(f, c.frame + 1, 4.5, EASE.out));
    if (p > pressAmount) pressAmount = p;
  }

  const steps = [
    {
      num: "01",
      idleLabel: "诊断核对",
      doneLabel: "诊断已确认",
      active: f < 76,
      done: f >= 46,
    },
    {
      num: "02",
      idleLabel: "处方开具",
      doneLabel: "处方已开具",
      active: f >= 76 && f < 194,
      done: f >= 170,
    },
    {
      num: "03",
      idleLabel: "病历签署",
      doneLabel: "病历已签署",
      active: f >= 194 && f < 230,
      done: f >= 230,
    },
  ];

  const subEnter = ramp(f, 12, 8, EASE.out);
  const subReveal = ramp(f, 14, 12, EASE.out);
  const subExit = 1 - ramp(f, 256, 10, EASE.exit);
  const subOpacity = subEnter * subExit;

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
            finalSignedT > 0.01
              ? `radial-gradient(1280px 760px at 50% 48%, rgba(24, 116, 66, ${(0.22 * finalSignedT).toFixed(3)}), rgba(59, 130, 246, ${(0.15 * (1 - finalSignedT)).toFixed(3)}) 45%, rgba(18, 18, 16, 0.98) 82%)`
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
          医生核对 · 正式签署
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {steps.map((step) => {
            const bg = step.done
              ? "rgba(125, 219, 164, 0.16)"
              : step.active
                ? "rgba(141, 187, 255, 0.18)"
                : "rgba(255, 255, 255, 0.06)";
            const border = step.done
              ? "rgba(125, 219, 164, 0.48)"
              : step.active
                ? "rgba(141, 187, 255, 0.54)"
                : "rgba(255, 255, 255, 0.14)";
            const color = step.done
              ? promoColor.success
              : step.active
                ? "#CFE2FF"
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
                <span>{step.done ? step.doneLabel : step.idleLabel}</span>
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
          width: VIEW_W,
          height: VIEW_H,
          opacity: stageIn,
          transform: `translateY(${(1 - stageIn) * 14}px)`,
          borderRadius: 14,
          backgroundColor: "#FFFFFF",
          overflow: "hidden",
          boxShadow:
            finalSignedT > 0.02
              ? `0 28px 80px rgba(0, 0, 0, 0.64), 0 0 0 2px rgba(125, 219, 164, ${(0.22 + 0.36 * finalSignedT).toFixed(3)}), 0 0 36px rgba(24, 116, 66, ${(0.28 * finalSignedT).toFixed(3)})`
              : "0 28px 80px rgba(0, 0, 0, 0.64), 0 0 0 1.5px rgba(255, 255, 255, 0.24)",
        }}
      >
        <ViewportCam keys={CAM_KEYS}>
          {CAPTURE_LAYERS.map((layer, idx) => {
            const opacity =
              layer.fadeInDur <= 0
                ? 1
                : ramp(f, layer.fadeInStart, layer.fadeInDur, EASE.out);
            const nextLayer = CAPTURE_LAYERS[idx + 1];
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
                key={layer.file}
                src={staticFile(
                  `episodes/clinmesh-promo/captures/light-s06/${layer.file}`,
                )}
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  width: IMG_W,
                  height: IMG_H,
                  opacity,
                }}
              />
            );
          })}

          {CLICKS.map((c) => {
            const ringT = ramp(f, c.frame - 2, 10, EASE.out);
            const ringOpacity = interpolate(
              f,
              [c.frame - 2, c.frame + 1, c.frame + 9],
              [0, 0.92, 0],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
            );
            if (ringOpacity <= 0.01) return null;
            const strokeColor = c.emerald ? "#187442" : "#2563EB";
            return (
              <div key={c.frame} style={{ pointerEvents: "none" }}>
                <div
                  style={{
                    position: "absolute",
                    left: c.rect.left - 4,
                    top: c.rect.top - 4,
                    width: c.rect.width + 8,
                    height: c.rect.height + 8,
                    borderRadius: 9,
                    border: `2.5px solid ${strokeColor}`,
                    boxShadow: `0 0 18px ${c.emerald ? "rgba(24, 116, 66, 0.45)" : "rgba(37, 99, 235, 0.42)"}`,
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
                    border: `2.5px solid ${strokeColor}`,
                    opacity: ringOpacity * 0.85,
                    transform: `scale(${0.35 + 1.15 * ringT})`,
                  }}
                />
              </div>
            );
          })}

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
        </ViewportCam>
      </div>

      {subOpacity > 0.01 ? (
        <AbsoluteFill
          style={{
            justifyContent: "flex-end",
            alignItems: "center",
            paddingBottom: promoSubtitle.bottom,
            pointerEvents: "none",
            opacity: subOpacity,
          }}
        >
          <div
            style={{
              display: "flex",
              flexShrink: 0,
              height: promoSubtitle.height,
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
                clipPath: `inset(0 ${(1 - subReveal) * 100}% 0 0)`,
              }}
            >
              {PREVIEW_SUBTITLE_TEXT}
            </div>
          </div>
        </AbsoluteFill>
      ) : null}

      <Audio
        name="Preview BGM Clinical AI Underscore"
        src={staticFile(
          "episodes/clinmesh-promo/music/Clinical AI Underscore.wav",
        )}
        volume={(frame) => {
          const fadeIn = cosineRamp(frame / 24);
          const fadeOut = cosineRamp(
            (S06_LIGHT_PREVIEW_DURATION_F - frame) / 36,
          );
          return BGM_STEADY_VOLUME * 1.45 * fadeIn * fadeOut;
        }}
        premountFor={fps}
      />

      {PREVIEW_SFX.map((cue) => {
        const from = sfxFrom(cue.peak, cue.src);
        const dur = "dur" in cue ? cue.dur : undefined;
        const fade = "fade" in cue ? cue.fade : undefined;
        return (
          <Sequence
            key={cue.id}
            name={`Preview SFX ${cue.id}`}
            from={from}
            durationInFrames={dur}
            premountFor={fps}
          >
            <Audio
              src={staticFile(`episodes/clinmesh-promo/sfx/${cue.src}`)}
              volume={(sf) => {
                if (!dur || !fade) return cue.volume;
                return interpolate(sf, [dur - fade, dur], [cue.volume, 0], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                });
              }}
            />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

/**
 * Scene S02 (L004-L005): Two-stage modular architecture diagram with zero English.
 * L004 centers a clean 5-domain clinical & knowledge foundation bus; L005 settles
 * it into a 4-slot motherboard dock as 4 vertical module cards hover and lock in.
 */
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { sentence } from "../../src/kit/sentence-timing";
import type { Timeline } from "../../tools/timeline-types";
import { promoFont } from "./fonts";
import { EASE, dampedSettle, lerp, ramp } from "./motion-utils";
import { StatusBadge } from "./primitives";
import { promoColor, promoRadius } from "./tokens";

type DomainKey =
  | "outpatient"
  | "diagnostics"
  | "inpatient"
  | "surgery"
  | "settlement";

type ModuleKey = "ambient" | "provenance" | "drg" | "specialty";

const SUBSTRATE_DOMAINS: ReadonlyArray<{
  key: DomainKey;
  title: string;
  cueFrame: number;
}> = [
  { key: "outpatient", title: "门诊", cueFrame: 26 },
  { key: "diagnostics", title: "医技", cueFrame: 48 },
  { key: "inpatient", title: "住院", cueFrame: 70 },
  { key: "surgery", title: "手术介入", cueFrame: 92 },
  { key: "settlement", title: "病案结算", cueFrame: 122 },
];

const FOUNDATION_PILLS = ["临床工作流", "结构化病历", "权威指南目录"] as const;

const PLUGGABLE_MODULES: ReadonlyArray<{
  key: ModuleKey;
  title: string;
  tag: string;
  accent: string;
  glow: string;
}> = [
    {
      key: "ambient",
      title: "无感伴随",
      tag: "静默成文",
      accent: promoColor.info,
      glow: "rgba(141, 187, 255, 0.26)",
    },
    {
      key: "provenance",
      title: "循证质控",
      tag: "溯源防错",
      accent: "#9BA3FF",
      glow: "rgba(155, 163, 255, 0.26)",
    },
    {
      key: "drg",
      title: "医保精算",
      tag: "病组测算",
      accent: promoColor.success,
      glow: "rgba(125, 219, 164, 0.25)",
    },
    {
      key: "specialty",
      title: "专科模型",
      tag: "多病种接入",
      accent: "#B59CFF",
      glow: "rgba(181, 156, 255, 0.26)",
    },
  ];

const DomainIcon: React.FC<{ kind: DomainKey; color: string }> = ({
  kind,
  color,
}) => {
  const common = {
    width: 26,
    height: 26,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: color,
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (kind) {
    case "outpatient":
      return (
        <svg {...common}>
          <path d="M6 4v5a5 5 0 0 0 10 0V4" />
          <path d="M11 14v2a4 4 0 0 0 8 0v-3" />
          <circle cx="19" cy="11" r="2" />
        </svg>
      );
    case "diagnostics":
      return (
        <svg {...common}>
          <path d="M9 3h6" />
          <path d="M10 3v5l-4.5 7.5A2 2 0 0 0 7.2 19h9.6a2 2 0 0 0 1.7-3.5L14 8V3" />
          <path d="M7.5 14h9" />
        </svg>
      );
    case "inpatient":
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="14" rx="2.5" />
          <path d="M6.5 12h2.5l1.8-3.2 2.4 6.4 1.8-3.2h2.5" />
        </svg>
      );
    case "surgery":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="7.5" />
          <circle cx="12" cy="12" r="2.5" />
          <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3" />
        </svg>
      );
    case "settlement":
      return (
        <svg {...common}>
          <path d="M7 3.5h7.5L19 8v12.5H7a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2Z" />
          <path d="M14 3.5V8h4.5" />
          <path d="m9 14 2.2 2.2 4.3-4.4" />
        </svg>
      );
  }
};

const ModuleIcon: React.FC<{ kind: ModuleKey; color: string }> = ({
  kind,
  color,
}) => {
  const common = {
    width: 30,
    height: 30,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: color,
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (kind) {
    case "ambient":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="2.5" />
          <path d="M7.8 7.8a6 6 0 0 0 0 8.4" />
          <path d="M16.2 7.8a6 6 0 0 1 0 8.4" />
          <path d="M4.8 4.8a10 10 0 0 0 0 14.4" />
          <path d="M19.2 4.8a10 10 0 0 1 0 14.4" />
        </svg>
      );
    case "provenance":
      return (
        <svg {...common}>
          <path d="M12 3 5 6v5.5c0 4.6 3 8.4 7 9.5 4-1.1 7-4.9 7-9.5V6l-7-3Z" />
          <path d="m9.2 12.2 2 2 3.8-4" />
        </svg>
      );
    case "drg":
      return (
        <svg {...common}>
          <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
          <path d="M8 15v-3.5M12 15V9M16 15v-5.5" />
        </svg>
      );
    case "specialty":
      return (
        <svg {...common}>
          <rect x="4" y="4" width="6.5" height="6.5" rx="1.5" />
          <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5" />
          <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5" />
          <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5" />
        </svg>
      );
  }
};

export const ShotS02Architecture: React.FC<{
  timeline: Timeline;
  domainCueFrames?: readonly [number, number, number, number, number];
  foundationSweepStartF?: number;
  plugBaseOffsetF?: number;
  plugStaggerF?: number;
  snapDoneOffsetF?: number;
}> = ({
  timeline,
  domainCueFrames,
  foundationSweepStartF,
  plugBaseOffsetF = 84,
  plugStaggerF = 12,
  snapDoneOffsetF = 136,
}) => {
  const f = useCurrentFrame();
  const l004 = sentence(timeline, "L004");
  const l005 = sentence(timeline, "L005");
  const l005Local = l005.startFrame - l004.startFrame;

  const headerIn = ramp(f, 0, 18, EASE.snappy);
  const dockIn = ramp(f, 0, 22, EASE.snappy);
  const prePush = ramp(f, 0, l005Local - 8, EASE.out);

  const sweepDuration = 46;
  const sweepT =
    foundationSweepStartF === undefined
      ? 0
      : ramp(f, foundationSweepStartF, sweepDuration, (t) => t);
  const sweepActive =
    foundationSweepStartF !== undefined &&
    f >= foundationSweepStartF &&
    f <= foundationSweepStartF + sweepDuration;
  const unifyT =
    foundationSweepStartF === undefined
      ? 0
      : ramp(f, foundationSweepStartF + sweepDuration - 4, 22, EASE.out);

  const dockShift = ramp(f, l005Local - 8, 28, EASE.snappy);
  const slotBayIn = ramp(f, l005Local - 2, 20, EASE.snappy);

  const snapDone = l005Local + snapDoneOffsetF;
  const dockThud =
    f >= snapDone ? dampedSettle((f - snapDone) / 30, 5.5, 10) * 5 : 0;
  const allLockedT = ramp(f, snapDone - 2, 14, EASE.snappy);

  const dockY = lerp(-184, 0, dockShift) + (1 - dockIn) * 26 + dockThud;
  const dockScale = lerp(0.92 + 0.13 * prePush, 1, dockShift);

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
            "radial-gradient(1120px 680px at 50% 50%, rgba(124, 134, 255, 0.14), rgba(18, 18, 16, 0.98) 74%)",
        }}
      />

      <div
        style={{
          position: "absolute",
          top: 66,
          left: 96,
          right: 96,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          opacity: headerIn,
        }}
      >
        <div
          style={{
            fontFamily: promoFont.sans,
            fontSize: 56,
            fontWeight: 700,
            color: promoColor.fg,
            whiteSpace: "nowrap",
          }}
        >
          医院业务与临床知识基底
        </div>
        {allLockedT > 0.02 ? (
          <div
            style={{
              opacity: allLockedT,
              transform: `scale(${0.95 + 0.05 * allLockedT})`,
            }}
          >
            <StatusBadge tone="success">✓ 支持单模块独立接入</StatusBadge>
          </div>
        ) : unifyT > 0.02 ? (
          <div
            style={{
              opacity: 0.4 + 0.6 * unifyT,
              transform: `scale(${0.96 + 0.04 * unifyT})`,
            }}
          >
            <StatusBadge tone="info">✓ 全院统一知识基底</StatusBadge>
          </div>
        ) : (
          <StatusBadge tone="info">五域全链路贯通</StatusBadge>
        )}
      </div>

      <div
        style={{
          position: "absolute",
          left: 226,
          width: 1468,
          top: 344,
          height: 288,
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 28,
          zIndex: 2,
          pointerEvents: "none",
        }}
      >
        {PLUGGABLE_MODULES.map((mod, idx) => {
          const cardIn = ramp(f, l005Local + 4 + idx * 5, 20, EASE.snappy);
          if (cardIn <= 0.01) return null;

          const plugStart = l005Local + plugBaseOffsetF + idx * plugStaggerF;
          const plugT = ramp(f, plugStart, 16, EASE.swift);
          const lockedT = ramp(f, plugStart + 13, 10, EASE.snappy);
          const cardBounce =
            f >= plugStart + 16
              ? dampedSettle((f - (plugStart + 16)) / 30, 6.5, 11) * 4
              : 0;

          const hoverY = lerp(-92, -64, cardIn);
          const cardY = lerp(hoverY, 0, plugT) + cardBounce + dockThud;
          const guideOpacity = cardIn * (1 - plugT) * 0.85;

          return (
            <div
              key={mod.key}
              style={{
                position: "relative",
                height: "100%",
              }}
            >
              {guideOpacity > 0.02 ? (
                <div
                  style={{
                    position: "absolute",
                    left: "50%",
                    bottom: 8,
                    width: 116,
                    height: 56,
                    transform: "translateX(-50%)",
                    opacity: guideOpacity,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "stretch",
                    padding: "0 14px",
                  }}
                >
                  <div
                    style={{
                      width: 0,
                      borderLeft: `2px dashed ${mod.accent}`,
                      opacity: 0.65,
                    }}
                  />
                  <div
                    style={{
                      alignSelf: "center",
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      backgroundColor: mod.accent,
                      boxShadow: `0 0 12px ${mod.accent}`,
                    }}
                  />
                  <div
                    style={{
                      width: 0,
                      borderLeft: `2px dashed ${mod.accent}`,
                      opacity: 0.65,
                    }}
                  />
                </div>
              ) : null}

              <div
                style={{
                  position: "relative",
                  height: 258,
                  opacity: cardIn,
                  transform: `translateY(${cardY}px)`,
                  backgroundColor: "rgba(32, 34, 40, 0.96)",
                  borderRadius: promoRadius.card,
                  border: `1.5px solid ${lockedT > 0.2 ? mod.accent : "rgba(255, 255, 255, 0.20)"}`,
                  boxShadow:
                    lockedT > 0.2
                      ? `0 20px 48px rgba(0, 0, 0, 0.56), 0 0 28px ${mod.glow}`
                      : "0 22px 48px rgba(0, 0, 0, 0.58)",
                  padding: "24px 28px 26px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 24,
                    right: 24,
                    height: 3,
                    borderRadius: 2,
                    backgroundColor: mod.accent,
                    opacity: 0.65 + 0.35 * lockedT,
                  }}
                />

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div
                    style={{
                      width: 58,
                      height: 58,
                      borderRadius: 14,
                      backgroundColor: "rgba(255, 255, 255, 0.05)",
                      border: `1px solid ${mod.accent}`,
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      boxShadow:
                        lockedT > 0.2 ? `0 0 18px ${mod.glow}` : undefined,
                    }}
                  >
                    <ModuleIcon kind={mod.key} color={mod.accent} />
                  </div>

                  <span
                    style={{
                      padding: "6px 14px",
                      borderRadius: promoRadius.control,
                      fontFamily: promoFont.sans,
                      fontSize: 23,
                      fontWeight: 600,
                      color: lockedT > 0.4 ? mod.accent : promoColor.fgMuted,
                      backgroundColor:
                        lockedT > 0.4
                          ? "rgba(255, 255, 255, 0.08)"
                          : "rgba(255, 255, 255, 0.04)",
                      border:
                        lockedT > 0.4
                          ? `1px solid ${mod.accent}`
                          : "1px dashed rgba(255, 255, 255, 0.24)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {lockedT > 0.4 ? "✓ 已接入" : "独立解耦"}
                  </span>
                </div>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  <div
                    style={{
                      fontFamily: promoFont.sans,
                      fontSize: 42,
                      fontWeight: 700,
                      color: promoColor.fg,
                      lineHeight: 1.15,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {mod.title}
                  </div>
                  <div
                    style={{
                      fontFamily: promoFont.sans,
                      fontSize: 28,
                      fontWeight: 500,
                      color: promoColor.fgMuted,
                      lineHeight: 1.25,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {mod.tag}
                  </div>
                </div>

                <div
                  style={{
                    position: "absolute",
                    left: "50%",
                    bottom: -26,
                    width: 140,
                    height: 26,
                    transform: "translateX(-50%)",
                    backgroundColor: "#1D1F26",
                    borderLeft: `1.5px solid ${mod.accent}`,
                    borderRight: `1.5px solid ${mod.accent}`,
                    borderBottom: `2px solid ${mod.accent}`,
                    borderRadius: "0 0 8px 8px",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: 12,
                    boxShadow:
                      lockedT > 0.3 ? `0 6px 18px ${mod.glow}` : undefined,
                  }}
                >
                  {[0, 1, 2, 3].map((pin) => (
                    <span
                      key={pin}
                      style={{
                        width: 10,
                        height: 8,
                        borderRadius: 2,
                        backgroundColor: mod.accent,
                        opacity: 0.55 + 0.45 * lockedT,
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          position: "absolute",
          left: 190,
          width: 1540,
          top: 616,
          height: 292,
          zIndex: 1,
          opacity: dockIn,
          transform: `translateY(${dockY}px) scale(${dockScale})`,
          transformOrigin: "50% 50%",
          backgroundColor: promoColor.cardBg,
          borderRadius: 12,
          border: `1.5px solid ${
            Math.max(allLockedT, unifyT) > 0.02
              ? `rgba(141, 187, 255, ${(0.2 + 0.28 * Math.max(allLockedT, unifyT)).toFixed(3)})`
              : promoColor.borderStrong
          }`,
          boxShadow:
            Math.max(allLockedT, unifyT) > 0.02
              ? `0 32px 72px rgba(0, 0, 0, 0.66), 0 0 ${Math.round(36 * Math.max(allLockedT, unifyT))}px rgba(141, 187, 255, ${(0.22 * Math.max(allLockedT, unifyT)).toFixed(3)})`
              : "0 32px 72px rgba(0, 0, 0, 0.66)",
          padding: "36px 36px 24px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        {sweepActive ? (
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: 12,
              overflow: "hidden",
              pointerEvents: "none",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: -40,
                bottom: -40,
                left: lerp(-560, 1580, sweepT),
                width: 560,
                background:
                  "linear-gradient(105deg, rgba(141, 187, 255, 0) 0%, rgba(141, 187, 255, 0.24) 40%, rgba(214, 232, 255, 0.42) 50%, rgba(155, 163, 255, 0.24) 60%, rgba(141, 187, 255, 0) 100%)",
              }}
            />
          </div>
        ) : null}

        {slotBayIn > 0.01 ? (
          <div
            style={{
              position: "absolute",
              top: -2,
              left: 36,
              right: 36,
              height: 22,
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 28,
              opacity: slotBayIn,
            }}
          >
            {PLUGGABLE_MODULES.map((mod, idx) => {
              const plugStart = l005Local + plugBaseOffsetF + idx * plugStaggerF;
              const lockedT = ramp(f, plugStart + 13, 10, EASE.snappy);
              return (
                <div
                  key={mod.key}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                  }}
                >
                  <div
                    style={{
                      width: 160,
                      height: 20,
                      borderRadius: "0 0 10px 10px",
                      backgroundColor: "#121419",
                      borderLeft: `1.5px solid ${lockedT > 0.2 ? mod.accent : "rgba(141, 187, 255, 0.42)"}`,
                      borderRight: `1.5px solid ${lockedT > 0.2 ? mod.accent : "rgba(141, 187, 255, 0.42)"}`,
                      borderBottom: `2px solid ${lockedT > 0.2 ? mod.accent : "rgba(141, 187, 255, 0.42)"}`,
                      boxShadow:
                        lockedT > 0.2 ? `0 4px 20px ${mod.glow}` : undefined,
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "flex-end",
                      paddingBottom: 3,
                    }}
                  >
                    <div
                      style={{
                        width: 112,
                        height: 3,
                        borderRadius: 2,
                        backgroundColor: mod.accent,
                        opacity: 0.28 + 0.72 * lockedT,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}

        <div
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {SUBSTRATE_DOMAINS.map((dom, idx) => {
            const cueF = domainCueFrames?.[idx] ?? dom.cueFrame;
            const domT = ramp(f, cueF, 24, EASE.snappy);
            const nextCue =
              idx < SUBSTRATE_DOMAINS.length - 1
                ? (domainCueFrames?.[idx + 1] ?? SUBSTRATE_DOMAINS[idx + 1].cueFrame) - 8
                : cueF + 16;
            const bridgeT =
              idx < SUBSTRATE_DOMAINS.length - 1
                ? ramp(f, nextCue, 20, EASE.snappy)
                : 0;
            const flowPhase = ((f * 0.035 - idx * 0.28) % 1 + 1) % 1;
            const sweepCenter = lerp(-0.32, 1.32, sweepT);
            const domCenter = idx / 4;
            const rawDist = Math.abs(sweepCenter - domCenter) / 0.24;
            const domResonance =
              sweepActive && rawDist < 1
                ? 0.5 * (1 + Math.cos(Math.PI * rawDist))
                : 0;

            return (
              <div
                key={dom.key}
                style={{
                  display: "flex",
                  alignItems: "center",
                  flex: idx < SUBSTRATE_DOMAINS.length - 1 ? 1 : "0 0 auto",
                }}
              >
                <div
                  style={{
                    position: "relative",
                    width: 242,
                    height: 136,
                    opacity: 0.22 + 0.78 * domT,
                    transform: `translateY(${(1 - domT) * 18 - domResonance * 6}px) scale(${0.92 + 0.08 * domT + domResonance * 0.022})`,
                    backgroundColor:
                      domT > 0.4
                        ? `rgba(${Math.round(33 + 18 * domResonance)}, ${Math.round(41 + 24 * domResonance)}, ${Math.round(58 + 38 * domResonance)}, ${(0.92 + 0.05 * domResonance).toFixed(3)})`
                        : promoColor.cardInset,
                    borderRadius: promoRadius.card,
                    border:
                      domT > 0.4
                        ? `1.5px solid rgba(141, 187, 255, ${(0.56 + 0.34 * domResonance).toFixed(3)})`
                        : `1px solid ${promoColor.border}`,
                    boxShadow:
                      domT > 0.4
                        ? `0 0 ${Math.round(22 + 16 * domResonance)}px rgba(141, 187, 255, ${(0.18 + 0.24 * domResonance).toFixed(3)}), 0 10px 24px rgba(0, 0, 0, 0.36)`
                        : undefined,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: 12,
                    flexShrink: 0,
                  }}
                >
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 12,
                      backgroundColor: "rgba(141, 187, 255, 0.12)",
                      border: "1px solid rgba(141, 187, 255, 0.36)",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <DomainIcon kind={dom.key} color={promoColor.info} />
                  </div>
                  <span
                    style={{
                      fontFamily: promoFont.sans,
                      fontSize: 36,
                      fontWeight: 700,
                      color: promoColor.fg,
                      lineHeight: 1.15,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {dom.title}
                  </span>
                </div>

                {idx < SUBSTRATE_DOMAINS.length - 1 ? (
                  <div
                    style={{
                      position: "relative",
                      flex: 1,
                      height: 24,
                      margin: "0 8px",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    <div
                      style={{
                        width: "100%",
                        height: 2,
                        backgroundColor: "rgba(255, 255, 255, 0.12)",
                        borderRadius: 2,
                      }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        left: 0,
                        width: `${bridgeT * 100}%`,
                        height: 3,
                        borderRadius: 2,
                        background: `linear-gradient(90deg, ${promoColor.stageAccent}, ${promoColor.info})`,
                        boxShadow: "0 0 12px rgba(141, 187, 255, 0.45)",
                      }}
                    />
                    {bridgeT > 0.95 ? (
                      <div
                        style={{
                          position: "absolute",
                          left: `${12 + flowPhase * 76}%`,
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          transform: "translateX(-50%)",
                          backgroundColor: "#DCEBFF",
                          boxShadow: "0 0 10px rgba(141, 187, 255, 0.9)",
                          opacity: Math.sin(flowPhase * Math.PI) * 0.85,
                        }}
                      />
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 20,
            paddingTop: 12,
            borderTop: "1px solid rgba(255, 255, 255, 0.09)",
          }}
        >
          {FOUNDATION_PILLS.map((pill, idx) => (
            <div
              key={pill}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 20,
              }}
            >
              <span
                style={{
                  padding: "6px 22px",
                  borderRadius: 999,
                  backgroundColor:
                    unifyT > 0.05
                      ? `rgba(141, 187, 255, ${(0.08 + 0.14 * unifyT).toFixed(3)})`
                      : "rgba(141, 187, 255, 0.08)",
                  border:
                    unifyT > 0.05
                      ? `1px solid rgba(141, 187, 255, ${(0.26 + 0.34 * unifyT).toFixed(3)})`
                      : "1px solid rgba(141, 187, 255, 0.26)",
                  transform:
                    unifyT > 0.05
                      ? `scale(${(1 + 0.03 * unifyT).toFixed(4)})`
                      : undefined,
                  fontFamily: promoFont.sans,
                  fontSize: 26,
                  fontWeight: 600,
                  color: unifyT > 0.35 ? promoColor.fg : promoColor.fgMuted,
                  whiteSpace: "nowrap",
                }}
              >
                {pill}
              </span>
              {idx < FOUNDATION_PILLS.length - 1 ? (
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    backgroundColor: promoColor.stageAccent,
                    opacity: 0.75,
                  }}
                />
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};

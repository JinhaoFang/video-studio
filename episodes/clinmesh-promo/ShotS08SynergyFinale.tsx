/**
 * Scene S08 (L013-L014): Six hospital role agents streaming along arc-length
 * parameterized cubic Bezier curves into the shared patient hub (C06), followed by
 * a six-card group-photo fly-in, ClinMesh brand stamp, staggered outward card
 * evaporation, and an uncluttered spotlighted ClinMesh + bilingual subtitle hold.
 */
import { useMemo } from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import { sentence } from "../../src/kit/sentence-timing";
import type { Timeline } from "../../tools/timeline-types";
import { promoFont } from "./fonts";
import {
  EASE,
  clamp01,
  lerp,
  precomputeCubicBezier,
  ramp,
  velocityAt,
} from "./motion-utils";
import { SpeedBlur, StatusBadge } from "./primitives";
import { promoColor, promoRadius } from "./tokens";

const ROLE_NODES = [
  { id: "doc", label: "临床医生智能体", y: 185, color: promoColor.info },
  { id: "nur", label: "病区护士智能体", y: 310, color: "#9BA3FF" },
  { id: "pha", label: "临床药师智能体", y: 435, color: promoColor.success },
  { id: "tech", label: "检验医技智能体", y: 560, color: promoColor.info },
  { id: "drg", label: "医保物价智能体", y: 685, color: promoColor.warning },
  { id: "cod", label: "病案编码智能体", y: 810, color: promoColor.stageAccent },
] as const;

const FINALE_CARDS = [
  {
    id: "fc1",
    title: "无感结构化病历",
    img: "episodes/clinmesh-promo/captures/C01-outpatient-emr-card.png",
    fromX: -620,
    fromY: -360,
    toX: 84,
    toY: 78,
    rot: -2.5,
    exitX: -196,
    exitY: -118,
    exitRot: -4.6,
    exitOrder: 0,
  },
  {
    id: "fc2",
    title: "权威指南循证候选",
    img: "episodes/clinmesh-promo/captures/C02-guideline-candidates-card.png",
    fromX: 620,
    fromY: -360,
    toX: 1356,
    toY: 78,
    rot: 2.5,
    exitX: 196,
    exitY: -118,
    exitRot: 4.6,
    exitOrder: 1,
  },
  {
    id: "fc3",
    title: "冠脉介入与 DRG 精算",
    img: "episodes/clinmesh-promo/captures/C03-pci-drg-workspace.png",
    fromX: -680,
    fromY: 0,
    toX: 56,
    toY: 404,
    rot: -1.5,
    exitX: -224,
    exitY: 0,
    exitRot: -3.2,
    exitOrder: 4,
  },
  {
    id: "fc4",
    title: "医生人工终审把关",
    img: "episodes/clinmesh-promo/captures/C05-review-gate-signed-card.png",
    fromX: 680,
    fromY: 0,
    toX: 1384,
    toY: 404,
    rot: 1.5,
    exitX: 224,
    exitY: 0,
    exitRot: 3.2,
    exitOrder: 5,
  },
  {
    id: "fc5",
    title: "自研数字病理识别",
    img: "episodes/clinmesh-promo/images/病理.png",
    fromX: -620,
    fromY: 380,
    toX: 96,
    toY: 726,
    rot: 2.0,
    exitX: -196,
    exitY: 122,
    exitRot: 4.2,
    exitOrder: 2,
  },
  {
    id: "fc6",
    title: "全院六岗同源流转",
    img: "episodes/clinmesh-promo/captures/C06-multirole-status-strip.png",
    fromX: 620,
    fromY: 380,
    toX: 1344,
    toY: 726,
    rot: -2.0,
    exitX: 196,
    exitY: 122,
    exitRot: -4.2,
    exitOrder: 3,
  },
] as const;

export const ShotS08SynergyFinale: React.FC<{
  timeline: Timeline;
  roleCueFrames?: readonly [number, number, number, number, number, number];
  stepBaseFrame?: number;
}> = ({ timeline, roleCueFrames, stepBaseFrame = 92 }) => {
  const f = useCurrentFrame();
  const l013 = sentence(timeline, "L013");
  const l014 = sentence(timeline, "L014");
  const shotStart = l013.startFrame;
  const shotDuration = timeline.durationInFrames - shotStart;
  const l014Local = l014.startFrame - shotStart;

  const curves = useMemo(
    () =>
      ROLE_NODES.map((node) =>
        precomputeCubicBezier(
          { x: 430, y: node.y },
          { x: 740, y: node.y },
          { x: 840, y: 500 },
          { x: 1060, y: 500 },
        ),
      ),
    [],
  );

  const partAFade = 1 - ramp(f, l014Local - 16, 18, EASE.swift);
  const craneT = ramp(f, l014Local - 16, 36, EASE.snappy);
  const cardsDim = ramp(f, l014Local + 10, 16, EASE.out);
  const immersionT = ramp(f, l014Local + 38, 28, EASE.smooth);
  const heroFocus = ramp(f, l014Local + 36, 30, EASE.smooth);

  const stampIn = ramp(f, l014Local + 14, 14, EASE.snappy);
  const ruleExpand = ramp(f, l014Local + 30, 16, EASE.swift);
  const ruleWingOut = ramp(f, l014Local + 32, 10, EASE.swift);
  const ruleWingFade = 1 - ramp(f, l014Local + 40, 12, EASE.out);
  const mottoIn = ramp(f, l014Local + 34, 18, EASE.out);
  const footnoteIn = ramp(f, l014Local + 46, 18, EASE.out);
  const endFadeOut = 1 - ramp(f, shotDuration - 24, 24, EASE.exit);

  const showCardsLayer = f >= l014Local - 16 && f < l014Local + 70;
  const plateAlpha = (1 - immersionT) * clamp01(stampIn * 1.2);
  const heroScale = lerp(0.962, 1.0, heroFocus);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: promoColor.stageBg,
        opacity: endFadeOut,
        overflow: "hidden",
      }}
    >
      <AbsoluteFill
        style={{
          background: `radial-gradient(1180px 760px at 50% 48%, rgba(124, 134, 255, ${lerp(0.16, 0.08, immersionT).toFixed(3)}), rgba(18, 18, 16, 0.98) 74%)`,
        }}
      />

      {stampIn > 0.01 ? (
        <AbsoluteFill
          style={{
            pointerEvents: "none",
            background: `radial-gradient(820px 430px at 50% 47%, rgba(124, 134, 255, ${(0.12 * stampIn + 0.1 * immersionT).toFixed(3)}) 0%, rgba(141, 187, 255, ${(0.07 * immersionT).toFixed(3)}) 42%, transparent 74%)`,
          }}
        />
      ) : null}

      {immersionT > 0.01 ? (
        <AbsoluteFill
          style={{
            pointerEvents: "none",
            opacity: immersionT,
            background:
              "radial-gradient(1240px 800px at 50% 47%, transparent 46%, rgba(8, 9, 12, 0.62) 100%)",
          }}
        />
      ) : null}

      {partAFade > 0.01 ? (
        <AbsoluteFill
          style={{
            opacity: partAFade,
            transform: `scale(${lerp(0.94, 1.01, clamp01(f / Math.max(1, l014Local - 16)))})`,
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 84,
              right: 84,
              top: 56,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div
              style={{
                fontFamily: promoFont.sans,
                fontSize: 54,
                fontWeight: 700,
                color: promoColor.fg,
              }}
            >
              六岗智能体围绕同一患者跨岗无缝交接
            </div>
            <StatusBadge tone="success">
              纵向病例同源 · 零手工重复转抄
            </StatusBadge>
          </div>

          <svg
            width={1920}
            height={1080}
            viewBox="0 0 1920 1080"
            style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
          >
            {curves.map((curve, idx) => {
              const roleStart = roleCueFrames?.[idx] ?? idx * 22;
              const draw = ramp(f, roleStart + 12, 36, EASE.snappy);
              const pktStart =
                roleCueFrames !== undefined ? roleStart + 20 : 24 + idx * 24;
              const pktT = clamp01((f - pktStart) / 56);
              const pt = curve.pointAtFraction(pktT);
              const color = ROLE_NODES[idx].color;
              return (
                <g key={ROLE_NODES[idx].id}>
                  <path
                    d={curve.svgPath}
                    fill="none"
                    stroke="rgba(255,255,255,0.08)"
                    strokeWidth={2.5}
                  />
                  <path
                    d={curve.svgPath}
                    fill="none"
                    stroke={color}
                    strokeWidth={3.5}
                    strokeOpacity={0.78}
                    strokeDasharray={curve.totalLength}
                    strokeDashoffset={curve.totalLength * (1 - draw)}
                  />
                  {pktT > 0.02 && pktT < 0.99 ? (
                    <circle cx={pt.x} cy={pt.y} r={8} fill={color} />
                  ) : null}
                </g>
              );
            })}
          </svg>

          {ROLE_NODES.map((node, idx) => {
            const roleStart = roleCueFrames?.[idx] ?? idx * 22;
            const nodeIn = ramp(f, roleStart, 22, EASE.snappy);
            return (
              <div
                key={node.id}
                style={{
                  position: "absolute",
                  left: 84,
                  top: node.y - 34,
                  width: 346,
                  height: 68,
                  opacity: nodeIn,
                  transform: `translateX(${(1 - nodeIn) * -22}px)`,
                  backgroundColor: promoColor.cardBg,
                  borderRadius: promoRadius.card,
                  border: `1.5px solid ${node.color}`,
                  padding: "0 22px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  boxShadow: "0 12px 28px rgba(0,0,0,0.42)",
                }}
              >
                <span
                  style={{
                    fontFamily: promoFont.sans,
                    fontSize: 30,
                    fontWeight: 700,
                    color: promoColor.fg,
                  }}
                >
                  {node.label}
                </span>
                <span
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: "50%",
                    backgroundColor: node.color,
                  }}
                />
              </div>
            );
          })}

          <div
            style={{
              position: "absolute",
              left: 1060,
              right: 84,
              top: 250,
              backgroundColor: promoColor.cardBg,
              borderRadius: promoRadius.card,
              border: `1.5px solid ${promoColor.borderStrong}`,
              boxShadow: promoColor.cardShadow,
              padding: "28px 30px",
              display: "flex",
              flexDirection: "column",
              gap: 20,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  fontFamily: promoFont.sans,
                  fontSize: 36,
                  fontWeight: 700,
                  color: promoColor.fg,
                }}
              >
                同一患者纵向病例中枢
              </span>
              <StatusBadge tone="info">实时状态链条</StatusBadge>
            </div>
            <div
              style={{
                borderRadius: promoRadius.control,
                overflow: "hidden",
                border: `1px solid ${promoColor.border}`,
                backgroundColor: promoColor.stageBgAlt,
              }}
            >
              <Img
                src={staticFile(
                  "episodes/clinmesh-promo/captures/C06-multirole-status-strip.png",
                )}
                style={{
                  width: "100%",
                  height: "auto",
                  display: "block",
                }}
              />
            </div>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              {[
                "01 入院登记",
                "02 入科分床",
                "03 在院诊疗与介入",
                "04 医保核定",
                "05 病案归档",
              ].map((stepLabel, stepIdx) => {
                const active = ramp(
                  f,
                  stepBaseFrame + stepIdx * 24,
                  18,
                  EASE.snappy,
                );
                return (
                  <span
                    key={stepLabel}
                    style={{
                      fontFamily: promoFont.sans,
                      fontSize: 24,
                      fontWeight: 600,
                      padding: "8px 14px",
                      borderRadius: promoRadius.control,
                      backgroundColor: `rgba(125, 219, 164, ${(0.05 + 0.16 * active).toFixed(3)})`,
                      border: `1px solid rgba(125, 219, 164, ${(0.14 + 0.42 * active).toFixed(3)})`,
                      color:
                        active > 0.5 ? promoColor.success : promoColor.fgDim,
                      transform: `translateY(${(1 - active) * 6}px)`,
                    }}
                  >
                    {stepLabel}
                  </span>
                );
              })}
            </div>
          </div>
        </AbsoluteFill>
      ) : null}

      {showCardsLayer ? (
        <AbsoluteFill style={{ perspective: "1600px", pointerEvents: "none" }}>
          <AbsoluteFill
            style={{
              transform: `scale(${lerp(1.05, 1.0, craneT)}) rotateX(${lerp(4, 0, craneT)}deg)`,
            }}
          >
            {FINALE_CARDS.map((card, idx) => {
              const startF = l014Local - 14 + idx * 2;
              const exitStartF = l014Local + 36 + card.exitOrder * 2;
              const exitT = ramp(f, exitStartF, 20, EASE.swift);
              const exitFade = ramp(f, exitStartF + 2, 18, EASE.smooth);
              const cardEnter = clamp01((f - startF) / 9);
              const cardOpacity =
                cardEnter * lerp(0.88, 0.34, cardsDim) * (1 - exitFade);
              if (cardOpacity <= 0.004) {
                return null;
              }
              const posAt = (sampleF: number) => {
                const tIn = ramp(sampleF, startF, 22, EASE.overshoot);
                const tOut = ramp(sampleF, exitStartF, 20, EASE.swift);
                return {
                  x:
                    lerp(card.toX + card.fromX, card.toX, tIn) +
                    card.exitX * tOut,
                  y:
                    lerp(card.toY + card.fromY, card.toY, tIn) +
                    card.exitY * tOut,
                };
              };
              const pos = posAt(f);
              const vel = velocityAt(posAt, f);
              const rot = lerp(card.rot, card.exitRot, exitT);
              const scale = lerp(1.0, 0.92, exitT);
              const sat = lerp(1 - 0.14 * cardsDim, 0.64, exitT);
              return (
                <div
                  key={card.id}
                  style={{
                    position: "absolute",
                    left: pos.x,
                    top: pos.y,
                    width: 480,
                    height: 268,
                    opacity: cardOpacity,
                    transform: `rotate(${rot.toFixed(2)}deg) scale(${scale.toFixed(3)})`,
                    transformOrigin: "50% 50%",
                    filter:
                      exitT > 0.01
                        ? `blur(${(exitT * 9).toFixed(1)}px) saturate(${sat.toFixed(2)})`
                        : cardsDim > 0.01
                          ? `saturate(${sat.toFixed(2)})`
                          : undefined,
                  }}
                >
                  <SpeedBlur vx={vel.vx} vy={vel.vy} id={`blur-${card.id}`}>
                    <div
                      style={{
                        width: 480,
                        height: 268,
                        borderRadius: promoRadius.card,
                        backgroundColor: promoColor.cardBg,
                        border: `1px solid ${promoColor.borderStrong}`,
                        boxShadow: "0 18px 42px rgba(0,0,0,0.56)",
                        overflow: "hidden",
                        display: "flex",
                        flexDirection: "column",
                      }}
                    >
                      <div
                        style={{
                          padding: "8px 16px",
                          fontFamily: promoFont.sans,
                          fontSize: 22,
                          fontWeight: 600,
                          color: promoColor.fgMuted,
                          borderBottom: `1px solid ${promoColor.border}`,
                        }}
                      >
                        {card.title}
                      </div>
                      <div style={{ flex: 1, overflow: "hidden" }}>
                        <Img
                          src={staticFile(card.img)}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                      </div>
                    </div>
                  </SpeedBlur>
                </div>
              );
            })}
          </AbsoluteFill>
        </AbsoluteFill>
      ) : null}

      {stampIn > 0.01 ? (
        <AbsoluteFill
          style={{
            justifyContent: "center",
            alignItems: "center",
            paddingBottom: 18,
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: "46px 78px",
              borderRadius: 16,
              backgroundColor:
                plateAlpha > 0.005
                  ? `rgba(18, 18, 16, ${(0.78 * plateAlpha).toFixed(3)})`
                  : "transparent",
              boxShadow:
                plateAlpha > 0.005
                  ? `0 28px 80px rgba(0, 0, 0, ${(0.68 * plateAlpha).toFixed(3)})`
                  : undefined,
              transform:
                heroFocus < 0.999
                  ? `scale(${heroScale.toFixed(4)})`
                  : undefined,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 28,
                opacity: stampIn,
                transform:
                  stampIn < 0.999
                    ? `scale(${lerp(1.14, 1.0, stampIn).toFixed(4)})`
                    : undefined,
                filter:
                  stampIn < 0.98
                    ? `blur(${((1 - stampIn) * 5.5).toFixed(1)}px)`
                    : undefined,
              }}
            >
              <div
                style={{
                  width: 96,
                  height: 96,
                  borderRadius: 20,
                  overflow: "hidden",
                  backgroundColor: "#FAFAFA",
                  boxShadow:
                    "0 16px 42px rgba(0, 0, 0, 0.56), 0 0 28px rgba(124, 134, 255, 0.28)",
                }}
              >
                <Img
                  src={staticFile(
                    "episodes/clinmesh-promo/images/clinmesh-logo.webp",
                  )}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    transform: "scale(1.02)",
                    display: "block",
                  }}
                />
              </div>
              <span
                style={{
                  fontFamily: promoFont.serif,
                  fontSize: 118,
                  fontWeight: 700,
                  letterSpacing: `${lerp(0.055, 0.022, stampIn).toFixed(3)}em`,
                  color: promoColor.fg,
                  lineHeight: 1.04,
                  textShadow: "0 18px 54px rgba(0, 0, 0, 0.82)",
                }}
              >
                ClinMesh
              </span>
            </div>

            <div
              style={{
                position: "relative",
                width: 420,
                height: 4,
                marginTop: 28,
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: 2,
                  background: `linear-gradient(90deg, transparent 0%, ${promoColor.stageAccent} 24%, ${promoColor.info} 76%, transparent 100%)`,
                  transform: `scaleX(${ruleExpand})`,
                  transformOrigin: "50% 50%",
                  opacity: ruleExpand,
                }}
              />
              {ruleWingOut > 0.01 && ruleWingFade > 0.01 ? (
                <>
                  <div
                    style={{
                      position: "absolute",
                      top: 1.5,
                      right: "100%",
                      width: 170 * ruleWingOut,
                      height: 1,
                      background: `linear-gradient(90deg, transparent 0%, ${promoColor.stageAccent} 100%)`,
                      opacity: 0.72 * ruleWingFade,
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      top: 1.5,
                      left: "100%",
                      width: 170 * ruleWingOut,
                      height: 1,
                      background: `linear-gradient(90deg, ${promoColor.info} 0%, transparent 100%)`,
                      opacity: 0.72 * ruleWingFade,
                    }}
                  />
                </>
              ) : null}
            </div>

            <div
              style={{
                marginTop: 26,
                opacity: mottoIn,
                transform:
                  mottoIn < 0.999
                    ? `translateY(${((1 - mottoIn) * 12).toFixed(2)}px)`
                    : undefined,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 14,
              }}
            >
              <div
                style={{
                  fontFamily: promoFont.sans,
                  fontSize: 58,
                  fontWeight: 700,
                  letterSpacing: "0.03em",
                  paddingLeft: "0.03em",
                  color: promoColor.fg,
                  textShadow: "0 14px 40px rgba(0, 0, 0, 0.82)",
                }}
              >
                让智能体深度融入医疗每一步
              </div>
              <div
                style={{
                  opacity: footnoteIn,
                  transform:
                    footnoteIn < 0.999
                      ? `translateY(${((1 - footnoteIn) * 8).toFixed(2)}px)`
                      : undefined,
                  fontFamily: promoFont.serif,
                  fontStyle: "italic",
                  fontSize: 34,
                  fontWeight: 600,
                  color: promoColor.fgMuted,
                  letterSpacing: "0.02em",
                  textShadow: "0 10px 30px rgba(0, 0, 0, 0.78)",
                }}
              >
                Clinical intelligence, woven into every step of care.
              </div>
            </div>
          </div>
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};

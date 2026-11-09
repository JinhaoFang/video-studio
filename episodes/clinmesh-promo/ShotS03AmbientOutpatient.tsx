/**
 * Scene S03 (L006-L007): Outpatient silent ambient EMR field drafting with single
 * indigo caret, transitioning via portal-wipe into guideline-backed candidate row
 * embedding with 2px info-blue seam flash and >=0.5s static hold.
 */
import {
  AbsoluteFill,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { sentence } from "../../src/kit/sentence-timing";
import type { Timeline } from "../../tools/timeline-types";
import { breatherStartFrame } from "./sfx-schedule";
import { promoFont } from "./fonts";
import { EASE, clamp01, lerp, ramp } from "./motion-utils";
import { PageCam, StatusBadge, type CamKey } from "./primitives";
import { BREATHER_DURATION_F, promoColor, promoRadius } from "./tokens";

const EMR_FIELDS = [
  {
    label: "主诉",
    value: "发作性头晕伴血压波动 1 周，加重 1 天。",
    startOffset: 12,
    dur: 34,
  },
  {
    label: "现病史",
    value: "劳累后头晕伴颈部紧胀，自测最高血压 166/98 mmHg，休息后部分缓解。",
    startOffset: 54,
    dur: 38,
  },
  {
    label: "辅助检查",
    value: "分诊指脉氧 98%，近半年糖化血红蛋白及肾功能基线已自动同步。",
    startOffset: 100,
    dur: 36,
  },
] as const;

const CANDIDATE_ROWS = [
  {
    kind: "检验候选",
    title: "糖化血红蛋白 (HbA1c) · 肾功能及电解质复查",
    source: "高血压合并糖尿病靶器官评估路径 · 自动预选",
    tone: "info" as const,
    offset: 24,
  },
  {
    kind: "影像候选",
    title: "颈动脉彩色多普勒超声（待核对外院近期报告）",
    source: "发作性头晕循证鉴别指南 · 零重复检查校验",
    tone: "warn" as const,
    offset: 70,
  },
  {
    kind: "处方候选",
    title: "苯磺酸氨氯地平片 5 mg · 口服 · 每日 1 次",
    source: "络活喜核验说明书 · 已关联肝肾基线与既有方案",
    tone: "success" as const,
    offset: 116,
  },
] as const;

export const ShotS03AmbientOutpatient: React.FC<{ timeline: Timeline }> = ({
  timeline,
}) => {
  const f = useCurrentFrame();
  const shotStart = breatherStartFrame(timeline, "L005") + BREATHER_DURATION_F;
  const l006 = sentence(timeline, "L006");
  const l007 = sentence(timeline, "L007");
  const l006Local = l006.startFrame - shotStart;
  const l007Local = l007.startFrame - shotStart;

  const portalT = ramp(f, l007Local - 10, 22, EASE.portal);
  const pillSurfaceFade = 1 - clamp01(portalT / 0.28);

  const partACam: CamKey[] = [
    { frame: 0, cx: 880, cy: 480, zoom: 1.08 },
    { frame: l006Local + 118, cx: 934, cy: 520, zoom: 1.026 },
    { frame: l007Local - 4, cx: 960, cy: 540, zoom: 1.0 },
  ];

  const partBCam: CamKey[] = [
    { frame: l007Local - 10, cx: 960, cy: 556, zoom: 0.94 },
    { frame: l007Local + 164, cx: 960, cy: 540, zoom: 1.0 },
  ];

  const insetTop = lerp(118, 0, portalT);
  const insetRight = lerp(96, 0, portalT);
  const insetBottom = lerp(884, 0, portalT);
  const insetLeft = lerp(1360, 0, portalT);
  const insetRadius = lerp(24, 0, portalT);

  return (
    <AbsoluteFill style={{ backgroundColor: promoColor.stageBg }}>
      {portalT < 0.999 ? (
        <PageCam keys={partACam}>
          <AbsoluteFill style={{ backgroundColor: promoColor.stageBgAlt }}>
            <Img
              src={staticFile(
                "episodes/clinmesh-promo/captures/C01-outpatient-emr-card.png",
              )}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                opacity: 0.22,
              }}
            />
            <AbsoluteFill
              style={{
                background:
                  "radial-gradient(1200px 760px at 50% 48%, rgba(21,21,23,0.58), rgba(18,18,16,0.94) 82%)",
              }}
            />

            <div
              style={{
                position: "absolute",
                left: 96,
                right: 96,
                top: 108,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  fontFamily: promoFont.sans,
                  fontSize: 58,
                  fontWeight: 700,
                  color: promoColor.fg,
                }}
              >
                无感伴随智能 · 结构化病历静默成文
              </div>

              <div
                style={{
                  opacity: pillSurfaceFade,
                  padding: "14px 26px",
                  borderRadius: 24,
                  backgroundColor: "rgba(141, 187, 255, 0.16)",
                  border: `1.5px solid ${promoColor.info}`,
                  fontFamily: promoFont.sans,
                  fontSize: 30,
                  fontWeight: 700,
                  color: promoColor.info,
                }}
              >
                ✨ 循证候选已同步就绪 →
              </div>
            </div>

            <div
              style={{
                position: "absolute",
                left: 96,
                right: 96,
                top: 236,
                backgroundColor: promoColor.cardBg,
                borderRadius: promoRadius.card,
                border: `1px solid ${promoColor.borderStrong}`,
                boxShadow: promoColor.cardShadow,
                padding: "34px 40px",
                display: "flex",
                flexDirection: "column",
                gap: 26,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingBottom: 18,
                  borderBottom: `1px solid ${promoColor.border}`,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                  }}
                >
                  <StatusBadge tone="info">✨ 助手已准备</StatusBadge>
                  <span
                    style={{
                      fontFamily: promoFont.sans,
                      fontSize: 32,
                      fontWeight: 600,
                      color: promoColor.fgMuted,
                    }}
                  >
                    患者A · 女 · 56 岁 · 随问诊与分诊事件实时归档
                  </span>
                </div>
                <StatusBadge tone="success">✓ 暂无质控疑点</StatusBadge>
              </div>

              {EMR_FIELDS.map((field) => {
                const p = ramp(
                  f,
                  l006Local + field.startOffset,
                  field.dur,
                  EASE.out,
                );
                const typingActive = p > 0.02 && p < 0.99;
                const visibleChars = Math.max(
                  0,
                  Math.round(field.value.length * p),
                );
                return (
                  <div
                    key={field.label}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "180px 1fr",
                      alignItems: "center",
                      gap: 24,
                      padding: "18px 24px",
                      borderRadius: promoRadius.control,
                      backgroundColor: promoColor.cardInset,
                      border: typingActive
                        ? `1.5px solid ${promoColor.stageAccent}`
                        : `1px solid ${promoColor.border}`,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: promoFont.sans,
                        fontSize: 32,
                        fontWeight: 700,
                        color: promoColor.fgMuted,
                      }}
                    >
                      {field.label}
                    </span>
                    <div
                      style={{
                        fontFamily: promoFont.sans,
                        fontSize: 34,
                        fontWeight: 500,
                        color: promoColor.fg,
                        minHeight: 46,
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      <span>{field.value.slice(0, visibleChars)}</span>
                      {typingActive ? (
                        <span
                          style={{
                            display: "inline-block",
                            width: 4,
                            height: 36,
                            marginLeft: 4,
                            borderRadius: 2,
                            backgroundColor: promoColor.stageAccent,
                          }}
                        />
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </AbsoluteFill>
        </PageCam>
      ) : null}

      {portalT > 0.001 ? (
        <AbsoluteFill
          style={{
            clipPath: `inset(${insetTop.toFixed(1)}px ${insetRight.toFixed(1)}px ${insetBottom.toFixed(1)}px ${insetLeft.toFixed(1)}px round ${insetRadius.toFixed(1)}px)`,
          }}
        >
          <PageCam keys={partBCam}>
            <AbsoluteFill style={{ backgroundColor: promoColor.stageBgAlt }}>
              <Img
                src={staticFile(
                  "episodes/clinmesh-promo/captures/C02-guideline-candidates-card.png",
                )}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  opacity: 0.24,
                }}
              />
              <AbsoluteFill
                style={{
                  background:
                    "radial-gradient(1260px 800px at 50% 48%, rgba(21,21,23,0.56), rgba(18,18,16,0.95) 84%)",
                }}
              />

              <div
                style={{
                  position: "absolute",
                  left: 92,
                  right: 92,
                  top: 98,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    fontFamily: promoFont.sans,
                    fontSize: 58,
                    fontWeight: 700,
                    color: promoColor.fg,
                  }}
                >
                  权威指南与院内目录候选同步就绪
                </div>
                <StatusBadge tone="info">
                  ◉ 已读取 15 份病例依据 · 4 条指南依据
                </StatusBadge>
              </div>

              <div
                style={{
                  position: "absolute",
                  left: 92,
                  right: 92,
                  top: 224,
                  display: "grid",
                  gridTemplateColumns: "1.42fr 0.88fr",
                  gap: 32,
                  alignItems: "stretch",
                }}
              >
                <div
                  style={{
                    backgroundColor: promoColor.cardBg,
                    borderRadius: promoRadius.card,
                    border: `1px solid ${promoColor.borderStrong}`,
                    boxShadow: promoColor.cardShadow,
                    padding: "28px 32px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 20,
                    perspective: "1100px",
                  }}
                >
                  {CANDIDATE_ROWS.map((row) => {
                    const rowStart = l007Local + row.offset;
                    const t = ramp(f, rowStart, 16, EASE.rowFly);
                    const seamFlash = interpolate(
                      f,
                      [rowStart + 14, rowStart + 17, rowStart + 28],
                      [0, 1, 0],
                      {
                        extrapolateLeft: "clamp",
                        extrapolateRight: "clamp",
                      },
                    );
                    return (
                      <div
                        key={row.kind}
                        style={{
                          position: "relative",
                          opacity: clamp01(t * 1.25),
                          transform: `translateY(${(1 - t) * -44}px) scale(${1.04 - 0.04 * t}) rotateX(${(1 - t) * 14}deg)`,
                          transformOrigin: "50% 100%",
                          backgroundColor: promoColor.cardInset,
                          borderRadius: promoRadius.control,
                          border: `1px solid ${promoColor.border}`,
                          padding: "22px 26px",
                          display: "flex",
                          flexDirection: "column",
                          gap: 10,
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <StatusBadge tone={row.tone}>{row.kind}</StatusBadge>
                          <span
                            style={{
                              fontFamily: promoFont.sans,
                              fontSize: 28,
                              fontWeight: 600,
                              color: promoColor.fgDim,
                            }}
                          >
                            待医生确认
                          </span>
                        </div>
                        <div
                          style={{
                            fontFamily: promoFont.sans,
                            fontSize: 34,
                            fontWeight: 700,
                            color: promoColor.fg,
                          }}
                        >
                          {row.title}
                        </div>
                        <div
                          style={{
                            fontFamily: promoFont.sans,
                            fontSize: 28,
                            color: promoColor.fgMuted,
                          }}
                        >
                          {row.source}
                        </div>
                        {seamFlash > 0.01 ? (
                          <div
                            style={{
                              position: "absolute",
                              left: 0,
                              right: 0,
                              bottom: 0,
                              height: 3,
                              backgroundColor: promoColor.info,
                              boxShadow: `0 0 18px ${promoColor.info}`,
                              opacity: seamFlash,
                            }}
                          />
                        ) : null}
                      </div>
                    );
                  })}
                </div>

                <div
                  style={{
                    backgroundColor: promoColor.cardBg,
                    borderRadius: promoRadius.card,
                    border: `1px solid ${promoColor.borderStrong}`,
                    boxShadow: promoColor.cardShadow,
                    padding: 18,
                    display: "flex",
                    flexDirection: "column",
                    gap: 14,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "6px 10px",
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
                      实机循证依据抽屉
                    </span>
                    <StatusBadge tone="neutral">药品说明书核验</StatusBadge>
                  </div>
                  <div
                    style={{
                      flex: 1,
                      borderRadius: promoRadius.control,
                      overflow: "hidden",
                      border: `1px solid ${promoColor.border}`,
                      backgroundColor: promoColor.stageBgAlt,
                    }}
                  >
                    <Img
                      src={staticFile(
                        "episodes/clinmesh-promo/captures/C02-guideline-evidence-dialog.png",
                      )}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        objectPosition: "top center",
                      }}
                    />
                  </div>
                </div>
              </div>
            </AbsoluteFill>
          </PageCam>
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};

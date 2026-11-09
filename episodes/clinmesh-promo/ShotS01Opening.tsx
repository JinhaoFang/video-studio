/**
 * Scene S01 (L001-L003): Streamlined 3-image cinematic prologue — screen-only Q&A
 * still life (begin1), shared hospital workstation backdrop (pain-legacy) carrying
 * both sequential pain-point headlines ("旧系统只记录过去" -> "孤立对话框走不进诊疗现场"),
 * and dusk consultation room (begin3) centering the full-bleed logo + ClinMesh title.
 */
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import { sentence } from "../../src/kit/sentence-timing";
import type { Timeline } from "../../tools/timeline-types";
import { promoFont } from "./fonts";
import { EASE, clamp01, lerp, ramp } from "./motion-utils";
import { StatusBadge } from "./primitives";
import { promoColor, promoRadius } from "./tokens";

export const ShotS01Opening: React.FC<{
  timeline: Timeline;
  mid2OffsetF?: number;
  lockupOffsetF?: number;
  ruleOffsetF?: number;
  subtitleOffsetF?: number;
}> = ({
  timeline,
  mid2OffsetF = 80,
  lockupOffsetF = 44,
  ruleOffsetF = 56,
  subtitleOffsetF = 62,
}) => {
  const f = useCurrentFrame();
  const l001 = sentence(timeline, "L001");
  const l002 = sentence(timeline, "L002");
  const l003 = sentence(timeline, "L003");

  const cut2 = l001.endFrame - 4;
  const mid2 = l002.startFrame + mid2OffsetF;
  const cut3 = l003.startFrame - 2;

  const coldFadeIn = ramp(f, 0, 26, EASE.out);
  const act1Progress = clamp01(f / Math.max(1, cut2));
  const qaCardIn = ramp(f, Math.max(0, l001.startFrame - 4), 22, EASE.snappy);
  const qaAnswerIn = ramp(f, l001.startFrame + 22, 22, EASE.out);
  const screenPulse =
    0.72 + 0.28 * Math.sin(((f - l001.startFrame) / 34) * Math.PI);

  const shot2In = ramp(f, cut2 - 4, 10, EASE.out);
  const shot2Progress = clamp01((f - cut2) / Math.max(1, cut3 - cut2));

  const legacyIn = ramp(f, cut2 + 4, 20, EASE.snappy);
  const legacyOut = ramp(f, mid2 - 6, 10, EASE.out);
  const legacyOpacity = legacyIn * (1 - legacyOut);

  const isolatedIn = ramp(f, mid2 + 2, 20, EASE.snappy);

  const roomDissolve = ramp(f, cut3 - 4, 22, EASE.smooth);
  const roomSettle = ramp(f, cut3, 94, EASE.out);

  const lockupIn = ramp(f, l003.startFrame + lockupOffsetF, 26, EASE.snappy);
  const ruleIn = ramp(f, l003.startFrame + ruleOffsetF, 22, EASE.out);
  const subtitleIn = ramp(f, l003.startFrame + subtitleOffsetF, 24, EASE.out);

  return (
    <AbsoluteFill style={{ backgroundColor: "#08090C" }}>
      {f < cut2 + 8 ? (
        <AbsoluteFill style={{ opacity: coldFadeIn, overflow: "hidden" }}>
          <Img
            src={staticFile("episodes/clinmesh-promo/images/begin1.jpg")}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transform: `scale(${lerp(1.0, 1.052, act1Progress)}) translateX(${lerp(0, -10, act1Progress)}px)`,
            }}
          />
          <AbsoluteFill
            style={{
              background: `radial-gradient(540px 340px at 82% 24%, rgba(124, 134, 255, ${(0.2 * qaCardIn * screenPulse).toFixed(3)}) 0%, rgba(141, 187, 255, ${(0.07 * qaCardIn).toFixed(3)}) 46%, transparent 76%)`,
              mixBlendMode: "screen",
              pointerEvents: "none",
            }}
          />
          <AbsoluteFill
            style={{
              background:
                "linear-gradient(180deg, rgba(8,9,12,0.22) 0%, transparent 34%, transparent 72%, rgba(8,9,12,0.72) 100%)",
              pointerEvents: "none",
            }}
          />

          <div
            style={{
              position: "absolute",
              left: 108,
              top: 286,
              width: 720,
              opacity: qaCardIn,
              transform: `translateY(${(1 - qaCardIn) * 22}px)`,
              backgroundColor: "rgba(18, 21, 28, 0.76)",
              borderRadius: promoRadius.card,
              border: "1px solid rgba(141, 187, 255, 0.22)",
              boxShadow: "0 24px 56px rgba(0, 0, 0, 0.52)",
              padding: "30px 34px",
              display: "flex",
              flexDirection: "column",
              gap: 18,
            }}
          >
            <div>
              <StatusBadge tone="info">✦ 屏幕端医学知识问答</StatusBadge>
            </div>
            <div
              style={{
                fontFamily: promoFont.sans,
                fontSize: 31,
                color: "#C4C9D2",
                lineHeight: 1.38,
              }}
            >
              “高血压合并胸闷胸痛，应如何评估调整方案？”
            </div>
            <div
              style={{
                opacity: qaAnswerIn,
                transform: `translateY(${(1 - qaAnswerIn) * 10}px)`,
                padding: "14px 18px",
                borderRadius: promoRadius.control,
                backgroundColor: "rgba(124, 134, 255, 0.12)",
                border: "1px solid rgba(124, 134, 255, 0.28)",
                fontFamily: promoFont.sans,
                fontSize: 32,
                fontWeight: 600,
                color: promoColor.fg,
              }}
            >
              AI 已在屏幕内生成通用医学参考回答
            </div>
          </div>
        </AbsoluteFill>
      ) : null}

      {f >= cut2 - 4 && f < cut3 + 20 ? (
        <AbsoluteFill style={{ opacity: shot2In, overflow: "hidden" }}>
          <Img
            src={staticFile("episodes/clinmesh-promo/images/pain-legacy.jpg")}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transform: `scale(${lerp(1.0, 1.072, shot2Progress)}) translateX(${lerp(0, -14, shot2Progress)}px)`,
            }}
          />
          <AbsoluteFill
            style={{
              background:
                "linear-gradient(90deg, rgba(10, 12, 16, 0.86) 0%, rgba(10, 12, 16, 0.64) 46%, rgba(10, 12, 16, 0.20) 100%)",
              pointerEvents: "none",
            }}
          />

          {legacyOpacity > 0.01 ? (
            <div
              style={{
                position: "absolute",
                left: 112,
                top: 326,
                maxWidth: 820,
                opacity: legacyOpacity,
                transform: `translateY(${(1 - legacyIn) * 20 - legacyOut * 14}px)`,
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
              }}
            >
              <StatusBadge tone="neutral">
                事后静态归档 · 零诊中协同
              </StatusBadge>
              <div
                style={{
                  marginTop: 24,
                  fontFamily: promoFont.sans,
                  fontSize: 78,
                  fontWeight: 700,
                  lineHeight: 1.18,
                  letterSpacing: "0.02em",
                  color: promoColor.fg,
                  textShadow: "0 16px 44px rgba(0, 0, 0, 0.68)",
                }}
              >
                旧系统
                <br />
                <span style={{ color: promoColor.fgMuted }}>只记录过去</span>
              </div>
              <div
                style={{
                  marginTop: 20,
                  fontFamily: promoFont.sans,
                  fontSize: 34,
                  fontWeight: 500,
                  color: promoColor.fgDim,
                }}
              >
                停留在手工补录表单，无法在接诊现场主动分担
              </div>
            </div>
          ) : null}

          {isolatedIn > 0.01 ? (
            <div
              style={{
                position: "absolute",
                left: 112,
                top: 326,
                maxWidth: 860,
                opacity: isolatedIn,
                transform: `translateY(${(1 - isolatedIn) * 20}px)`,
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
              }}
            >
              <StatusBadge tone="warn">
                脱离临床上下文 · 仅停留在问答
              </StatusBadge>
              <div
                style={{
                  marginTop: 24,
                  fontFamily: promoFont.sans,
                  fontSize: 78,
                  fontWeight: 700,
                  lineHeight: 1.18,
                  letterSpacing: "0.02em",
                  color: promoColor.fg,
                  textShadow: "0 16px 44px rgba(0, 0, 0, 0.68)",
                }}
              >
                孤立对话框
                <br />
                <span style={{ color: promoColor.warning }}>
                  走不进诊疗现场
                </span>
              </div>
              <div
                style={{
                  marginTop: 20,
                  fontFamily: promoFont.sans,
                  fontSize: 34,
                  fontWeight: 500,
                  color: promoColor.fgMuted,
                }}
              >
                读不到当前病历与医嘱链路，难解医生真实负担
              </div>
            </div>
          ) : null}
        </AbsoluteFill>
      ) : null}

      {f >= cut3 - 4 ? (
        <AbsoluteFill style={{ opacity: roomDissolve, overflow: "hidden" }}>
          <Img
            src={staticFile("episodes/clinmesh-promo/images/begin3.jpg")}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              filter: "brightness(0.76)",
              transform: `scale(${lerp(1.052, 1.0, roomSettle)})`,
            }}
          />
          <AbsoluteFill
            style={{
              background:
                "radial-gradient(980px 560px at 50% 46%, rgba(10, 12, 18, 0.54) 0%, rgba(10, 12, 18, 0.26) 58%, rgba(10, 12, 18, 0.58) 100%)",
              pointerEvents: "none",
            }}
          />

          {lockupIn > 0.01 ? (
            <AbsoluteFill
              style={{
                justifyContent: "center",
                alignItems: "center",
                paddingBottom: 52,
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
                    alignItems: "center",
                    gap: 28,
                    opacity: lockupIn,
                    transform: `translateY(${(1 - lockupIn) * 16}px)`,
                    filter:
                      lockupIn < 0.98
                        ? `blur(${((1 - lockupIn) * 4.5).toFixed(1)}px)`
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
                      letterSpacing: `${lerp(0.06, 0.022, lockupIn).toFixed(3)}em`,
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
                    width: 400,
                    height: 3,
                    borderRadius: 1.5,
                    marginTop: 26,
                    background: `linear-gradient(90deg, transparent 0%, ${promoColor.stageAccent} 24%, ${promoColor.info} 76%, transparent 100%)`,
                    transform: `scaleX(${ruleIn})`,
                    transformOrigin: "50% 50%",
                    opacity: ruleIn,
                  }}
                />

                <div
                  style={{
                    marginTop: 22,
                    fontFamily: promoFont.sans,
                    fontSize: 44,
                    fontWeight: 600,
                    letterSpacing: "0.04em",
                    paddingLeft: "0.04em",
                    color: "#DCE0E6",
                    opacity: subtitleIn,
                    transform: `translateY(${(1 - subtitleIn) * 12}px)`,
                    textShadow: "0 12px 36px rgba(0, 0, 0, 0.82)",
                  }}
                >
                  深度融入诊疗每一步的医疗智能体体系
                </div>
              </div>
            </AbsoluteFill>
          ) : null}
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};

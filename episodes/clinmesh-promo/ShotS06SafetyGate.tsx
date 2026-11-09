/**
 * Scene S06 (L010): Immersive single-card Physician Final Review Workstation
 * continuing Patient A from S05: side-by-side structured EMR and formal order
 * review on a calm, zero-AI-glow clinical surface, locking into an immutable
 * signed receipt and audit trail upon the physician's click at s06ClickOffset.
 */
import {
  AbsoluteFill,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import type { Timeline } from "../../tools/timeline-types";
import { promoFont } from "./fonts";
import { EASE, lerp, ramp } from "./motion-utils";
import { StatusBadge } from "./primitives";
import { s06ClickOffset } from "./sfx-schedule";
import { promoColor, promoRadius } from "./tokens";

const EMR_REVIEW_ITEMS = [
  {
    label: "主诉与现病史",
    value: "晨起头晕胸闷两周，自测最高血压 166/98 mmHg",
    highlight: false,
  },
  {
    label: "过敏史核实归档",
    value: "既往注射青霉素全身红疹史（已与患者当面核实确认）",
    highlight: true,
  },
  {
    label: "初步临床诊断",
    value: "原发性高血压（2 级，高危）；2 型糖尿病",
    highlight: false,
  },
] as const;

const ORDER_REVIEW_ITEMS = [
  {
    label: "长期降压处方",
    value: "苯磺酸氨氯地平片 5mg · 口服 · 每日 1 次",
    sub: "符合 2 级高血压初始规范剂量 · 院内目录有库存",
  },
  {
    label: "靶器官评估检验",
    value: "糖化血红蛋白（HbA1c）· 肾功能与电解质复查",
    sub: "关联近半年基线指标 · 已排除近期重复检查",
  },
  {
    label: "用药安全红线复核",
    value: "阿莫西林候选已由质控熔断，未进入正式待签清单",
    sub: "青霉素类过敏风险已闭环拦截",
  },
] as const;

export const ShotS06SafetyGate: React.FC<{ timeline: Timeline }> = ({
  timeline,
}) => {
  const f = useCurrentFrame();

  const clickFrame = s06ClickOffset(timeline);
  const switchFrame = clickFrame + 6;
  const signed = f >= switchFrame;

  const cardIn = ramp(f, 0, 20, EASE.snappy);
  const bgDrift = ramp(f, 0, Math.max(96, clickFrame), EASE.out);
  const docCheckIn = ramp(f, 40, 16, EASE.snappy);
  const orderCheckIn = ramp(f, 80, 16, EASE.snappy);

  const cursorStart = Math.max(88, clickFrame - 39);
  const cursorMove = ramp(
    f,
    cursorStart,
    clickFrame - cursorStart - 4,
    EASE.snappy,
  );
  const cursorOpacity =
    ramp(f, cursorStart, 10, EASE.out) *
    (1 - ramp(f, clickFrame + 2, 4, EASE.exit));
  const cursorPress =
    ramp(f, clickFrame - 2, 3, EASE.out) *
    (1 - ramp(f, clickFrame + 1, 5, EASE.out));
  const rippleT = ramp(f, clickFrame, 6, EASE.out);
  const rippleOpacity = interpolate(
    f,
    [clickFrame, clickFrame + 2, switchFrame - 1],
    [0, 0.7, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const sealBarT = ramp(f, switchFrame, 16, EASE.swift);
  const auditIn = ramp(f, switchFrame, 18, EASE.snappy);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: promoColor.stageBg,
        overflow: "hidden",
      }}
    >
      <AbsoluteFill
        style={{
          transform: `translateX(${lerp(20, 0, bgDrift)}px) scale(1.03)`,
          opacity: 0.16,
        }}
      >
        <Img
          src={staticFile(
            "episodes/clinmesh-promo/captures/C01-outpatient-emr-card.png",
          )}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      </AbsoluteFill>

      <AbsoluteFill
        style={{
          background:
            "radial-gradient(1260px 800px at 50% 48%, rgba(21, 21, 23, 0.68), rgba(18, 18, 16, 0.97) 82%)",
        }}
      />

      <div
        style={{
          position: "absolute",
          left: 88,
          right: 88,
          top: 78,
          opacity: cardIn,
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
            whiteSpace: "nowrap",
          }}
        >
          医生终审 · 拍板留痕
        </div>
        <StatusBadge tone={signed ? "success" : "neutral"}>
          {signed
            ? "✓ 已签署生效 · 审计已留痕"
            : "草稿待核对 · 智能体无直接签发权"}
        </StatusBadge>
      </div>

      <div
        style={{
          position: "absolute",
          left: 88,
          right: 88,
          top: 180,
          opacity: cardIn,
          transform: `translateY(${(1 - cardIn) * 16}px)`,
          backgroundColor: promoColor.cardBg,
          borderRadius: promoRadius.card,
          border: signed
            ? "1.5px solid rgba(125, 219, 164, 0.48)"
            : `1.5px solid ${promoColor.borderStrong}`,
          boxShadow: promoColor.cardShadow,
          padding: "26px 34px",
          display: "flex",
          flexDirection: "column",
          gap: 20,
          overflow: "hidden",
        }}
      >
        {signed ? (
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: 0,
              height: 4,
              backgroundColor: promoColor.success,
              transform: `scaleX(${sealBarT})`,
              transformOrigin: "0% 50%",
            }}
          />
        ) : null}

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingBottom: 16,
            borderBottom: `1px solid ${promoColor.border}`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <StatusBadge tone={signed ? "success" : "neutral"}>
              {signed ? "正式医疗记录" : "医师终审工作台"}
            </StatusBadge>
            <span
              style={{
                fontFamily: promoFont.sans,
                fontSize: 32,
                fontWeight: 700,
                color: promoColor.fg,
                whiteSpace: "nowrap",
              }}
            >
              患者A · 女 · 56 岁 · 心内科初诊
            </span>
          </div>
          <span
            style={{
              fontFamily: promoFont.sans,
              fontSize: 27,
              fontWeight: 600,
              color: signed ? promoColor.success : promoColor.fgMuted,
              whiteSpace: "nowrap",
            }}
          >
            {signed
              ? "状态：文书与医嘱已正式生效锁定"
              : "状态：草稿待审 · 须执业医师本人确认"}
          </span>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 26,
            alignItems: "stretch",
          }}
        >
          <div
            style={{
              backgroundColor: promoColor.cardInset,
              borderRadius: promoRadius.card,
              border: signed
                ? "1px solid rgba(125, 219, 164, 0.34)"
                : `1px solid ${promoColor.border}`,
              padding: "20px 26px",
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                paddingBottom: 12,
                borderBottom: `1px solid ${promoColor.border}`,
              }}
            >
              <span
                style={{
                  fontFamily: promoFont.sans,
                  fontSize: 31,
                  fontWeight: 700,
                  color: promoColor.fg,
                }}
              >
                {signed ? "门诊病历文书" : "待签病历文书"}
              </span>
              <span
                style={{
                  fontFamily: promoFont.sans,
                  fontSize: 25,
                  fontWeight: 600,
                  color: signed
                    ? promoColor.success
                    : docCheckIn > 0.5
                      ? promoColor.fg
                      : promoColor.fgDim,
                  opacity: signed ? 1 : 0.45 + 0.55 * docCheckIn,
                }}
              >
                {signed
                  ? "✓ 正式病历已归档"
                  : docCheckIn > 0.5
                    ? "✓ 医师已核对"
                    : "核对中"}
              </span>
            </div>

            {EMR_REVIEW_ITEMS.map((item, idx) => {
              const rowCheck = ramp(f, 16 + idx * 10, 16, EASE.snappy);
              return (
                <div
                  key={item.label}
                  style={{
                    opacity: signed ? 1 : 0.38 + 0.62 * rowCheck,
                    transform:
                      signed || rowCheck > 0.999
                        ? undefined
                        : `translateX(${((1 - rowCheck) * -8).toFixed(2)}px)`,
                    padding: "13px 18px",
                    borderRadius: promoRadius.control,
                    backgroundColor: "rgba(35, 35, 36, 0.72)",
                    border:
                      item.highlight && !signed
                        ? `1px solid rgba(244, 202, 123, ${(0.14 + 0.24 * rowCheck).toFixed(3)})`
                        : `1px solid ${promoColor.border}`,
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                  }}
                >
                  <span
                    style={{
                      fontFamily: promoFont.sans,
                      fontSize: 24,
                      fontWeight: 600,
                      color: signed
                        ? promoColor.fgMuted
                        : item.highlight
                          ? promoColor.warning
                          : promoColor.fgDim,
                    }}
                  >
                    {item.label}
                  </span>
                  <span
                    style={{
                      fontFamily: promoFont.sans,
                      fontSize: 28,
                      fontWeight: 600,
                      color: promoColor.fg,
                      lineHeight: 1.32,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {item.value}
                  </span>
                </div>
              );
            })}
          </div>

          <div
            style={{
              backgroundColor: promoColor.cardInset,
              borderRadius: promoRadius.card,
              border: signed
                ? "1px solid rgba(125, 219, 164, 0.34)"
                : `1px solid ${promoColor.border}`,
              padding: "20px 26px",
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                paddingBottom: 12,
                borderBottom: `1px solid ${promoColor.border}`,
              }}
            >
              <span
                style={{
                  fontFamily: promoFont.sans,
                  fontSize: 31,
                  fontWeight: 700,
                  color: promoColor.fg,
                }}
              >
                {signed ? "正式处方与医嘱" : "待签正式医嘱"}
              </span>
              <span
                style={{
                  fontFamily: promoFont.sans,
                  fontSize: 25,
                  fontWeight: 600,
                  color: signed
                    ? promoColor.success
                    : orderCheckIn > 0.5
                      ? promoColor.fg
                      : promoColor.fgDim,
                  opacity: signed ? 1 : 0.45 + 0.55 * orderCheckIn,
                }}
              >
                {signed
                  ? "✓ 正式医嘱已下达"
                  : orderCheckIn > 0.5
                    ? "✓ 医师已核对"
                    : "核对中"}
              </span>
            </div>

            {ORDER_REVIEW_ITEMS.map((item, idx) => {
              const rowCheck = ramp(f, 56 + idx * 10, 16, EASE.snappy);
              return (
                <div
                  key={item.label}
                  style={{
                    opacity: signed ? 1 : 0.38 + 0.62 * rowCheck,
                    transform:
                      signed || rowCheck > 0.999
                        ? undefined
                        : `translateX(${((1 - rowCheck) * -8).toFixed(2)}px)`,
                    padding: "13px 18px",
                    borderRadius: promoRadius.control,
                    backgroundColor: "rgba(35, 35, 36, 0.72)",
                    border: `1px solid ${promoColor.border}`,
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
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
                        fontSize: 24,
                        fontWeight: 600,
                        color: promoColor.fgDim,
                      }}
                    >
                      {item.label}
                    </span>
                    <span
                      style={{
                        fontFamily: promoFont.sans,
                        fontSize: 22,
                        color: promoColor.fgMuted,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item.sub}
                    </span>
                  </div>
                  <span
                    style={{
                      fontFamily: promoFont.sans,
                      fontSize: 28,
                      fontWeight: 600,
                      color: promoColor.fg,
                      lineHeight: 1.32,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {item.value}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {!signed ? (
          <div
            style={{
              backgroundColor: "#191B20",
              borderRadius: promoRadius.card,
              border: `1px solid ${promoColor.borderStrong}`,
              padding: "18px 28px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 24,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span
                style={{
                  fontFamily: promoFont.sans,
                  fontSize: 29,
                  fontWeight: 700,
                  color: promoColor.fg,
                }}
              >
                请执业医师人工核对病历与医嘱后拍板签署
              </span>
              <span
                style={{
                  fontFamily: promoFont.sans,
                  fontSize: 24,
                  color: promoColor.fgMuted,
                }}
              >
                智能体仅辅助生成草稿，严禁自动签发；签署后成为正式医疗记录并全程留痕
              </span>
            </div>

            <div
              style={{
                flexShrink: 0,
                transform: `scale(${1 - 0.04 * cursorPress})`,
                padding: "16px 36px",
                borderRadius: promoRadius.control,
                backgroundColor: "#F9FAFB",
                color: "#151517",
                fontFamily: promoFont.sans,
                fontSize: 30,
                fontWeight: 700,
                whiteSpace: "nowrap",
              }}
            >
              ✓ 核对无误 · 确认签署
            </div>
          </div>
        ) : (
          <div
            style={{
              opacity: 0.3 + 0.7 * auditIn,
              transform: `translateY(${(1 - auditIn) * 8}px)`,
              backgroundColor: "rgba(125, 219, 164, 0.11)",
              borderRadius: promoRadius.card,
              border: "1.5px solid rgba(125, 219, 164, 0.46)",
              padding: "18px 28px",
              display: "grid",
              gridTemplateColumns: "1.06fr 0.96fr 1.18fr",
              gap: 24,
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span
                style={{
                  fontFamily: promoFont.sans,
                  fontSize: 24,
                  fontWeight: 600,
                  color: promoColor.success,
                }}
              >
                签署生效状态
              </span>
              <span
                style={{
                  fontFamily: promoFont.sans,
                  fontSize: 29,
                  fontWeight: 700,
                  color: promoColor.fg,
                  whiteSpace: "nowrap",
                }}
              >
                ✓ 正式病历与医嘱已生效
              </span>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                paddingLeft: 24,
                borderLeft: "1px solid rgba(125, 219, 164, 0.28)",
              }}
            >
              <span
                style={{
                  fontFamily: promoFont.sans,
                  fontSize: 24,
                  fontWeight: 600,
                  color: promoColor.success,
                }}
              >
                终审拍板责任人
              </span>
              <span
                style={{
                  fontFamily: promoFont.sans,
                  fontSize: 29,
                  fontWeight: 700,
                  color: promoColor.fg,
                  whiteSpace: "nowrap",
                }}
              >
                心内科主治医师 · 本人签署
              </span>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                paddingLeft: 24,
                borderLeft: "1px solid rgba(125, 219, 164, 0.28)",
              }}
            >
              <span
                style={{
                  fontFamily: promoFont.sans,
                  fontSize: 24,
                  fontWeight: 600,
                  color: promoColor.success,
                }}
              >
                法定医疗审计留痕
              </span>
              <span
                style={{
                  fontFamily: promoFont.sans,
                  fontSize: 28,
                  fontWeight: 700,
                  color: promoColor.fg,
                  whiteSpace: "nowrap",
                }}
              >
                修订差异与时间戳不可篡改留存
              </span>
            </div>
          </div>
        )}

        {!signed && cursorOpacity > 0.01 ? (
          <div
            style={{
              position: "absolute",
              left: lerp(1210, 1506, cursorMove),
              top: lerp(460, 624, cursorMove),
              opacity: cursorOpacity,
              pointerEvents: "none",
            }}
          >
            {rippleOpacity > 0.01 ? (
              <div
                style={{
                  position: "absolute",
                  left: -34,
                  top: -34,
                  width: 68,
                  height: 68,
                  borderRadius: "50%",
                  border: "2.5px solid rgba(249, 250, 251, 0.88)",
                  transform: `scale(${0.45 + 1.15 * rippleT})`,
                  opacity: rippleOpacity,
                }}
              />
            ) : null}
            <svg
              width={40}
              height={40}
              viewBox="0 0 24 24"
              style={{
                transform: `scale(${1 - 0.1 * cursorPress})`,
                filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.68))",
              }}
            >
              <path
                d="M4 2 L4 19 L9 14.5 L12.5 21 L15.5 19.5 L12 13 L19 13 Z"
                fill="#FFFFFF"
                stroke="#151517"
                strokeWidth={1.5}
              />
            </svg>
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};

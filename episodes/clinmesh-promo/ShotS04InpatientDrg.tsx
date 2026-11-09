/**
 * Scene S04 (L008): Inpatient coronary PCI stent reservation and DRG FM59->FM39
 * payment headroom calculation with tabular DigitRoll, locking into a crisp
 * shutter freeze-annotate frame at L008+112 with three-role verification banner.
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
import { promoFont } from "./fonts";
import { EASE, lerp, ramp } from "./motion-utils";
import { DigitRoll, StatusBadge } from "./primitives";
import { promoColor, promoRadius } from "./tokens";

export const ShotS04InpatientDrg: React.FC<{ timeline: Timeline }> = ({
  timeline,
}) => {
  const f = useCurrentFrame();
  const l008 = sentence(timeline, "L008");
  void l008;

  const freezeFrame = 112;
  const preGlide = ramp(f, 0, freezeFrame, EASE.snappy);
  const cardIn = ramp(f, 0, 22, EASE.snappy);
  const groupShift = ramp(f, 28, 22, EASE.snappy);

  const shutterFlash = interpolate(
    f,
    [freezeFrame - 1, freezeFrame + 1, freezeFrame + 8],
    [0, 0.22, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const bracketPop = ramp(f, freezeFrame, 12, EASE.pop);
  const circleDraw = ramp(f, freezeFrame + 4, 18, EASE.snappy);
  const threeRoleIn = ramp(f, freezeFrame + 8, 16, EASE.snappy);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: promoColor.stageBg,
        overflow: "hidden",
      }}
    >
      <AbsoluteFill
        style={{
          transform: `translateX(${lerp(28, 0, preGlide)}px) scale(1.03)`,
          opacity: 0.22,
        }}
      >
        <Img
          src={staticFile(
            "episodes/clinmesh-promo/captures/C03-pci-drg-workspace.png",
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
            "radial-gradient(1240px 800px at 50% 48%, rgba(21,21,23,0.62), rgba(18,18,16,0.96) 82%)",
        }}
      />

      <div
        style={{
          position: "absolute",
          left: 92,
          right: 92,
          top: 94,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          opacity: cardIn,
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
          住院冠脉介入 · 耗材预留与 DRG 病组精算
        </div>
        <StatusBadge tone="info">患者B · 介入术后联动</StatusBadge>
      </div>

      <div
        style={{
          position: "absolute",
          left: 92,
          right: 92,
          top: 224,
          opacity: cardIn,
          transform: `translateX(${lerp(-24, 0, preGlide)}px)`,
          display: "flex",
          flexDirection: "column",
          gap: 26,
        }}
      >
        <div
          style={{
            backgroundColor: promoColor.cardBg,
            borderRadius: promoRadius.card,
            border: `1px solid ${promoColor.borderStrong}`,
            padding: "24px 36px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            boxShadow: promoColor.cardShadow,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
            <StatusBadge tone="info">高值耗材预留</StatusBadge>
            <span
              style={{
                fontFamily: promoFont.sans,
                fontSize: 40,
                fontWeight: 700,
                color: promoColor.fg,
              }}
            >
              药物洗脱冠脉支架 × 1
            </span>
            <span
              style={{
                fontFamily: promoFont.mono,
                fontSize: 30,
                color: promoColor.fgMuted,
              }}
            >
              经皮冠状动脉支架置入术（PCI）
            </span>
          </div>
          <StatusBadge tone="success">✓ 主操作与导管室台账已同步</StatusBadge>
        </div>

        <div
          style={{
            position: "relative",
            backgroundColor: promoColor.cardBg,
            borderRadius: promoRadius.card,
            border: `1.5px solid ${promoColor.borderStrong}`,
            padding: "38px 44px",
            boxShadow: promoColor.cardShadow,
            display: "grid",
            gridTemplateColumns: "1.05fr 1fr 1fr",
            gap: 36,
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <span
              style={{
                fontFamily: promoFont.sans,
                fontSize: 30,
                fontWeight: 600,
                color: promoColor.fgMuted,
              }}
            >
              DRG 病组实时重算
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
              <span
                style={{
                  fontFamily: promoFont.mono,
                  fontSize: 48,
                  fontWeight: 600,
                  color: promoColor.fgDim,
                  textDecoration: groupShift > 0.5 ? "line-through" : "none",
                }}
              >
                FM59
              </span>
              <span
                style={{
                  fontFamily: promoFont.mono,
                  fontSize: 44,
                  color: promoColor.stageAccent,
                }}
              >
                →
              </span>
              <span
                style={{
                  fontFamily: promoFont.mono,
                  fontSize: 78,
                  fontWeight: 700,
                  color: promoColor.info,
                  opacity: 0.25 + 0.75 * groupShift,
                  transform: `scale(${0.9 + 0.1 * groupShift})`,
                }}
              >
                FM39
              </span>
            </div>
            <span
              style={{
                fontFamily: promoFont.sans,
                fontSize: 28,
                color: promoColor.fgMuted,
              }}
            >
              经皮心血管介入治疗病组
            </span>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
              paddingLeft: 28,
              borderLeft: `1px solid ${promoColor.border}`,
            }}
          >
            <span
              style={{
                fontFamily: promoFont.sans,
                fontSize: 30,
                fontWeight: 600,
                color: promoColor.fgMuted,
              }}
            >
              预计医院支付参考
            </span>
            <DigitRoll
              value="¥12,000"
              delay={20}
              fontSize={64}
              color={promoColor.fg}
            />
            <span
              style={{
                fontFamily: promoFont.sans,
                fontSize: 28,
                color: promoColor.fgDim,
              }}
            >
              做完计划手术后 · 预计费用 ¥3,943
            </span>
          </div>

          <div
            style={{
              position: "relative",
              display: "flex",
              flexDirection: "column",
              gap: 12,
              paddingLeft: 28,
              borderLeft: `1px solid ${promoColor.border}`,
            }}
          >
            <span
              style={{
                fontFamily: promoFont.sans,
                fontSize: 30,
                fontWeight: 600,
                color: promoColor.fgMuted,
              }}
            >
              预计剩余支付空间
            </span>
            <DigitRoll
              value="¥8,057"
              delay={30}
              fontSize={68}
              color={promoColor.success}
            />
            <span
              style={{
                fontFamily: promoFont.sans,
                fontSize: 28,
                color: promoColor.success,
              }}
            >
              含手术费 ¥1,800 + 预留耗材 ¥1,266
            </span>

            {circleDraw > 0.01 ? (
              <svg
                width={470}
                height={190}
                viewBox="0 0 470 190"
                style={{
                  position: "absolute",
                  left: -8,
                  top: -12,
                  pointerEvents: "none",
                }}
              >
                <path
                  d="M 38 96 C 34 32, 132 14, 248 16 C 378 18, 452 42, 448 98 C 444 154, 356 176, 228 174 C 104 172, 36 146, 48 86"
                  fill="none"
                  stroke={promoColor.stageAccent}
                  strokeWidth={4.5}
                  strokeLinecap="round"
                  pathLength={1}
                  strokeDasharray={1}
                  strokeDashoffset={1 - circleDraw}
                />
              </svg>
            ) : null}
          </div>

          {bracketPop > 0.01 ? (
            <div
              style={{
                position: "absolute",
                inset: -14,
                pointerEvents: "none",
                opacity: Math.min(1, bracketPop),
                transform: `scale(${1.04 - 0.04 * bracketPop})`,
              }}
            >
              {[
                { top: 0, left: 0, bw: "4px 0 0 4px" },
                { top: 0, right: 0, bw: "4px 4px 0 0" },
                { bottom: 0, left: 0, bw: "0 0 4px 4px" },
                { bottom: 0, right: 0, bw: "0 4px 4px 0" },
              ].map((pos, idx) => (
                <div
                  key={idx}
                  style={{
                    position: "absolute",
                    top: pos.top,
                    bottom: pos.bottom,
                    left: pos.left,
                    right: pos.right,
                    width: 34,
                    height: 34,
                    borderColor: promoColor.stageAccent,
                    borderStyle: "solid",
                    borderWidth: pos.bw,
                  }}
                />
              ))}
            </div>
          ) : null}
        </div>

        <div
          style={{
            opacity: threeRoleIn,
            transform: `translateY(${(1 - threeRoleIn) * 16}px)`,
            backgroundColor: "rgba(125, 219, 164, 0.12)",
            border: "1.5px solid rgba(125, 219, 164, 0.45)",
            borderRadius: promoRadius.card,
            padding: "22px 36px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span
            style={{
              fontFamily: promoFont.sans,
              fontSize: 38,
              fontWeight: 700,
              color: promoColor.success,
            }}
          >
            ✓ 临床 · 收费 · 病案三岗核对一致
          </span>
          <span
            style={{
              fontFamily: promoFont.sans,
              fontSize: 30,
              fontWeight: 600,
              color: promoColor.fg,
            }}
          >
            手术计划 · 实际耗材 · 病案首页主操作同源校验通过
          </span>
        </div>
      </div>

      {shutterFlash > 0.005 ? (
        <AbsoluteFill
          style={{
            backgroundColor: "#FFFFFF",
            opacity: shutterFlash,
            pointerEvents: "none",
          }}
        />
      ) : null}
    </AbsoluteFill>
  );
};

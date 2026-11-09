/**
 * Scene S05 (L009): Dual-focus clinical provenance and deterministic quality
 * control via a single PageCam: left structured EMR & order candidates anchored
 * 1-to-1 to verbatim consultation quotes and guidelines, panning right across a
 * quality-control bridge into real-time allergy redline & contradiction checks.
 */
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { sentence } from "../../src/kit/sentence-timing";
import type { Timeline } from "../../tools/timeline-types";
import { promoFont } from "./fonts";
import { EASE, ramp } from "./motion-utils";
import {
  PageCam,
  ProvenancePill,
  StatusBadge,
  type BadgeTone,
  type CamKey,
} from "./primitives";
import { breatherStartFrame } from "./sfx-schedule";
import { BREATHER_DURATION_F, promoColor, promoRadius } from "./tokens";

const PROVENANCE_ROWS: ReadonlyArray<{
  fieldLabel: string;
  anchorTag: string;
  tone: BadgeTone;
  draftText: string;
  sourceMeta: string;
  sourceQuote: string;
  accent: string;
  delay: number;
}> = [
  {
    fieldLabel: "现病史成文",
    anchorTag: "问诊原话 #02",
    tone: "info",
    draftText: "晨起头晕胸闷两周，未规律服降压药，休息后减轻",
    sourceMeta: "问诊逐句转写 · 第 02 轮 09:14",
    sourceQuote: "“这两周早上起来老头晕胸闷，降压药常忘吃。”",
    accent: promoColor.info,
    delay: 8,
  },
  {
    fieldLabel: "风险补充摘录",
    anchorTag: "问诊原话 #04",
    tone: "warn",
    draftText: "自述既往注射青霉素后全身红疹史（待医师核实）",
    sourceMeta: "问诊逐句转写 · 第 04 轮 09:15",
    sourceQuote: "“对了大夫，我以前打青霉素起过一身红疹子。”",
    accent: promoColor.warning,
    delay: 34,
  },
  {
    fieldLabel: "循证处方候选",
    anchorTag: "高血压指南 §4.2",
    tone: "success",
    draftText: "苯磺酸氨氯地平片 5mg qd 口服（2 级初始规范剂量）",
    sourceMeta: "中国高血压防治指南 · §4.2 推荐条目",
    sourceQuote: "2 级高血压初始单药推荐钙通道阻滞剂 5mg qd。",
    accent: promoColor.success,
    delay: 60,
  },
];

const QC_CHECKS: ReadonlyArray<{
  badge: string;
  tone: BadgeTone;
  rightNote: string;
  headline: string;
  detail: string;
  borderActive: string;
  bgActive: string;
  noteColor: string;
  delay: number;
}> = [
  {
    badge: "✕ 过敏用药红线已阻断",
    tone: "danger",
    rightNote: "自动熔断 · 禁入待签医嘱",
    headline: "候选「阿莫西林胶囊 0.5g tid」命中青霉素类过敏禁忌",
    detail: "联动问诊原话 #04「青霉素红疹史」实时阻断，杜绝过敏处方流出",
    borderActive: "rgba(255, 155, 155, 0.54)",
    bgActive: "rgba(255, 155, 155, 0.09)",
    noteColor: promoColor.destructive,
    delay: 148,
  },
  {
    badge: "⚠ 前后病史陈述矛盾",
    tone: "warn",
    rightNote: "已定位冲突原话待核实",
    headline: "分诊初记「否认药物过敏」 ↔ 问诊第 4 轮自述「青霉素红疹」",
    detail: "四维病历质控自动高亮跨环节矛盾，签署前强制提示医生核实归档",
    borderActive: "rgba(244, 202, 123, 0.48)",
    bgActive: "rgba(244, 202, 123, 0.08)",
    noteColor: promoColor.warning,
    delay: 164,
  },
  {
    badge: "✓ 指南适应证与剂量通过",
    tone: "success",
    rightNote: "已进入医生待审清单",
    headline: "苯磺酸氨氯地平片 5mg qd · 符合高血压 2 级适应证与日剂量上限",
    detail: "院内药品目录与适应证规则核验无误，移交下一步医生人工拍板",
    borderActive: "rgba(125, 219, 164, 0.42)",
    bgActive: "rgba(24, 26, 32, 0.94)",
    noteColor: promoColor.success,
    delay: 180,
  },
];

export const ShotS05ExplicitAssistant: React.FC<{ timeline: Timeline }> = ({
  timeline,
}) => {
  const f = useCurrentFrame();
  const shotStart = breatherStartFrame(timeline, "L008") + BREATHER_DURATION_F;
  const l009 = sentence(timeline, "L009");
  const l009Local = l009.startFrame - shotStart;

  const leftCardIn = ramp(f, 0, 20, EASE.snappy);
  const anchorGlow = ramp(f, l009Local + 24, 24, EASE.out);
  const bridgePulse = ramp(f, l009Local + 128, 24, EASE.snappy);
  const rightHeaderBadgeIn = ramp(f, l009Local + 158, 18, EASE.snappy);

  const camKeys: CamKey[] = [
    { frame: 0, cx: 960, cy: 540, zoom: 1.0 },
    { frame: l009Local + 136, cx: 976, cy: 540, zoom: 1.018 },
    { frame: l009Local + 166, cx: 2880, cy: 540, zoom: 1.015 },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: promoColor.stageBg }}>
      <PageCam keys={camKeys} pageW={3840} pageH={1080}>
        <div
          style={{
            position: "relative",
            width: 3840,
            height: 1080,
            backgroundColor: promoColor.stageBg,
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage:
                "radial-gradient(1040px 660px at 25% 50%, rgba(141,187,255,0.12), transparent 72%), radial-gradient(1040px 660px at 75% 50%, rgba(255,155,155,0.09), transparent 72%)",
            }}
          />

          <div
            style={{
              position: "absolute",
              left: 140,
              top: 84,
              width: 1640,
              opacity: leftCardIn,
              transform: `translateY(${(1 - leftCardIn) * 18}px)`,
              display: "flex",
              flexDirection: "column",
              gap: 22,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
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
                逐句原话与指南依据强绑定
              </div>
              <ProvenancePill label="·逐句溯源已锁定" opacity={anchorGlow} />
            </div>

            <div
              style={{
                position: "relative",
                borderRadius: promoRadius.card,
                backgroundColor: promoColor.cardBg,
                border:
                  anchorGlow > 0.05
                    ? "1.5px solid rgba(141, 187, 255, 0.52)"
                    : `1px solid ${promoColor.borderStrong}`,
                boxShadow:
                  anchorGlow > 0.05
                    ? `${promoColor.clinmeshGlowShadow}, ${promoColor.cardShadow}`
                    : promoColor.cardShadow,
                padding: "26px 34px",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                gap: 18,
              }}
            >
              <div
                style={{
                  position: "relative",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingBottom: 16,
                  borderBottom: `1px solid ${promoColor.border}`,
                }}
              >
                <span
                  style={{
                    fontFamily: promoFont.sans,
                    fontSize: 33,
                    fontWeight: 700,
                    color: promoColor.fg,
                  }}
                >
                  病历成文与医嘱候选 · 患者A
                </span>
                <StatusBadge tone="info">
                  拒绝无据生成 · 每句均可回溯原文
                </StatusBadge>
              </div>

              {PROVENANCE_ROWS.map((row) => {
                const rowT = ramp(f, l009Local + row.delay, 20, EASE.snappy);
                const quoteT = ramp(
                  f,
                  l009Local + row.delay + 8,
                  20,
                  EASE.snappy,
                );
                return (
                  <div
                    key={row.fieldLabel}
                    style={{
                      position: "relative",
                      display: "grid",
                      gridTemplateColumns: "1.03fr 48px 0.97fr",
                      alignItems: "stretch",
                      gap: 14,
                      opacity: 0.25 + 0.75 * rowT,
                      transform: `translateY(${(1 - rowT) * 14}px)`,
                    }}
                  >
                    <div
                      style={{
                        borderRadius: promoRadius.card,
                        backgroundColor: "rgba(24, 26, 32, 0.95)",
                        border:
                          rowT > 0.25
                            ? `1.5px solid ${row.accent}`
                            : `1px solid ${promoColor.border}`,
                        padding: "20px 24px",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        gap: 12,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: 12,
                        }}
                      >
                        <span
                          style={{
                            fontFamily: promoFont.sans,
                            fontSize: 28,
                            fontWeight: 700,
                            color: row.accent,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {row.fieldLabel}
                        </span>
                        <StatusBadge
                          tone={row.tone}
                          style={{ padding: "5px 14px", fontSize: 24 }}
                        >
                          {row.anchorTag}
                        </StatusBadge>
                      </div>
                      <div
                        style={{
                          fontFamily: promoFont.sans,
                          fontSize: 29,
                          fontWeight: 600,
                          color: promoColor.fg,
                          lineHeight: 1.36,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {row.draftText}
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <div
                        style={{
                          width: "100%",
                          height: 2.5,
                          borderRadius: 2,
                          backgroundColor: row.accent,
                          opacity: 0.35 + 0.65 * quoteT,
                          boxShadow: `0 0 12px ${row.accent}`,
                        }}
                      />
                    </div>

                    <div
                      style={{
                        borderRadius: promoRadius.card,
                        backgroundColor: promoColor.cardInset,
                        border: `1px solid ${promoColor.borderStrong}`,
                        borderLeft: `4px solid ${row.accent}`,
                        padding: "20px 24px",
                        opacity: 0.3 + 0.7 * quoteT,
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        gap: 12,
                      }}
                    >
                      <span
                        style={{
                          fontFamily: promoFont.mono,
                          fontSize: 23,
                          fontWeight: 600,
                          color: promoColor.fgDim,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {row.sourceMeta}
                      </span>
                      <div
                        style={{
                          fontFamily: promoFont.sans,
                          fontSize: 28,
                          fontWeight: 500,
                          color: promoColor.fgMuted,
                          lineHeight: 1.36,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {row.sourceQuote}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div
            style={{
              position: "absolute",
              left: 1824,
              top: 492,
              width: 192,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 10,
              opacity: 0.35 + 0.65 * bridgePulse,
            }}
          >
            <span
              style={{
                fontFamily: promoFont.sans,
                fontSize: 24,
                fontWeight: 700,
                color: promoColor.stageAccent,
                letterSpacing: "0.04em",
                whiteSpace: "nowrap",
              }}
            >
              实时质控校验 →
            </span>
            <div
              style={{
                width: "100%",
                height: 3,
                borderRadius: 2,
                background: `linear-gradient(90deg, ${promoColor.info} 0%, ${promoColor.stageAccent} 50%, ${promoColor.destructive} 100%)`,
                boxShadow: "0 0 16px rgba(124, 134, 255, 0.5)",
              }}
            />
          </div>

          <div
            style={{
              position: "absolute",
              left: 2060,
              top: 84,
              width: 1640,
              display: "flex",
              flexDirection: "column",
              gap: 22,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
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
                矛盾与过敏用药风险实时拦截
              </div>
              <div
                style={{
                  opacity: 0.25 + 0.75 * rightHeaderBadgeIn,
                  transform: `scale(${0.95 + 0.05 * rightHeaderBadgeIn})`,
                }}
              >
                <StatusBadge tone="danger">
                  已阻断 1 项过敏禁忌 · 标记 1 项病史矛盾
                </StatusBadge>
              </div>
            </div>

            <div
              style={{
                position: "relative",
                borderRadius: promoRadius.card,
                backgroundColor: promoColor.cardBg,
                border: `1.5px solid ${promoColor.borderStrong}`,
                boxShadow: promoColor.cardShadow,
                padding: "26px 34px",
                display: "flex",
                flexDirection: "column",
                gap: 16,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingBottom: 16,
                  borderBottom: `1px solid ${promoColor.border}`,
                }}
              >
                <span
                  style={{
                    fontFamily: promoFont.sans,
                    fontSize: 33,
                    fontWeight: 700,
                    color: promoColor.fg,
                  }}
                >
                  四维病历质控与处方安全规则引擎
                </span>
                <span
                  style={{
                    fontFamily: promoFont.sans,
                    fontSize: 27,
                    fontWeight: 600,
                    color: promoColor.fgMuted,
                    whiteSpace: "nowrap",
                  }}
                >
                  草稿态确定性校验 · 风险项严禁入签
                </span>
              </div>

              {QC_CHECKS.map((item) => {
                const rowT = ramp(f, l009Local + item.delay, 18, EASE.snappy);
                return (
                  <div
                    key={item.badge}
                    style={{
                      opacity: 0.26 + 0.74 * rowT,
                      transform: `translateY(${(1 - rowT) * 14}px)`,
                      borderRadius: promoRadius.card,
                      backgroundColor:
                        rowT > 0.2 ? item.bgActive : promoColor.cardInset,
                      border:
                        rowT > 0.2
                          ? `1.5px solid ${item.borderActive}`
                          : `1px solid ${promoColor.border}`,
                      padding: "19px 26px",
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 16,
                      }}
                    >
                      <StatusBadge tone={item.tone}>{item.badge}</StatusBadge>
                      <span
                        style={{
                          fontFamily: promoFont.sans,
                          fontSize: 27,
                          fontWeight: 700,
                          color: item.noteColor,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {item.rightNote}
                      </span>
                    </div>
                    <div
                      style={{
                        fontFamily: promoFont.sans,
                        fontSize: 33,
                        fontWeight: 700,
                        color: promoColor.fg,
                        lineHeight: 1.32,
                      }}
                    >
                      {item.headline}
                    </div>
                    <div
                      style={{
                        fontFamily: promoFont.sans,
                        fontSize: 27,
                        fontWeight: 500,
                        color: promoColor.fgMuted,
                        lineHeight: 1.34,
                      }}
                    >
                      {item.detail}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </PageCam>
    </AbsoluteFill>
  );
};

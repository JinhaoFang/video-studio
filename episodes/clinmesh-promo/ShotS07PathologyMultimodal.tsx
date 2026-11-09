/**
 * S07：以数字病理图像、扫描线和两处 ROI 展示自研识别模型，再拉远到专病插槽。
 * 病理图像使用 TCGA-BRCA CC BY 3.0 素材；保留原有 2×2 专病布局。
 * 局部动画沿用句尾 +3 帧的定位，与主时间线 B03 的 +12 帧分别计算。
 */
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { sentence } from "../../src/kit/sentence-timing";
import type { Timeline } from "../../tools/timeline-types";
import { promoFont } from "./fonts";
import { EASE, clamp01, ramp } from "./motion-utils";
import { PageCam, StatusBadge, type CamKey } from "./primitives";
import { BREATHER_DURATION_F, promoColor, promoRadius } from "./tokens";

const reticleScaleAt = (f: number, lockFrame: number): number =>
  interpolate(
    f,
    [lockFrame - 6, lockFrame + 1, lockFrame + 6, lockFrame + 12],
    [2.2, 0.94, 1.02, 1.0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

const SPECIALTY_SLOTS = [
  {
    code: "SLOT 02",
    title: "胸痛冠脉介入智能体",
    badge: "已接入住院主线",
    tone: "success" as const,
    codeColor: promoColor.success,
    cardBorder: "rgba(125, 219, 164, 0.40)",
    hudBorder: "rgba(125, 219, 164, 0.58)",
    hudColor: promoColor.success,
    hudTag: "PCI-AGENT · 高值支架预留 · FM59 → FM39 精算",
    img: "episodes/clinmesh-promo/images/slot-chest-pain.jpg",
    points: ["导管室高值耗材预留与核销同源", "病组跃迁与支付结余实时测算"],
  },
  {
    code: "SLOT 03",
    title: "肝病专病诊疗智能体",
    badge: "多病种智能体就绪",
    tone: "info" as const,
    codeColor: promoColor.info,
    cardBorder: "rgba(141, 187, 255, 0.34)",
    hudBorder: "rgba(141, 187, 255, 0.56)",
    hudColor: promoColor.info,
    hudTag: "HEPA-AGENT · 肝功·病毒学·纤维化纵向分期",
    img: "episodes/clinmesh-promo/images/slot-liver-disease.jpg",
    points: ["病毒学与纤维化指标动态追踪", "抗病毒随访与高危筛查联动"],
  },
  {
    code: "SLOT 04",
    title: "肿瘤多学科会诊 (MDT) 智能体",
    badge: "多病种智能体就绪",
    tone: "info" as const,
    codeColor: promoColor.info,
    cardBorder: "rgba(124, 134, 255, 0.38)",
    hudBorder: "rgba(124, 134, 255, 0.62)",
    hudColor: "#B7BEFF",
    hudTag: "MDT-AGENT · 病理·影像·分子跨科证据收敛",
    img: "episodes/clinmesh-promo/images/slot-oncology-mdt.jpg",
    points: ["病理、分期与分子检测纵向拼图", "跨科会诊草稿汇总与指南核验"],
  },
] as const;

export const ShotS07PathologyMultimodal: React.FC<{
  timeline: Timeline;
  tailCamKeys?: readonly CamKey[];
}> = ({ timeline, tailCamKeys }) => {
  const f = useCurrentFrame();
  const shotStart = sentence(timeline, "L010").endFrame + 3 + BREATHER_DURATION_F;
  const l011 = sentence(timeline, "L011");
  const l012 = sentence(timeline, "L012");
  const l011Local = l011.startFrame - shotStart;
  const l012Local = l012.startFrame - shotStart;

  const scanStart = l011Local + 16;
  const scanDur = 112;
  const scanProgress = ramp(f, scanStart, scanDur, Easing.linear);
  const scanActive = f >= scanStart && f <= scanStart + scanDur;

  const roi1Lock = l011Local + 66;
  const roi2Lock = l011Local + 104;
  const roi1Visible = ramp(f, roi1Lock - 6, 8, EASE.out);
  const roi2Visible = ramp(f, roi2Lock - 6, 8, EASE.out);
  const roi1Scale = reticleScaleAt(f, roi1Lock);
  const roi2Scale = reticleScaleAt(f, roi2Lock);
  const roi1LabelIn = ramp(f, roi1Lock + 5, 14, EASE.snappy);
  const roi2LabelIn = ramp(f, roi2Lock + 5, 14, EASE.snappy);

  const pullbackStart = l012Local - 24;
  const pullbackT = ramp(f, pullbackStart, 78, EASE.snappy);

  const camKeys: CamKey[] = [
    { frame: 0, cx: 530, cy: 366, zoom: 1.62 },
    { frame: pullbackStart, cx: 530, cy: 366, zoom: 1.62 },
    { frame: pullbackStart + 78, cx: 960, cy: 540, zoom: 1.0 },
    ...(tailCamKeys ?? [
      { frame: l012Local + 178, cx: 960, cy: 540, zoom: 1.03 },
    ]),
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: promoColor.stageBg }}>
      <PageCam keys={camKeys}>
        <AbsoluteFill
          style={{
            backgroundColor: promoColor.stageBg,
            padding: "52px 84px 108px",
            display: "flex",
            flexDirection: "column",
            gap: 20,
          }}
        >
          <div
            style={{
              flexShrink: 0,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              opacity: 0.15 + 0.85 * pullbackT,
            }}
          >
            <div
              style={{
                fontFamily: promoFont.sans,
                fontSize: 52,
                fontWeight: 700,
                color: promoColor.fg,
              }}
            >
              自研病理切片识别与多病种智能体持续接入
            </div>
            <StatusBadge tone="info">
              底座独立解耦 · 多病种智能体即插即用
            </StatusBadge>
          </div>

          <div
            style={{
              flex: 1,
              minHeight: 0,
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gridTemplateRows: "minmax(0, 1fr) minmax(0, 1fr)",
              gap: 20,
            }}
          >
            <div
              style={{
                position: "relative",
                minHeight: 0,
                backgroundColor: promoColor.cardBg,
                borderRadius: promoRadius.card,
                border: "1.5px solid rgba(125, 219, 164, 0.45)",
                boxShadow: promoColor.cardShadow,
                padding: "12px 16px",
                display: "flex",
                flexDirection: "column",
                gap: 8,
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
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span
                    style={{
                      fontFamily: promoFont.mono,
                      fontSize: 20,
                      fontWeight: 700,
                      color: promoColor.success,
                    }}
                  >
                    SLOT 01
                  </span>
                  <span
                    style={{
                      fontFamily: promoFont.sans,
                      fontSize: 28,
                      fontWeight: 700,
                      color: promoColor.fg,
                    }}
                  >
                    自研数字病理切片识别模型
                  </span>
                </div>
                <StatusBadge
                  tone="success"
                  style={{ fontSize: 20, padding: "4px 12px" }}
                >
                  自研多模态模型
                </StatusBadge>
              </div>

              <div
                style={{
                  position: "relative",
                  flex: 1,
                  minHeight: 0,
                  borderRadius: promoRadius.control,
                  overflow: "hidden",
                  border: `1px solid ${promoColor.border}`,
                  backgroundColor: "#14161D",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    position: "relative",
                    height: "100%",
                    aspectRatio: "1920 / 945",
                    overflow: "hidden",
                  }}
                >
                  <Img
                    src={staticFile("episodes/clinmesh-promo/images/病理.png")}
                    style={{
                      width: "100%",
                      height: "100%",
                      display: "block",
                    }}
                  />

                  {scanActive ? (
                    <div
                      style={{
                        position: "absolute",
                        left: 0,
                        right: 0,
                        top: `${(scanProgress * 100).toFixed(2)}%`,
                        transform: "translateY(-24px)",
                        height: 27,
                        pointerEvents: "none",
                      }}
                    >
                      <div
                        style={{
                          width: "100%",
                          height: 24,
                          background:
                            "linear-gradient(180deg, rgba(79, 70, 229, 0) 0%, rgba(79, 70, 229, 0.24) 100%)",
                        }}
                      />
                      <div
                        style={{
                          width: "100%",
                          height: 3,
                          backgroundColor: "#4F46E5",
                          boxShadow: "0 0 14px rgba(79, 70, 229, 0.9)",
                        }}
                      />
                    </div>
                  ) : null}

                  {roi1Visible > 0.01 ? (
                    <div
                      style={{
                        position: "absolute",
                        left: "46.8%",
                        top: "35.8%",
                        width: "13.2%",
                        height: "20.1%",
                        opacity: roi1Visible,
                        transform: `scale(${roi1Scale})`,
                        filter: "drop-shadow(0 1px 4px rgba(15, 23, 42, 0.55))",
                      }}
                    >
                      {[
                        { top: 0, left: 0, bw: "3px 0 0 3px" },
                        { top: 0, right: 0, bw: "3px 3px 0 0" },
                        { bottom: 0, left: 0, bw: "0 0 3px 3px" },
                        { bottom: 0, right: 0, bw: "0 3px 3px 0" },
                      ].map((pos, idx) => (
                        <div
                          key={idx}
                          style={{
                            position: "absolute",
                            top: pos.top,
                            bottom: pos.bottom,
                            left: pos.left,
                            right: pos.right,
                            width: 18,
                            height: 18,
                            borderColor: "#4F46E5",
                            borderStyle: "solid",
                            borderWidth: pos.bw,
                          }}
                        />
                      ))}
                    </div>
                  ) : null}

                  {roi1LabelIn > 0.01 ? (
                    <div
                      style={{
                        position: "absolute",
                        left: "3.2%",
                        top: "42%",
                        opacity: roi1LabelIn,
                        transform: `translateX(${(1 - roi1LabelIn) * -10}px)`,
                        backgroundColor: "rgba(18, 20, 28, 0.92)",
                        border: `1px solid ${promoColor.stageAccent}`,
                        borderRadius: promoRadius.control,
                        padding: "6px 12px",
                        fontFamily: promoFont.mono,
                        fontSize: 16,
                        fontWeight: 600,
                        color: promoColor.fg,
                        whiteSpace: "nowrap",
                        boxShadow: "0 6px 18px rgba(0, 0, 0, 0.35)",
                      }}
                    >
                      ROI-01 · 浸润性病灶特征定位 · 0.94
                    </div>
                  ) : null}

                  {roi2Visible > 0.01 ? (
                    <div
                      style={{
                        position: "absolute",
                        left: "52.8%",
                        top: "62.1%",
                        width: "10.4%",
                        height: "15.5%",
                        opacity: roi2Visible,
                        transform: `scale(${roi2Scale})`,
                        filter: "drop-shadow(0 1px 4px rgba(15, 23, 42, 0.55))",
                      }}
                    >
                      {[
                        { top: 0, left: 0, bw: "3px 0 0 3px" },
                        { top: 0, right: 0, bw: "3px 3px 0 0" },
                        { bottom: 0, left: 0, bw: "0 0 3px 3px" },
                        { bottom: 0, right: 0, bw: "0 3px 3px 0" },
                      ].map((pos, idx) => (
                        <div
                          key={idx}
                          style={{
                            position: "absolute",
                            top: pos.top,
                            bottom: pos.bottom,
                            left: pos.left,
                            right: pos.right,
                            width: 16,
                            height: 16,
                            borderColor: promoColor.infoDeep,
                            borderStyle: "solid",
                            borderWidth: pos.bw,
                          }}
                        />
                      ))}
                    </div>
                  ) : null}

                  {roi2LabelIn > 0.01 ? (
                    <div
                      style={{
                        position: "absolute",
                        left: "3.2%",
                        top: "66%",
                        opacity: roi2LabelIn,
                        transform: `translateX(${(1 - roi2LabelIn) * -10}px)`,
                        backgroundColor: "rgba(18, 20, 28, 0.92)",
                        border: `1px solid ${promoColor.info}`,
                        borderRadius: promoRadius.control,
                        padding: "6px 12px",
                        fontFamily: promoFont.mono,
                        fontSize: 16,
                        fontWeight: 600,
                        color: promoColor.info,
                        whiteSpace: "nowrap",
                        boxShadow: "0 6px 18px rgba(0, 0, 0, 0.35)",
                      }}
                    >
                      ROI-02 · 组织学辅助提示 · 待医师复核
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            {SPECIALTY_SLOTS.map((slot, idx) => {
              const slotIn = clamp01(
                ramp(f, l012Local + 34 + idx * 42, 26, EASE.snappy),
              );
              const imgScale = 1.05 - 0.05 * slotIn;
              return (
                <div
                  key={slot.code}
                  style={{
                    minHeight: 0,
                    opacity: 0.18 + 0.82 * slotIn,
                    transform: `translateY(${(1 - slotIn) * 18}px)`,
                    backgroundColor: promoColor.cardBg,
                    borderRadius: promoRadius.card,
                    border: `1.5px solid ${slot.cardBorder}`,
                    boxShadow: promoColor.cardShadow,
                    padding: "12px 16px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      flexShrink: 0,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                      }}
                    >
                      <span
                        style={{
                          fontFamily: promoFont.mono,
                          fontSize: 20,
                          fontWeight: 700,
                          color: slot.codeColor,
                        }}
                      >
                        {slot.code}
                      </span>
                      <span
                        style={{
                          fontFamily: promoFont.sans,
                          fontSize: 28,
                          fontWeight: 700,
                          color: promoColor.fg,
                        }}
                      >
                        {slot.title}
                      </span>
                    </div>
                    <StatusBadge
                      tone={slot.tone}
                      style={{ fontSize: 20, padding: "4px 12px" }}
                    >
                      {slot.badge}
                    </StatusBadge>
                  </div>

                  <div
                    style={{
                      position: "relative",
                      flex: 1,
                      minHeight: 0,
                      borderRadius: promoRadius.control,
                      overflow: "hidden",
                      border: `1px solid ${promoColor.border}`,
                      backgroundColor: "#14161D",
                    }}
                  >
                    <Img
                      src={staticFile(slot.img)}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        objectPosition: "center",
                        transform: `scale(${imgScale.toFixed(3)})`,
                        display: "block",
                      }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        background:
                          "linear-gradient(90deg, rgba(16, 18, 25, 0.72) 0%, rgba(16, 18, 25, 0.14) 50%, rgba(16, 18, 25, 0.24) 100%)",
                        pointerEvents: "none",
                      }}
                    />
                    <div
                      style={{
                        position: "absolute",
                        left: 14,
                        bottom: 12,
                        backgroundColor: "rgba(18, 20, 28, 0.90)",
                        border: `1px solid ${slot.hudBorder}`,
                        borderRadius: promoRadius.control,
                        padding: "5px 12px",
                        fontFamily: promoFont.mono,
                        fontSize: 15,
                        fontWeight: 600,
                        color: slot.hudColor,
                        whiteSpace: "nowrap",
                        boxShadow: "0 6px 18px rgba(0, 0, 0, 0.38)",
                      }}
                    >
                      {slot.hudTag}
                    </div>
                  </div>

                  <div
                    style={{
                      flexShrink: 0,
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 8,
                    }}
                  >
                    {slot.points.map((pt) => (
                      <div
                        key={pt}
                        style={{
                          backgroundColor: promoColor.cardInset,
                          borderRadius: promoRadius.control,
                          border: `1px solid ${promoColor.border}`,
                          padding: "7px 12px",
                          fontFamily: promoFont.sans,
                          fontSize: 20,
                          color: promoColor.fgMuted,
                          lineHeight: 1.25,
                          whiteSpace: "nowrap",
                        }}
                      >
                        • {pt}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </AbsoluteFill>
      </PageCam>
      <div
        style={{
          position: "absolute",
          right: 88,
          top: 16,
          fontFamily: promoFont.mono,
          fontSize: 15,
          color: promoColor.fgDim,
          opacity: 0.72,
          pointerEvents: "none",
        }}
      >
        Slide microscopy: Clunie et al. (2024), TCGA-BRCA DICOM collection,
        Zenodo doi:10.5281/zenodo.12689962 (CC BY 3.0)
      </div>
    </AbsoluteFill>
  );
};

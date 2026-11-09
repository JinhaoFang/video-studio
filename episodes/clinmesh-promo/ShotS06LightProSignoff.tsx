/**
 * Scene S06 (L010) in ClinMeshPromoLightPro: syllable-locked Light-Theme
 * licensed physician manual approval across diagnosis confirmation, prescription
 * issuance, and structured EMR signing with >=1.2s emerald signed hold.
 */
import { useCurrentFrame } from "remotion";
import type { Timeline } from "../../tools/timeline-types";
import {
  type LightCaptureLayer,
  type LightClickAction,
  type LightCursorStop,
  type LightViewCamKey,
  LightWorkstationStage,
} from "./light-stage";
import { EASE, ramp } from "./motion-utils";

export const S06_LIGHT_PRO_SIGN_CLICK_OFFSET_F = 180;

const BASE = "episodes/clinmesh-promo/captures/light-s06";

const CAM_KEYS: LightViewCamKey[] = [
  { frame: 0, cx: 840, cy: 420, zoom: 1.052 },
  { frame: 18, cx: 846, cy: 424, zoom: 1.058 },
  { frame: 38, cx: 840, cy: 420, zoom: 1.052 },
  { frame: 59, cx: 838, cy: 422, zoom: 1.054 },
  { frame: 72, cx: 748, cy: 492, zoom: 1.22 },
  { frame: 93, cx: 762, cy: 498, zoom: 1.23 },
  { frame: 106, cx: 844, cy: 426, zoom: 1.056 },
  { frame: 152, cx: 840, cy: 420, zoom: 1.052 },
  { frame: 164, cx: 840, cy: 492, zoom: 1.058 },
  { frame: 180, cx: 840, cy: 494, zoom: 1.064 },
  { frame: 196, cx: 840, cy: 432, zoom: 1.052 },
  { frame: 228, cx: 840, cy: 432, zoom: 1.052 },
];

const LAYERS: LightCaptureLayer[] = [
  { src: `${BASE}/01-diagnosis-candidate.png`, fadeInStart: 0, fadeInDur: 0 },
  { src: `${BASE}/02-diagnosis-confirmed.png`, fadeInStart: 19, fadeInDur: 5 },
  {
    src: `${BASE}/03-prescription-incomplete.png`,
    fadeInStart: 36,
    fadeInDur: 6,
  },
  {
    src: `${BASE}/04-prescription-adjust-empty.png`,
    fadeInStart: 59,
    fadeInDur: 5,
  },
  {
    src: `${BASE}/05-prescription-adjust-filled.png`,
    fadeInStart: 72,
    fadeInDur: 5,
  },
  { src: `${BASE}/06-prescription-ready.png`, fadeInStart: 93, fadeInDur: 5 },
  { src: `${BASE}/07-prescription-issued.png`, fadeInStart: 117, fadeInDur: 5 },
  { src: `${BASE}/08-emr-before-sign.png`, fadeInStart: 136, fadeInDur: 6 },
  {
    src: `${BASE}/09-emr-confirm-sign-dialog.png`,
    fadeInStart: 152,
    fadeInDur: 5,
  },
  { src: `${BASE}/10-emr-signed.png`, fadeInStart: 181, fadeInDur: 6 },
];

const CLICKS: LightClickAction[] = [
  {
    frame: 18,
    cx: 1543.5,
    cy: 525.0,
    rect: { left: 1459, top: 509, width: 169, height: 32 },
    tone: "blue",
  },
  {
    frame: 58,
    cx: 166.5,
    cy: 483.0,
    rect: { left: 138, top: 469, width: 57, height: 28 },
    tone: "blue",
  },
  {
    frame: 92,
    cx: 896.5,
    cy: 705.25,
    rect: { left: 833, top: 689.25, width: 127, height: 32 },
    tone: "blue",
  },
  {
    frame: 116,
    cx: 1561.0,
    cy: 652.0,
    rect: { left: 1494, top: 636, width: 134, height: 32 },
    tone: "blue",
  },
  {
    frame: 180,
    cx: 822.5,
    cy: 857.75,
    rect: { left: 749, top: 841.75, width: 147, height: 32 },
    tone: "emerald",
  },
];

const CURSOR_STOPS: LightCursorStop[] = [
  { frame: 0, x: 1330, y: 560 },
  { frame: 4, x: 1330, y: 560 },
  { frame: 15, x: 1543.5, y: 525.0 },
  { frame: 34, x: 1485, y: 518 },
  { frame: 54, x: 166.5, y: 483.0 },
  { frame: 60, x: 166.5, y: 483.0 },
  { frame: 74, x: 690, y: 565 },
  { frame: 89, x: 896.5, y: 705.25 },
  { frame: 95, x: 896.5, y: 705.25 },
  { frame: 113, x: 1561.0, y: 652.0 },
  { frame: 138, x: 1490, y: 642 },
  { frame: 175, x: 822.5, y: 857.75 },
  { frame: 194, x: 822.5, y: 857.75 },
];

export const ShotS06LightProSignoff: React.FC<{ timeline: Timeline }> = ({
  timeline,
}) => {
  void timeline;
  const f = useCurrentFrame();
  const finalSignedT = ramp(f, 181, 14, EASE.snappy);

  return (
    <LightWorkstationStage
      title="执业医师 · 人工核准"
      steps={[
        {
          num: "01",
          idleLabel: "诊断确认",
          doneLabel: "诊断已确认",
          active: f < 36,
          done: f >= 20,
          tone: "emerald",
        },
        {
          num: "02",
          idleLabel: "处方开具",
          doneLabel: "处方已开具",
          active: f >= 36 && f < 136,
          done: f >= 118,
          tone: "emerald",
        },
        {
          num: "03",
          idleLabel: "病历签署",
          doneLabel: "正式生效",
          active: f >= 136 && f < 182,
          done: f >= 182,
          tone: "emerald",
        },
      ]}
      camKeys={CAM_KEYS}
      layers={LAYERS}
      clicks={CLICKS}
      cursorStops={CURSOR_STOPS}
      cursorSpan={[3, 188]}
      finalTone={{ progress: finalSignedT, kind: "emerald" }}
    />
  );
};

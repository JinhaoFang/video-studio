/**
 * Scene S03 (L006-L007) in ClinMeshPromoLightPro: syllable-locked Light-Theme
 * outpatient ambient consultation auto-recording, structured EMR drafting, and
 * guideline-backed lab/prescription candidate tabs & evidence drawer.
 */
import { useCurrentFrame } from "remotion";
import type { Timeline } from "../../tools/timeline-types";
import {
  type LightCalloutBox,
  type LightCaptureLayer,
  type LightClickAction,
  type LightCursorStop,
  type LightViewCamKey,
  LightWorkstationStage,
} from "./light-stage";
import { EASE, ramp } from "./motion-utils";

const BASE = "episodes/clinmesh-promo/captures/light-s03-s05";

const CAM_KEYS: LightViewCamKey[] = [
  { frame: 0, cx: 840, cy: 422, zoom: 1.045 },
  { frame: 54, cx: 618, cy: 448, zoom: 1.095 },
  { frame: 106, cx: 840, cy: 422, zoom: 1.05 },
  { frame: 156, cx: 920, cy: 382, zoom: 1.082 },
  { frame: 204, cx: 840, cy: 420, zoom: 1.05 },
  { frame: 284, cx: 840, cy: 422, zoom: 1.05 },
  { frame: 324, cx: 840, cy: 422, zoom: 1.05 },
  { frame: 353, cx: 840, cy: 422, zoom: 1.05 },
  { frame: 370, cx: 720, cy: 412, zoom: 1.078 },
  { frame: 400, cx: 720, cy: 416, zoom: 1.082 },
];

const LAYERS: LightCaptureLayer[] = [
  {
    src: `${BASE}/s03-01-consultation-turns.png`,
    fadeInStart: 0,
    fadeInDur: 0,
  },
  {
    src: `${BASE}/s03-02-emr-auto-recorded.png`,
    fadeInStart: 109,
    fadeInDur: 6,
  },
  { src: `${BASE}/s03-03-emr-prepared.png`, fadeInStart: 204, fadeInDur: 8 },
  { src: `${BASE}/s03-04-lab-candidates.png`, fadeInStart: 285, fadeInDur: 6 },
  { src: `${BASE}/s03-05-rx-candidates.png`, fadeInStart: 325, fadeInDur: 6 },
  {
    src: `${BASE}/s03-06-rx-evidence-drawer.png`,
    fadeInStart: 353,
    fadeInDur: 6,
  },
];

const CALLOUTS: LightCalloutBox[] = [
  {
    id: "auto-record-pill",
    startFrame: 18,
    endFrame: 100,
    rect: { left: 1308, top: 166, width: 224, height: 34 },
    label: "静默整理病史",
    labelAlign: "bottom-right",
    labelOutset: -29,
    tone: "emerald",
  },
  {
    id: "hpi-iridescent-update",
    startFrame: 118,
    endFrame: 196,
    rect: { left: 848, top: 300, width: 794, height: 104 },
    label: "问诊原话自动入病历",
    labelAlign: "bottom-right",
    labelOutset: -14,
    tone: "blue",
  },
  {
    id: "assistant-prepared-strip",
    startFrame: 214,
    endFrame: 276,
    rect: { left: 42, top: 114, width: 1598, height: 40 },
    label: "候选同步就绪",
    labelAlign: "top-right",
    labelOutset: -27,
    tone: "blue",
  },
];

const CLICKS: LightClickAction[] = [
  {
    frame: 108,
    cx: 210.33,
    cy: 184.38,
    rect: { left: 141, top: 168.25, width: 138.66, height: 32.25 },
    tone: "blue",
  },
  {
    frame: 284,
    cx: 369.88,
    cy: 184.38,
    rect: { left: 283.66, top: 168.25, width: 172.45, height: 32.25 },
    tone: "blue",
  },
  {
    frame: 324,
    cx: 711.94,
    cy: 184.38,
    rect: { left: 629.33, top: 168.25, width: 165.22, height: 32.25 },
    tone: "blue",
  },
  {
    frame: 352,
    cx: 1573.5,
    cy: 379.75,
    rect: { left: 1519, top: 365.75, width: 109, height: 28 },
    tone: "emerald",
  },
];

const CURSOR_STOPS: LightCursorStop[] = [
  { frame: 0, x: 480, y: 420 },
  { frame: 78, x: 460, y: 390 },
  { frame: 105, x: 210.33, y: 184.38 },
  { frame: 126, x: 240, y: 210 },
  { frame: 256, x: 320, y: 210 },
  { frame: 281, x: 369.88, y: 184.38 },
  { frame: 300, x: 540, y: 240 },
  { frame: 321, x: 711.94, y: 184.38 },
  { frame: 334, x: 1120, y: 310 },
  { frame: 349, x: 1573.5, y: 379.75 },
  { frame: 370, x: 960, y: 460 },
];

export const ShotS03LightProOutpatient: React.FC<{ timeline: Timeline }> = ({
  timeline,
}) => {
  void timeline;
  const f = useCurrentFrame();
  const readyGlow = ramp(f, 353, 16, EASE.snappy);

  return (
    <LightWorkstationStage
      title="无感伴随 · 指南候选"
      steps={[
        {
          num: "01",
          idleLabel: "问诊自记",
          doneLabel: "问诊已整理",
          active: f < 109,
          done: f >= 109,
          tone: "emerald",
        },
        {
          num: "02",
          idleLabel: "病历成稿",
          doneLabel: "病历已成稿",
          active: f >= 109 && f < 284,
          done: f >= 206,
          tone: "emerald",
        },
        {
          num: "03",
          idleLabel: "指南候选",
          doneLabel: "候选已就绪",
          active: f >= 284 && f < 353,
          done: f >= 353,
          tone: "emerald",
        },
      ]}
      camKeys={CAM_KEYS}
      layers={LAYERS}
      callouts={CALLOUTS}
      clicks={CLICKS}
      cursorStops={CURSOR_STOPS}
      cursorSpan={[82, 364]}
      finalTone={{ progress: readyGlow, kind: "blue" }}
    />
  );
};

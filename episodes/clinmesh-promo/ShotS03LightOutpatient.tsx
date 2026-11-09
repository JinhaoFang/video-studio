/**
 * Scene S03 (L006-L007) in ClinMeshPromoLight: showcases real Light-Theme
 * ClinMesh outpatient ambient consultation auto-recording, structured EMR
 * population, and guideline-backed laboratory/prescription candidate cards
 * with the authentic provenance & package-insert drawer.
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
  { frame: 0, cx: 840, cy: 422, zoom: 1.05 },
  { frame: 92, cx: 840, cy: 422, zoom: 1.05 },
  { frame: 168, cx: 840, cy: 424, zoom: 1.05 },
  { frame: 236, cx: 840, cy: 422, zoom: 1.05 },
  { frame: 286, cx: 840, cy: 422, zoom: 1.05 },
  { frame: 326, cx: 840, cy: 422, zoom: 1.05 },
  { frame: 344, cx: 720, cy: 412, zoom: 1.078 },
  { frame: 413, cx: 720, cy: 416, zoom: 1.082 },
];

const LAYERS: LightCaptureLayer[] = [
  {
    src: `${BASE}/s03-01-consultation-turns.png`,
    fadeInStart: 0,
    fadeInDur: 0,
  },
  {
    src: `${BASE}/s03-02-emr-auto-recorded.png`,
    fadeInStart: 93,
    fadeInDur: 6,
  },
  { src: `${BASE}/s03-03-emr-prepared.png`, fadeInStart: 162, fadeInDur: 8 },
  { src: `${BASE}/s03-04-lab-candidates.png`, fadeInStart: 237, fadeInDur: 6 },
  { src: `${BASE}/s03-05-rx-candidates.png`, fadeInStart: 287, fadeInDur: 6 },
  {
    src: `${BASE}/s03-06-rx-evidence-drawer.png`,
    fadeInStart: 325,
    fadeInDur: 6,
  },
];

const CALLOUTS: LightCalloutBox[] = [
  {
    id: "auto-record-pill",
    startFrame: 22,
    endFrame: 86,
    rect: { left: 1308, top: 166, width: 224, height: 34 },
    label: "静默整理病史",
    labelAlign: "bottom-right",
    labelOutset: -29,
    tone: "emerald",
  },
  {
    id: "hpi-iridescent-update",
    startFrame: 102,
    endFrame: 156,
    rect: { left: 848, top: 300, width: 794, height: 104 },
    label: "问诊原话自动入病历",
    labelAlign: "bottom-right",
    labelOutset: -14,
    tone: "blue",
  },
  {
    id: "assistant-prepared-strip",
    startFrame: 174,
    endFrame: 230,
    rect: { left: 42, top: 114, width: 1598, height: 40 },
    label: "候选同步就绪",
    labelAlign: "top-right",
    labelOutset: -27,
    tone: "blue",
  },
];

const CLICKS: LightClickAction[] = [
  {
    frame: 92,
    cx: 210.33,
    cy: 184.38,
    rect: { left: 141, top: 168.25, width: 138.66, height: 32.25 },
    tone: "blue",
  },
  {
    frame: 236,
    cx: 369.88,
    cy: 184.38,
    rect: { left: 283.66, top: 168.25, width: 172.45, height: 32.25 },
    tone: "blue",
  },
  {
    frame: 286,
    cx: 711.94,
    cy: 184.38,
    rect: { left: 629.33, top: 168.25, width: 165.22, height: 32.25 },
    tone: "blue",
  },
  {
    frame: 324,
    cx: 1573.5,
    cy: 379.75,
    rect: { left: 1519, top: 365.75, width: 109, height: 28 },
    tone: "emerald",
  },
];

const CURSOR_STOPS: LightCursorStop[] = [
  { frame: 0, x: 480, y: 420 },
  { frame: 64, x: 460, y: 390 },
  { frame: 89, x: 210.33, y: 184.38 },
  { frame: 108, x: 240, y: 210 },
  { frame: 208, x: 320, y: 210 },
  { frame: 233, x: 369.88, y: 184.38 },
  { frame: 258, x: 540, y: 240 },
  { frame: 283, x: 711.94, y: 184.38 },
  { frame: 296, x: 1120, y: 310 },
  { frame: 321, x: 1573.5, y: 379.75 },
  { frame: 344, x: 960, y: 460 },
];

export const ShotS03LightOutpatient: React.FC<{ timeline: Timeline }> = ({
  timeline,
}) => {
  void timeline;
  const f = useCurrentFrame();
  const readyGlow = ramp(f, 325, 16, EASE.snappy);

  return (
    <LightWorkstationStage
      title="无感伴随 · 指南候选"
      steps={[
        {
          num: "01",
          idleLabel: "问诊自记",
          doneLabel: "问诊已整理",
          active: f < 93,
          done: f >= 93,
          tone: "emerald",
        },
        {
          num: "02",
          idleLabel: "病历成文",
          doneLabel: "病历已成文",
          active: f >= 93 && f < 236,
          done: f >= 166,
          tone: "emerald",
        },
        {
          num: "03",
          idleLabel: "指南候选",
          doneLabel: "候选已就绪",
          active: f >= 236 && f < 326,
          done: f >= 326,
          tone: "emerald",
        },
      ]}
      camKeys={CAM_KEYS}
      layers={LAYERS}
      callouts={CALLOUTS}
      clicks={CLICKS}
      cursorStops={CURSOR_STOPS}
      cursorSpan={[68, 336]}
      finalTone={{ progress: readyGlow, kind: "blue" }}
    />
  );
};

/**
 * Scene S05 (L009) in ClinMeshPromoLight: real Light-Theme ClinMesh verbatim
 * consultation provenance and live clinical quality control intercepting both
 * a penicillin allergy omission and a same-morning temperature inconsistency.
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
  { frame: 56, cx: 840, cy: 424, zoom: 1.05 },
  { frame: 75, cx: 840, cy: 422, zoom: 1.05 },
  { frame: 138, cx: 840, cy: 422, zoom: 1.05 },
  { frame: 152, cx: 720, cy: 492, zoom: 1.09 },
  { frame: 188, cx: 720, cy: 496, zoom: 1.095 },
  { frame: 204, cx: 840, cy: 422, zoom: 1.05 },
  { frame: 238, cx: 840, cy: 422, zoom: 1.05 },
];

const LAYERS: LightCaptureLayer[] = [
  {
    src: `${BASE}/s05-01-consultation-allergy-quote.png`,
    fadeInStart: 0,
    fadeInDur: 0,
  },
  {
    src: `${BASE}/s05-02-emr-quality-compact.png`,
    fadeInStart: 75,
    fadeInDur: 6,
  },
  {
    src: `${BASE}/s05-03-emr-quality-drawer.png`,
    fadeInStart: 139,
    fadeInDur: 6,
  },
  {
    src: `${BASE}/s05-04-emr-quality-resolved.png`,
    fadeInStart: 194,
    fadeInDur: 7,
  },
];

const CALLOUTS: LightCalloutBox[] = [
  {
    id: "verbatim-allergy-temp-quote",
    startFrame: 14,
    endFrame: 70,
    rect: { left: 52, top: 672, width: 372, height: 56 },
    label: "患者原话：青霉素过敏 · 38.5℃",
    labelAlign: "top-left",
    labelOutset: -24,
    tone: "blue",
  },
  {
    id: "emr-fields-mismatch",
    startFrame: 84,
    endFrame: 134,
    rect: { left: 44, top: 604, width: 1596, height: 76 },
    label: "过敏待核实 · 体温不一致",
    labelAlign: "top-right",
    labelOutset: -22,
    tone: "amber",
  },
  {
    id: "quality-drawer-allergy",
    startFrame: 147,
    endFrame: 190,
    rect: { left: 400, top: 438, width: 640, height: 176 },
    label: "拦截过敏遗漏",
    labelAlign: "top-right",
    labelOutset: -25,
    tone: "amber",
  },
  {
    id: "emr-fields-resolved",
    startFrame: 202,
    endFrame: 236,
    rect: { left: 44, top: 538, width: 1596, height: 76 },
    label: "已补录过敏史并核实体温",
    labelAlign: "top-right",
    labelOutset: -22,
    tone: "emerald",
  },
];

const CLICKS: LightClickAction[] = [
  {
    frame: 74,
    cx: 242.41,
    cy: 184.38,
    rect: { left: 141, top: 168.25, width: 202.83, height: 32.25 },
    tone: "blue",
  },
  {
    frame: 138,
    cx: 1585.25,
    cy: 309.75,
    rect: { left: 1530.5, top: 295.75, width: 109.5, height: 28 },
    tone: "amber",
  },
];

const CURSOR_STOPS: LightCursorStop[] = [
  { frame: 0, x: 310, y: 690 },
  { frame: 48, x: 295, y: 660 },
  { frame: 71, x: 242.41, y: 184.38 },
  { frame: 94, x: 680, y: 252 },
  { frame: 134, x: 1585.25, y: 309.75 },
  { frame: 156, x: 890, y: 520 },
];

export const ShotS05LightQualityGate: React.FC<{ timeline: Timeline }> = ({
  timeline,
}) => {
  void timeline;
  const f = useCurrentFrame();
  const resolvedGlow = ramp(f, 195, 14, EASE.snappy);

  return (
    <LightWorkstationStage
      title="原话溯源 · 质控拦截"
      steps={[
        {
          num: "01",
          idleLabel: "问诊原话",
          doneLabel: "原话已绑定",
          active: f < 75,
          done: f >= 75,
          tone: "blue",
        },
        {
          num: "02",
          idleLabel: "矛盾与过敏拦截",
          doneLabel: "风险已拦截",
          active: f >= 75 && f < 194,
          done: f >= 140,
          tone: "amber",
        },
        {
          num: "03",
          idleLabel: "核实补录",
          doneLabel: "病历已核实",
          active: f >= 194,
          done: f >= 198,
          tone: "emerald",
        },
      ]}
      camKeys={CAM_KEYS}
      layers={LAYERS}
      callouts={CALLOUTS}
      clicks={CLICKS}
      cursorStops={CURSOR_STOPS}
      cursorSpan={[46, 152]}
      finalTone={{ progress: resolvedGlow, kind: "emerald" }}
    />
  );
};

/**
 * S05（L009）：按逐音节时间点展示浅色工作站的问诊原话溯源与实时质控，
 * 阻断前后矛盾和青霉素过敏遗漏风险。
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
  { frame: 52, cx: 560, cy: 524, zoom: 1.115 },
  { frame: 100, cx: 840, cy: 422, zoom: 1.05 },
  { frame: 158, cx: 840, cy: 422, zoom: 1.05 },
  { frame: 172, cx: 720, cy: 492, zoom: 1.09 },
  { frame: 210, cx: 720, cy: 496, zoom: 1.095 },
  { frame: 226, cx: 840, cy: 422, zoom: 1.05 },
  { frame: 262, cx: 840, cy: 422, zoom: 1.05 },
];

const LAYERS: LightCaptureLayer[] = [
  {
    src: `${BASE}/s05-01-consultation-allergy-quote.png`,
    fadeInStart: 0,
    fadeInDur: 0,
  },
  {
    src: `${BASE}/s05-02-emr-quality-compact.png`,
    fadeInStart: 103,
    fadeInDur: 6,
  },
  {
    src: `${BASE}/s05-03-emr-quality-drawer.png`,
    fadeInStart: 159,
    fadeInDur: 6,
  },
  {
    src: `${BASE}/s05-04-emr-quality-resolved.png`,
    fadeInStart: 218,
    fadeInDur: 7,
  },
];

const CALLOUTS: LightCalloutBox[] = [
  {
    id: "verbatim-allergy-temp-quote",
    startFrame: 14,
    endFrame: 96,
    rect: { left: 52, top: 672, width: 372, height: 56 },
    label: "患者原话：青霉素过敏 · 38.5℃",
    labelAlign: "top-left",
    labelOutset: -24,
    tone: "blue",
  },
  {
    id: "emr-fields-mismatch",
    startFrame: 110,
    endFrame: 152,
    rect: { left: 44, top: 604, width: 1596, height: 76 },
    label: "过敏待核实 · 体温不一致",
    labelAlign: "top-right",
    labelOutset: -22,
    tone: "amber",
  },
  {
    id: "quality-drawer-allergy",
    startFrame: 166,
    endFrame: 214,
    rect: { left: 400, top: 438, width: 640, height: 176 },
    label: "阻断过敏隐患",
    labelAlign: "top-right",
    labelOutset: -25,
    tone: "amber",
  },
  {
    id: "emr-fields-resolved",
    startFrame: 224,
    endFrame: 258,
    rect: { left: 44, top: 538, width: 1596, height: 76 },
    label: "已补录过敏史并核实体温",
    labelAlign: "top-right",
    labelOutset: -22,
    tone: "emerald",
  },
];

const CLICKS: LightClickAction[] = [
  {
    frame: 102,
    cx: 242.41,
    cy: 184.38,
    rect: { left: 141, top: 168.25, width: 202.83, height: 32.25 },
    tone: "blue",
  },
  {
    frame: 158,
    cx: 1585.25,
    cy: 309.75,
    rect: { left: 1530.5, top: 295.75, width: 109.5, height: 28 },
    tone: "amber",
  },
];

const CURSOR_STOPS: LightCursorStop[] = [
  { frame: 0, x: 310, y: 690 },
  { frame: 72, x: 295, y: 660 },
  { frame: 99, x: 242.41, y: 184.38 },
  { frame: 120, x: 680, y: 252 },
  { frame: 154, x: 1585.25, y: 309.75 },
  { frame: 176, x: 890, y: 520 },
];

export const ShotS05QualityGate: React.FC<{ timeline: Timeline }> = ({
  timeline,
}) => {
  void timeline;
  const f = useCurrentFrame();
  const resolvedGlow = ramp(f, 219, 14, EASE.snappy);

  return (
    <LightWorkstationStage
      title="原话锚定 · 质控阻断"
      steps={[
        {
          num: "01",
          idleLabel: "原话锚定",
          doneLabel: "原话已锚定",
          active: f < 103,
          done: f >= 103,
          tone: "blue",
        },
        {
          num: "02",
          idleLabel: "矛盾与过敏阻断",
          doneLabel: "隐患已阻断",
          active: f >= 103 && f < 218,
          done: f >= 160,
          tone: "amber",
        },
        {
          num: "03",
          idleLabel: "核实补录",
          doneLabel: "病历已核实",
          active: f >= 218,
          done: f >= 222,
          tone: "emerald",
        },
      ]}
      camKeys={CAM_KEYS}
      layers={LAYERS}
      callouts={CALLOUTS}
      clicks={CLICKS}
      cursorStops={CURSOR_STOPS}
      cursorSpan={[70, 172]}
      finalTone={{ progress: resolvedGlow, kind: "emerald" }}
    />
  );
};

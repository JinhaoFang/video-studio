/**
 * Scene S04 (L008) in ClinMeshPromoLight: real Light-Theme ClinMesh inpatient
 * coronary PCI stent consumable reservation, DRG FM59->FM39 payment headroom
 * calculation, actual procedure completion, and three-role billing/coding
 * alignment.
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
  { frame: 58, cx: 840, cy: 422, zoom: 1.05 },
  { frame: 84, cx: 840, cy: 424, zoom: 1.05 },
  { frame: 134, cx: 840, cy: 424, zoom: 1.05 },
  { frame: 148, cx: 840, cy: 422, zoom: 1.05 },
  { frame: 170, cx: 840, cy: 424, zoom: 1.05 },
  { frame: 203, cx: 840, cy: 424, zoom: 1.05 },
];

const LAYERS: LightCaptureLayer[] = [
  {
    src: `${BASE}/s04-01-pci-surgery-reserved.png`,
    fadeInStart: 0,
    fadeInDur: 0,
  },
  { src: `${BASE}/s04-02-pci-drg-pregroup.png`, fadeInStart: 63, fadeInDur: 6 },
  {
    src: `${BASE}/s04-04-pci-surgery-completed.png`,
    fadeInStart: 136,
    fadeInDur: 6,
  },
  {
    src: `${BASE}/s04-05-pci-drg-fm39-final.png`,
    fadeInStart: 168,
    fadeInDur: 6,
  },
];

const CALLOUTS: LightCalloutBox[] = [
  {
    id: "pci-reserved-consumables",
    startFrame: 14,
    endFrame: 58,
    rect: { left: 32, top: 248, width: 1620, height: 112 },
    label: "支架与导管耗材已预留",
    labelAlign: "top-right",
    tone: "blue",
  },
  {
    id: "drg-fm39-headroom",
    startFrame: 96,
    endFrame: 133,
    rect: { left: 45, top: 500, width: 1594, height: 105 },
    label: "预计 FM39 · 空间充足",
    labelAlign: "bottom-right",
    labelOutset: -14,
    tone: "emerald",
  },
  {
    id: "drg-fm39-final-aligned",
    startFrame: 174,
    endFrame: 202,
    rect: { left: 32, top: 287, width: 1620, height: 218 },
    label: "临床 · 收费 · 病案一致",
    labelAlign: "top-right",
    labelOutset: -24,
    tone: "emerald",
  },
];

const CLICKS: LightClickAction[] = [
  {
    frame: 62,
    cx: 343.42,
    cy: 152.73,
    rect: { left: 290.05, top: 136.61, width: 106.75, height: 32.25 },
    tone: "blue",
  },
];

const CURSOR_STOPS: LightCursorStop[] = [
  { frame: 0, x: 640, y: 315 },
  { frame: 38, x: 580, y: 295 },
  { frame: 59, x: 343.42, y: 152.73 },
  { frame: 82, x: 560, y: 540 },
  { frame: 120, x: 590, y: 548 },
];

export const ShotS04LightInpatientDrg: React.FC<{ timeline: Timeline }> = ({
  timeline,
}) => {
  void timeline;
  const f = useCurrentFrame();
  const finalEmeraldT = ramp(f, 168, 14, EASE.snappy);

  return (
    <LightWorkstationStage
      title="冠脉介入 · 病组精算"
      steps={[
        {
          num: "01",
          idleLabel: "耗材预留",
          doneLabel: "耗材已预留",
          active: f < 63,
          done: f >= 46,
          tone: "emerald",
        },
        {
          num: "02",
          idleLabel: "空间精算",
          doneLabel: "FM39 精算",
          active: f >= 63 && f < 136,
          done: f >= 104,
          tone: "emerald",
        },
        {
          num: "03",
          idleLabel: "三岗核查",
          doneLabel: "三岗已核对",
          active: f >= 136 && f < 170,
          done: f >= 170,
          tone: "emerald",
        },
      ]}
      camKeys={CAM_KEYS}
      layers={LAYERS}
      callouts={CALLOUTS}
      clicks={CLICKS}
      cursorStops={CURSOR_STOPS}
      cursorSpan={[34, 124]}
      finalTone={{ progress: finalEmeraldT, kind: "emerald" }}
    />
  );
};

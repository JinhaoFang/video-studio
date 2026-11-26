/**
 * 《雨后》正片的规格、镜头时间表、叠化激活查询与画面事件种类表（对照 storyboard.md「时间表」与 contract.md 第 4 节）。
 * 12 个镜头共 1620 帧（67.5 秒，24 fps），其中 s11 与 s12 重叠 24 帧用于叠化。
 * 供合成入口、生成器、声音管线和测试共同取用；不依赖浏览器 API。
 * 待定事项：无。
 */
import { filmDuration, type ShotRow } from "../../src/kit/shots.ts";

export const fps = 24;
export const width = 1920;
export const height = 1080;

export const shotTable: readonly ShotRow[] = [
  { id: "s01", startFrame: 0, durationInFrames: 144 },
  { id: "s02", startFrame: 144, durationInFrames: 144 },
  { id: "s03", startFrame: 288, durationInFrames: 168 },
  { id: "s04", startFrame: 456, durationInFrames: 96 },
  { id: "s05", startFrame: 552, durationInFrames: 120 },
  { id: "s06", startFrame: 672, durationInFrames: 120 },
  { id: "s07", startFrame: 792, durationInFrames: 120 },
  { id: "s08", startFrame: 912, durationInFrames: 144 },
  { id: "s09", startFrame: 1056, durationInFrames: 96 },
  { id: "s10", startFrame: 1152, durationInFrames: 84 },
  { id: "s11", startFrame: 1236, durationInFrames: 192 },
  { id: "s12", startFrame: 1404, durationInFrames: 216 },
];

export const durationInFrames = filmDuration(shotTable);

export const DISSOLVE_FRAMES = 24;

export type ActiveShot = {
  row: ShotRow;
  localFrame: number;
};

export const activeShots = (
  table: readonly ShotRow[],
  frame: number,
): ActiveShot[] => {
  const hits: ActiveShot[] = [];
  for (const row of table) {
    if (frame >= row.startFrame && frame < row.startFrame + row.durationInFrames) {
      hits.push({ row, localFrame: frame - row.startFrame });
    }
  }
  if (!hits.length) {
    throw new Error(`当前帧不在镜头时间表内：${frame}`);
  }
  return hits;
};

export const EVENT_KINDS = [
  "open",
  "lightning",
  "thunder",
  "companion_call",
  "glance",
  "call_weak",
  "claw_shift",
  "wing_lift",
  "shiver",
  "huddle",
  "rain_tail",
  "light_break",
  "drip_fall",
  "drip_hit",
  "mud_step",
  "mud_pull",
  "basket_creak",
  "puddle_step",
  "splash_peak",
  "flinch",
  "call_alarm",
  "windup",
  "push_off",
  "flap_wet",
  "hush",
  "drop",
  "fall_back",
  "pole_spring",
  "steady",
  "call_small",
  "drop_land",
  "step_stop",
  "toe_turn",
  "hum_start",
  "shake",
  "puff",
  "look_up",
  "call_clear",
  "crouch",
  "takeoff",
  "wingbeat",
  "wing_pass",
  "land",
  "flock_shift",
  "call_home",
  "lamp_on",
  "title_dot",
  "seal_press",
  "fade_out",
] as const;

export type EventKind = (typeof EVENT_KINDS)[number];

export const STAR_EVENT_KINDS: readonly EventKind[] = [
  "open",
  "light_break",
  "drip_fall",
  "fall_back",
  "hum_start",
  "puff",
  "look_up",
  "crouch",
  "takeoff",
  "land",
  "lamp_on",
  "fade_out",
] as const;

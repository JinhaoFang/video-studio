/** 《雨后》听点表。接触从画面事件取帧，画外环境滴水按镜头定位。逐条保留 place 返回的起始采样及素材对齐点，供混音落位核对。 */
import {
  curve,
  dbGain,
  place,
  random,
  rate,
  reverb,
  seedFor,
  stereo,
} from "../../../src/kit/sound/dsp.ts";
import { resolveAnchor } from "../../../src/kit/sound/score.ts";
import type {
  EventTable,
  Scene,
  Stereo,
} from "../../../src/kit/sound/types.ts";
import { shotRow } from "../model.ts";
import { synthesizeSfx, type SfxName } from "./sfx.ts";

export const rooms = {
  eaves: {
    t60: 0.32,
    preDelayMs: 2,
    earlyReflectionsMs: [2.5, 4.2, 6.5],
    highCutHz: 5800,
  },
  garden: {
    t60: 0.85,
    preDelayMs: 26,
    earlyReflectionsMs: [40, 74, 115],
    highCutHz: 4400,
  },
  open: {
    t60: 0.45,
    preDelayMs: 36,
    earlyReflectionsMs: [60],
    highCutHz: 3800,
  },
  dusk: {
    t60: 0.58,
    preDelayMs: 26,
    earlyReflectionsMs: [40, 74],
    highCutHz: 3800,
  },
  music: { t60: 1.6, preDelayMs: 20, highCutHz: 9000 },
  woodRoom: {
    t60: 0.24,
    preDelayMs: 3,
    earlyReflectionsMs: [7, 13, 23],
    highCutHz: 1420,
  },
  rainYard: {
    t60: 0.5,
    preDelayMs: 14,
    earlyReflectionsMs: [17, 31, 49],
    highCutHz: 3600,
  },
} satisfies Record<string, Scene>;

type Spot = [name: SfxName, db: number, pan: number, scene: keyof typeof rooms];
const spots: Record<string, Spot> = {
  thunder: ["thunder", -7, -0.12, "rainYard"],
  companion_call: ["companion_call", -12, 0.6, "garden"],
  call_weak: ["call_weak", -7, 0.2, "eaves"],
  glance: ["feather_flinch", -16, 0.2, "eaves"],
  claw_shift: ["claw_shift", -9, 0.2, "eaves"],
  wing_lift: ["wet_lift", -10, 0.2, "eaves"],
  shiver: ["shiver", -6, 0.2, "eaves"],
  huddle: ["feather_puff", -14, 0.2, "eaves"],
  drip_hit: ["drip_hit", -2, 0.24, "eaves"],
  mud_step: ["mud_step", -3, -0.1, "garden"],
  mud_pull: ["mud_pull", -5, 0, "garden"],
  basket_creak: ["basket_creak", -10, 0.1, "garden"],
  puddle_step: ["puddle_step", 0, 0.12, "garden"],
  splash_peak: ["splash_peak", -1, 0.15, "garden"],
  flinch: ["feather_flinch", -7, 0.1, "eaves"],
  call_alarm: ["call_alarm", 0, 0.12, "eaves"],
  windup: ["claw_shift", -10, 0.1, "eaves"],
  push_off: ["takeoff_push", -4, 0.1, "eaves"],
  flap_wet: ["wet_flap", -3, 0.12, "eaves"],
  fall_back: ["fall_thud", 0, 0.1, "eaves"],
  pole_spring: ["pole_spring", -4, 0.05, "eaves"],
  steady: ["claw_shift", -10, 0.1, "eaves"],
  call_small: ["call_small", -10, 0.12, "eaves"],
  drop_land: ["drip_land", -10, -0.12, "garden"],
  step_stop: ["step_stop", -2, 0, "garden"],
  toe_turn: ["toe_turn", -6, 0.15, "garden"],
  shake: ["feather_shake", -4, 0.12, "eaves"],
  puff: ["feather_puff", -5, 0.12, "eaves"],
  call_clear: ["call_clear", -3, 0.05, "eaves"],
  crouch: ["claw_shift", -9, 0, "eaves"],
  takeoff: ["takeoff_push", -2, 0, "eaves"],
  wingbeat: ["wing_flap", -6, 0.2, "eaves"],
  wing_pass: ["wing_pass", -2, 0.25, "eaves"],
  land: ["wire_land", -10, 0.35, "open"],
  flock_shift: ["feather_flinch", -15, 0.35, "open"],
  call_home: ["call_home", -8, 0.35, "open"],
  title_dot: ["drip_land", -7, -0.25, "dusk"],
  seal_press: ["seal_press", -6, -0.25, "dusk"],
  floor_creak: ["basket_creak", -19, 0, "woodRoom"],
  eave_drip: ["drip_land", -13, -0.4, "garden"],
};
const dropSurfaces = [
  { material: "竹竿", tone: 820, cutoffHz: 5800 },
  { material: "竹竿", tone: 620, cutoffHz: 5800 },
  { material: "木板", tone: 280, cutoffHz: 2500 },
  { material: "泥地", tone: 150, cutoffHz: 680 },
] as const;

const heroes = new Set([
  "drip_hit",
  "puddle_step",
  "splash_peak",
  "call_alarm",
  "fall_back",
  "takeoff",
  "wing_pass",
  "land",
]);
const otherAnchors = new Set([
  "open",
  "lightning",
  "rain_tail",
  "light_break",
  "drip_fall",
  "hush",
  "drop",
  "hum_start",
  "look_up",
  "lamp_on",
  "fade_out",
]);
export const quietRanges = (table: EventTable) => {
  const frame = (kind: string) => resolveAnchor({ event: kind }, table);
  const turns = table.events
    .filter((e) => e.kind === "toe_turn")
    .sort((a, b) => a.frame - b.frame);
  const sun = shotRow(table.shotTable, "s08");
  return [
    [frame("drip_fall"), frame("drip_hit")],
    [frame("hush"), frame("drop") + 1],
    [turns[1].frame + 2, turns[2].frame - 1],
    [sun.startFrame, sun.startFrame + sun.durationInFrames],
  ];
};

export const renderSpots = (
  table: EventTable,
  seed: number,
  toSample: (frame: number) => number,
  stems: Record<"sfx" | "ambience" | "voice", Stereo>,
) => {
  const at = (shot: string, frame: number) =>
    resolveAnchor({ shot, frame }, table);
  const event = (kind: string) => resolveAnchor({ event: kind }, table);
  const dissolveStart = toSample(at("s12", 0));
  const outgoing = shotRow(table.shotTable, "s11");
  const dissolveEnd = toSample(outgoing.startFrame + outgoing.durationInFrames - 1);
  const dissolve: [number, number][] = [[dissolveStart, 1], [dissolveEnd, 0]];
  const quiet = quietRanges(table);
  const cues = table.events.map(({ shotId, kind, frame }) => ({
    shotId,
    kind,
    frame,
  }));
  const rng = random(seedFor(seed, "滴水"));
  for (const row of table.shotTable.filter(
    (r) => r.id >= "s03" && r.id <= "s07",
  )) {
    for (
      let frame = row.startFrame + 12;
      frame < row.startFrame + row.durationInFrames;
      frame += Math.round(table.fps * (0.8 + rng() * 2.4))
    ) {
      if (!quiet.some(([a, b]) => frame >= a && frame < b))
        cues.push({ shotId: row.id, kind: "eave_drip", frame });
    }
  }
  for (const frame of [30, 95])
    cues.push({ shotId: "s08", kind: "eave_drip", frame: at("s08", frame) });
  cues.push({ shotId: "s02", kind: "floor_creak", frame: at("s02", 112) });
  const counts = new Map<string, number>();
  const heroSamples: number[] = [];
  const placements = [];
  for (const { shotId, kind, frame } of cues.sort(
    (a, b) => a.frame - b.frame,
  )) {
    if (otherAnchors.has(kind)) continue;
    if (!spots[kind]) throw new Error(`听点表缺少声音决定：${shotId} ${kind}`);
    const [name, baseDb, basePan, room] = spots[kind];
    const key = `${shotId}/${kind}`,
      ordinal = counts.get(key) ?? 0;
    counts.set(key, ordinal + 1);
    const wide = shotId === "s11";
    let db = baseDb,
      pan = basePan;
    if (kind === "mud_step")
      db +=
        shotId === "s03"
          ? -9
          : shotId === "s06"
            ? -5 - ordinal * 2
            : ordinal * 2;
    if (shotId === "s06" && kind === "basket_creak")
      db -= frame < event("hum_start") ? ordinal * 3 : 5;
    if (kind === "flap_wet" && frame > event("fall_back")) db -= 5;
    if (kind === "shake") db += -4 + Math.min(7, ordinal * 0.7);
    if (kind === "title_dot") db += [0, -1, 1, 3][ordinal % 4];
    if (kind === "companion_call") {
      if (wide) db += Math.min(7, ordinal * 2);
      pan = wide ? 0.35 : shotId === "s09" ? 0.7 : 0.6;
    }
    if (wide && kind === "wingbeat") db -= 14;
    const fadeCall = wide && kind === "companion_call";
    const surface = shotId === "s05" && kind === "drop_land"
      ? dropSurfaces[ordinal % dropSurfaces.length] : undefined;
    const scene = wide ? "open" : room;
    const seconds =
      kind === "wing_pass" ? (at("s11", 10) - frame) / table.fps : undefined;
    const clip = synthesizeSfx(name, seedFor(seed, `${key}/${ordinal}`), {
      seconds,
      period:
        kind === "pole_spring"
          ? (shotId === "s05" ? 2 * (frame - event("fall_back")) : 10) /
            table.fps
          : undefined,
      tone:
        kind === "title_dot" ? [740, 920, 810, 1150][ordinal % 4] : surface?.tone,
      crest:
        kind === "wing_pass" ? (at("s11", 0) - frame) / table.fps : undefined,
      cutoffHz: wide
        ? 1800
        : shotId === "s03" && kind === "mud_step"
          ? 680
          : surface?.cutoffHz,
    });
    const wet = wide
      ? 0.22
      : shotId === "s04" || shotId === "s05" || shotId === "s10"
        ? 0.18
        : 0.11;
    const dry = stereo(
      clip.samples.length + Math.ceil(rooms[scene].t60 * rate),
    );
    const target = toSample(frame),
      origin = target - clip.alignmentSample;
    const start = place(
      dry,
      clip,
      target - origin,
      dbGain(db),
      pan,
      0.28,
    );
    const sound = reverb(dry, rooms[scene], wet);
    const layer =
      kind === "thunder" || kind === "eave_drip"
        ? "ambience"
        : kind === "floor_creak"
          ? "voice"
          : "sfx";
    const bus = stems[layer];
    for (let c = 0; c < 2; c++)
      for (
        let i = Math.max(0, -origin);
        i < Math.min(sound[c].length, bus[c].length - origin);
        i++
      )
        bus[c][origin + i] += sound[c][i] * (fadeCall ? curve(dissolve, origin + i) : 1);
    const alignedSample = origin + start + clip.alignmentSample;
    placements.push({
      shotId,
      frame,
      kind,
      name,
      scene,
      ...(surface && { material: surface.material }),
      layer,
      onsetSample:
        origin + start + clip.samples.findIndex((v) => Math.abs(v) > 1e-9),
      startSample: origin + start,
      alignmentSample: clip.alignmentSample,
      alignedSample,
    });
    if (heroes.has(kind)) heroSamples.push(alignedSample);
  }
  return { placements, heroSamples };
};

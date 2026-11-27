/** 事件驱动混音：逐镜头序号变体、床音、场景混响、明确静默与主音效让位；分轨保留相同主总线增益，可相加还原混音。 待定事项：无。 */
import { frameToSample } from "../shots.ts";
import {
  add,
  curve,
  dbGain,
  place,
  rate,
  reverb,
  seedFor,
  stereo,
} from "./dsp.ts";
import { compileScore, resolveAnchor } from "./score.ts";
import type {
  EventTable,
  Score,
  SynthesizeSfx,
  SoundDesign,
  Stereo,
} from "./types.ts";

export const validateEvents = (
  table: EventTable,
  design: SoundDesign,
): number => {
  if (
    !table.shotTable?.length ||
    !Array.isArray(table.events) ||
    !Number.isFinite(table.fps) || table.fps <= 0 ||
    table.sampleRate !== rate
  )
    throw new Error("事件表需要镜头表、事件数组、正帧率和 48000 Hz 采样率。");
  const ids = new Set<string>();
  let previousEnd = 0;
  for (const row of [...table.shotTable].sort(
    (a, b) => a.startFrame - b.startFrame,
  )) {
    if (
      ids.has(row.id) ||
      !Number.isInteger(row.startFrame) ||
      !Number.isInteger(row.durationInFrames) ||
      row.durationInFrames <= 0 ||
      row.startFrame < previousEnd
    )
      throw new Error(`镜头时间表无效或重叠：${row.id}`);
    ids.add(row.id);
    previousEnd = row.startFrame + row.durationInFrames;
  }
  for (const event of table.events) {
    const row = table.shotTable.find((shot) => shot.id === event.shotId);
    if (
      !row ||
      !Number.isInteger(event.localFrame) ||
      event.localFrame < 0 ||
      event.localFrame >= row.durationInFrames ||
      event.frame !== row.startFrame + event.localFrame
    )
      throw new Error(`事件局部帧与全片帧不一致：${event.kind}`);
    if (!(event.kind in design.eventMap))
      throw new Error(`声音设计未定义事件种类：${event.kind}`);
  }
  for (const [name, item] of Object.entries(design.sfx)) {
    const range = design.tiers[item.tier]?.range;
    if (
      !range ||
      item.db < range[0] ||
      item.db > range[1] ||
      !design.scenes[item.scene] ||
      item.pan < -1 ||
      item.pan > 1
    )
      throw new Error(`音效档位、电平、场景或声像无效：${name}`);
  }
  return previousEnd;
};
export type Perspective<Name extends string> = (name: Name, ordinal: number) => {
  panOffset?: number;
  dbOffset?: number;
  wet?: number;
  far?: { scene: string; distance: number };
  cutoffHz?: number;
};

export const renderMix = <Name extends string>(
  table: EventTable,
  score: Score,
  design: SoundDesign<Name>,
  seed: number,
  synthesizeSfx: SynthesizeSfx<Name>,
  perspective: Perspective<Name> = () => ({}),
) => {
  const durationFrames = validateEvents(table, design);
  const count = frameToSample(durationFrames, rate, table.fps);
  const sample = (frame: number) => frameToSample(frame, rate, table.fps);
  const anchorSample = (anchor: Parameters<typeof resolveAnchor>[0]) =>
    sample(resolveAnchor(anchor, table));
  const voices = compileScore(score, table, seed);
  const stems: Record<string, Stereo> = Object.fromEntries(
    design.master.stems.map((name) => [name, stereo(count)]),
  );
  if (!stems.music || !stems.sfx || !stems.ambience)
    throw new Error("总线必须包含 music、sfx、ambience 三轨。");
  const instruments: Record<string, Stereo> = {};
  const groups = new Map<number, Stereo>();
  for (const voice of voices) {
    const instrument = (instruments[voice.instrument] ??= stereo(count));
    place(
      instrument,
      { samples: voice.samples, alignmentSample: 0 },
      voice.start,
    );
    const bus = groups.get(voice.cutoff) ?? stereo(count);
    groups.set(voice.cutoff, bus);
    place(bus, { samples: voice.samples, alignmentSample: 0 }, voice.start);
  }
  for (const [cutoff, dry] of groups) {
    const wet = reverb(dry, design.scenes.music, 0.2);
    for (let c = 0; c < 2; c++)
      for (let i = 0; i < count; i++)
        wet[c][i] *= Math.max(0, Math.min(1, (cutoff - 1 - i) / (rate * 0.15)));
    add(stems.music, wet);
  }
  const silences = design.silences.map((item) => ({
    ...item,
    fromSample: anchorSample(item.from),
    toSample: anchorSample(item.to),
  }));
  const applySilence = (bus: Stereo, name: string) => {
    for (const item of silences) {
      const attenuation = item.mute.includes(name)
        ? 0
        : dbGain(item.duck?.[name] ?? 0);
      const edge = Math.round(rate * 0.005);
      for (
        let i = Math.max(0, item.fromSample - edge);
        i < Math.min(count, item.toSample + edge);
        i++
      ) {
        const gain = curve(
          [
            [item.fromSample - edge, 1],
            [item.fromSample, attenuation],
            [item.toSample - 1, attenuation],
            [item.toSample + edge, 1],
          ],
          i,
        );
        for (let c = 0; c < 2; c++) bus[c][i] *= gain;
      }
    }
  };
  const placements: {
    sfx: Name;
    shotId: string;
    ordinal: number;
    eventFrame: number;
    alignmentSample: number;
    startSample: number;
    alignedSample: number;
    db: number;
    pan: number;
    wet: number;
  }[] = [];
  const heroSamples: number[] = [];
  const counters = new Map<string, number>();
  const drop = (name: Name, eventFrame: number, shotId: string) => {
    const config = design.sfx[name];
    if (!config) throw new Error(`声音设计未配置音效：${name}`);
    const key = `${shotId}/${name}`;
    const ordinal = counters.get(key) ?? 0;
    counters.set(key, ordinal + 1);
    const change = perspective(name, ordinal);
    const clip = synthesizeSfx(name, seedFor(seed, `${key}/${ordinal}`), { cutoffHz: change.cutoffHz });
    const pan = Math.min(1, Math.max(-1, config.pan + (change.panOffset ?? 0)));
    const db = config.db + (change.dbOffset ?? 0);
    const dry = stereo(count);
    const alignedSample = sample(eventFrame);
    const startSample = place(
      dry,
      clip,
      alignedSample,
      dbGain(db),
      pan,
      config.width,
    );
    const wet = change.wet ?? 0.16;
    const near = reverb(dry, design.scenes[config.scene], wet);
    if (change.far) {
      const far = reverb(dry, design.scenes[change.far.scene], wet);
      const distance = change.far.distance;
      for (let c = 0; c < 2; c++)
        for (let i = 0; i < count; i++)
          near[c][i] = near[c][i] * (1 - distance) + far[c][i] * distance;
    }
    applySilence(near, name);
    add(stems.sfx, near);
    if (design.ducking.on.includes(config.tier))
      heroSamples.push(alignedSample);
    placements.push({
      sfx: name,
      shotId,
      ordinal,
      eventFrame,
      alignmentSample: clip.alignmentSample,
      startSample,
      alignedSample,
      db,
      pan,
      wet,
    });
  };
  for (const event of [...table.events].sort((a, b) => a.frame - b.frame))
    for (const mapping of design.eventMap[event.kind])
      drop(mapping.sfx, event.frame + mapping.offsetFrames, event.shotId);
  for (const extra of design.extra) {
    const frame = resolveAnchor(extra.at, table);
    const row = table.shotTable.find(
      (shot) =>
        frame >= shot.startFrame &&
        frame < shot.startFrame + shot.durationInFrames,
    );
    if (!row) throw new Error(`附加音效锚点不在镜头内：${extra.sfx}`);
    drop(extra.sfx, frame, row.id);
  }
  for (const bed of design.beds) {
    const start = anchorSample(bed.from),
      end = anchorSample(bed.to);
    if (start < 0 || end > count || end <= start)
      throw new Error(`床音范围无效：${bed.sfx}`);
    const clip = synthesizeSfx(bed.sfx, seedFor(seed, `bed/${bed.sfx}`), {
      seconds: (end - start) / rate,
      density: bed.density?.map(([anchor, value]) => [
        (anchorSample(anchor) - start) / rate,
        value,
      ]),
    });
    const config = design.sfx[bed.sfx];
    if (!config) throw new Error(`声音设计未配置床音：${bed.sfx}`);
    const bus = stereo(count);
    place(bus, clip, start, dbGain(config.db), config.pan, config.width);
    const wet = reverb(bus, design.scenes[config.scene]);
    for (let i = 0; i < count; i++) {
      const fadeIn = bed.fadeInFrames
        ? Math.min(1, (i - start) / sample(bed.fadeInFrames))
        : 1;
      const fadeOut = bed.fadeOutFrames
        ? Math.min(1, (end - 1 - i) / sample(bed.fadeOutFrames))
        : 1;
      const gain = i < start || i >= end ? 0 : fadeIn * fadeOut;
      for (let c = 0; c < 2; c++) wet[c][i] *= gain;
    }
    applySilence(wet, bed.sfx);
    add(stems.ambience, wet);
  }
  applySilence(stems.music, "music");
  const duck = design.ducking;
  const attack = (duck.attackMs * rate) / 1000,
    hold = (duck.holdMs * rate) / 1000,
    release = (duck.releaseMs * rate) / 1000;
  for (let i = 0; i < count; i++) {
    let gain = 1;
    for (const at of heroSamples)
      gain = Math.min(
        gain,
        dbGain(
          curve(
            [
              [at - attack, 0],
              [at, duck.musicDb],
              [at + hold, duck.musicDb],
              [at + hold + release, 0],
            ],
            i,
          ),
        ),
      );
    for (let c = 0; c < 2; c++) stems.music[c][i] *= gain;
  }
  const fade = sample(design.master.fadeOutFrames);
  const mix = stereo(count);
  for (const bus of Object.values(stems)) {
    for (let i = Math.max(0, count - fade); i < count; i++)
      for (let c = 0; c < 2; c++) bus[c][i] *= (count - 1 - i) / fade;
    add(mix, bus);
  }
  return { mix, stems, voices, instruments, placements, durationFrames };
};

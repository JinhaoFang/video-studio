/**
 * 《雨后》屋里的说话（#202，sound-design.md「背景人声」）：两个人（后来走出来的那个人，和另一个更老、更慢的声音）的无词语流，
 * 沿用 #184 试听样的源—滤波配方（短段发声、气声、停顿，起伏由基频和力度曲线描述，两个声音的音高、语速错开），每拍加一点辅音般的气流起音；
 * 合成后再做隔墙处理（第 1 镜两级 1 kHz 低通加木头小房间的反射，声像 +0.3；第 2 镜三级 600 Hz，更闷，居中），
 * 不靠字，靠 200–1000 Hz 的语调起伏、有来有回的节奏和一两声轻笑。
 * 说话的段落按场次取自时间表：thunder 所在镜头及其下一镜。wallaLines 按顺序一问一答排开（下一句在上一句结束后 0.18 秒起），
 * 雷后那一句从雨的阵风低谷起（跟着 thunder 事件和 rain.ts 的 lull），轻笑接在它的尾巴上；第 2 镜在镜头结束前 1.2 秒停下。
 * 待定事项：说话段落的编排和隔墙截止频率是声音自己定的，设计负责人戴耳机听后可改 wallaLines、wallaViews 和 WALL_HIGH_PASS_HZ。
 */
import {
  curve,
  place,
  random,
  rate,
  reverb,
  seedFor,
  stereo,
} from "../../../src/kit/sound/dsp.ts";
import {
  synthesizeVoice,
  type VoicePoint,
} from "../../../src/kit/sound/voice.ts";
import type { EventTable, Stereo } from "../../../src/kit/sound/types.ts";
import { rainPlan } from "./rain.ts";

export type Speaker = "younger" | "older";

export type Line = {
  shot: number;
  slot: "opening" | "reply" | "closing" | "lull" | "laugh";
  speaker: Speaker;
  beats: number;
  contour: number;
  laugh?: boolean;
};

export const STOP_BEFORE_SHOT_END_SECONDS = 1.2;
export const TURNS_SECONDS_BETWEEN = 0.18;
export const LAUGH_TAIL_SECONDS = 0.32;

export const wallaShots = (table: EventTable) => {
  const thunder = table.events.find((event) => event.kind === "thunder");
  if (!thunder) throw new Error("屋里的说话需要 thunder 画面事件来定位镜头。");
  const index = table.shotTable.findIndex((shot) => shot.id === thunder.shotId);
  const shots = table.shotTable.slice(index, index + 2);
  if (shots.length !== 2)
    throw new Error("屋里的说话需要 thunder 所在镜头及其下一镜。");
  return shots.map((row) => ({
    id: row.id,
    from: row.startFrame,
    to: row.startFrame + row.durationInFrames,
  }));
};

export const wallaLines: readonly Line[] = [
  { shot: 0, slot: "opening", speaker: "older", beats: 5, contour: -0.6 },
  { shot: 0, slot: "reply", speaker: "younger", beats: 6, contour: 0.82 },
  { shot: 0, slot: "closing", speaker: "older", beats: 3, contour: 1.35 },
  { shot: 0, slot: "lull", speaker: "younger", beats: 5, contour: 1.76 },
  {
    shot: 0,
    slot: "laugh",
    speaker: "older",
    beats: 2,
    contour: 1.54,
    laugh: true,
  },
  { shot: 1, slot: "opening", speaker: "older", beats: 5, contour: -0.95 },
  { shot: 1, slot: "reply", speaker: "younger", beats: 4, contour: 0.4 },
  { shot: 1, slot: "closing", speaker: "older", beats: 2, contour: 1.1 },
];

export type PlacedLine = Line & { at: number; seconds: number };

export const placeLines = (
  table: EventTable,
  seed: number,
  seconds: number[],
): PlacedLine[] => {
  const [first, second] = wallaShots(table);
  const plan = rainPlan(table, seed);
  const lullStart = (plan.lull.fromFrame - first.from) / table.fps;
  const placed: PlacedLine[] = [];
  let cursor = -Infinity;
  wallaLines.forEach((line, i) => {
    let at: number;
    if (line.slot === "opening") at = line.shot === 0 ? 0.35 : 0.9;
    else if (line.slot === "lull") at = lullStart;
    else if (line.slot === "laugh")
      at = placed.at(-1)!.at + placed.at(-1)!.seconds - LAUGH_TAIL_SECONDS;
    else at = cursor + TURNS_SECONDS_BETWEEN;
    cursor = at + seconds[i];
    placed.push({ ...line, at, seconds: seconds[i] });
  });
  for (const [i, line] of placed.entries()) {
    const shot = [first, second][line.shot];
    const limit =
      (shot.to - shot.from) / table.fps -
      (line.shot === 1 ? STOP_BEFORE_SHOT_END_SECONDS : 0);
    if (line.at < 0 || line.at + line.seconds > limit)
      throw new Error(
        `屋里的说话第 ${i + 1} 句（${line.slot}）超出镜头：${line.at.toFixed(2)}–${(line.at + line.seconds).toFixed(2)} 秒，镜头内可用到 ${limit.toFixed(2)} 秒。`,
      );
  }
  return placed;
};

export const SYLLABLE_SECONDS: Record<Speaker, number> = {
  younger: 0.16,
  older: 0.25,
};
export const GAP_SECONDS: Record<Speaker, number> = {
  younger: 0.045,
  older: 0.075,
};

const utterance = (
  seed: number,
  speaker: Speaker,
  beats: number,
  contour: number,
  laugh: boolean,
) => {
  const rng = random(seed);
  const older = speaker === "older";
  const register = older ? 126 : 184;
  const points: VoicePoint[] = [{ at: 0, hz: register, level: 0, mouth: 0.12 }];
  const onsets: number[] = [];
  let at = 0;
  for (let i = 0; i < beats; i++) {
    const syllable = laugh
      ? 0.09 + 0.05 * rng()
      : SYLLABLE_SECONDS[speaker] * (0.7 + 0.6 * rng());
    const gap = laugh
      ? 0.03 + 0.03 * rng()
      : GAP_SECONDS[speaker] * (0.6 + 0.9 * rng());
    const hz =
      register *
      (1 + 0.28 * Math.sin(contour + (2.8 * i) / beats) + (rng() - 0.5) * 0.22);
    const mouth = 0.2 + 0.75 * rng();
    const level = 0.41 + 0.45 * rng();
    const nextMouth = Math.max(0.1, Math.min(1, mouth + (rng() - 0.5) * 0.7));
    const running = !laugh && rng() < 0.22 && i < beats - 1;
    onsets.push(at);
    points.push(
      { at: at + 0.022 + 0.015 * rng(), hz, level, mouth },
      {
        at: at + syllable * 0.55,
        hz: hz * (0.94 + 0.12 * rng()),
        level: level * (0.78 + 0.2 * rng()),
        mouth: nextMouth,
      },
      {
        at: at + syllable,
        hz: hz * (laugh ? 0.86 : 0.9 + 0.1 * rng()),
        level: running
          ? level * 0.5
          : i === beats - 1
            ? 0
            : 0.02 + 0.05 * rng(),
        mouth: running ? 0.3 + 0.3 * rng() : 0.12 + 0.1 * rng(),
      },
    );
    at += syllable + (running ? 0 : gap);
  }
  const clip = synthesizeVoice(
    points,
    {
      tractScale: older ? 0.92 : 1.04,
      breath: laugh ? 0.85 : older ? 0.32 : 0.18,
      driftCents: older ? 19 : 12,
    },
    seed,
  );
  let breath = 0;
  let band = 0;
  for (let i = 0; i < clip.samples.length; i++) {
    const white = rng() * 2 - 1;
    breath += 0.004 * (white - breath);
    band += 0.3 * (white - band);
    const t = i / rate;
    const onset = onsets.some((item) => t >= item && t < item + 0.02);
    clip.samples[i] += band * (onset ? 0.06 : 0) + breath * 0.02;
  }
  return clip;
};

export const wallaRoom = {
  t60: 0.24,
  preDelayMs: 3,
  earlyReflectionsMs: [7, 13, 23],
  highCutHz: 1420,
};

export type WallaView = {
  cutoffHz: number;
  stages: number;
  pan: number;
  db: number;
  wet: number;
};

export const wallaViews: readonly WallaView[] = [
  { cutoffHz: 1000, stages: 2, pan: 0.3, db: 0, wet: 0.25 },
  { cutoffHz: 600, stages: 3, pan: 0, db: -4, wet: 0.3 },
];

export const CROSSFADE_SECONDS = 0.1;

export const WALL_HIGH_PASS_HZ = 170;

const lowPass = (channel: Float64Array, hz: number, stages: number) => {
  const alpha = 1 - Math.exp((-2 * Math.PI * hz) / rate);
  const state = new Float64Array(stages);
  for (let i = 0; i < channel.length; i++) {
    state[0] += alpha * (channel[i] - state[0]);
    for (let k = 1; k < stages; k++)
      state[k] += alpha * (state[k - 1] - state[k]);
    channel[i] = state[stages - 1];
  }
};

const highPass = (channel: Float64Array, hz: number) => {
  const alpha = 1 - Math.exp((-2 * Math.PI * hz) / rate);
  let state = 0;
  for (let i = 0; i < channel.length; i++) {
    state += alpha * (channel[i] - state);
    channel[i] -= state;
  }
};

export type WallaRender = {
  output: Stereo;
  shots: { id: string; from: number; to: number }[];
  lines: PlacedLine[];
  shotRange: { from: number; to: number };
};

export const synthesizeWalla = (
  table: EventTable,
  seed: number,
  count: number,
  toSample: (frame: number) => number,
): WallaRender => {
  const shots = wallaShots(table);
  const clips = wallaLines.map((line, i) => ({
    line,
    clip: utterance(
      seedFor(seed, `walla/${i}`),
      line.speaker,
      line.beats,
      line.contour,
      Boolean(line.laugh),
    ),
  }));
  const placed = placeLines(
    table,
    seed,
    clips.map(({ clip }) => clip.samples.length / rate),
  );
  const output = stereo(count);
  const fade = Math.round(CROSSFADE_SECONDS * rate);
  shots.forEach((shot, index) => {
    const view = wallaViews[Math.min(index, wallaViews.length - 1)];
    const from = toSample(shot.from);
    const to = toSample(shot.to);
    const speech = stereo(count);
    for (const [i, line] of placed.entries())
      place(
        speech,
        { samples: clips[i].clip.samples, alignmentSample: 0 },
        from + Math.round(line.at * rate),
        line.speaker === "older" ? 0.9 : 1,
        view.pan,
      );
    for (const channel of speech) {
      highPass(channel, WALL_HIGH_PASS_HZ);
      lowPass(channel, view.cutoffHz, view.stages);
    }
    const wet = reverb(speech, wallaRoom, view.wet);
    for (let c = 0; c < 2; c++)
      for (
        let i = Math.max(0, from - fade);
        i < Math.min(count, to + fade);
        i++
      ) {
        const g =
          curve(
            [
              [from - fade, 0],
              [from + fade, 1],
              [to - fade, 1],
              [to + fade, 0],
            ],
            i,
          ) *
          10 ** (view.db / 20);
        output[c][i] += wet[c][i] * g;
      }
  });
  return {
    output,
    shots,
    lines: placed,
    shotRange: { from: toSample(shots[0].from), to: toSample(shots[1].to) },
  };
};

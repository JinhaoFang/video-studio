/** 把本期 theme 的钢琴高声部与亮灯解决音改为两遍连贯哼唱，闭口鼻音的时值、力度和滑音由调用方控制。供试听生成器使用。待定事项：无。 */
import {
  add,
  place,
  random,
  rate,
  reverb,
  stereo,
} from "../../../src/kit/sound/dsp.ts";
import { frequency } from "../../../src/kit/sound/score.ts";
import {
  synthesizeVoice,
  type VoicePoint,
} from "../../../src/kit/sound/voice.ts";
import { courtyard } from "./courtyard.ts";

type Note = {
  instrument: string;
  pitch?: string;
  beat: number;
  beats: number;
  velocity: number;
};
export type AuditionScore = {
  fps: number;
  phrases: { id: string; tempo: number; notes: Note[] }[];
};

export const hum = (score: AuditionScore) => {
  const phrase = (id: string) => {
    const found = score.phrases.find((item) => item.id === id);
    if (!found) throw new Error(`乐谱缺少乐句 ${id}。`);
    return found;
  };
  const rightHand = (note: Note): note is Note & { pitch: string } =>
    note.instrument === "piano_felt" &&
    !!note.pitch &&
    frequency(note.pitch) >= frequency("G4");
  const theme = phrase("theme").notes.filter(rightHand);
  const resolution = phrase("last").notes.find(rightHand);
  if (theme.length !== 13 || !resolution)
    throw new Error("试听需要主旋律 13 音与亮灯解决音。");
  const beat = 60 / phrase("hum").tempo;
  const downbeat = theme[0].beat - 0.5;
  const last = theme[theme.length - 1];
  const melody = [
    ...theme,
    { ...resolution, beat: last.beat + last.beats, beats: 1 },
  ];
  const endBeat = melody[13].beat + melody[13].beats - downbeat;
  const bed = courtyard(2 * endBeat * beat + 0.2, 184, false);
  const dry = stereo(bed[0].length);
  for (const pass of [0, 1]) {
    const rng = random(185 + pass);
    const points: VoicePoint[] = [];
    const first = (melody[0].beat - downbeat) * beat;
    for (const [i, note] of melody.entries()) {
      const hz = frequency(note.pitch) / 2;
      const at =
        (note.beat - downbeat) * beat -
        first +
        (i === 0 ? 0 : (2 * rng() - 1) / score.fps);
      const mouth = i === 0 && pass === 0 ? 0.28 : 0.03 + 0.04 * rng();
      const level = note.velocity * (0.93 + 0.07 * rng());
      if (i === 0) points.push({ at, hz, level: 0, mouth });
      else {
        const previous = points[points.length - 1];
        points.push({
          ...previous,
          at: at - 0.055,
          level: previous.level * 0.86,
        });
      }
      points.push(
        { at: at + 0.055, hz, level, mouth },
        { at: at + 0.18, hz, level: level * 0.94, mouth: 0.03 },
      );
    }
    const end = endBeat * beat - first;
    const final = points[points.length - 1];
    points.push(
      { ...final, at: end - 0.22, level: final.level * 0.8 },
      { ...final, at: end, level: 0 },
    );
    const clip = synthesizeVoice(
      points,
      { tractScale: 1, breath: 0.06, driftCents: 10 },
      212 + pass,
    );
    place(dry, clip, Math.round((first + pass * endBeat * beat) * rate), 0.67);
  }
  add(
    bed,
    reverb(
      dry,
      {
        t60: 0.33,
        preDelayMs: 12,
        earlyReflectionsMs: [16, 31],
        highCutHz: 2800,
      },
      0.14,
    ),
  );
  return bed;
};

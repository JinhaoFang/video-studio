/** 本期试听的院子空气声与第 1 镜的瓦面雨声、隔墙交谈。每轮答话有独立的音高、口形和时值曲线，合成两人后再过木墙并定位。待定事项：无。 */
import {
  add,
  place,
  random,
  rate,
  reverb,
  stereo,
} from "../../../src/kit/sound/dsp.ts";
import {
  synthesizeVoice,
  type VoicePoint,
} from "../../../src/kit/sound/voice.ts";

export const courtyard = (seconds: number, seed: number, raining: boolean) => {
  const bed = stereo(Math.round(seconds * rate));
  for (const [side, samples] of bed.entries()) {
    const rng = random(seed + side);
    let wind = 0,
      spray = 0;
    for (let i = 0; i < samples.length; i++) {
      const white = 2 * rng() - 1;
      wind += 0.038 * (white - wind);
      spray += 0.5 * (white - spray);
      const t = i / rate;
      samples[i] += wind * 0.055 * (1 + 0.17 * Math.sin(t * 1.23 + side));
      if (!raining) continue;
      samples[i] +=
        (0.15 * spray + 0.08 * wind) * (0.9 + 0.1 * Math.sin(t * 0.89));
      if (rng() < 73 / rate) {
        const hz = 490 + 2500 * rng(),
          gain = 0.02 + 0.07 * rng();
        for (let j = 0; j < 950 && i + j < samples.length; j++) {
          const dt = j / rate;
          samples[i + j] +=
            gain *
            Math.sin(2 * Math.PI * hz * dt * (1 + 9 * dt)) *
            Math.exp(-280 * dt);
        }
      }
    }
  }
  return bed;
};

const utterance = (
  seed: number,
  older: boolean,
  beats: number,
  contour: number,
  laugh: boolean,
) => {
  const rng = random(seed);
  const register = older ? 126 : 184;
  const points: VoicePoint[] = [{ at: 0, hz: register, level: 0, mouth: 0.12 }];
  let at = 0;
  for (let i = 0; i < beats; i++) {
    const length = laugh
      ? 0.12 + 0.07 * rng()
      : (older ? 0.29 : 0.17) * (0.72 + rng());
    const hz =
      register *
      (1 + 0.28 * Math.sin(contour + (2.8 * i) / beats) + (rng() - 0.5) * 0.2);
    const mouth = 0.25 + 0.7 * rng(),
      level = 0.41 + 0.45 * rng();
    points.push(
      { at: at + (0.21 + 0.18 * rng()) * length, hz, level, mouth },
      {
        at: at + length * 0.76,
        hz: hz * (0.91 + 0.17 * rng()),
        level: level * (0.6 + 0.32 * rng()),
        mouth: mouth * (0.45 + 0.5 * rng()),
      },
    );
    at += length;
    points.push({
      at,
      hz: hz * (laugh ? 0.88 : 0.96),
      level: i === beats - 1 ? 0 : level * (laugh ? 0.05 : 0.12 + 0.5 * rng()),
      mouth: 0.14 + 0.32 * rng(),
    });
  }
  return synthesizeVoice(
    points,
    {
      tractScale: older ? 0.92 : 1.04,
      breath: laugh ? 0.85 : older ? 0.32 : 0.18,
      driftCents: older ? 19 : 12,
    },
    seed,
  );
};

export const walla = () => {
  const bed = courtyard(10, 186, true);
  const voices = stereo(bed[0].length);
  const turns = [
    { at: 0.34, older: false, beats: 6, contour: -0.6 },
    { at: 2.03, older: true, beats: 5, contour: 1.35 },
    { at: 3.96, older: false, beats: 8, contour: 0.82 },
    { at: 5.75, older: true, beats: 2, contour: 1.54, laugh: true },
    { at: 6.38, older: true, beats: 6, contour: -0.95 },
    { at: 8.46, older: false, beats: 4, contour: 1.76 },
  ];
  for (const [i, turn] of turns.entries()) {
    const clip = utterance(
      4908 + i * 977,
      turn.older,
      turn.beats,
      turn.contour,
      !!turn.laugh,
    );
    place(
      voices,
      clip,
      Math.round(turn.at * rate),
      turn.older ? 0.21 : 0.15,
      0.3,
    );
  }
  const room = reverb(
    voices,
    {
      t60: 0.24,
      preDelayMs: 3,
      earlyReflectionsMs: [7, 13, 23],
      highCutHz: 1420,
    },
    0.25,
  );
  const alpha = 1 - Math.exp((-2 * Math.PI * 890) / rate);
  for (const channel of room) {
    let first = 0,
      second = 0;
    for (let i = 0; i < channel.length; i++) {
      first += alpha * (channel[i] - first);
      second += alpha * (first - second);
      channel[i] = second;
    }
  }
  add(bed, room);
  return bed;
};

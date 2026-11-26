/** 把第 1、2、4 声按从弱到受惊、再到回应的顺序放在同一空气声上，保持可对比的电平。供试听生成器使用。待定事项：无。 */
import { synthesizeChirp } from "../../../src/kit/sound/chirp.ts";
import {
  add,
  place,
  rate,
  reverb,
  stereo,
} from "../../../src/kit/sound/dsp.ts";
import { courtyard } from "./courtyard.ts";

export const calls = () => {
  const bed = courtyard(3, 187, false);
  const dry = stereo(bed[0].length);
  const contact = (seconds: number, top: number) =>
    synthesizeChirp(
      seconds,
      [
        [0, 3100],
        [0.19, top],
        [0.32, top * 0.96],
        [0.65, 3700],
        [1, 3050],
      ],
      [1, 0.075],
    );
  place(dry, contact(0.047, 5050), Math.round(0.48 * rate), 0.072);
  for (const [index, pitch] of [2420, 2670].entries()) {
    const note = synthesizeChirp(
      0.048 - 0.005 * index,
      [
        [0, pitch * 0.83],
        [0.16, pitch],
        [0.59, pitch * 0.97],
        [1, pitch * 0.8],
      ],
      [0.78, 0.63, 0.35, 0.12],
    );
    place(
      dry,
      note,
      Math.round((1.36 + index * 0.08) * rate),
      0.39 - index * 0.04,
    );
  }
  place(dry, contact(0.066, 5860), Math.round(2.34 * rate), 0.24);
  add(
    bed,
    reverb(
      dry,
      {
        t60: 0.19,
        preDelayMs: 4,
        earlyReflectionsMs: [9, 17],
        highCutHz: 4800,
      },
      0.2,
    ),
  );
  return bed;
};

/** 小样的成片规格和镜头时间表，供生成器和合成共同取用。 */
import { filmDuration, type ShotRow } from "../../src/kit/shots.ts";

export const fps = 24;
export const width = 1920;
export const height = 1080;
export const sampleSize = { width, height, durationInFrames: 4 };
export const shotTable: readonly ShotRow[] = [
  { id: "S1", startFrame: 0, durationInFrames: 168 },
  { id: "S2", startFrame: 168, durationInFrames: 144 },
];
export const durationInFrames = filmDuration(shotTable);

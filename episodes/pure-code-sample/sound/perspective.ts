/** 小样的声音运动设计。振翅逐拍向右远去，抖羽左右交替。 */
import type { Perspective } from "../../../src/kit/sound/mix.ts";

export const perspective: Perspective = (name, ordinal) => {
  if (name === "wing_flap")
    return {
      panOffset: ordinal * 0.15,
      dbOffset: -ordinal * 3,
      cutoffHz: 7000 * 0.76 ** ordinal,
      wet: 0.12 + ordinal * 0.06,
      far:
        ordinal > 0
          ? { scene: "garden", distance: Math.min(1, ordinal / 4) }
          : undefined,
    };
  if (name === "feather_shake")
    return { panOffset: ordinal % 2 ? 0.15 : -0.15 };
  return {};
};

/** 竹竿上的表演，按画张排眼神、重心、尾羽与寒战。返回的腾空高度以米计，脚的栖点单独投影。 */
import { drawing, mix, progress } from "../../../../src/kit/engine/timing.ts";
import { restPose } from "../../sparrow.ts";
import type { Pose } from "../../sparrow.ts";
import {
  S02_CALL_WEAK as call,
  S02_CLAW_SHIFT as hop,
  S02_GLANCE as glance,
  S02_HUDDLE as huddle,
  S02_SHIVER as shake,
  S02_WING_LIFT as wing,
} from "./timing.ts";

export const wetHuddle: Pose = {
  ...restPose,
  wet: 1,
  puff: 0.08,
  crouch: 0.34,
  bodyPitch: 0.24,
  headPitch: -0.22,
  headYaw: 0.06,
  eyeOpen: 0.52,
  glint: 0.2,
};
const listen: Pose = {
  ...wetHuddle,
  crouch: 0.16,
  bodyPitch: 0.42,
  headPitch: 0.18,
  headYaw: 0.42,
  eyeOpen: 0.92,
  glint: 0.34,
};
const lifted: Pose = {
  ...listen,
  bodyPitch: 0.34,
  headPitch: 0.1,
  wingSpread: 0.24,
  wingFlap: 0.22,
};
const chilled: Pose = {
  ...wetHuddle,
  crouch: 0.38,
  puff: 0.24,
  headRoll: 0.22,
  eyeOpen: 0.18,
  glint: 0.15,
};
const poses: readonly [number, Pose][] = [
  [0, wetHuddle],
  [glance - 4, wetHuddle],
  [glance - 2, { ...wetHuddle, eyeOpen: 0.78 }],
  [glance - 1, { ...wetHuddle, eyeOpen: 0.78 }],
  [glance, { ...wetHuddle, headYaw: 0.03, headPitch: -0.19, eyeOpen: 0.88 }],
  [glance + 4, { ...listen, bodyPitch: 0.25, crouch: 0.32, headPitch: 0.11 }],
  [glance + 8, { ...listen, headPitch: 0.22 }],
  [glance + 12, listen],
  [call - 2, listen],
  [call, { ...listen, beakOpen: 0.36 }],
  [hop, { ...listen, beakOpen: 0.18, crouch: 0.44, bodyPitch: 0.24 }],
  [hop + 2, { ...listen, stretch: 0.06, tailLift: 0.18, legReach: -0.12 }],
  [hop + 4, { ...listen, tailLift: 0.08, legReach: 0.2 }],
  [hop + 6, { ...listen, crouch: 0.44, bodyPitch: 0.28, tailLift: -0.12 }],
  [hop + 10, { ...listen, crouch: 0.22, tailLift: 0.1 }],
  [hop + 12, listen],
  [wing, { ...listen, wingSpread: 0.07 }],
  [wing + 2, { ...lifted, wingSpread: 0.15 }],
  [wing + 4, lifted],
  [shake - 2, lifted],
  [shake, { ...chilled, wingSpread: 0.19, headRoll: 0.08 }],
  [shake + 1, { ...chilled, bodyPitch: 0.18, headRoll: 0.18 }],
  [
    shake + 2,
    {
      ...chilled,
      wingSpread: 0.26,
      wingFlap: 0.32,
      wingSmear: 0.74,
      stretch: 0.06,
      headRoll: -0.2,
    },
  ],
  [shake + 3, { ...chilled, headRoll: -0.26, tailLift: 0.23 }],
  [
    shake + 4,
    {
      ...chilled,
      wingSpread: 0.18,
      wingFlap: -0.25,
      wingSmear: 0.56,
      headRoll: 0.16,
    },
  ],
  [shake + 5, { ...chilled, headRoll: 0.2, tailLift: -0.18 }],
  [shake + 7, { ...chilled, headRoll: -0.08 }],
  [shake + 8, chilled],
  [huddle - 2, chilled],
  [huddle, { ...chilled, puff: 0.22, headPitch: -0.2 }],
  [huddle + 6, { ...wetHuddle, headRoll: 0.06, tailLift: -0.13, puff: 0.17 }],
  [huddle + 14, { ...wetHuddle, tailLift: 0.04 }],
  [huddle + 20, wetHuddle],
];

export const birdAt = (frame: number) => {
  const f =
    frame >= shake && frame <= shake + 8 ? frame : drawing(frame, 2).frame;
  let i = 0;
  while (i + 1 < poses.length && poses[i + 1][0] <= f) i++;
  const [start, from] = poses[i],
    [end, to] = poses[Math.min(i + 1, poses.length - 1)];
  const pose = { ...from };
  const u = end === start ? 0 : progress(f, start, end);
  for (const key of Object.keys(from) as (keyof Pose)[]) {
    if (key !== "legs") pose[key] = mix(from[key] ?? 0, to[key] ?? 0, u);
  }
  const blink = Math.max(0, 1 - Math.abs(f - 14) / 4);
  if (f < glance - 6) {
    pose.eyeOpen = wetHuddle.eyeOpen * (1 - blink);
    pose.headPitch = wetHuddle.headPitch;
  }
  pose.crouch += 0.018 * (1 - Math.cos((f * Math.PI) / 21));
  const shift = progress(f, hop, hop + 6);
  return {
    pose,
    shift: shift * 0.014,
    height: 0.028 * 4 * shift * (1 - shift),
    drawing:
      from === to || f === start
        ? poses.findIndex(([, p]) => p === from) + 1
        : f + 150,
  };
};

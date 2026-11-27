/** 「转」的表演。脚爪为支点，以同一组变向帧驱动甩头、躯干与晚一拍的羽端，再逐张晒干、睁眼、起跳和回应。 */
import {
  drawing,
  ease,
  mix,
  progress,
} from "../../../../src/kit/engine/timing.ts";
import {
  restPose,
  sparrowPoses,
  sparrowStates,
  transitionSparrowState,
  type Pose,
} from "../../sparrow.ts";
import {
  S07_BLINK,
  S07_PUFF,
  S07_SHAKE_1,
  S07_SHAKE_2,
  S07_SHAKE_3,
  S08_BLINK_1,
  S08_BLINK_2,
  S09_CALL_CLEAR,
  S09_CLAW_SHIFT,
  S09_COMPANION_CALL,
  S09_EYE_OPEN,
  S09_LOOK_START,
  S09_LOOK_UP,
} from "./timing.ts";

const interval = (f: number, a: number, b: number) => ease(progress(f, a, b));
const pulse = (f: number, a: number, b: number, c: number) =>
  interval(f, a, b) - interval(f, b, c);
const blink = (f: number, at: number) => pulse(f, at - 4, at, at + 6);

const wetSide = {
  ...restPose,
  ...sparrowStates.wet,
  bodyPitch: 0.36,
  crouch: 0.14,
  headPitch: -0.06,
  eyeOpen: 0.85,
  glint: 0.65,
};
const ball = {
  ...restPose,
  ...sparrowStates.ruffled,
  bodyPitch: 0.44,
  crouch: 0.08,
  headPitch: 0.04,
  eyeOpen: 1.12,
  glint: 0.72,
};
const dry = {
  ...sparrowPoses.sunbathe,
  ...sparrowStates.dry,
  puff: 0.12,
  eyeOpen: 0.46,
  glint: 0.52,
};

const turn = (f: number, hits: readonly number[], end: number) => {
  const keys = [hits[0] - 2, ...hits, end];
  if (f <= keys[0] || f >= end) return 0;
  const j = keys.findIndex((k) => k > f);
  const swing = (i: number) =>
    i === 0 || i === keys.length - 1 ? 0 : i % 2 ? 1 : -1;
  return mix(swing(j - 1), swing(j), progress(f, keys[j - 1], keys[j]));
};

export const shakePose = (frame: number) => {
  const rapid = [
    [S07_SHAKE_1[0], 16],
    [S07_SHAKE_2[0], 38],
    [S07_SHAKE_3[0], 74],
  ].some(([a, b]) => frame >= a && frame <= b);
  const f = rapid ? frame : drawing(frame, 2).frame;
  if (f >= S07_PUFF)
    return {
      pose: {
        ...ball,
        eyeOpen: ball.eyeOpen * (1 - blink(f, S07_BLINK)),
        tailLift: -0.12 * (1 - interval(f, S07_PUFF, S07_PUFF + 4)),
      },
      drawing: 10,
    };
  const first = turn(f, S07_SHAKE_1, 18);
  const body = (t: number) =>
    turn(t, S07_SHAKE_2, 40) * 0.68 + turn(t, S07_SHAKE_3, 74);
  const head = first * 0.72 + body(f - 1);
  const feathers = body(f - 2);
  const load =
    pulse(f, 6, 8, 12) * 0.2 +
    pulse(f, 22, 26, 30) * 0.32 +
    pulse(f, 50, 56, 74);
  const ruffle =
    0.12 * interval(f, 10, 18) +
    0.18 * interval(f, 28, 40) +
    0.7 * interval(f, 52, S07_PUFF);
  const smear = f >= 57 && f < 72 && f % 2 ? 0.72 : 0;
  const pose: Pose = {
    ...wetSide,
    ruffle,
    crouch: 0.14 + 0.26 * load,
    bodyPitch: 0.36 + 0.15 * body(f),
    headYaw: 0.33 * head,
    headRoll: 0.45 * head,
    headPitch: -0.06 - 0.14 * load + 0.12 * head,
    tailLift: 0.22 * feathers,
    wingSpread: 0.11 * Math.abs(feathers) + (f >= 54 && f < 74 ? 0.24 : 0),
    wingFold: 0.72,
    wingFlap: 0.5 * feathers,
    wingSweep: 0.28 * feathers,
    wingSmear: smear,
    eyeOpen:
      wetSide.eyeOpen -
      0.72 * Math.max(Math.abs(head), Math.abs(body(f)), load),
  };
  return { pose, drawing: rapid ? f : 1 };
};

export const baskPose = (frame: number): Pose => {
  const f = drawing(frame, 2).frame;
  const dryness = ease(0.5 * (progress(f, 0, 60) + progress(f, 60, 110)));
  const breath =
    pulse(f, 8, 20, 38) +
    0.78 * pulse(f, 54, 68, 84) +
    0.66 * pulse(f, 100, 112, 130);
  return {
    ...dry,
    ...transitionSparrowState(
      sparrowStates.ruffled,
      sparrowStates.dry,
      dryness,
    ),
    puff: 0.12 * dryness + 0.052 * breath,
    bodyPitch: mix(ball.bodyPitch, dry.bodyPitch, dryness),
    headPitch: mix(ball.headPitch, dry.headPitch, dryness),
    tailLift: dry.tailLift + 0.024 * pulse(f, 24, 32, 42),
    eyeOpen: dry.eyeOpen * (1 - blink(f, S08_BLINK_1) - blink(f, S08_BLINK_2)),
  };
};

export const lookBeat = (frame: number) => {
  const f = drawing(frame, 2).frame;
  const look = interval(f, S09_LOOK_START, S09_LOOK_UP);
  const open = interval(f, S09_EYE_OPEN - 2, S09_EYE_OPEN + 4);
  const hop = f - S09_CLAW_SHIFT;
  const airborne = progress(hop, 2, 6);
  const rise = 4 * airborne * (1 - airborne);
  const listen = pulse(
    f,
    S09_COMPANION_CALL + 2,
    S09_COMPANION_CALL + 6,
    S09_CLAW_SHIFT,
  );
  const pose: Pose = {
    ...dry,
    bodyPitch:
      mix(dry.bodyPitch, sparrowPoses.lookUp.bodyPitch, look) -
      0.16 * pulse(hop, -2, 2, 6),
    headPitch:
      mix(dry.headPitch, sparrowPoses.lookUp.headPitch, look) -
      0.08 * pulse(f, 14, 18, S09_LOOK_START + 2),
    headYaw:
      mix(dry.headYaw, sparrowPoses.lookUp.headYaw, look) + 0.08 * listen,
    puff: 0.12 * (1 - look),
    crouch: 0.32 * pulse(hop, -2, 2, 4) + 0.24 * pulse(hop, 4, 8, 12),
    eyeOpen: mix(dry.eyeOpen, 1, open),
    glint: f >= S09_LOOK_UP ? 1 : 0.52 * (1 - open),
    sparkle: Number(f >= S09_LOOK_UP),
    tailLift: -0.04 + 0.16 * pulse(hop, 2, 8, 14),
    toeSpread: 0.38 * rise,
    beakOpen:
      f >= S09_CALL_CLEAR && f < S09_CALL_CLEAR + 6
        ? f === S09_CALL_CLEAR + 2
          ? 0.44
          : 0.24
        : 0,
  };
  return { pose, shift: 0.01 * airborne, height: 0.018 * rise };
};

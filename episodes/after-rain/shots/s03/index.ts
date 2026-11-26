/**
 * 第 3 镜（承）：直接引用小样 S1 的实现（不复制、不改动小样代码），只替换为 s03Timing 并将后期覆盖交给正片 grade.ts 的第 30–100 帧雨色→夕光过渡。
 * 待定事项：无。
 */
import type { Shot } from "../../../../src/kit/shots.ts";
import { s1 } from "../../../pure-code-sample/shots/s1/index.ts";
import type { Surface } from "../../stage.ts";
import { s03Timing } from "./timing.ts";

export const s03: Shot<Surface> = {
  ...s03Timing,
  post: {},
  draw: s1.draw,
};

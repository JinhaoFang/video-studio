/**
 * 正片全部 12 个镜头的时间与事件汇总清单：不依赖浏览器 API，供 Node 端生成器与测试导入。
 * 待定事项：无。
 */
import type { ShotTiming } from "../../../src/kit/shots.ts";
import { s01Timing, s02Timing } from "./s01-02/timing.ts";
import { s03Timing } from "./s03/timing.ts";
import { s04Timing, s05Timing, s06Timing } from "./s04-06/timing.ts";
import { s07Timing, s08Timing, s09Timing } from "./s07-09/timing.ts";
import { s10Timing, s11Timing } from "./s10-11/timing.ts";
import { s12Timing } from "./s12/timing.ts";

export const shotTimings: readonly ShotTiming[] = [
  s01Timing,
  s02Timing,
  s03Timing,
  s04Timing,
  s05Timing,
  s06Timing,
  s07Timing,
  s08Timing,
  s09Timing,
  s10Timing,
  s11Timing,
  s12Timing,
];

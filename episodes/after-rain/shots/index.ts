/**
 * 《雨后》正片 12 个镜头的登记表：#185 建好，之后镜头工单（#187–#191）各自在自己的目录替换实现，不改本文件。
 * 待定事项：无。
 */
import type { Shot } from "../../../src/kit/shots.ts";
import type { Surface } from "../stage.ts";
import { s01, s02 } from "./s01-02/index.ts";
import { s03 } from "./s03/index.ts";
import { s04, s05, s06 } from "./s04-06/index.ts";
import { s07, s08, s09 } from "./s07-09/index.ts";
import { s10, s11 } from "./s10-11/index.ts";
import { s12 } from "./s12/index.ts";

export type ShotKey =
  | "s01"
  | "s02"
  | "s03"
  | "s04"
  | "s05"
  | "s06"
  | "s07"
  | "s08"
  | "s09"
  | "s10"
  | "s11"
  | "s12";

export const shots: Record<ShotKey, Shot<Surface>> = {
  s01,
  s02,
  s03,
  s04,
  s05,
  s06,
  s07,
  s08,
  s09,
  s10,
  s11,
  s12,
};

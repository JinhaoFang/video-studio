/**
 * 第 3 镜时间数据：直接引用小样 S1 的 s1Timing，不修改、不复制小样代码；仅改编号为 s03 并追加第 158 帧的画外 mud_step（3→4 J 切声音先行）。
 * 待定事项：#188 调整第 4 镜步频时由设计负责人同步更新 MUD_STEP_PRELAP。
 */
import { timeShot } from "../../model.ts";
import { s1Timing } from "../../../pure-code-sample/shots/s1/timing.ts";

export const MUD_STEP_PRELAP = 158;

export const s03Timing = timeShot({
  id: "s03",
  events: [
    ...s1Timing.events,
    {
      frame: MUD_STEP_PRELAP,
      kind: "mud_step",
      description: "画外：远处传来第一声胶鞋陷泥（3→4 J 切的声音先行）",
    },
  ],
});

/**
 * S2 A 版的 Node/浏览器共用镜头元数据；表演事件从原 choreography.ts 迁出。
 * pole_drip 是 effects.ts 里 POLE_DROPS 按弹道落到地面（z=0）的帧：第 78、79 帧甩下的两颗在第 93、94 帧落地，合成一声记在 93；第 81 帧的落在 96，第 85 帧的落在 100。改了水珠的释放帧或初速要重算。
 */
import type { ShotTiming } from "../../model.ts";

export const DURATION = 144;
export const s2Timing: ShotTiming = {
  id: "S2",
  durationInFrames: DURATION,
  events: [
    { frame: 6, kind: "flinch", description: "被水珠惊到后收紧一缩" },
    { frame: 10, kind: "shake", description: "第一次向右急甩头抖水" },
    { frame: 14, kind: "shake", description: "第二次向左急甩头抖水" },
    { frame: 18, kind: "shake", description: "第三次向右大甩身抖水" },
    { frame: 21, kind: "shake", description: "第四次回甩收尾甩出残水" },
    { frame: 22, kind: "puff", description: "抖干后浑身羽毛蓬成圆团" },
    { frame: 24, kind: "hush", description: "蓬起停住，故意留白静默开始" },
    {
      frame: 48,
      kind: "look_up",
      description: "抬头望向画右上方的夕光，眼中亮起光点",
    },
    { frame: 64, kind: "crouch", description: "起飞前压低身子蓄力" },
    { frame: 77, kind: "takeoff", description: "小爪蹬离竹竿跃入夕光" },
    {
      frame: 78,
      kind: "pole_spring",
      description: "竹竿被蹬下沉后首次猛然弹回",
    },
    { frame: 80, kind: "wingbeat", description: "第一次振翅下扑" },
    { frame: 84, kind: "wingbeat", description: "第二次振翅下扑" },
    { frame: 88, kind: "wingbeat", description: "第三次振翅下扑" },
    { frame: 92, kind: "wingbeat", description: "第四次振翅下扑" },
    { frame: 96, kind: "wingbeat", description: "第五次振翅下扑" },
    { frame: 93, kind: "pole_drip", description: "竹竿甩下的第一批水珠落地" },
    { frame: 96, kind: "pole_drip", description: "竹竿甩下的第二颗水珠落地" },
    { frame: 100, kind: "pole_drip", description: "竹竿甩下的第三颗水珠落地" },
    {
      frame: 114,
      kind: "settle",
      description: "相机缓缓停稳在空竹竿与暖金夕光上",
    },
  ],
};

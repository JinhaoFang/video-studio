/**
 * 第 12 镜（尾）的时间数据与画面事件：对齐 storyboard.md「镜头内的锚点」与 contract.md 第 4 节。
 * 片名组件（#183）尚未合并，片名画面留空，title_dot 与 seal_press 按 storyboard 帧号先在此声明。
 * 不依赖浏览器，供镜头渲染、生成器与测试共用。
 * 待定事项：#183 合并后由 #191 接入片名组件并复用其导出的相对帧号。
 */
import { ease, progress } from "../../../../src/kit/engine/timing.ts";
import { timeShot } from "../../model.ts";

export const S12_DISSOLVE_END = 24;
export const S12_LAMP_ON = 40;
export const S12_TITLE_START = 64;
export const S12_TITLE_DOTS = [90, 97, 104, 111] as const;
export const S12_SEAL_PRESS = 148;
export const S12_FADE_OUT = 196;

export const s12CameraProgress = (frame: number) =>
  ease(progress(frame, 12, 176), 2.2, 2.4);

export const s12Timing = timeShot({
  id: "s12",
  events: [
    { frame: S12_LAMP_ON, kind: "lamp_on", description: "屋里亮灯，暖光透过格子门落在空竹竿后" },
    ...S12_TITLE_DOTS.map((frame, i) => ({
      frame,
      kind: "title_dot",
      description: `片名「雨」的第 ${i + 1} 点落定`,
    })),
    { frame: S12_SEAL_PRESS, kind: "seal_press", description: "盖上「溯游」白文印" },
    { frame: S12_FADE_OUT, kind: "fade_out", description: "开始淡出到暮色最暗色，环境声同时淡出" },
  ],
});

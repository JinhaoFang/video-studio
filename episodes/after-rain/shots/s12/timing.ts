/** 第 12 镜的局部时间。亮灯和整幅淡出的第一帧已有可见变化，题字和落印的事件直接取书写组件的时间表。 */
import { progress } from "../../../../src/kit/engine/timing.ts";
import { timeShot } from "../../model.ts";
import { TITLE_FADE_START_FRAME, TITLE_START_OFFSET_SHOT12, titleEventsAtOffset } from "../../title/timing.ts";

export const S12_TITLE_START = TITLE_START_OFFSET_SHOT12;
const lampOn = 40;
const fadeOut = S12_TITLE_START + TITLE_FADE_START_FRAME;

export const s12Timing = timeShot({
  id: "s12",
  events: [
    { frame: lampOn, kind: "lamp_on", description: "屋里亮灯，暖光透过格子门落在空竹竿后" },
    ...titleEventsAtOffset(S12_TITLE_START).map((event, index) => ({
      ...event,
      description: event.kind === "title_dot" ? `片名「雨」的第 ${index + 1} 点落定` : "盖上「溯游」白文印",
    })),
    { frame: fadeOut, kind: "fade_out", description: "开始淡出到暮色最暗色，环境声同时淡出" },
  ],
});

export const lampIntensity = (frame: number) =>
  frame < lampOn ? 0 : 0.48 + 0.52 * progress(frame, lampOn, lampOn + 3);

export const fadeAmount = (frame: number) => progress(frame, fadeOut - 1, s12Timing.durationInFrames - 1);

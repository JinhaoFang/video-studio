/**
 * 片名「雨后」与署名「遡游」印章预览合成（216 帧，24 fps，1920×1080）。
 * 仅绘第 12 镜暮色天空分层背景（art.md 第 12 镜色值）与片名/印章，不绘屋子与竹竿（守住工单边界）；
 * 将镜头帧减去 TITLE_START_OFFSET_SHOT12（64）传给 drawTitleCard，使片名组件按相对起点定时，
 * 经由 kit 的 ShotPreview 与第 12 镜暮色后期参数输出，196–215 帧淡出至暮色最暗色 #1f1b30。待定事项：无。
 */
import { ShotPreview } from "../../../src/kit/samples/ShotPreview.tsx";
import type { Shot } from "../../../src/kit/shots.ts";
import { ease, progress } from "../../../src/kit/engine/timing.ts";
import { drawTitleCard, drawTwilightSkyBackdrop } from "./canvas.ts";
import {
  TITLE_FADE_END_FRAME,
  TITLE_FADE_START_FRAME,
  TITLE_START_OFFSET_SHOT12,
  titlePreviewTiming,
} from "./timing.ts";
import { twilightPost, twilightSky } from "./tokens.ts";

type TitleSurface = { context: CanvasRenderingContext2D };

const previewInputs = {};
const makeSurface = (context: CanvasRenderingContext2D): TitleSurface => ({ context });
const previewFadeStart = TITLE_START_OFFSET_SHOT12 + TITLE_FADE_START_FRAME;
const previewFadeEnd = TITLE_START_OFFSET_SHOT12 + TITLE_FADE_END_FRAME;

const titleShot: Shot<TitleSurface> = {
  ...titlePreviewTiming,
  post: twilightPost,
  draw: ({ context }, frame) => {
    const { width, height } = context.canvas;
    drawTwilightSkyBackdrop(context, width, height);
    drawTitleCard(context, frame - TITLE_START_OFFSET_SHOT12, { fade: false });
    if (frame >= previewFadeStart) {
      const t = ease(progress(frame, previewFadeStart, previewFadeEnd), 1.2, 1.4);
      context.save();
      context.globalAlpha = t;
      context.fillStyle = twilightSky.darkest;
      context.fillRect(0, 0, width, height);
      context.restore();
    }
  },
};

export const TitlePreview = () => (
  <ShotPreview
    shot={titleShot}
    defaults={twilightPost}
    inputs={previewInputs}
    surface={makeSurface}
  />
);

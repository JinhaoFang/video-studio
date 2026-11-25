/**
 * 镜头 S2「抖水起飞」A 版（#155）入口。
 * 按镜头接口导出 s2（编号 S2、144 帧、画面事件表、暖色黄昏后期覆盖、纯帧号绘制函数）：
 * 衔接 S1 末尾麻雀闭眼湿毛的状态，依次完成一缩、甩水、蓬起停住、睁眼眨眼、抬头看光、压身蓄力、蹬离振翅出画、
 * 空竹竿回弹甩水与相机停稳在夕光余韵上的完整表演。
 */
import type { Shot } from "../../model.ts";
import { drawPole } from "../../pole.ts";
import { backlight, drawSparrow } from "../../sparrow.ts";
import { placeSparrow } from "../../stage.ts";
import type { Surface } from "../../stage.ts";
import { drawTelephotoBackdrop } from "./backdrop.ts";
import {
  cameraAt,
  characterDrawing,
  poleBendAt,
  poleDrawing,
  sparrowAt,
} from "./choreography.ts";
import {
  drawActionSmear,
  drawAtmosphere,
  drawContactShadow,
  drawPoleDrops,
  drawShakeSpray,
} from "./effects.ts";

import { s2Timing } from "./timing.ts";

export const s2: Shot<Surface> = {
  ...s2Timing,
  post: {
    softFocus: 0.38,
    glowThreshold: 0.7,
    glow: 0.36,
    aberration: 1.5,
    vignette: 0.24,
    grain: 0.048,
    grainHighlight: 0.011,
  },
  draw: ({ context, plates }, frame) => {
    const camera = cameraAt(frame);
    drawTelephotoBackdrop(context, plates, camera, frame);

    const bend = poleBendAt(frame);
    drawPole(context, camera, {
      state: "dusk",
      drawing: poleDrawing(frame),
      bend,
      drops: 0,
    });
    drawPoleDrops(context, camera, frame);

    const state = sparrowAt(frame);
    if (state.visible) {
      const { index } = characterDrawing(frame);
      const place = placeSparrow(camera, state.feet, state.facing);
      drawContactShadow(context, camera, frame, place.ppu);
      drawActionSmear(context, state, place.x, place.y, place.ppu, frame, true);
      drawSparrow(
        context,
        {
          x: place.x,
          y: place.y,
          ppu: place.ppu,
          yaw: place.yaw,
          pitch: place.pitch,
          roll: state.roll,
          lighting: { ...backlight, direction: place.light },
          drawing: index,
          seed: 155,
        },
        state.pose,
      );
      drawActionSmear(context, state, place.x, place.y, place.ppu, frame, false);
    }

    drawShakeSpray(context, camera, frame);
    drawAtmosphere(context, camera, frame);
  },
};

/**
 * 载入烘焙好的五层底图的夕光（plates）和雨色（rain）两种状态（generate.ts 产出），全部解码后返回；读不到就中止渲染并提示先运行生成器。
 * 样张和镜头预览共用；素材只按登记过的字面路径用 staticFile 载入（纯代码护栏）。
 */
import { useEffect, useState } from "react";
import { cancelRender, staticFile } from "remotion";
import type { PlateImages } from "../../after-rain/stage.ts";

export type PlateSets = { plates: PlateImages; rain: PlateImages };

export const surface = (context: CanvasRenderingContext2D, images: PlateSets) => ({ context, ...images });

export const usePlates = () => {
  const [images, setImages] = useState<PlateSets | null>(null);
  useEffect(() => {
    const far = new Image();
    far.src = staticFile("episodes/pure-code-sample/plate-far-dusk.png");
    const field = new Image();
    field.src = staticFile("episodes/pure-code-sample/plate-field-dusk.png");
    const hedge = new Image();
    hedge.src = staticFile("episodes/pure-code-sample/plate-hedge-dusk.png");
    const yard = new Image();
    yard.src = staticFile("episodes/pure-code-sample/plate-yard-dusk.png");
    const eaves = new Image();
    eaves.src = staticFile("episodes/pure-code-sample/plate-eaves-dusk.png");
    const farRain = new Image();
    farRain.src = staticFile("episodes/pure-code-sample/plate-far-rain.png");
    const fieldRain = new Image();
    fieldRain.src = staticFile("episodes/pure-code-sample/plate-field-rain.png");
    const hedgeRain = new Image();
    hedgeRain.src = staticFile("episodes/pure-code-sample/plate-hedge-rain.png");
    const yardRain = new Image();
    yardRain.src = staticFile("episodes/pure-code-sample/plate-yard-rain.png");
    const eavesRain = new Image();
    eavesRain.src = staticFile("episodes/pure-code-sample/plate-eaves-rain.png");
    const all = [far, field, hedge, yard, eaves, farRain, fieldRain, hedgeRain, yardRain, eavesRain];
    Promise.all(all.map((image) => image.decode()))
      .then(() =>
        setImages({
          plates: { far, field, hedge, yard, eaves },
          rain: { far: farRain, field: fieldRain, hedge: hedgeRain, yard: yardRain, eaves: eavesRain },
        }),
      )
      .catch(() => cancelRender(new Error("底图读取失败，请先运行本期 generate.ts。")));
  }, []);
  return images;
};

/**
 * 载入烘焙好的五层夕光底图（generate.ts 产出），全部解码后返回；读不到就中止渲染并提示先运行生成器。
 * 样张和镜头预览共用；素材只按登记过的字面路径用 staticFile 载入（纯代码护栏）。
 */
import { useEffect, useState } from "react";
import { cancelRender, staticFile } from "remotion";
import type { PlateImages } from "../stage.ts";

export const usePlates = () => {
  const [images, setImages] = useState<PlateImages | null>(null);
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
    Promise.all([far, field, hedge, yard, eaves].map((image) => image.decode()))
      .then(() => setImages({ far, field, hedge, yard, eaves }))
      .catch(() => cancelRender(new Error("底图读取失败，请先运行本期 generate.ts。")));
  }, []);
  return images;
};

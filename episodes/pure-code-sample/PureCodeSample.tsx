/** PureCodeSample 的 Canvas → WebGL 合成入口；图像载入与逐帧绘制通过 delayRender 阻止空帧。 */
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Audio } from "@remotion/media";
import {
  AbsoluteFill,
  cancelRender,
  continueRender,
  delayRender,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { height, shotTable, width } from "./model";
import { createPost, placeholderShot } from "./shot";

export const PureCodeSample: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const canvas = useRef<HTMLCanvasElement>(null);
  const [background, setBackground] = useState<HTMLImageElement | null>(null);
  const [ready] = useState(() => delayRender("等待纯代码底图和 WebGL 首帧"));
  const initialized = useRef(false);
  const post = useRef<ReturnType<typeof createPost> | null>(null);

  useEffect(() => {
    const image = new Image();
    image.onload = () => setBackground(image);
    image.onerror = () =>
      cancelRender(new Error("底图读取失败，请先运行本期 generate.ts。"));
    image.src = staticFile("episodes/pure-code-sample/background.png");
    post.current = createPost(canvas.current!);
    return () => {
      image.onload = null;
      image.onerror = null;
      post.current?.dispose();
      post.current = null;
    };
  }, []);

  useLayoutEffect(() => {
    if (!background || !post.current) return;
    const handle = delayRender("等待纯代码帧绘制");
    try {
      const row = shotTable.find(
        (item) =>
          frame >= item.startFrame &&
          frame < item.startFrame + item.durationInFrames,
      );
      if (!row) throw new Error("当前帧不属于镜头时间表。");
      const source = document.createElement("canvas");
      source.width = width;
      source.height = height;
      const context = source.getContext("2d");
      if (!context) throw new Error("Canvas 2D 不可用。");
      const localFrame = frame - row.startFrame;
      placeholderShot.draw({ context, background }, localFrame);
      post.current.draw(source, localFrame, placeholderShot.post);
      if (!initialized.current) {
        initialized.current = true;
        continueRender(ready);
      }
      continueRender(handle);
    } catch (error) {
      cancelRender(error);
    }
  }, [background, frame, ready]);

  return (
    <AbsoluteFill>
      <canvas ref={canvas} width={width} height={height} />
      <Audio
        src={staticFile("episodes/pure-code-sample/mix.wav")}
        premountFor={fps}
      />
    </AbsoluteFill>
  );
};

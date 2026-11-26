/**
 * 样张合成共用的逐帧渲染：在 2D 离屏画布上按帧号作画，再交给摄影后期链画到合成里的 WebGL 画布上。
 * 首帧前用 delayRender 挡住；每帧画完才释放，不依赖时钟或运行状态。素材由调用方用 staticFile 载入后传进 inputs。
 * 待定事项：无。
 */
import { useLayoutEffect, useRef, useState } from "react";
import { cancelRender, continueRender, delayRender } from "remotion";
import { createPost } from "../engine/post.ts";
import type { Post } from "../engine/post.ts";

export const useFrame = <I>(
  canvas: React.RefObject<HTMLCanvasElement | null>,
  frame: number,
  inputs: I | null,
  render: (ctx: CanvasRenderingContext2D, frame: number, inputs: I) => void,
  post: Post,
) => {
  const [ready] = useState(() => delayRender("等待纯代码样张首帧"));
  const started = useRef(false);
  const chain = useRef<ReturnType<typeof createPost> | null>(null);
  useLayoutEffect(
    () => () => {
      chain.current?.dispose();
      chain.current = null;
    },
    [post.darkest],
  );
  useLayoutEffect(() => {
    if (inputs === null) return;
    const handle = delayRender(`绘制第 ${frame} 帧`);
    try {
      if (!chain.current) {
        chain.current = createPost(canvas.current!, post.darkest);
        console.log("WebGL 实测：", chain.current.renderer());
      }
      const target = canvas.current!;
      const source = document.createElement("canvas");
      source.width = target.width;
      source.height = target.height;
      const ctx = source.getContext("2d");
      if (!ctx) throw new Error("Canvas 2D 不可用。");
      const start = performance.now();
      render(ctx, frame, inputs);
      const painted = performance.now();
      chain.current.draw(source, frame, post);
      console.log(
        `帧耗时 ${frame}: 作画 ${(painted - start).toFixed(0)} ms，后期 ${(performance.now() - painted).toFixed(0)} ms`,
      );
      if (!started.current) {
        started.current = true;
        continueRender(ready);
      }
      continueRender(handle);
    } catch (error) {
      cancelRender(error);
    }
  }, [canvas, frame, inputs, post, ready, render]);
};

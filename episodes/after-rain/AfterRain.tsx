/**
 * 《雨后》正片全片装配合成入口：按 model.ts 的 shotTable 将 12 个镜头按帧装配、处理第 11→12 镜 24 帧叠化与各场后期链，
 * 并挂接 generate.ts 生成的 48 kHz 混音。绕开 src/kit/shots.ts 的 locateShot 单镜头假设以支持叠化重叠区间。
 * 待定事项：片名与署名组件（#183）合并后由 #191 接入 s12；正式声音由 #193 替换临时混音。
 */
import { Audio } from "@remotion/media";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  AbsoluteFill,
  cancelRender,
  continueRender,
  delayRender,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { createPost } from "../../src/kit/engine/post.ts";
import { mixPost, postForShot } from "./grade.ts";
import { activeShots, DISSOLVE_FRAMES, shotTable } from "./model.ts";
import { shots, type ShotKey } from "./shots/index.ts";
import { surfaceFromPlates, useShotPlates } from "./usePlates.ts";

export const AfterRain: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const hits = useMemo(() => activeShots(shotTable, frame), [frame]);
  const activeIds = useMemo(
    () => hits.map((h) => h.row.id as ShotKey),
    [hits],
  );
  const inputs = useShotPlates(activeIds);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [ready] = useState(() => delayRender("等待《雨后》底图解码与首帧绘制"));
  const started = useRef(false);
  const pendingHandle = useRef<number | null>(null);
  const chain = useRef<ReturnType<typeof createPost> | null>(null);
  const primaryRef = useRef<HTMLCanvasElement | null>(null);
  const secondaryRef = useRef<HTMLCanvasElement | null>(null);

  useLayoutEffect(
    () => () => {
      if (pendingHandle.current !== null) {
        continueRender(pendingHandle.current);
        pendingHandle.current = null;
      }
      chain.current?.dispose();
      chain.current = null;
    },
    [],
  );

  useLayoutEffect(() => {
    if (pendingHandle.current === null) {
      pendingHandle.current = delayRender(`绘制《雨后》第 ${frame} 帧`);
    }
    if (inputs === null) return;
    const handle = pendingHandle.current;
    pendingHandle.current = null;
    try {
      if (!chain.current) {
        chain.current = createPost(canvas.current!);
        console.log("WebGL 实测：", chain.current.renderer());
      }
      if (!primaryRef.current) {
        primaryRef.current = document.createElement("canvas");
      }
      const primary = primaryRef.current;
      if (primary.width !== width || primary.height !== height) {
        primary.width = width;
        primary.height = height;
      }
      const ctx = primary.getContext("2d");
      if (!ctx) throw new Error("Canvas 2D 不可用。");
      ctx.clearRect(0, 0, width, height);

      const start = performance.now();

      let post = postForShot(hits[0].row.id, hits[0].localFrame);
      if (hits.length === 1) {
        const key = hits[0].row.id as ShotKey;
        const shot = shots[key];
        shot.draw(surfaceFromPlates(ctx, inputs), hits[0].localFrame);
        post = postForShot(key, hits[0].localFrame, shot.post);
      } else {
        const firstKey = hits[0].row.id as ShotKey;
        const secondKey = hits[1].row.id as ShotKey;
        const firstShot = shots[firstKey];
        const secondShot = shots[secondKey];
        firstShot.draw(surfaceFromPlates(ctx, inputs), hits[0].localFrame);

        if (!secondaryRef.current) {
          secondaryRef.current = document.createElement("canvas");
        }
        const secondary = secondaryRef.current;
        if (secondary.width !== width || secondary.height !== height) {
          secondary.width = width;
          secondary.height = height;
        }
        const ctxB = secondary.getContext("2d");
        if (!ctxB) throw new Error("叠化 Canvas 2D 不可用。");
        ctxB.clearRect(0, 0, width, height);
        secondShot.draw(surfaceFromPlates(ctxB, inputs), hits[1].localFrame);

        const alpha = Math.max(
          0,
          Math.min(1, (hits[1].localFrame + 0.5) / DISSOLVE_FRAMES),
        );
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.drawImage(secondary, 0, 0);
        ctx.restore();

        const postA = postForShot(firstKey, hits[0].localFrame, firstShot.post);
        const postB = postForShot(secondKey, hits[1].localFrame, secondShot.post);
        post = mixPost(postA, postB, alpha);
      }

      const painted = performance.now();
      chain.current.draw(primary, frame, post);
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
  }, [frame, height, hits, inputs, ready, width]);

  return (
    <AbsoluteFill>
      <canvas ref={canvas} width={width} height={height} />
      <Audio src={staticFile("episodes/after-rain/mix.wav")} />
    </AbsoluteFill>
  );
};

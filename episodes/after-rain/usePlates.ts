/**
 * 按当前激活镜头按需载入并缓存《雨后》正片的 25 张烘焙底图（10 张共用院子五层雨/夕光底图 + 15 张正片新机位底图，含暮色屋灭灯底图与独立灯层）。
 * 所有路径均以字面量直接赋给 remotion 的 staticFile，满足纯代码护栏检查；模块级缓存保证整片渲染时每张底图最多解码一次，
 * 单帧出图时只解码当前镜头所需的 1–3 张底图（第 3 镜 10 张），显著降低单帧冷启动耗时。
 * 待定事项：无。
 */
import { useEffect, useMemo, useState } from "react";
import { cancelRender, staticFile } from "remotion";
import type { PlateId, ViewPlateId } from "./scene.ts";
import type { ShotKey } from "./shots/index.ts";
import type { PlateImages, Surface, ViewPlateImages } from "./stage.ts";

type SharedKey = `${PlateId}-${"dusk" | "rain"}`;
export type PlateKey = SharedKey | ViewPlateId;

const SHOT_PLATES: Record<ShotKey, readonly PlateKey[]> = {
  s01: ["house-sky-rain", "house-front-rain"],
  s02: ["closeup-s2"],
  s03: [
    "far-dusk",
    "field-dusk",
    "hedge-dusk",
    "yard-dusk",
    "eaves-dusk",
    "far-rain",
    "field-rain",
    "hedge-rain",
    "yard-rain",
    "eaves-rain",
  ],
  s04: ["low-s4"],
  s05: ["closeup-s5"],
  s06: ["low-s6"],
  s07: ["closeup-s7"],
  s08: ["closeup-s8-start", "closeup-s8-end"],
  s09: ["closeup-s9"],
  s10: ["house-takeoff"],
  s11: ["paddy-wide"],
  s12: ["house-sky-twilight", "house-front-twilight", "house-front-twilight-lamp"],
};

const createPlateImage = (key: PlateKey): HTMLImageElement => {
  const image = new Image();
  switch (key) {
    case "far-dusk":
      image.src = staticFile("episodes/after-rain/plate-far-dusk.png");
      return image;
    case "field-dusk":
      image.src = staticFile("episodes/after-rain/plate-field-dusk.png");
      return image;
    case "hedge-dusk":
      image.src = staticFile("episodes/after-rain/plate-hedge-dusk.png");
      return image;
    case "yard-dusk":
      image.src = staticFile("episodes/after-rain/plate-yard-dusk.png");
      return image;
    case "eaves-dusk":
      image.src = staticFile("episodes/after-rain/plate-eaves-dusk.png");
      return image;
    case "far-rain":
      image.src = staticFile("episodes/after-rain/plate-far-rain.png");
      return image;
    case "field-rain":
      image.src = staticFile("episodes/after-rain/plate-field-rain.png");
      return image;
    case "hedge-rain":
      image.src = staticFile("episodes/after-rain/plate-hedge-rain.png");
      return image;
    case "yard-rain":
      image.src = staticFile("episodes/after-rain/plate-yard-rain.png");
      return image;
    case "eaves-rain":
      image.src = staticFile("episodes/after-rain/plate-eaves-rain.png");
      return image;
    case "house-sky-rain":
      image.src = staticFile("episodes/after-rain/plate-house-sky-rain.png");
      return image;
    case "house-front-rain":
      image.src = staticFile("episodes/after-rain/plate-house-front-rain.png");
      return image;
    case "house-sky-twilight":
      image.src = staticFile("episodes/after-rain/plate-house-sky-twilight.png");
      return image;
    case "house-front-twilight":
      image.src = staticFile("episodes/after-rain/plate-house-front-twilight.png");
      return image;
    case "house-front-twilight-lamp":
      image.src = staticFile("episodes/after-rain/plate-house-front-twilight-lamp.png");
      return image;
    case "house-takeoff":
      image.src = staticFile("episodes/after-rain/plate-house-takeoff.png");
      return image;
    case "low-s4":
      image.src = staticFile("episodes/after-rain/plate-low-s4.png");
      return image;
    case "low-s6":
      image.src = staticFile("episodes/after-rain/plate-low-s6.png");
      return image;
    case "paddy-wide":
      image.src = staticFile("episodes/after-rain/plate-paddy-wide.png");
      return image;
    case "closeup-s2":
      image.src = staticFile("episodes/after-rain/plate-closeup-s2.png");
      return image;
    case "closeup-s5":
      image.src = staticFile("episodes/after-rain/plate-closeup-s5.png");
      return image;
    case "closeup-s7":
      image.src = staticFile("episodes/after-rain/plate-closeup-s7.png");
      return image;
    case "closeup-s8-start":
      image.src = staticFile("episodes/after-rain/plate-closeup-s8-start.png");
      return image;
    case "closeup-s8-end":
      image.src = staticFile("episodes/after-rain/plate-closeup-s8-end.png");
      return image;
    case "closeup-s9":
      image.src = staticFile("episodes/after-rain/plate-closeup-s9.png");
      return image;
  }
};

const decodedCache = new Map<PlateKey, HTMLImageElement>();
const inflightCache = new Map<PlateKey, Promise<HTMLImageElement>>();

const ensurePlate = (key: PlateKey): Promise<HTMLImageElement> => {
  const ready = decodedCache.get(key);
  if (ready) return Promise.resolve(ready);
  const existing = inflightCache.get(key);
  if (existing) return existing;
  const img = createPlateImage(key);
  const promise = img.decode().then(() => {
    decodedCache.set(key, img);
    inflightCache.delete(key);
    return img;
  });
  inflightCache.set(key, promise);
  return promise;
};

export type AfterRainPlates = {
  plates: PlateImages;
  rain: PlateImages;
  views: ViewPlateImages;
};

const buildPlatesSnapshot = (): AfterRainPlates => ({
  plates: {
    far: decodedCache.get("far-dusk")!,
    field: decodedCache.get("field-dusk")!,
    hedge: decodedCache.get("hedge-dusk")!,
    yard: decodedCache.get("yard-dusk")!,
    eaves: decodedCache.get("eaves-dusk")!,
  },
  rain: {
    far: decodedCache.get("far-rain")!,
    field: decodedCache.get("field-rain")!,
    hedge: decodedCache.get("hedge-rain")!,
    yard: decodedCache.get("yard-rain")!,
    eaves: decodedCache.get("eaves-rain")!,
  },
  views: {
    "house-sky-rain": decodedCache.get("house-sky-rain")!,
    "house-front-rain": decodedCache.get("house-front-rain")!,
    "house-sky-twilight": decodedCache.get("house-sky-twilight")!,
    "house-front-twilight": decodedCache.get("house-front-twilight")!,
    "house-front-twilight-lamp": decodedCache.get("house-front-twilight-lamp")!,
    "house-takeoff": decodedCache.get("house-takeoff")!,
    "low-s4": decodedCache.get("low-s4")!,
    "low-s6": decodedCache.get("low-s6")!,
    "paddy-wide": decodedCache.get("paddy-wide")!,
    "closeup-s2": decodedCache.get("closeup-s2")!,
    "closeup-s5": decodedCache.get("closeup-s5")!,
    "closeup-s7": decodedCache.get("closeup-s7")!,
    "closeup-s8-start": decodedCache.get("closeup-s8-start")!,
    "closeup-s8-end": decodedCache.get("closeup-s8-end")!,
    "closeup-s9": decodedCache.get("closeup-s9")!,
  },
});

export const surfaceFromPlates = (
  context: CanvasRenderingContext2D,
  images: AfterRainPlates,
): Surface => ({ context, ...images });

export const useShotPlates = (shotIds: readonly ShotKey[]): AfterRainPlates | null => {
  const keys = useMemo(() => {
    const needed: PlateKey[] = [];
    for (const id of shotIds) {
      for (const k of SHOT_PLATES[id]) {
        if (needed.indexOf(k) === -1) needed.push(k);
      }
    }
    return needed;
  }, [shotIds]);

  const allReady = keys.every((k) => decodedCache.has(k));
  const [, setVersion] = useState(0);

  useEffect(() => {
    const missing = keys.filter((k) => !decodedCache.has(k));
    if (!missing.length) return;
    let alive = true;
    Promise.all(missing.map(ensurePlate))
      .then(() => {
        if (alive) setVersion((v) => v + 1);
      })
      .catch(() =>
        cancelRender(
          new Error("底图读取失败，请先运行 node episodes/after-rain/generate.ts。"),
        ),
      );
    return () => {
      alive = false;
    };
  }, [keys]);

  return allReady ? buildPlatesSnapshot() : null;
};

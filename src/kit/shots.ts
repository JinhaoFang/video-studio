/** 镜头只给局部帧和后期覆盖。传时间表给 locateShot、filmDuration 或 collectEvents，声音用 frameToSample 共用时间基准。待定事项：无。 */
import type { Post } from "./engine/post-settings.ts";

export type PictureEvent = {
  frame: number;
  kind: string;
  description: string;
};
export type ShotTiming = {
  id: string;
  durationInFrames: number;
  events: readonly PictureEvent[];
};
export type Shot<Surface> = ShotTiming & {
  post: Partial<Post>;
  draw: (surface: Surface, frame: number) => void;
};
export type ShotRow = {
  id: string;
  startFrame: number;
  durationInFrames: number;
};
export type FilmEvent = PictureEvent & { shotId: string; localFrame: number };

export const locateShot = (table: readonly ShotRow[], frame: number) => {
  const row = table.find(
    (shot) =>
      frame >= shot.startFrame &&
      frame < shot.startFrame + shot.durationInFrames,
  );
  if (!row) throw new Error("当前帧不属于镜头时间表。");
  return { row, localFrame: frame - row.startFrame };
};
export const filmDuration = (table: readonly ShotRow[]) =>
  table.reduce(
    (end, row) => Math.max(end, row.startFrame + row.durationInFrames),
    0,
  );

export const collectEvents = (
  table: readonly ShotRow[],
  shots: readonly ShotTiming[],
): FilmEvent[] =>
  table
    .reduce<FilmEvent[]>((all, row) => {
      const shot = shots.find((item) => item.id === row.id);
      if (!shot || shot.durationInFrames !== row.durationInFrames)
        throw new Error(`镜头时长或编号不匹配：${row.id}`);
      if (!Number.isInteger(row.startFrame) || row.startFrame < 0)
        throw new Error(`镜头起点无效：${row.id}`);
      return all.concat(
        shot.events.map((event) => {
          if (
            !Number.isInteger(event.frame) ||
            event.frame < 0 ||
            event.frame >= row.durationInFrames
          )
            throw new Error(`事件超出镜头：${row.id}`);
          return {
            ...event,
            shotId: row.id,
            localFrame: event.frame,
            frame: row.startFrame + event.frame,
          };
        }),
      );
    }, [])
    .sort((a, b) => a.frame - b.frame);

export const frameToSample = (
  frame: number,
  rate: number,
  frameRate: number,
): number => Math.round((frame * rate) / frameRate);

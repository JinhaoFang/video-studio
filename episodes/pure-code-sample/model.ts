/** 本期镜头时间表与画面事件；镜头只声明局部帧，全片事件和采样位置统一在这里换算。 */
export const fps = 24;
export const width = 1920;
export const height = 1080;
export const seed = 149;

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
  post: { grain: number; vignetteInner: number; vignette: number };
  draw: (surface: Surface, frame: number) => void;
};
export type ShotRow = {
  id: string;
  startFrame: number;
  durationInFrames: number;
};
export type FilmEvent = PictureEvent & { shotId: string; localFrame: number };

export const placeholder: ShotTiming = {
  id: "placeholder",
  durationInFrames: 240,
  events: [{ frame: 48, kind: "impact", description: "占位圆块触地" }],
};
export const shotTable: readonly ShotRow[] = [
  {
    id: placeholder.id,
    startFrame: 0,
    durationInFrames: placeholder.durationInFrames,
  },
];
export const durationInFrames = shotTable.reduce(
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

/**
 * Reusable sentence-anchored timing helpers for Remotion compositions.
 * Use sentenceFrame(timeline, "L003", 12) as a Sequence.from, and chapterSpans
 * with chapterOpacity to cross-dissolve adjacent chapters without double-holding
 * both scenes at full opacity.
 */
import type { Timeline, TimelineLine } from "../../tools/timeline-types";

export type ChapterSpan = {
  id: string;
  start: number;
  end: number;
  durationInFrames: number;
  fadeIn: boolean;
  fadeOut: boolean;
};

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

const smoothstep = (value: number): number => {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
};

export const sentence = (timeline: Timeline, id: string): TimelineLine => {
  const line = timeline.lines.find((entry) => entry.id === id);
  if (!line) throw new Error(`时间轴找不到句子编号：${id}`);
  return line;
};

export const sentenceFrame = (
  timeline: Timeline,
  id: string,
  offsetFrames = 0,
): number => {
  if (!Number.isSafeInteger(offsetFrames))
    throw new Error("句子定时偏移必须是整数帧。");
  return sentence(timeline, id).startFrame + offsetFrames;
};

export const chapterSpans = (
  timeline: Timeline,
  ids: readonly string[],
  dissolveFrames = 0,
): ChapterSpan[] => {
  if (!Number.isSafeInteger(dissolveFrames) || dissolveFrames < 0)
    throw new Error("章节溶解帧数必须是非负整数帧。");
  return ids.map((id, index) => {
    const start =
      index === 0 ? 0 : sentenceFrame(timeline, id, -dissolveFrames);
    const end =
      index === ids.length - 1
        ? timeline.durationInFrames
        : sentenceFrame(timeline, ids[index + 1]);
    if (end <= start) throw new Error(`章节区间无效：${id}`);
    return {
      id,
      start,
      end,
      durationInFrames: end - start,
      fadeIn: index > 0 && dissolveFrames > 0,
      fadeOut: index < ids.length - 1 && dissolveFrames > 0,
    };
  });
};

export const chapterOpacity = (
  frame: number,
  span: Pick<ChapterSpan, "durationInFrames" | "fadeIn" | "fadeOut">,
  dissolveFrames: number,
): number => {
  if (dissolveFrames <= 0) return 1;
  const enter = span.fadeIn ? smoothstep(frame / dissolveFrames) : 1;
  const exit = span.fadeOut
    ? smoothstep((span.durationInFrames - frame) / dissolveFrames)
    : 1;
  return Math.min(enter, exit);
};

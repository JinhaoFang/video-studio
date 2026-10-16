/**
 * Episode-local sentence anchors for scene code, with exclusive end frames.
 * Use sentenceFrame(timeline, "L003", 12) as a Sequence.from, and subtract the
 * anchor from useCurrentFrame() for animation progress. Replacing the timeline
 * moves every anchor without editing the scene; offsets are signed frame counts.
 */
import type { Timeline, TimelineLine } from "../../tools/timeline-types";

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

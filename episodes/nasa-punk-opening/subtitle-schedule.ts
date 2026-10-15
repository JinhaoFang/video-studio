/**
 * Pure subtitle-bar schedule from a timeline: when each line expands, holds and
 * collapses to the color strip, which lines join without collapsing (gap at most
 * joinGapFrames), and when the strip alone shows between lines of one run.
 * `subtitleState(schedule, frame)` returns the line to draw, its reveal 0..1 and
 * the strip opacity. Parameters come from the style tokens' `subtitle` group.
 */
import type { TimelineLine } from "../../tools/timeline-types";

export type SubtitleParams = {
  expandFrames: number;
  collapseFrames: number;
  holdAfterFrames: number;
  joinGapFrames: number;
  stripKeepGapFrames: number;
  stripFadeFrames: number;
};

export type SubtitleSlot = {
  id: string;
  text: string;
  start: number;
  textEnd: number;
  closeEnd: number;
  joinsPrevious: boolean;
  joinsNext: boolean;
  run: number;
};

export type SubtitleSchedule = {
  slots: SubtitleSlot[];
  runs: { start: number; end: number }[];
  params: SubtitleParams;
};

export const buildSubtitleSchedule = (
  lines: readonly TimelineLine[],
  params: SubtitleParams,
): SubtitleSchedule => {
  const slots: SubtitleSlot[] = [];
  let run = 0;
  lines.forEach((line, index) => {
    const previous = lines[index - 1];
    const next = lines[index + 1];
    const joinsPrevious =
      previous !== undefined &&
      line.startFrame - previous.endFrame <= params.joinGapFrames;
    const joinsNext =
      next !== undefined &&
      next.startFrame - line.endFrame <= params.joinGapFrames;
    if (
      previous !== undefined &&
      line.startFrame - previous.endFrame > params.stripKeepGapFrames
    ) {
      run += 1;
    }
    const limit = next?.startFrame ?? Number.POSITIVE_INFINITY;
    const textEnd = joinsNext
      ? limit
      : Math.min(line.endFrame + params.holdAfterFrames, limit);
    const closeEnd = joinsNext
      ? limit
      : Math.min(textEnd + params.collapseFrames, limit);
    slots.push({
      id: line.id,
      text: line.text,
      start: line.startFrame,
      textEnd,
      closeEnd,
      joinsPrevious,
      joinsNext,
      run,
    });
  });
  const runs: { start: number; end: number }[] = [];
  for (const slot of slots) {
    const current = runs[slot.run];
    if (current) {
      current.end = slot.closeEnd;
    } else {
      runs[slot.run] = { start: slot.start, end: slot.closeEnd };
    }
  }
  return { slots, runs, params };
};

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

const easeOut = (value: number): number => 1 - (1 - value) ** 3;

export type SubtitleState = {
  slot: SubtitleSlot;
  reveal: number;
  stripOpacity: number;
};

export const subtitleState = (
  schedule: SubtitleSchedule,
  frame: number,
): SubtitleState | null => {
  const { slots, runs, params } = schedule;
  if (slots.length === 0) return null;
  const fade = params.stripFadeFrames;
  const stripOpacity = Math.max(
    0,
    ...runs.map((run) =>
      Math.min(
        clamp01((frame - (run.start - fade)) / fade),
        clamp01((run.end + fade - frame) / fade),
      ),
    ),
  );
  const active = slots.find(
    (slot) => frame >= slot.start && frame < slot.closeEnd,
  );
  if (active) {
    const opening = active.joinsPrevious
      ? 1
      : easeOut(clamp01((frame - active.start) / params.expandFrames));
    const closing = active.joinsNext
      ? 0
      : easeOut(clamp01((frame - active.textEnd) / params.collapseFrames));
    return {
      slot: active,
      reveal: opening * (1 - closing),
      stripOpacity: 1,
    };
  }
  const upcoming = slots.find((slot) => slot.start > frame);
  const fallback = upcoming ?? slots[slots.length - 1];
  return { slot: fallback, reveal: 0, stripOpacity };
};

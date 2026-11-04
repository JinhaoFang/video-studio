/** Shared timeline data contract; safe for browser and Node type consumers. */
export type ScriptLine = {
  id: string;
  text: string;
  pauseAfterSeconds: number;
};

export type AudioDuration = {
  id: string;
  durationSeconds: number;
  src: string | null;
};

export type TimelineSource = {
  kind: "temporary" | "elevenlabs";
  description: string;
};

export type TimelineLine = ScriptLine & {
  startFrame: number;
  endFrame: number;
  audioDurationSeconds: number;
  audioSrc: string | null;
};

export type Timeline = {
  version: 1;
  fps: number;
  source: TimelineSource;
  leadingSilenceSeconds: number;
  durationInFrames: number;
  lines: TimelineLine[];
};

export type ReferenceLine = { startSeconds: number; endSeconds: number };

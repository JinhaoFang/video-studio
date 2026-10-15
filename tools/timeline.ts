/**
 * Pure sentence timeline generation shared by pipeline tools and Node tests.
 * Seconds accumulate as integer nanoseconds; only absolute frame boundaries are
 * rounded (half up). End frames are exclusive, including the final pause in the
 * composition duration. Reference timestamps and measured audio use one schema.
 */
import type {
  AudioDuration,
  ReferenceLine,
  ScriptLine,
  Timeline,
  TimelineLine,
  TimelineSource,
} from "./timeline-types.ts";
export type {
  AudioDuration,
  ReferenceLine,
  ScriptLine,
  Timeline,
  TimelineLine,
  TimelineSource,
} from "./timeline-types.ts";

const nanoseconds = (seconds: number, name: string): bigint => {
  const value = Math.round(seconds * 1e9);
  if (!Number.isFinite(seconds) || seconds < 0 || !Number.isSafeInteger(value))
    throw new Error(`${name} 必须是范围内的非负秒数。`);
  return BigInt(value);
};

const frameAt = (time: bigint, fps: number): number =>
  Number((time * BigInt(fps) * 2n + 1_000_000_000n) / 2_000_000_000n);

const validateScript = (script: ScriptLine[], fps: number): void => {
  if (!Number.isSafeInteger(fps) || fps <= 0)
    throw new Error("帧率必须是正整数。");
  if (!script.length) throw new Error("台本不能为空。");
  const ids = new Set<string>();
  script.forEach((line, index) => {
    if (ids.has(line.id)) throw new Error(`句子编号重复：${line.id}`);
    ids.add(line.id);
    if (line.id !== `L${String(index + 1).padStart(3, "0")}`)
      throw new Error(`句子编号不连续：${line.id}，必须从 L001 顺序排列。`);
    if (typeof line.text !== "string" || !line.text.trim())
      throw new Error(`${line.id} 缺少旁白文字。`);
    nanoseconds(line.pauseAfterSeconds, `${line.id} 句后停顿`);
  });
};

export const generateTimeline = (
  script: ScriptLine[],
  audio: AudioDuration[],
  source: TimelineSource,
  leadingSilenceSeconds: number,
  fps = 30,
): Timeline => {
  validateScript(script, fps);
  if (
    !["temporary", "elevenlabs"].includes(source.kind) ||
    !source.description?.trim()
  )
    throw new Error("请提供临时音轨或 ElevenLabs 配音来源及说明。");
  const durations = new Map<string, AudioDuration>();
  for (const clip of audio) {
    if (durations.has(clip.id)) throw new Error(`音频编号重复：${clip.id}`);
    if (!script.some((line) => line.id === clip.id))
      throw new Error(`音频编号不在台本中：${clip.id}`);
    durations.set(clip.id, clip);
  }
  let cursor = nanoseconds(leadingSilenceSeconds, "开头留白");
  const lines = script.map((line): TimelineLine => {
    const clip = durations.get(line.id);
    if (!clip) throw new Error(`缺少音频：${line.id}`);
    const duration = nanoseconds(clip.durationSeconds, `${line.id} 音频时长`);
    if (duration === 0n || (clip.src !== null && !clip.src?.trim()))
      throw new Error(`${line.id} 音频时长必须大于零，路径不能为空。`);
    const startFrame = frameAt(cursor, fps);
    cursor += duration;
    const endFrame = frameAt(cursor, fps);
    if (endFrame <= startFrame)
      throw new Error(`${line.id} 音频短于一帧，请检查时长。`);
    cursor += nanoseconds(line.pauseAfterSeconds, `${line.id} 句后停顿`);
    return {
      ...line,
      startFrame,
      endFrame,
      audioDurationSeconds: clip.durationSeconds,
      audioSrc: clip.src,
    };
  });
  return {
    version: 1,
    fps,
    source: { ...source },
    leadingSilenceSeconds,
    durationInFrames: frameAt(cursor, fps),
    lines,
  };
};

export const generateReferenceTimeline = (
  script: ScriptLine[],
  reference: ReferenceLine[],
  description: string,
  fps = 30,
): Timeline => {
  if (reference.length !== script.length || !reference.length)
    throw new Error("参考时间和台本句数不一致。");
  const timeline = generateTimeline(
    script,
    reference.map((line, index) => ({
      id: script[index].id,
      durationSeconds: line.endSeconds - line.startSeconds,
      src: null,
    })),
    { kind: "temporary", description },
    reference[0].startSeconds,
    fps,
  );
  timeline.lines = timeline.lines.map((line, index) => {
    const timing = reference[index];
    const startFrame = frameAt(nanoseconds(timing.startSeconds, line.id), fps);
    const endFrame = frameAt(nanoseconds(timing.endSeconds, line.id), fps);
    if (
      endFrame <= startFrame ||
      (index > 0 && timing.startSeconds < reference[index - 1].endSeconds)
    )
      throw new Error(`参考时间无效或重叠：${line.id}`);
    if (line.startFrame !== startFrame || line.endFrame !== endFrame)
      throw new Error(`参考时间与台本停顿不一致：${line.id}`);
    return { ...line, startFrame, endFrame };
  });
  const last = reference.at(-1)!;
  timeline.durationInFrames = frameAt(
    nanoseconds(last.endSeconds, "参考末句结束") +
      nanoseconds(script.at(-1)!.pauseAfterSeconds, "末句停顿"),
    fps,
  );
  return timeline;
};

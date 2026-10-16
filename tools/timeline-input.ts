/**
 * Read the numbered Markdown script table and research transcript timestamps.
 * Reference parsing keeps the next sentence so the last pause is measurable.
 * Durations manifests are JSON arrays of {id, durationSeconds, src}; src is a
 * public-relative path. No episode module or media is imported by these tools.
 */
import { readFileSync } from "node:fs";
import type { ReferenceLine, ScriptLine } from "./timeline.ts";
import { parseTimecode } from "./qa-time.ts";

export const readScript = (path: string): ScriptLine[] => {
  const rows = readFileSync(path, "utf8")
    .split(/\r?\n/)
    .filter((line) => /^\|\s*L\d+\s*\|/.test(line));
  if (!rows.length) throw new Error("台本缺少句子编号、旁白原文、句后停顿表。");
  return rows.map((row) => {
    const [, id, text, pause] = row.split("|").map((cell) => cell.trim());
    if (!/^\d+(?:\.\d+)?$/.test(pause ?? ""))
      throw new Error(`${id} 的句后停顿必须是非负秒数。`);
    return { id, text, pauseAfterSeconds: Number(pause) };
  });
};

export const readReference = (
  path: string,
): (ReferenceLine & { text: string })[] =>
  readFileSync(path, "utf8")
    .split(/\r?\n/)
    .filter((line) => /^\|\s*\d+:\d/.test(line))
    .map((row) => {
      const [, start, end, text] = row.split("|").map((cell) => cell.trim());
      const seconds = (value: string): number => {
        const time = parseTimecode(value);
        return Number(time.numerator) / Number(time.denominator);
      };
      return { startSeconds: seconds(start), endSeconds: seconds(end), text };
    });

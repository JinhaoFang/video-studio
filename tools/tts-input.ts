/**
 * Read numbered narration from the reference transcript's time/text tables.
 * The first 22 rows are the opening; retain the full table for adjacent context.
 * Callers supply paths, so the synthesis and QA tools do not import episodes.
 */
import { readFileSync } from "node:fs";

export const readTranscript = (path: string) => {
  const rows = [
    ...readFileSync(path, "utf8").matchAll(
      /^\|\s*\d+:\d+(?:\.\d+)?\s*\|\s*\d+:\d+(?:\.\d+)?\s*\|\s*([^|]+?)\s*\|\s*$/gm,
    ),
  ];
  if (!rows.length) throw new Error("台本中没有找到起止时间和旁白表格。");
  return rows.map((row, index) => ({
    id: `L${String(index + 1).padStart(3, "0")}`,
    text: row[1].trim(),
  }));
};

export const sentenceIndex = (id: string): number => {
  if (!/^L\d{3}$/.test(id) || Number(id.slice(1)) < 1)
    throw new Error(`句子编号无效：${id}，应为 L001 这样的编号。`);
  return Number(id.slice(1)) - 1;
};

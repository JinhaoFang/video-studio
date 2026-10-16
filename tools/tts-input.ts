/**
 * Read numbered narration from the reference transcript's time/text tables.
 * The first 22 rows are the opening; retain the full table for adjacent context.
 * Callers supply paths, so the synthesis and QA tools do not import episodes.
 * Optional per-ID synthesis overrides preserve narration and can omit context.
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

type SynthesisOverride = {
  text?: string;
  previous_text?: null;
  next_text?: null;
};
type Transcript = ReturnType<typeof readTranscript>;

export const readSynthesisOverrides = (
  path: string | undefined,
  rows: Transcript,
): Record<string, SynthesisOverride> => {
  if (!path) return {};
  const data = JSON.parse(readFileSync(path, "utf8"));
  if (!data || typeof data !== "object" || Array.isArray(data))
    throw new Error("合成改写必须是按句子编号索引的 JSON 对象。");
  for (const [id, value] of Object.entries(data)) {
    const index = sentenceIndex(id);
    if (
      index >= rows.length ||
      !value ||
      typeof value !== "object" ||
      Array.isArray(value)
    )
      throw new Error(`${id} 合成改写无效。`);
    for (const [key, item] of Object.entries(value)) {
      if (
        key === "text"
          ? typeof item !== "string" || !item.trim()
          : !["previous_text", "next_text"].includes(key) || item !== null
      )
        throw new Error(`${id} 只允许非空 text，或用 null 省略前后文。`);
    }
  }
  return data;
};

export const synthesisText = (
  rows: Transcript,
  index: number,
  overrides: Record<string, SynthesisOverride>,
) => {
  const row = rows[index];
  const override = overrides[row.id];
  const textAt = (position: number) =>
    overrides[rows[position].id]?.text ?? rows[position].text;
  return {
    text: textAt(index),
    ...(rows[index - 1] && override?.previous_text !== null
      ? { previous_text: textAt(index - 1) }
      : {}),
    ...(rows[index + 1] && override?.next_text !== null
      ? { next_text: textAt(index + 1) }
      : {}),
  };
};

/**
 * Build a measured voiceover timeline with `node tools/build-timeline.ts --help`.
 * Read a script table and probed audio durations; write the common JSON schema.
 * Rebuild after replacing any clip or editing a pause, without editing scenes.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { reportError, usageError } from "./cli.ts";
import { parseOptions } from "./qa-common.ts";
import { readScript } from "./timeline-input.ts";
import { generateTimeline } from "./timeline.ts";
import type { AudioDuration, TimelineSource } from "./timeline.ts";

const usage =
  "node tools/build-timeline.ts <台本.md> --durations <时长清单.json> --source <temporary|elevenlabs> --label <来源说明> --leading-silence <秒> --out <时间轴.json>";

try {
  const { positional, options, help } = parseOptions(
    process.argv.slice(2),
    ["--durations", "--source", "--label", "--leading-silence", "--out"],
    usage,
  );
  if (help) console.log(`用法：${usage}`);
  else {
    if (
      positional.length !== 1 ||
      ["--durations", "--source", "--label", "--leading-silence", "--out"].some(
        (option) => !options.has(option),
      )
    )
      throw usageError("请提供台本和全部必填选项。", usage);
    const silence = options.get("--leading-silence")!;
    if (!/^\d+(?:\.\d+)?$/.test(silence))
      throw new Error("开头留白必须是非负秒数。");
    const audio = JSON.parse(
      readFileSync(options.get("--durations")!, "utf8"),
    ) as AudioDuration[];
    if (!Array.isArray(audio))
      throw new Error("音频时长清单必须是 JSON 数组。");
    const timeline = generateTimeline(
      readScript(positional[0]),
      audio,
      {
        kind: options.get("--source") as TimelineSource["kind"],
        description: options.get("--label")!,
      },
      Number(silence),
    );
    const output = options.get("--out")!;
    mkdirSync(dirname(output), { recursive: true });
    writeFileSync(output, JSON.stringify(timeline, null, 2) + "\n");
    console.log(
      `已生成 ${timeline.lines.length} 句时间轴，共 ${timeline.durationInFrames} 帧：${output}`,
    );
  }
} catch (error) {
  reportError(error);
}

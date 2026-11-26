/**
 * 通过 pnpm qa <子命令> 分发验收工具，包括原始像素裁切和连续帧条。
 * 新工具在 commands 中登记用法字符串与 run(args) 处理函数。
 * 中文帮助退出 0，检查不通过退出 1，参数或运行错误退出 2。
 */
import { stripUsage, runStrip } from "./qa-strip.ts";
import { cropUsage, runCrop } from "./qa-crop.ts";
import { framesUsage, runFrames } from "./qa-frames.ts";
import { sheetUsage, runSheet } from "./qa-sheet.ts";
import { compareUsage, runCompare } from "./qa-compare.ts";
import { loudnessUsage, runLoudness } from "./qa-loudness.ts";
import { sentenceUsage, runSentence } from "./qa-sentence.ts";
import { voiceUsage, runVoice } from "./qa-voice.ts";
import { motionUsage, runMotion } from "./qa-motion.ts";

import { reportError } from "./cli.ts";

const commands: Record<
  string,
  { usage: string; run: (args: string[]) => void }
> = {
  crop: { usage: cropUsage, run: runCrop },
  strip: { usage: stripUsage, run: runStrip },
  frames: { usage: framesUsage, run: runFrames },
  sheet: { usage: sheetUsage, run: runSheet },
  compare: { usage: compareUsage, run: runCompare },
  loudness: { usage: loudnessUsage, run: runLoudness },
  sentence: { usage: sentenceUsage, run: runSentence },
  voice: { usage: voiceUsage, run: runVoice },
  motion: { usage: motionUsage, run: runMotion },
};

const help = (): string =>
  `用法：pnpm qa <子命令>\n可用子命令：\n${Object.values(commands)
    .map((command) => `  ${command.usage}`)
    .join("\n")}`;

try {
  const [name, ...args] = process.argv.slice(2);
  if (name === "--help") {
    console.log(help());
  } else if (!name || !Object.hasOwn(commands, name)) {
    throw new Error(
      `${name ? `未知子命令：${name}` : "缺少子命令。"}\n${help()}`,
    );
  } else {
    commands[name].run(args);
  }
} catch (error) {
  reportError(error);
}

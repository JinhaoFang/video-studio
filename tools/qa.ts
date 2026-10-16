/**
 * Dispatch frames, sheet, compare, loudness, sentence, voice and motion with `pnpm qa <command>`.
 * Add a usage string and run(args) handler to commands for future QA tools.
 * Chinese help returns 0; check failures return 1; argument/runtime errors return 2.
 */
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

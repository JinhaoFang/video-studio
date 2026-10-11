/**
 * Run QA subcommands with `pnpm qa <command>`. Register later sheet, compare,
 * and loudness handlers in commands, with their usage strings and run(args).
 * Only implemented commands are advertised. Failures produce a concise error
 * and a nonzero exit status, without writing to GitHub or changing source media.
 */
import { framesUsage, runFrames } from "./qa-frames.ts";
import { sheetUsage, runSheet } from "./qa-sheet.ts";
import { compareUsage, runCompare } from "./qa-compare.ts";
import { loudnessUsage, runLoudness } from "./qa-loudness.ts";

const commands: Record<
  string,
  { usage: string; run: (args: string[]) => void }
> = {
  frames: { usage: framesUsage, run: runFrames },
  sheet: { usage: sheetUsage, run: runSheet },
  compare: { usage: compareUsage, run: runCompare },
  loudness: { usage: loudnessUsage, run: runLoudness },
};

const help = (): string =>
  `Usage: pnpm qa <command>\nAvailable commands:\n${Object.values(commands)
    .map((command) => `  ${command.usage}`)
    .join("\n")}`;

try {
  const [name, ...args] = process.argv.slice(2);
  if (!name || name === "--help") {
    console.log(help());
  } else if (!Object.hasOwn(commands, name)) {
    throw new Error(`Unknown command: ${name}\n${help()}`);
  } else {
    commands[name].run(args);
  }
} catch (error) {
  console.error(
    `qa: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exitCode = 1;
}

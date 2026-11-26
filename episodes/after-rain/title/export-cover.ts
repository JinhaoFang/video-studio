/**
 * 导出透明底封面静帧 PNG（1920×1080 RGBA）：含完整落定的片名「雨后」与署名「遡游」白文印，供交付贴在第 8 镜封面上。
 * 用法：node episodes/after-rain/title/export-cover.ts --out <输出路径.png> [--frame <帧号>] [--help]
 */
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { parseArgs } from "node:util";
import { bakePlate } from "../../../src/kit/generation/bake.ts";
import { reportError, usageError } from "../../../tools/cli.ts";
import { renderTitleCardPaper } from "./draw.ts";
import { SEAL_STAMP_FRAME, SEAL_SETTLE_FRAMES } from "./timing.ts";

const usage =
  "node episodes/after-rain/title/export-cover.ts --out <输出路径.png> [--frame <帧号>] [--help]";

const main = () => {
  let values;
  try {
    ({ values } = parseArgs({
      options: {
        out: { type: "string" },
        frame: { type: "string" },
        help: { type: "boolean" },
      },
    }));
  } catch {
    throw usageError("参数错误。", usage);
  }
  if (values.help) {
    console.log(
      `用法：${usage}\n将完全落定的片名「雨后」与署名「遡游」白文印以 1920×1080 透明底 PNG 输出到指定路径。`,
    );
    return;
  }
  if (!values.out) {
    throw usageError("缺少 --out 输出路径。", usage);
  }
  const frame = values.frame
    ? Number.parseInt(values.frame, 10)
    : SEAL_STAMP_FRAME + SEAL_SETTLE_FRAMES + 4;
  if (!Number.isInteger(frame) || frame < 0) {
    throw usageError("--frame 必须为非负整数。", usage);
  }
  const output = resolve(values.out);
  mkdirSync(dirname(output), { recursive: true });
  const started = performance.now();
  const rendered = renderTitleCardPaper(frame, 1920, 1080, { fade: false });
  bakePlate(rendered, output);
  console.log(
    `已输出透明底封面静帧：${output}（1920×1080，第 ${frame} 帧，${((performance.now() - started) / 1000).toFixed(2)} 秒）`,
  );
};

try {
  main();
} catch (error) {
  reportError(error);
}

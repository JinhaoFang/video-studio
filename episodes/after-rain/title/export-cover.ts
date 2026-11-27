/**
 * 导出透明底封面静帧 PNG（1920×1080 RGBA）与可选的放大印章辨识检查图 PNG。
 * 用法：node episodes/after-rain/title/export-cover.ts --out <封面路径.png> [--frame <片名相对帧号>] [--seal-out <印章路径.png>] [--seal-scale <倍数>] [--help]
 * 待定事项：无。
 */
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { parseArgs } from "node:util";
import { bakePlate } from "../../../src/kit/generation/bake.ts";
import { reportError, usageError } from "../../../tools/cli.ts";
import { defaultTitleLayout, renderSealPaper, renderTitleCardPaper } from "./draw.ts";
import { SEAL_PRESS_FRAME, SEAL_SETTLE_FRAMES } from "./timing.ts";

const usage =
  "node episodes/after-rain/title/export-cover.ts --out <封面路径.png> [--frame <片名相对帧号>] [--seal-out <印章路径.png>] [--seal-scale <倍数>] [--help]";

const main = () => {
  let values;
  try {
    ({ values } = parseArgs({
      options: {
        out: { type: "string" },
        frame: { type: "string" },
        "seal-out": { type: "string" },
        "seal-scale": { type: "string" },
        help: { type: "boolean" },
      },
    }));
  } catch {
    throw usageError("参数错误。", usage);
  }
  if (values.help) {
    console.log(
      `用法：${usage}\n将完全落定的片名「雨后」与署名「遡游」满白文印以 1920×1080 透明底 PNG 输出；可选同时输出放大倍数印章图用于字形辨识检查。`,
    );
    return;
  }
  if (!values.out && !values["seal-out"]) {
    throw usageError("至少需要提供 --out 或 --seal-out 输出路径。", usage);
  }
  const titleFrame = values.frame
    ? Number.parseInt(values.frame, 10)
    : SEAL_PRESS_FRAME + SEAL_SETTLE_FRAMES + 4;
  if (!Number.isInteger(titleFrame) || titleFrame < 0) {
    throw usageError("--frame 必须为非负整数（相对片名起点的帧号）。", usage);
  }
  if (values.out) {
    const output = resolve(values.out);
    mkdirSync(dirname(output), { recursive: true });
    const started = performance.now();
    const rendered = renderTitleCardPaper(titleFrame, 1920, 1080, { fade: false });
    bakePlate(rendered, output);
    console.log(
      `已输出透明底封面静帧：${output}（1920×1080，片名相对第 ${titleFrame} 帧，${((performance.now() - started) / 1000).toFixed(2)} 秒）`,
    );
  }
  if (values["seal-out"]) {
    const scale = values["seal-scale"] ? Number.parseFloat(values["seal-scale"]) : 4;
    if (!Number.isFinite(scale) || scale <= 0) {
      throw usageError("--seal-scale 必须为正数。", usage);
    }
    const sealOut = resolve(values["seal-out"]);
    mkdirSync(dirname(sealOut), { recursive: true });
    const size = Math.round(defaultTitleLayout.sealSize * scale);
    const started = performance.now();
    const sealPaper = renderSealPaper(size);
    bakePlate(sealPaper, sealOut);
    console.log(
      `已输出 ${scale} 倍印章检查图：${sealOut}（${size}×${size}，${((performance.now() - started) / 1000).toFixed(2)} 秒）`,
    );
  }
};

try {
  main();
} catch (error) {
  reportError(error);
}

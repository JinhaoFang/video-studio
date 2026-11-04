/**
 * Compose JPG cells on black padding and cap the complete image at 2000px.
 * Established in #8: ffmpeg default font (or an explicit Windows system font
 * when Fontconfig is unconfigured), white 24px ASCII labels, opaque black
 * boxes, 6px inset/border and black padding. User media paths never enter filters.
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import { imageScale, runMedia } from "./qa-common.ts";

const drawtextFont = (): string => {
  if (
    process.platform !== "win32" ||
    process.env.FONTCONFIG_FILE ||
    process.env.FONTCONFIG_PATH
  )
    return "";
  const root = process.env.SystemRoot ?? process.env.WINDIR ?? "C:\\Windows";
  const font = ["arial.ttf", "segoeui.ttf", "consola.ttf", "tahoma.ttf"]
    .map((name) => join(root, "Fonts", name))
    .find((candidate) => existsSync(candidate));
  if (!font)
    throw new Error(
      `找不到 Windows 系统字体（已检查 ${join(root, "Fonts")}），无法绘制时间码标签。`,
    );
  const escaped = font
    .replaceAll("\\", "/")
    .replaceAll(":", "\\:")
    .replaceAll("'", "\\'");
  return `fontfile='${escaped}':`;
};

export const composeImage = (
  cells: { path: string; label: string }[],
  columns: number,
  width: number,
  height: number,
  output: string,
): void => {
  const font = drawtextFont();
  const filters = cells.map(
    (cell, index) =>
      `[${index}:v]format=rgb24,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:color=black,` +
      `drawtext=${font}text='${cell.label.replaceAll(":", "\\:")}':fontcolor=white:fontsize=24:box=1:boxcolor=black:boxborderw=6:x=6:y=h-th-6[c${index}]`,
  );
  const layout = cells
    .map(
      (_, index) =>
        `${(index % columns) * width}_${Math.floor(index / columns) * height}`,
    )
    .join("|");
  const stacked =
    cells.length === 1
      ? "[c0]null[stacked]"
      : `${cells.map((_, index) => `[c${index}]`).join("")}xstack=inputs=${cells.length}:layout=${layout}:fill=black[stacked]`;
  filters.push(stacked);
  filters.push(
    `[stacked]pad=${columns * width}:${Math.ceil(cells.length / columns) * height}:0:0:color=black,` +
      `${imageScale},setsar=1[out]`,
  );
  runMedia("ffmpeg", [
    "-hide_banner",
    "-loglevel",
    "error",
    "-nostdin",
    "-y",
    ...cells.flatMap((cell) => ["-threads", "1", "-i", cell.path]),
    "-filter_complex_threads",
    "1",
    "-filter_complex",
    filters.join(";"),
    "-map",
    "[out]",
    "-frames:v",
    "1",
    "-q:v",
    "2",
    "-pix_fmt",
    "yuvj444p",
    "-threads",
    "1",
    "-f",
    "image2",
    "-update",
    "1",
    output,
  ]);
};

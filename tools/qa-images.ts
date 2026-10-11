/**
 * Compose JPG cells on black padding and cap the complete image at 2000px.
 * Established in #8: ffmpeg default font, white 24px ASCII labels, opaque black
 * boxes, 6px inset/border and black padding. No shell or paths enter filters.
 */
import { imageScale, runMedia } from "./qa-common.ts";

export const composeImage = (
  cells: { path: string; label: string }[],
  columns: number,
  width: number,
  height: number,
  output: string,
): void => {
  const filters = cells.map(
    (cell, index) =>
      `[${index}:v]format=rgb24,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:color=black,` +
      `drawtext=text='${cell.label.replaceAll(":", "\\:")}':fontcolor=white:fontsize=24:box=1:boxcolor=black:boxborderw=6:x=6:y=h-th-6[c${index}]`,
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

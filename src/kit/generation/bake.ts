/** Node 底图烘焙。将画好的浮点 Paper 写到调用方指定的 PNG 文件，使用同一套 FFmpeg 参数。待定事项：无。 */
import { execFileSync } from "node:child_process";
import { toBytes, type Paper } from "../engine/paint.ts";

export const bakePlate = (painted: Paper, output: string) => {
  execFileSync(
    "ffmpeg",
    [
      "-hide_banner",
      "-loglevel",
      "error",
      "-nostdin",
      "-y",
      "-f",
      "rawvideo",
      "-pixel_format",
      "rgba",
      "-video_size",
      `${painted.width}x${painted.height}`,
      "-i",
      "pipe:0",
      "-frames:v",
      "1",
      "-threads",
      "1",
      "-update",
      "1",
      output,
    ],
    { input: toBytes(painted) },
  );
};

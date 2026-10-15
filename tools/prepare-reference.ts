/**
 * Cut local reference audio by transcript timestamps, probe PCM durations, and
 * generate direct reference/temporary timelines plus a cumulative drift report.
 * Run `node tools/prepare-reference.ts --help`; audio goes only into ignored
 * public media directories. The script table determines the sentence count.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join, posix, resolve } from "node:path";
import { reportError, usageError } from "./cli.ts";
import { parseOptions, runMedia } from "./qa-common.ts";
import { readReference, readScript } from "./timeline-input.ts";
import { generateReferenceTimeline, generateTimeline } from "./timeline.ts";

const usage =
  "node tools/prepare-reference.ts <参考视频> --transcript <转写.md> --script <台本.md> --out <数据目录> --audio-out <public 内音频目录>";

try {
  const { positional, options, help } = parseOptions(
    process.argv.slice(2),
    ["--transcript", "--script", "--out", "--audio-out"],
    usage,
  );
  if (help) console.log(`用法：${usage}`);
  else {
    if (
      positional.length !== 1 ||
      ["--transcript", "--script", "--out", "--audio-out"].some(
        (key) => !options.has(key),
      )
    )
      throw usageError("请提供参考视频和全部必填选项。", usage);
    const script = readScript(options.get("--script")!);
    const rows = readReference(options.get("--transcript")!);
    const reference = rows.slice(0, script.length);
    const direct = generateReferenceTimeline(
      script,
      reference,
      options.get("--transcript")!,
    );
    script.forEach((line, index) => {
      const row = reference[index];
      const next = rows[index + 1];
      if (
        line.text !== row.text ||
        !next ||
        Math.abs(
          line.pauseAfterSeconds - (next.startSeconds - row.endSeconds),
        ) > 1e-8
      )
        throw new Error(`${line.id} 文字或句后停顿与转写不一致。`);
    });
    const audioDirectory = resolve(options.get("--audio-out")!);
    const publicPrefix = resolve("public") + "/";
    if (!audioDirectory.startsWith(publicPrefix))
      throw new Error("音频输出目录必须位于本工作区的 public 内。");
    const audioPrefix = audioDirectory.slice(publicPrefix.length);
    mkdirSync(audioDirectory, { recursive: true });
    const audio = reference.map((row, index) => {
      const id = script[index].id;
      const path = join(audioDirectory, `${id}.wav`);
      runMedia("ffmpeg", [
        "-hide_banner",
        "-loglevel",
        "error",
        "-nostdin",
        "-y",
        "-i",
        positional[0],
        "-ss",
        String(row.startSeconds),
        "-t",
        String(Number((row.endSeconds - row.startSeconds).toFixed(9))),
        "-map",
        "0:a:0",
        "-vn",
        "-ar",
        "48000",
        "-c:a",
        "pcm_s16le",
        path,
      ]);
      const probe = JSON.parse(
        runMedia("ffprobe", [
          "-v",
          "error",
          "-show_entries",
          "format=duration",
          "-of",
          "json",
          path,
        ]),
      ) as { format: { duration: string } };
      return {
        id,
        durationSeconds: Number(probe.format.duration),
        src: posix.join(audioPrefix, `${id}.wav`),
      };
    });
    const recomputed = generateTimeline(
      script,
      audio,
      { kind: "temporary", description: positional[0] },
      direct.leadingSilenceSeconds,
    );
    const timeline = {
      ...direct,
      source: recomputed.source,
      lines: direct.lines.map((line, index) => ({
        ...line,
        audioSrc: audio[index].src,
        audioDurationSeconds: audio[index].durationSeconds,
      })),
    };
    const deviations = direct.lines.map((line, index) => ({
      id: line.id,
      startFrames: recomputed.lines[index].startFrame - line.startFrame,
      endFrames: recomputed.lines[index].endFrame - line.endFrame,
    }));
    const maxDeviationFrames = Math.max(
      Math.abs(recomputed.durationInFrames - direct.durationInFrames),
      ...deviations.flatMap((line) => [
        Math.abs(line.startFrames),
        Math.abs(line.endFrames),
      ]),
    );
    if (maxDeviationFrames > 1)
      throw new Error(
        `时间轴复算最大偏差 ${maxDeviationFrames} 帧，超过 1 帧。`,
      );
    const directory = options.get("--out")!;
    mkdirSync(directory, { recursive: true });
    for (const [name, data] of Object.entries({
      "timeline.json": timeline,
      "reference-timeline.json": direct,
      "audio-durations.json": audio,
      "timeline-check.json": {
        maxDeviationFrames,
        durationDifferenceFrames:
          recomputed.durationInFrames - direct.durationInFrames,
        deviations,
      },
    }))
      writeFileSync(
        join(directory, name),
        JSON.stringify(data, null, 2) + "\n",
      );
    console.log(
      `已切出 ${audio.length} 段临时音频；时间轴 ${timeline.durationInFrames} 帧，复算最大偏差 ${maxDeviationFrames} 帧。`,
    );
  }
} catch (error) {
  reportError(error);
}

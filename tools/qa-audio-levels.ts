/** 为 dropouts 解码第一条音轨并计算逐帧 RMS。视频沿用播放器时间轴上的呈现帧，纯音频使用指定帧率。临时 PCM 保留所有声道，逐块累加能量。还原包时间戳空隙时为毫秒级容器时基的舍入留出 2 ms 容差。 */
import {
  closeSync,
  mkdtempSync,
  openSync,
  readSync,
  rmSync,
  statSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runMedia } from "./qa-common.ts";
import { probeVideo } from "./qa-video.ts";
import type { Time } from "./qa-time.ts";

export type LevelFrame = { start: number; end: number; dbfs: number };

const seconds = (time: Time) =>
  Number(time.numerator) / Number(time.denominator);

export const measureFrames = (input: string, audioFps: number) => {
  if (!statSync(input).isFile()) throw new Error(`不是媒体文件：${input}`);
  const {
    streams,
  }: {
    streams: {
      codec_type: string;
      sample_rate: string;
      channels: number;
      disposition: { attached_pic: number };
    }[];
  } = JSON.parse(
    runMedia("ffprobe", [
      "-v",
      "error",
      "-show_entries",
      "stream=codec_type,sample_rate,channels:stream_disposition=attached_pic",
      "-of",
      "json",
      input,
    ]),
  );
  const audio = streams.find((s) => s.codec_type === "audio");
  if (!audio) throw new Error(`没有音轨：${input}`);
  const rate = Number(audio.sample_rate);
  const channels = audio.channels;
  const picture = streams.find((s) => s.codec_type === "video");
  const video =
    picture && !picture.disposition.attached_pic ? probeVideo(input) : null;
  if (!video && audioFps > rate) throw new Error("分析帧率超过了音频采样率。");
  const directory = mkdtempSync(join(tmpdir(), "qa-dropouts-"));
  try {
    const raw = join(directory, "audio.f32le");
    runMedia("ffmpeg", [
      "-v",
      "error",
      "-nostdin",
      "-copyts",
      "-start_at_zero",
      "-i",
      input,
      "-map",
      "0:a:0",
      "-af",
      "aresample=async=1:min_hard_comp=0.002:first_pts=0",
      "-f",
      "f32le",
      raw,
    ]);
    const samples = statSync(raw).size / (4 * channels);
    if (!Number.isSafeInteger(samples) || samples <= 0)
      throw new Error("没有可解码的音频采样。");
    const duration = video ? seconds(video.end) : samples / rate;
    const starts = video ? video.times.map(seconds) : [];
    if (!video) {
      for (let i = 0; Math.round((i / audioFps) * rate) < samples; i++) {
        starts.push(i / audioFps);
      }
    }
    const fd = openSync(raw, "r");
    try {
      const chunk = Buffer.alloc(64 * 1024);
      const frames = starts.map((start, i): LevelFrame => {
        const end = starts[i + 1] ?? duration;
        const first = Math.round(start * rate);
        const stop = Math.round(end * rate);
        const count = (stop - first) * channels;
        if (count <= 0) throw new Error(`第 ${i} 帧的时间区间没有音频采样。`);
        const byteEnd = Math.min(samples, stop) * channels * 4;
        let energy = 0;
        for (let pos = Math.max(0, first) * channels * 4; pos < byteEnd; ) {
          const size = readSync(
            fd,
            chunk,
            0,
            Math.min(chunk.length, byteEnd - pos),
            pos,
          );
          if (size === 0 || size % 4 !== 0)
            throw new Error("读取音频采样失败。");
          for (let byte = 0; byte < size; byte += 4)
            energy += chunk.readFloatLE(byte) ** 2;
          pos += size;
        }
        if (!Number.isFinite(energy))
          throw new Error(`第 ${i} 帧的音频采样无效。`);
        return { start, end, dbfs: 10 * Math.log10(energy / count) };
      });
      return {
        frames,
        sampleRate: rate,
        channels,
        audioFps: video ? null : audioFps,
      };
    } finally {
      closeSync(fd);
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
};

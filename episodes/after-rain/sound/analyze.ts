/**
 * 《雨后》声音的分轨测量（#202 测试接缝：生成的分层 WAV 和全片混音）：
 * 运行 `node episodes/after-rain/sound/analyze.ts <WAV…> --bands <下限Hz,上限Hz;…> [--from <秒>] [--to <秒>] [--step <秒>] [--out <目录>] [--json <文件>] [--help]`。
 * 读 48 kHz PCM16 WAV，按给定频带（默认 20–300、300–1000、1000–8000 Hz 三组）量每段的 RMS（dBFS，双声道合计）与阵风起伏（短时包络的分位数），
 * --loudness 用 FFmpeg ebur128 量同一区间的短期响度（S 值的平均、最低、最高），--spectrum 用 FFmpeg 画同一区间（--to 缺省到文件末尾）的语谱图；
 * 多个 WAV 给同一个 --json 时写进同一个报告，便于分轨相减。退出码：0 完成，2 参数或运行出错。
 * 待定事项：无。
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { media } from "../../../src/kit/sound/measure.ts";
import { reportError, usageError } from "../../../tools/cli.ts";

const usage =
  "node episodes/after-rain/sound/analyze.ts <WAV…> [--from <秒>] [--to <秒>] [--bands <下限,上限;…>] [--step <秒>] [--loudness] [--spectrum --out <目录>] [--json <文件>] [--help]";

type Band = { low: number; high: number };

export const SPECTRUM_SIZE = "1200x600";

export const readWav = (
  path: string,
): { channels: Float64Array[]; rate: number } => {
  const buffer = readFileSync(path);
  if (
    buffer.toString("ascii", 0, 4) !== "RIFF" ||
    buffer.toString("ascii", 8, 12) !== "WAVE"
  )
    throw new Error(`不是 RIFF/WAVE 文件：${path}`);
  let at = 12;
  let rate = 0;
  let channels = 0;
  let bits = 0;
  let data = Buffer.alloc(0);
  while (at + 8 <= buffer.length) {
    const id = buffer.toString("ascii", at, at + 4);
    const size = buffer.readUInt32LE(at + 4);
    const body = at + 8;
    if (id === "fmt ") {
      channels = buffer.readUInt16LE(body + 2);
      rate = buffer.readUInt32LE(body + 4);
      bits = buffer.readUInt16LE(body + 14);
    } else if (id === "data") data = buffer.subarray(body, body + size);
    at = body + size + (size % 2);
  }
  if (!rate || !channels || bits !== 16)
    throw new Error(`只支持 PCM16 WAV：${path}`);
  const frames = Math.floor(data.length / (2 * channels));
  const decoded = Array.from(
    { length: channels },
    () => new Float64Array(frames),
  );
  for (let i = 0; i < frames; i++)
    for (let c = 0; c < channels; c++)
      decoded[c][i] = data.readInt16LE((i * channels + c) * 2) / 32768;
  return { channels: decoded, rate };
};

const parseBands = (text: string): Band[] =>
  text.split(";").map((item) => {
    const [low, high] = item.split(",").map(Number);
    if (!(low > 0 && high > low))
      throw usageError("频带写成 下限,上限（Hz），多组用分号隔开。", usage);
    return { low, high };
  });

export type BandLevel = {
  from: number;
  to: number;
  rmsDbfs: number;
  bands: Record<string, number>;
};

export const bandLevels = (
  channels: Float64Array[],
  rate: number,
  from: number,
  to: number,
  bands: Band[],
): Omit<BandLevel, "from" | "to"> => {
  const start = Math.round(from * rate);
  const end = Math.min(channels[0].length, Math.round(to * rate));
  const n = end - start;
  if (n <= 0) throw new Error(`测量区间为空：${from}–${to} 秒`);
  let nfft = 1;
  while (2 * nfft <= Math.min(n, 8192)) nfft *= 2;
  const binHz = rate / nfft;
  const real = new Float64Array(nfft);
  const imag = new Float64Array(nfft);
  const power = new Float64Array(nfft / 2);
  let energy = 0;
  for (const channel of channels)
    for (let i = start; i < end; i++) energy += channel[i] ** 2;
  for (let at = start; at + nfft <= end; at += nfft / 2) {
    for (let c = 0; c < channels.length; c++) {
      real.fill(0);
      imag.fill(0);
      for (let i = 0; i < nfft; i++) {
        const value = channels[c][at + i];
        real[i] =
          value * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (nfft - 1)));
      }
      for (let i = 1, j = 0; i < nfft; i++) {
        let bit = nfft >> 1;
        for (; j & bit; bit >>= 1) j ^= bit;
        j ^= bit;
        if (i < j) [real[i], real[j]] = [real[j], real[i]];
      }
      for (let size = 2; size <= nfft; size *= 2) {
        const angle = (-2 * Math.PI) / size;
        for (let s = 0; s < nfft; s += size)
          for (let i = 0; i < size / 2; i++) {
            const a = s + i;
            const b = a + size / 2;
            const cr = Math.cos(angle * i);
            const sr = Math.sin(angle * i);
            const rr = real[b] * cr - imag[b] * sr;
            const ii = real[b] * sr + imag[b] * cr;
            real[b] = real[a] - rr;
            imag[b] = imag[a] - ii;
            real[a] += rr;
            imag[a] += ii;
          }
      }
      for (let k = 0; k < nfft / 2; k++)
        power[k] += real[k] ** 2 + imag[k] ** 2;
    }
  }
  const total = power.reduce((sum, value) => sum + value, 0);
  const result: Record<string, number> = {};
  for (const { low, high } of bands) {
    let sum = 0;
    for (
      let k = Math.ceil(low / binHz);
      k < Math.min(nfft / 2, Math.ceil(high / binHz));
      k++
    )
      sum += power[k];
    result[`${low}-${high}`] =
      10 *
      Math.log10(
        Math.max(1e-30, (sum / Math.max(1e-30, total)) * (energy / (n * channels.length))),
      );
  }
  return {
    rmsDbfs: 10 * Math.log10(Math.max(1e-30, energy / (n * channels.length))),
    bands: result,
  };
};

export const envelope = (
  channel: Float64Array,
  rate: number,
  step: number,
  from: number,
  to: number,
) => {
  const width = Math.round(step * rate);
  const values: number[] = [];
  for (
    let at = Math.round(from * rate);
    at + width <= Math.min(channel.length, Math.round(to * rate));
    at += width
  ) {
    let energy = 0;
    for (let i = 0; i < width; i++) energy += channel[at + i] ** 2;
    values.push(10 * Math.log10(Math.max(1e-30, energy / width)));
  }
  return values;
};

export const shortTermLufs = (path: string, from: number, to: number) => {
  const log = media([
    "-hide_banner",
    "-nostdin",
    "-nostats",
    "-loglevel",
    "verbose",
    "-threads",
    "1",
    "-i",
    path,
    "-af",
    "ebur128=framelog=verbose",
    "-f",
    "null",
    "-",
  ]);
  const values: number[] = [];
  for (const line of log.split("\n")) {
    const match =
      /\bt:\s*([\d.]+)\s+TARGET:\S+ LUFS\s+M:\s*(-?[\d.]+|-inf)\s+S:\s*(-?[\d.]+|-inf)\s/.exec(
        line,
      );
    if (!match) continue;
    const t = Number(match[1]);
    const shortTerm = Number(match[3]);
    if (t < from || t > to || !(shortTerm > -70)) continue;
    values.push(shortTerm);
  }
  if (!values.length)
    throw new Error(`这段没有短期响度读数：${path} ${from}–${to} 秒`);
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  return {
    shortTermMeanLufs: mean,
    shortTermMaxLufs: Math.max(...values),
    shortTermMinLufs: Math.min(...values),
  };
};

const quantile = (values: number[], p: number) => {
  const sorted = [...values].sort((a, b) => a - b);
  const at = (sorted.length - 1) * p;
  const i = Math.floor(at);
  return sorted[i] + (sorted[Math.ceil(at)] - sorted[i]) * (at - i);
};

const main = () => {
  let values: {
    from?: string;
    to?: string;
    bands?: string;
    step?: string;
    out?: string;
    json?: string;
    spectrum?: boolean;
    loudness?: boolean;
    help?: boolean;
  };
  let positionals: string[];
  try {
    ({ values, positionals } = parseArgs({
      options: {
        from: { type: "string" },
        to: { type: "string" },
        bands: { type: "string" },
        step: { type: "string" },
        out: { type: "string" },
        json: { type: "string" },
        spectrum: { type: "boolean" },
        loudness: { type: "boolean" },
        help: { type: "boolean" },
      },
      allowPositionals: true,
    }));
  } catch (error) {
    throw usageError(
      error instanceof Error ? error.message : String(error),
      usage,
    );
  }
  if (values.help) {
    console.log(
      `用法：${usage}\n量 48 kHz PCM16 WAV 在 --from 到 --to 秒之间各频带的 RMS（dBFS，双声道合计），频带写成 下限,上限（Hz），多组用分号隔开；默认 20,300;300,1000;1000,8000。\n--step 给出短时包络的窗长（默认 0.25 秒），报告包络的 10%、50%、90% 分位数和起伏（dB）。\n--loudness 用 FFmpeg ebur128 量同一区间的短期响度；--spectrum 用 FFmpeg 画同一区间的语谱图（--to 缺省到文件末尾），--out 给出输出目录。\n--json 把多项测量写进同一个 JSON 文件（已有时追加）。退出码 0 完成，2 参数或运行出错。`,
    );
    return;
  }
  if (!positionals.length) throw usageError("请至少提供一个 WAV 文件。", usage);
  const from = Number(values.from ?? 0);
  const to = Number(values.to ?? Number.NaN);
  const step = Number(values.step ?? 0.25);
  if (!(from >= 0) || !(step > 0))
    throw usageError("--from 须非负，--step 须为正数。", usage);
  const bands = parseBands(values.bands ?? "20,300;300,1000;1000,8000");
  const out = values.out ? resolve(values.out) : undefined;
  if (out && values.spectrum) mkdirSync(out, { recursive: true });
  const jsonPath = values.json ? resolve(values.json) : undefined;
  const report: Record<string, unknown> =
    jsonPath && existsSync(jsonPath)
      ? JSON.parse(readFileSync(jsonPath, "utf8"))
      : {};
  for (const input of positionals.map((path) => resolve(path))) {
    const { channels, rate } = readWav(input);
    const end = Number.isFinite(to) ? to : channels[0].length / rate;
    const mono = new Float64Array(channels[0].length);
    for (let i = 0; i < mono.length; i++)
      mono[i] = (channels[0][i] + (channels[1]?.[i] ?? 0)) / 2;
    const levels = bandLevels(channels, rate, from, end, bands);
    const env = envelope(mono, rate, step, from, end);
    const q10 = quantile(env, 0.1);
    const q50 = quantile(env, 0.5);
    const q90 = quantile(env, 0.9);
    const loudness = values.loudness
      ? shortTermLufs(input, from, end)
      : undefined;
    const entry = {
      file: input,
      from,
      to: end,
      sampleRate: rate,
      channels: channels.length,
      ...levels,
      envelope: {
        stepSeconds: step,
        p10Dbfs: q10,
        p50Dbfs: q50,
        p90Dbfs: q90,
        spreadDb: q90 - q10,
      },
      ...(loudness ? { loudness } : {}),
    };
    report[`${basename(input)} ${from.toFixed(2)}-${end.toFixed(2)}`] = entry;
    console.log(
      `${basename(input)}  ${from.toFixed(2)}–${end.toFixed(2)} 秒  RMS ${levels.rmsDbfs.toFixed(1)} dBFS  ${Object.entries(
        levels.bands,
      )
        .map(([band, db]) => `${band} Hz ${db.toFixed(1)}`)
        .join(
          "  ",
        )}  包络 p10/p50/p90 ${q10.toFixed(1)}/${q50.toFixed(1)}/${q90.toFixed(1)} dBFS（起伏 ${(q90 - q10).toFixed(1)} dB）${loudness ? `  短期响度 平均 ${loudness.shortTermMeanLufs.toFixed(1)} LUFS（最低 ${loudness.shortTermMinLufs.toFixed(1)}，最高 ${loudness.shortTermMaxLufs.toFixed(1)}）` : ""}`,
    );
    if (out && values.spectrum) {
      const stamp =
        from > 0 || end < channels[0].length / rate
          ? `-${from.toFixed(2)}-${end.toFixed(2)}`
          : "";
      const output = join(
        out,
        `${basename(input, ".wav")}${stamp}-spectrum.png`,
      );
      media([
        "-hide_banner",
        "-loglevel",
        "error",
        "-nostdin",
        "-y",
        "-threads",
        "1",
        "-i",
        input,
        "-filter_complex_threads",
        "1",
        "-lavfi",
        `atrim=${from}:${end},asetpts=PTS-STARTPTS,showspectrumpic=s=${SPECTRUM_SIZE}:legend=1:scale=log:fscale=log:color=intensity`,
        "-frames:v",
        "1",
        "-threads",
        "1",
        output,
      ]);
      console.log(
        `  语谱图：${output}（${from.toFixed(2)}–${end.toFixed(2)} 秒）`,
      );
    }
  }
  if (jsonPath) {
    mkdirSync(resolve(jsonPath, ".."), { recursive: true });
    writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
    console.log(`测量报告：${jsonPath}`);
  }
};

if (import.meta.main) {
  try {
    main();
  } catch (error) {
    reportError(error);
  }
}

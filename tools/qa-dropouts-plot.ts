/** 绘制 dropouts 的独立 SVG 验收图。横轴使用实际帧时间，纵轴为未加权 RMS，颜色沿用工作室汇报图表。阴影标出排除区和低电平段，圆点标出骤降落点。 */
import type { LevelFrame } from "./qa-audio-levels.ts";

export type Mark = {
  type: "silence" | "drop";
  startFrame: number;
  endFrame: number;
};

export const levelPlot = (
  frames: LevelFrame[],
  findings: Mark[],
  first: number,
  last: number,
  floor: number,
) => {
  const duration = frames.at(-1)!.end;
  const left = 64,
    right = 1056,
    top = 48,
    bottom = 288;
  const x = (t: number) => left + ((right - left) * t) / duration;
  const y = (db: number) =>
    top + ((bottom - top) * Math.min(120, Math.max(0, -db))) / 120;
  const band = (from: number, to: number, color: string) =>
    `<rect x="${x(from)}" y="${top}" width="${Math.max(0, x(to) - x(from))}" height="${bottom - top}" fill="${color}"/>`;
  const grid = Array.from({ length: 7 }, (_, i) => {
    const db = -20 * i;
    return `<path d="M${left} ${y(db)}H${right}" stroke="#e1e0d9"/><text x="${left - 8}" y="${y(db) + 4}" text-anchor="end">${i === 6 ? "≤ " : ""}${db}</text>`;
  });
  const ticks = Array.from({ length: 6 }, (_, i) => {
    const t = (duration * i) / 5;
    return `<text x="${x(t)}" y="312" text-anchor="middle">${Number(t.toFixed(3))}</text>`;
  });
  const spans: string[] = [],
    drops: string[] = [];
  for (const { type, startFrame, endFrame } of findings) {
    const frame = frames[startFrame];
    const title = `<title>F${startFrame}–F${endFrame}</title>`;
    if (type === "silence")
      spans.push(
        `<g>${title}${band(frame.start, frames[endFrame].end, "#fab219")}</g>`,
      );
    else
      drops.push(
        `<circle cx="${x(frame.start)}" cy="${y(frame.dbfs)}" r="4" fill="#d03b3b">${title}</circle>`,
      );
  }
  const points = frames.map(
    (f) => `${x(f.start).toFixed(2)},${y(f.dbfs).toFixed(2)}`,
  );
  points.push(`${right},${y(frames.at(-1)!.dbfs).toFixed(2)}`);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 352" width="1080" height="352" font-family="sans-serif" font-size="15" fill="#0b0b0b" role="img" aria-label="逐帧电平及断音位置">
<rect width="1080" height="352" fill="#fcfcfb"/>
<text x="16" y="28">RMS (dBFS)</text><text x="${right}" y="28" text-anchor="end">灰色为排除区 · 黄色为低电平段 · 红点为单帧骤降 · 虚线为 ${floor} dBFS 下限</text>
${band(0, frames[first].start, "#e1e0d9")}${band(frames[last].end, duration, "#e1e0d9")}
${grid.join("\n")}${spans.join("\n")}
${floor >= -120 && floor <= 0 ? `<path d="M${left} ${y(floor)}H${right}" stroke="#52514e" stroke-dasharray="4 4"/>` : ""}
<polyline points="${points.join(" ")}" fill="none" stroke="#2a78d6" stroke-width="2"/>
${drops.join("\n")}${ticks.join("\n")}
<text x="560" y="340" text-anchor="middle">时间（秒）</text></svg>\n`;
};

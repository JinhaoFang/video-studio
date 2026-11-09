/**
 * ClinMeshPromo 的最终版契约测试：入库时间轴与呼吸区间始终验证；
 * 本机配音或音效清单不可读取时，仅跳过对应媒体断言并报告具体原因。
 * 文件读取放在测试函数内，避免 describe 初始化失败掩盖测试结果。
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, type TestContext } from "node:test";
import type { Timeline } from "../../tools/timeline-types.ts";

const epDir = import.meta.dirname;
const studioRoot = join(epDir, "../..");

const readTimeline = (): Timeline =>
  JSON.parse(
    readFileSync(join(epDir, "data/timeline.json"), "utf8"),
  ) as Timeline;

const readMedia = (t: TestContext, path: string): Buffer | undefined => {
  try {
    return readFileSync(path);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT" || code === "EACCES" || code === "EPERM") {
      t.skip(`本机媒体不可读取（${code}）：${path}`);
      return undefined;
    }
    throw error;
  }
};

describe("clinmesh-promo 最终版配音与音效契约", () => {
  it("14 句普通话的时长为 3114 帧，文案不包含旧口语表达", () => {
    const tl = readTimeline();
    assert.equal(tl.fps, 30);
    assert.equal(tl.durationInFrames, 3114);
    assert.equal(tl.lines.length, 14);
    const totalSec = tl.durationInFrames / tl.fps;
    assert.ok(
      totalSec >= 85 && totalSec <= 105,
      `总时长应为 85..105 秒，实际为 ${totalSec.toFixed(2)} 秒`,
    );
    for (const line of tl.lines) {
      assert.equal(line.text.includes("拍板"), false);
      assert.equal(line.text.includes("这是 ClinMesh"), false);
      assert.ok(line.audioSrc, `配音路径未登记：${line.id}`);
    }
  });

  it("本机 14 句配音文件可读且非空", (t) => {
    const tl = readTimeline();
    for (const line of tl.lines) {
      assert.ok(line.audioSrc, `配音路径未登记：${line.id}`);
      const audio = readMedia(t, join(studioRoot, "public", line.audioSrc));
      if (audio === undefined) return;
      assert.ok(audio.length > 0, `配音文件为空：${line.id}`);
    }
  });

  it("B01-B03 位于 L005/L008/L010 的停顿中且不与配音重叠", () => {
    const tl = readTimeline();
    const breatherDurationF = 52;
    for (const id of ["L005", "L008", "L010"] as const) {
      const idx = tl.lines.findIndex((l) => l.id === id);
      assert.ok(idx >= 0 && idx + 1 < tl.lines.length);
      const offset = id === "L010" ? 12 : 3;
      const bStart = tl.lines[idx].endFrame + offset;
      const bEnd = bStart + breatherDurationF;
      assert.ok(
        bEnd <= tl.lines[idx + 1].startFrame,
        `${id} 后的呼吸区间（${bStart}..${bEnd}）与 ${tl.lines[idx + 1].id}（${tl.lines[idx + 1].startFrame}）重叠`,
      );
    }
  });

  it("终章 fs-562196 的自然尾音与 fs-177242 的渐隐在片尾前结束", (t) => {
    const tl = readTimeline();
    const manifestData = readMedia(
      t,
      join(studioRoot, "public/episodes/clinmesh-promo/sfx/audio-manifest.json"),
    );
    if (manifestData === undefined) return;
    const manifest = JSON.parse(manifestData.toString("utf8")) as {
      assets: Array<{
        file: string;
        analysis: { energy_peak_seconds: number; active_end_seconds: number };
      }>;
    };
    const l014 = tl.lines.find((l) => l.id === "L014");
    assert.ok(l014);
    const outputOffsetF = 0.21;
    const sparkleAsset = manifest.assets.find(
      (a) => a.file === "fs-562196.mp3",
    );
    assert.ok(sparkleAsset);
    const sparkleFromF = Math.max(
      0,
      Math.round(
        l014.startFrame +
          32 -
          sparkleAsset.analysis.energy_peak_seconds * tl.fps -
          outputOffsetF,
      ),
    );
    const sparkleActiveEndF =
      sparkleFromF + sparkleAsset.analysis.active_end_seconds * tl.fps;
    assert.ok(sparkleActiveEndF <= tl.durationInFrames);

    const impactAsset = manifest.assets.find((a) => a.file === "fs-177242.mp3");
    assert.ok(impactAsset);
    const impactFromF = Math.max(
      0,
      Math.round(
        l014.startFrame +
          16 -
          impactAsset.analysis.energy_peak_seconds * tl.fps -
          outputOffsetF,
      ),
    );
    assert.ok(impactFromF + 183 <= tl.durationInFrames);
  });
});

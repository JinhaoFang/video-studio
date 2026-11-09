/**
 * Episode contract tests for the standalone ClinMeshPromoLightPro composition:
 * verifies 14-sentence timeline-light-pro.json bounds, zero colloquial phrases
 * ("这是 ClinMesh" / "拍板"), non-overlapping breathers, and natural SFX tails.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import type { Timeline } from "../../tools/timeline-types.ts";

const epDir = import.meta.dirname;
const studioRoot = join(epDir, "../..");

describe("clinmesh-promo-light-pro flagship narration & audio contract", () => {
  const tl = JSON.parse(
    readFileSync(join(epDir, "data/timeline-light-pro.json"), "utf8"),
  ) as Timeline;
  const manifest = JSON.parse(
    readFileSync(
      join(
        studioRoot,
        "public/episodes/clinmesh-promo/sfx/audio-manifest.json",
      ),
      "utf8",
    ),
  ) as {
    assets: Array<{
      file: string;
      analysis: { energy_peak_seconds: number; active_end_seconds: number };
    }>;
  };

  it("contains all 14 Mandarin lines within 85-105s and eliminates colloquial phrases", () => {
    assert.equal(tl.lines.length, 14);
    const totalSec = tl.durationInFrames / tl.fps;
    assert.ok(
      totalSec >= 85 && totalSec <= 105,
      `Expected total duration in 85..105s, got ${totalSec.toFixed(2)}s`,
    );
    for (const line of tl.lines) {
      assert.equal(line.text.includes("拍板"), false);
      assert.equal(line.text.includes("这是 ClinMesh"), false);
      assert.ok(
        line.audioSrc && existsSync(join(studioRoot, "public", line.audioSrc)),
        `Missing audio file for ${line.id}: ${line.audioSrc}`,
      );
    }
  });

  it("places B01-B03 strictly inside L005/L008/L010 pauses without overlapping speech", () => {
    const breatherDurationF = 52;
    for (const id of ["L005", "L008", "L010"] as const) {
      const idx = tl.lines.findIndex((l) => l.id === id);
      assert.ok(idx >= 0 && idx + 1 < tl.lines.length);
      const offset = id === "L010" ? 12 : 3;
      const bStart = tl.lines[idx].endFrame + offset;
      const bEnd = bStart + breatherDurationF;
      assert.ok(
        bEnd <= tl.lines[idx + 1].startFrame,
        `Breather after ${id} (${bStart}..${bEnd}) overlaps ${tl.lines[idx + 1].id} (${tl.lines[idx + 1].startFrame})`,
      );
    }
  });

  it("completes finale fs-562196 natural tail and fs-177242 smooth fade-out before end", () => {
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

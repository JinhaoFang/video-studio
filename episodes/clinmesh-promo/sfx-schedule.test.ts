/**
 * Episode contract tests for ClinMesh promo: verifies 14-sentence timeline
 * continuity, non-overlapping B01-B03 breathers, natural reverb tail room for
 * finale SFX (fs-177242 & fs-562196), and zero-ducking steady BGM policy.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import type { Timeline } from "../../tools/timeline-types.ts";

const epDir = import.meta.dirname;
const studioRoot = join(epDir, "../..");

describe("clinmesh-promo timeline & audio contract", () => {
  const tl = JSON.parse(
    readFileSync(join(epDir, "data/timeline.json"), "utf8"),
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

  it("contains all 14 Mandarin lines within the 85-105s target window", () => {
    assert.equal(tl.lines.length, 14);
    const totalSec = tl.durationInFrames / tl.fps;
    assert.ok(
      totalSec >= 85 && totalSec <= 105,
      `Expected total duration in 85..105s, got ${totalSec.toFixed(2)}s`,
    );
  });

  it("places B01-B03 strictly inside L005/L008/L010 pauses without overlapping speech", () => {
    const breatherDurationF = 52;
    for (const id of ["L005", "L008", "L010"]) {
      const idx = tl.lines.findIndex((l) => l.id === id);
      assert.ok(idx >= 0 && idx + 1 < tl.lines.length);
      const bStart = tl.lines[idx].endFrame + 3;
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
    assert.ok(sparkleAsset, "Missing fs-562196.mp3 in audio-manifest.json");
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
    assert.ok(
      sparkleActiveEndF <= tl.durationInFrames,
      `fs-562196.mp3 active tail (${sparkleActiveEndF.toFixed(1)}f) exceeds durationInFrames (${tl.durationInFrames}f)`,
    );

    const impactAsset = manifest.assets.find((a) => a.file === "fs-177242.mp3");
    assert.ok(impactAsset, "Missing fs-177242.mp3 in audio-manifest.json");
    const impactFromF = Math.max(
      0,
      Math.round(
        l014.startFrame +
          16 -
          impactAsset.analysis.energy_peak_seconds * tl.fps -
          outputOffsetF,
      ),
    );
    const impactDurationF = 183;
    const impactFadeOutF = 48;
    assert.ok(
      impactFromF + impactDurationF <= tl.durationInFrames,
      `fs-177242.mp3 envelope end (${impactFromF + impactDurationF}f) exceeds durationInFrames (${tl.durationInFrames}f)`,
    );
    assert.ok(impactFadeOutF >= 36);
  });

  it("enforces steady-state BGM without speech ducking or voiceover truncation", () => {
    const promoAudioSrc = readFileSync(join(epDir, "PromoAudio.tsx"), "utf8");
    assert.equal(promoAudioSrc.includes("speaking"), false);
    assert.equal(promoAudioSrc.includes("inBreather"), false);
    assert.ok(promoAudioSrc.includes("Clinical AI Underscore.wav"));
    assert.ok(
      promoAudioSrc.includes(
        "BGM_STEADY_VOLUME * scoreBalance * fadeIn * fadeOut",
      ),
    );
  });
});

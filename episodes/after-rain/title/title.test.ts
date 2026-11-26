/** 《雨后》片名与印章的笔顺数量、事件帧对齐与第 12 镜天色对比度测试。待定事项：无。 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { contrastRatio, dropStateAt } from "../../../src/kit/engine/calligraphy.ts";
import { rgb } from "../../../src/kit/engine/paint.ts";
import { stampStateAt } from "../../../src/kit/engine/seal.ts";
import { defaultTitleLayout, twilightSkyColorAt } from "./draw.ts";
import { buildTitleGeometry } from "./glyphs.ts";
import {
  SEAL_STAMP_FRAME,
  SHOT12_DURATION,
  titleDropTimings,
  titleEvents,
  titleStrokeTimings,
} from "./timing.ts";
import { titlePalette } from "./tokens.ts";

test("片名「雨后」笔画与四滴雨点严格遵循 GF 0023—2020 笔顺且提笔有停顿", () => {
  const geom = buildTitleGeometry(
    defaultTitleLayout.centerX,
    defaultTitleLayout.topY,
    defaultTitleLayout.charSize,
    defaultTitleLayout.charGap,
  );
  assert.equal(geom.strokes.length, 10);
  assert.equal(geom.drops.length, 4);

  const ids = titleStrokeTimings.map((t) => t.id);
  assert.deepEqual(ids, [
    "yu-1-heng",
    "yu-2-shu-left",
    "yu-3-hengzhegou",
    "yu-4-shu-mid",
    "hou-1-pie-top",
    "hou-2-pie-left",
    "hou-3-heng-long",
    "hou-4-kou-shu",
    "hou-5-kou-hengzhe",
    "hou-6-kou-heng",
  ]);
  assert.deepEqual(
    titleDropTimings.map((d) => d.id),
    ["yu-5-dot-tl", "yu-6-dot-bl", "yu-7-dot-tr", "yu-8-dot-br"],
  );

  let pauses = 0;
  for (let i = 1; i < titleStrokeTimings.length; i++) {
    const prev = titleStrokeTimings[i - 1];
    const curr = titleStrokeTimings[i];
    assert.ok(curr.startFrame > prev.endFrame);
    if (curr.startFrame - prev.endFrame >= 2) pauses++;
  }
  assert.ok(pauses >= 6);
  const yuEnd = titleStrokeTimings[3].endFrame;
  const houStart = titleStrokeTimings[4].startFrame;
  for (const drop of titleDropTimings) {
    assert.ok(drop.landFrame > yuEnd && drop.landFrame < houStart);
  }
});

test("画面事件声明在四滴落点与盖印真正发生的那一帧", () => {
  const geom = buildTitleGeometry(
    defaultTitleLayout.centerX,
    defaultTitleLayout.topY,
    defaultTitleLayout.charSize,
    defaultTitleLayout.charGap,
  );
  assert.equal(titleEvents.length, 5);
  for (let i = 0; i < 4; i++) {
    const ev = titleEvents[i];
    const drop = geom.drops[i];
    const dt = titleDropTimings[i];
    assert.equal(ev.kind, "title_drip");
    assert.equal(ev.frame, dt.landFrame);
    assert.equal(dropStateAt(ev.frame - 1, drop, dt).phase, "falling");
    assert.equal(dropStateAt(ev.frame, drop, dt).phase, "settling");
  }
  const sealEv = titleEvents[4];
  assert.equal(sealEv.kind, "seal_stamp");
  assert.equal(sealEv.frame, SEAL_STAMP_FRAME);
  assert.equal(stampStateAt(sealEv.frame - 1, SEAL_STAMP_FRAME).visible, false);
  assert.equal(stampStateAt(sealEv.frame, SEAL_STAMP_FRAME).visible, true);
  assert.ok(sealEv.frame < SHOT12_DURATION);
});

test("片名墨色与第 12 镜身后天色的对比全程不低于 4.5:1，且白文字口与印泥对比不低于 4.0:1", () => {
  const ink = rgb(titlePalette.ink);
  const topY = defaultTitleLayout.topY;
  const bottomY =
    defaultTitleLayout.topY +
    defaultTitleLayout.charSize * 2 +
    defaultTitleLayout.charGap;
  for (let y = topY; y <= bottomY; y += 8) {
    const sky = twilightSkyColorAt(y / 1080);
    const ratio = contrastRatio(ink, sky);
    assert.ok(
      ratio >= 4.5,
      `y=${y} 处墨色与天色对比度 ${ratio.toFixed(2)} 低于 4.5:1`,
    );
  }
  const sealContrast = contrastRatio(
    rgb(titlePalette.carve),
    rgb(titlePalette.paste),
  );
  assert.ok(sealContrast >= 4.0, `印章字口与印泥对比度 ${sealContrast.toFixed(2)} 偏低`);
});

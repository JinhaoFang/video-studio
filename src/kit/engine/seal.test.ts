/** 篆刻印章工具的纯逻辑与确定性测试：印廓残破、白文/朱文栅格化、印泥不匀与盖印时间。待定事项：无。 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { rgb, toBytes } from "./paint.ts";
import {
  renderSeal,
  sealOutline,
  stampStateAt,
  type SealSpec,
} from "./seal.ts";

const sampleSpec: SealSpec = {
  mode: "intaglio",
  strokes: [
    {
      points: [
        [0.2, 0.2],
        [0.2, 0.8],
      ],
    },
    {
      points: [
        [0.5, 0.2],
        [0.8, 0.2],
        [0.8, 0.8],
      ],
    },
  ],
  chips: [
    { side: "top", at: 0.25, width: 0.14, depth: 0.045 },
    { side: "right", at: 0.72, width: 0.12, depth: 0.04 },
  ],
  seed: 183,
};

test("sealOutline 在残破处向内凹陷且同种子结果一致", () => {
  const chipped = sealOutline(100, 4, sampleSpec.chips!, 0.5, 183);
  const intact = sealOutline(100, 4, [], 0.5, 183);
  assert.deepEqual(chipped, sealOutline(100, 4, sampleSpec.chips!, 0.5, 183));
  const topChipped = chipped.filter(([x, y]) => x > 18 && x < 34 && y < 20);
  const topIntact = intact.filter(([x, y]) => x > 18 && x < 34 && y < 20);
  const maxYChipped = Math.max(...topChipped.map((p) => p[1]));
  const maxYIntact = Math.max(...topIntact.map((p) => p[1]));
  assert.ok(maxYChipped > maxYIntact + 2);
});

test("renderSeal 支持白文与朱文、同种子确定性、且印泥具有不匀纹理", () => {
  const options = {
    size: 64,
    pasteColor: rgb("#b0473a"),
    carveColor: rgb("#efe4cf"),
  };
  const a = renderSeal(sampleSpec, options);
  const b = renderSeal(sampleSpec, options);
  assert.deepEqual(toBytes(a), toBytes(b));

  const bytes = toBytes(a);
  const redValues: number[] = [];
  let brightPixels = 0;
  for (let i = 0; i < bytes.length; i += 4) {
    const r = bytes[i];
    const g = bytes[i + 1];
    const bl = bytes[i + 2];
    const al = bytes[i + 3];
    if (al < 180) continue;
    if (r > 200 && g > 190 && bl > 170) brightPixels++;
    else if (r > g + 45) redValues.push(r);
  }
  assert.ok(brightPixels > 40);
  assert.ok(redValues.length > 400);
  const minR = Math.min(...redValues);
  const maxR = Math.max(...redValues);
  assert.ok(maxR - minR > 15);

  const relief = renderSeal({ ...sampleSpec, mode: "relief" }, options);
  const rBytes = toBytes(relief);
  let reliefBright = 0;
  for (let i = 0; i < rBytes.length; i += 4) {
    if (rBytes[i + 3] > 180 && rBytes[i] > 200 && rBytes[i + 1] > 190) reliefBright++;
  }
  assert.ok(reliefBright > brightPixels * 2);
});

test("stampStateAt 在盖印帧前不可见，在盖印帧当帧落定", () => {
  assert.equal(stampStateAt(147, 148).visible, false);
  const on = stampStateAt(148, 148);
  assert.equal(on.visible, true);
  assert.ok(on.scale >= 1);
  const settled = stampStateAt(150, 148, 2);
  assert.equal(settled.visible, true);
  assert.equal(settled.scale, 1);
  assert.equal(settled.alpha, 1);
});

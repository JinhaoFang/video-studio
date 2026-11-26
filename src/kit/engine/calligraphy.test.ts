/** 毛笔书写工具的纯逻辑与确定性测试：路径采样、转折保留、压感曲线、飞白、落点时间与对比度。待定事项：无。 */
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  contrastRatio,
  dropStateAt,
  paintCalligraphyStroke,
  pressureProfile,
  sampleStroke,
  strokeProgressAt,
  type BrushNode,
  type BrushStyle,
  type CalligraphyStroke,
  type DropDot,
} from "./calligraphy.ts";
import { paper, rgb, toBytes } from "./paint.ts";

test("sampleStroke 弧长单调递增且转折点不圆滑过冲", () => {
  const nodes: BrushNode[] = [
    { x: 10, y: 20, pressure: 0.9, speed: 0.5 },
    { x: 70, y: 20, pressure: 1.0, speed: 0.6, corner: true },
    { x: 70, y: 80, pressure: 1.0, speed: 0.7 },
  ];
  const pts = sampleStroke(nodes, 3);
  assert.ok(pts.length > 20);
  for (let i = 1; i < pts.length; i++) {
    assert.ok(pts[i].s > pts[i - 1].s);
    assert.ok(pts[i].u >= pts[i - 1].u);
  }
  assert.ok(Math.abs(pts[0].x - 10) < 1e-6);
  assert.ok(Math.abs(pts[pts.length - 1].y - 80) < 1e-6);
  const cornerSample = pts.reduce((best, item) =>
    Math.hypot(item.x - 70, item.y - 20) < Math.hypot(best.x - 70, best.y - 20)
      ? item
      : best,
  );
  assert.ok(Math.hypot(cornerSample.x - 70, cornerSample.y - 20) < 0.01);
  assert.ok(cornerSample.cornerWeight > 0.95);
});

test("pressureProfile 区分藏锋/露锋起笔与出锋/回锋收笔", () => {
  const pts = sampleStroke(
    [
      { x: 0, y: 0, pressure: 1 },
      { x: 50, y: 0, pressure: 1 },
      { x: 100, y: 0, pressure: 1 },
    ],
    2,
  );
  const start = pts[0];
  const end = pts[pts.length - 1];
  const hiddenStart = pressureProfile(start, "hidden", "press", 20);
  const exposedStart = pressureProfile(start, "exposed", "press", 20);
  assert.ok(hiddenStart > exposedStart * 3);

  const pressEnd = pressureProfile(end, "hidden", "press", 20);
  const taperEnd = pressureProfile(end, "hidden", "taper", 20);
  assert.ok(pressEnd > taperEnd * 3);
});

test("paintCalligraphyStroke 确定性、进度单调递增且快笔干墨产生飞白", () => {
  const stroke: CalligraphyStroke = {
    id: "test-h",
    nodes: [
      { x: 16, y: 32, pressure: 1.0, speed: 0.4 },
      { x: 70, y: 30, pressure: 0.95, speed: 0.95 },
      { x: 124, y: 28, pressure: 0.9, speed: 1.0 },
    ],
    entry: "hidden",
    exit: "taper",
    seed: 42,
  };
  const wetStyle: BrushStyle = {
    color: rgb("#3a2a28"),
    baseWidth: 16,
    dry: 0.02,
    bristles: 16,
  };
  const dryStyle: BrushStyle = {
    ...wetStyle,
    dry: 0.85,
  };

  const a = paper(140, 64);
  const b = paper(140, 64);
  paintCalligraphyStroke(a, stroke, wetStyle, 1);
  paintCalligraphyStroke(b, stroke, wetStyle, 1);
  assert.deepEqual(toBytes(a), toBytes(b));

  const alphaSum = (p: ReturnType<typeof paper>) => {
    let sum = 0;
    for (let i = 3; i < p.data.length; i += 4) sum += p.data[i];
    return sum;
  };
  const half = paper(140, 64);
  paintCalligraphyStroke(half, stroke, wetStyle, 0.5);
  assert.ok(alphaSum(half) > 0);
  assert.ok(alphaSum(a) > alphaSum(half) * 1.4);

  const dryCanvas = paper(140, 64);
  paintCalligraphyStroke(dryCanvas, stroke, dryStyle, 1);
  assert.ok(alphaSum(dryCanvas) > 0);
  assert.ok(alphaSum(dryCanvas) < alphaSum(a) * 0.88);
});

test("strokeProgressAt 与 dropStateAt 在起止帧和落点帧精确对齐", () => {
  const timing = { id: "s1", startFrame: 64, endFrame: 70 };
  assert.equal(strokeProgressAt(63, timing), 0);
  assert.ok(strokeProgressAt(67, timing) > 0 && strokeProgressAt(67, timing) < 1);
  assert.equal(strokeProgressAt(70, timing), 1);

  const drop: DropDot = {
    id: "d1",
    start: [100, 50],
    nodes: [
      { x: 100, y: 80, pressure: 0.7 },
      { x: 108, y: 88, pressure: 1.0 },
    ],
    seed: 12,
  };
  const dt = { id: "d1", fallStartFrame: 87, landFrame: 90, settleFrames: 2 };
  assert.equal(dropStateAt(86, drop, dt).phase, "waiting");
  const falling = dropStateAt(88, drop, dt);
  assert.equal(falling.phase, "falling");
  assert.ok(falling.y > 50 && falling.y < 80);
  const impact = dropStateAt(90, drop, dt);
  assert.equal(impact.phase, "settling");
  assert.equal(impact.y, 80);
  assert.equal(dropStateAt(92, drop, dt).phase, "landed");
});

test("contrastRatio 核对 art.md 第 12 镜墨色与天色对比度", () => {
  const ink = rgb("#3a2a28");
  const band = rgb("#b39ab2");
  const high = rgb("#6f78a3");
  const cBand = contrastRatio(ink, band);
  const cHigh = contrastRatio(ink, high);
  assert.ok(cBand > 5.0 && cBand < 5.6);
  assert.ok(cHigh > 2.9 && cHigh < 3.4);
});

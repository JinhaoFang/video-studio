/// <reference types="web" />
/** 麻雀羽衣轮廓与电线小跳的逐张回归。设定图 58 px/单位，轮廓一档的容差取一根 1.6 px 的细墨线。
 * 小跳在 4 帧内走完 0.58 个单位，一拍二时一张画最多走一半。用 node --test 运行。
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  contours,
  sample,
  viewBasis,
  type Point,
} from "../../src/kit/engine/figure.ts";
import { createFlock, flockMemberState } from "./flock.ts";
import { restPose, sparrowPlumageField } from "./sparrow.ts";

const pointToLoop = ([x, y]: Point, loop: Point[]) => {
  let nearest = Infinity;
  for (let i = 0; i < loop.length; i++) {
    const [ax, ay] = loop[i];
    const [bx, by] = loop[(i + 1) % loop.length];
    const dx = bx - ax;
    const dy = by - ay;
    const t = Math.max(
      0,
      Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1)),
    );
    nearest = Math.min(
      nearest,
      (x - ax - dx * t) ** 2 + (y - ay - dy * t) ** 2,
    );
  }
  return Math.sqrt(nearest);
};

const directedGap = (from: Point[][], to: Point[][]) =>
  Math.max(
    ...from
      .flat()
      .map((p) => Math.min(...to.map((loop) => pointToLoop(p, loop)))),
  );

for (const yaw of [0, 0.7]) {
  test(`湿羽甩乱的每一档轮廓位移小于一根细墨线（转角 ${yaw}）`, (t) => {
    const limit = 1.6;
    let previous: Point[][] = [];
    let peak = 0;
    let peakStep = 0;
    for (let step = 0; step <= 50; step++) {
      const sdf = sparrowPlumageField({
        ...restPose,
        wet: 1,
        ruffle: step / 50,
      });
      const s = sample(sdf, {
        basis: viewBasis(yaw, 0.1),
        originX: 0,
        originY: 0,
        ppu: 58,
        cell: 2,
        radius: 2.48,
        center: [0, 0, 0],
      });
      const loops = contours(s.silhouette, s.grid);
      assert.ok(loops.length);
      if (step > 0) {
        const gap = Math.max(
          directedGap(previous, loops),
          directedGap(loops, previous),
        );
        if (gap > peak) {
          peak = gap;
          peakStep = step;
        }
      }
      previous = loops;
    }
    t.diagnostic(
      `最大轮廓位移 ${peak.toFixed(3)} px，第 ${peakStep} 档，上限 ${limit} px`,
    );
    assert.ok(peak < limit, `第 ${peakStep} 档位移 ${peak} px`);
  });
}

const land = { frame: 150, slot: 0.5 };

test("默认鸟群 192 帧中每张画的水平位移受单跳步幅约束", (t) => {
  let peak = 0;
  for (const reaction of [undefined, land]) {
    for (const member of createFlock()) {
      let last = flockMemberState(member, 0, reaction);
      for (let f = 1; f < 192; f++) {
        const state = flockMemberState(member, f, reaction);
        const dx = Math.abs(state.offsetX - last.offsetX);
        peak = Math.max(peak, dx);
        assert.ok(
          dx <= 0.58 / 2 + 1e-12,
          `鸟 ${member.id} 第 ${f} 帧横移 ${dx}`,
        );
        if (f % 2) assert.deepEqual(last, state);
        last = state;
      }
    }
  }
  const hoppingBird = createFlock().find(
    (member) => member.idleKind === "hop",
  )!;
  const landing = Math.ceil((hoppingBird.idleStart + 6) / 2) * 2;
  const firstPerch = flockMemberState(hoppingBird, landing).offsetX;
  assert.equal(Math.abs(firstPerch), 0.58);
  for (
    let f = landing;
    f < hoppingBird.idleStart + hoppingBird.idlePeriod;
    f++
  ) {
    assert.equal(flockMemberState(hoppingBird, f).offsetX, firstPerch);
  }
  assert.equal(
    flockMemberState(hoppingBird, landing + hoppingBird.idlePeriod).offsetX,
    0,
  );
  t.diagnostic(`单张画最大水平位移 ${peak.toFixed(3)} 单位`);
});

test("主角居中落地后邻鸟两两错开离线", (t) => {
  for (const count of [5, 6, 7]) {
    const takeoffs: number[] = [];
    for (const member of createFlock(count)) {
      const distance = Math.abs(member.slot - land.slot);
      if (distance < 0.02 || distance >= 0.36) continue;
      let takeoff = -1;
      for (let f = land.frame; f < 192; f++) {
        if (
          !flockMemberState(member, f, land).legs &&
          flockMemberState(member, f).legs
        ) {
          takeoff = f;
          break;
        }
      }
      assert.ok(takeoff > land.frame, `鸟 ${member.id} 未见离线`);
      takeoffs.push(takeoff);
    }
    t.diagnostic(
      `${count} 只鸟，邻鸟依次离线于 ${takeoffs.join("、")} 帧（按站位列）`,
    );
    assert.equal(new Set(takeoffs).size, takeoffs.length);
  }
});

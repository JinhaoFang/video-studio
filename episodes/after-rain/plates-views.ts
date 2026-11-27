/**
 * 《雨后》正片各新机位的水粉底图绘制（#200 返工精修版）：
 * 几何投影只作草稿定位，所有建筑、屋瓦、灰泥墙、木墙板、树篱、林木、湿泥地、水洼、稻田与天空均以顺形水粉笔触与手绘边缘画出，摒弃平涂、直尺线与规则几何。
 * 1. 老屋正面反向机位（第 1 镜暴雨版、第 12 镜暮色灭灯版 + 独立透明亮灯层）：晾衣架由 pole-stand.ts 实时投影；雨中的屋瓦分垄叠放，湿光沿筒瓦断续，暮色只保留屋脊和檐口轮廓光；灭灯底图与独立灯层分别绘制；
 * 2. 第 10 镜低夕光回看老屋正面：保持玄关门洞与 1.64 米檐影线构图不变；檐影上半墙改灰泥哑光质感；下半墙板逐块画接缝、通长木纹与深浅（去掉梭形）；右上受光屋瓦按 3D 透视画成行瓦垄（去掉迷彩斑）；檐廊地板木纹顺地板方向走；两根柱子改成手画边的木方柱；
 * 3. 第 4、6 镜贴地低机位院子与第 2、5、7、8、9 镜近景虚化背景保持验收通过版本不变；
 * 4. 第 11 镜稻田上空大远景：按 shots/s10-11/ 实际相机路径（含末段上摇至 +8.3°）扩展天空覆盖并画入冷暖夕云与空气层；远处补林带与农舍罩在暖紫雾（#b49aa8）中；稻田去掉细直地块线，改用大片风吹明暗稻浪与地块色相/稻行方向变化，田埂改成手画不规则宽窄、弯折、缺口与边草。#190 追加：天空分暖冷两侧（画左上靠太阳最亮最暖，画右上偏冷紫），太阳方位正下方远处一条逆光发亮的反光带，近处更深更饱和并压一片云影，稻行加影子线，风浪暗槽加深。
 */
import { project, toCamera } from "../../src/kit/engine/camera.ts";
import type { Camera, Vec3 } from "../../src/kit/engine/camera.ts";
import { fbm2, noise1 } from "../../src/kit/engine/random.ts";
import { curve, mixRgb, mottle, rgb, shadeRgb } from "../../src/kit/engine/paint.ts";
import type { Paper, RGB } from "../../src/kit/engine/paint.ts";
import {
  arc,
  bilerp,
  billows,
  cloudCauliflower,
  fill,
  handLine,
  handPath,
  jitter,
  line,
  makeBrush,
  mass,
  paintWash,
} from "./plates.ts";
import type { Brush, MassTones, Puff } from "./plates.ts";
import {
  hedgeWorld,
  house,
  paddyWorld,
  puddleW1,
  yardPath,
  yardPuddlesWorld,
} from "./scene.ts";
import type { ViewPlate } from "./scene.ts";
import {
  closeup,
  dusk,
  houseRain,
  houseTakeoff,
  houseTwilight,
  ink,
  lowYard,
  paddyWide,
  props,
  rain,
  sheet,
  warm,
} from "./tokens.ts";

const proj = (camera: Camera, p: Vec3): [number, number] => {
  const q = project(camera, p);
  return [q.x, q.y];
};

const horizonOf = (camera: Camera): number => {
  const f = (camera.focal / 36) * camera.width;
  return camera.height / 2 + f * Math.tan(camera.pitch);
};

const screenToGround = (camera: Camera, sx: number, sy: number): [number, number] | null => {
  const f = (camera.focal / 36) * camera.width;
  const cx = (sx - camera.width / 2) / f;
  const cy = -(sy - camera.height / 2) / f;
  const cp = Math.cos(camera.pitch);
  const sp = Math.sin(camera.pitch);
  const cyaw = Math.cos(camera.yaw);
  const syaw = Math.sin(camera.yaw);
  const dy1 = cp - cy * sp;
  const dz = sp + cy * cp;
  if (dz >= -1e-4) return null;
  const dx = cx * cyaw + dy1 * syaw;
  const dy = -cx * syaw + dy1 * cyaw;
  const t = -camera.position[2] / dz;
  if (t <= 0 || t > 1400) return null;
  return [camera.position[0] + dx * t, camera.position[1] + dy * t];
};

const paintSoftDisk = (
  b: Brush,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  col: RGB,
  alpha: number,
  ringBoost = 0.14,
) => {
  const { width, height, data } = b.c;
  const [pcx, pcy] = b.P(cx, cy);
  const prx = Math.max(2, rx * b.k);
  const pry = Math.max(2, ry * b.k);
  const x0 = Math.max(0, Math.floor(pcx - prx * 1.12));
  const x1 = Math.min(width - 1, Math.ceil(pcx + prx * 1.12));
  const y0 = Math.max(0, Math.floor(pcy - pry * 1.12));
  const y1 = Math.min(height - 1, Math.ceil(pcy + pry * 1.12));
  const invRx = 1 / prx;
  const invRy = 1 / pry;
  const [cr, cg, cb] = col;
  for (let py = y0; py <= y1; py++) {
    const dy = (py - pcy) * invRy;
    const dy2 = dy * dy;
    for (let px = x0; px <= x1; px++) {
      const dx = (px - pcx) * invRx;
      const r2 = dx * dx + dy2;
      if (r2 >= 1.1) continue;
      const r = Math.sqrt(r2);
      const edge = r <= 0.55 ? 1 : Math.max(0, 1 - (r - 0.55) / 0.5);
      const soft = edge * edge * (3 - 2 * edge);
      const ring = ringBoost > 0 ? 1 + ringBoost * Math.exp(-Math.pow((r - 0.72) / 0.18, 2)) : 1;
      const a = Math.min(1, alpha * soft * ring);
      if (a <= 0.002) continue;
      const idx = (py * width + px) * 4;
      const inv = 1 - a;
      data[idx] = data[idx] * inv + cr * a;
      data[idx + 1] = data[idx + 1] * inv + cg * a;
      data[idx + 2] = data[idx + 2] * inv + cb * a;
      data[idx + 3] = data[idx + 3] * inv + a;
    }
  }
};

const paintSoftGlowQuad = (
  b: Brush,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  col: RGB,
  alpha: number,
) => {
  paintSoftDisk(b, cx, cy, rx, ry, col, alpha, 0);
};

const paintSilhouetteCluster = (
  b: Brush,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  baseCol: RGB,
  deepCol: RGB,
  rimCol: RGB,
  clusters = 14,
) => {
  const lobes: [number, number, number][] = [];
  for (let i = 0; i < clusters; i++) {
    const a = (i / clusters) * Math.PI * 2 + b.r.range(-0.24, 0.24);
    const dist = b.r.range(0.32, 0.84);
    const lx = cx + Math.cos(a) * rx * dist;
    const ly = cy + Math.sin(a) * ry * dist;
    const rad = Math.min(rx, ry) * b.r.range(0.22, 0.42);
    lobes.push([lx, ly, rad]);
  }
  lobes.push([cx, cy, Math.min(rx, ry) * 0.56]);

  for (const [lx, ly, rad] of lobes) {
    if (ly < cy + ry * 0.15) {
      const tufts = 4 + Math.floor(b.r.next() * 3);
      for (let t = 0; t < tufts; t++) {
        const a = b.r.range(-Math.PI * 0.96, -Math.PI * 0.04);
        const px = lx + Math.cos(a) * rad * 0.96 * 1.12;
        const py = ly + Math.sin(a) * rad * 0.96 * 0.88 - 1.5;
        const rLeaf = Math.max(5, rad * b.r.range(0.18, 0.32));
        fill(b, arc(px, py, rLeaf, 0, Math.PI * 2, 8).slice(0, -1), jitter(b, rimCol, 0.025), Math.max(1.5, rLeaf * 0.25), 0.72);
      }
    }
  }

  for (const [lx, ly, rad] of lobes) {
    const pts = arc(lx, ly, rad, 0, Math.PI * 2, 12)
      .slice(0, -1)
      .map(([x, y]) => [lx + (x - lx) * 1.12, ly + (y - ly) * 0.88] as [number, number]);
    fill(b, pts, jitter(b, baseCol, 0.018), Math.max(2.6, rad * 0.2), 0.99);
    const outerTufts = 3;
    for (let t = 0; t < outerTufts; t++) {
      const a = b.r.range(-Math.PI * 1.05, Math.PI * 0.12);
      const px = lx + Math.cos(a) * rad * 0.9 * 1.12;
      const py = ly + Math.sin(a) * rad * 0.9 * 0.88;
      const rLeaf = Math.max(4.5, rad * b.r.range(0.18, 0.3));
      fill(b, arc(px, py, rLeaf, 0, Math.PI * 2, 7).slice(0, -1), jitter(b, baseCol, 0.022), Math.max(1.4, rLeaf * 0.22), 0.95);
    }
  }

  const innerCount = Math.max(16, Math.round((rx * ry) / 1800));
  for (let i = 0; i < innerCount; i++) {
    const a = b.r.range(0, Math.PI * 2);
    const rr = Math.sqrt(b.r.next()) * 0.78;
    const x = cx + Math.cos(a) * rx * rr;
    const y = cy + Math.sin(a) * ry * rr;
    const lowerBias = Math.max(0, Math.min(1, (y - (cy - ry)) / Math.max(1, 2 * ry)));
    const col = mixRgb(baseCol, deepCol, 0.25 + lowerBias * 0.6);
    const len = b.r.range(14, 28);
    const ang = b.r.range(-0.4, 0.4);
    line(
      b,
      [[x - Math.cos(ang) * len * 0.5, y - Math.sin(ang) * len * 0.5], [x + Math.cos(ang) * len * 0.5, y + Math.sin(ang) * len * 0.5]],
      b.r.range(10, 18),
      jitter(b, col, 0.02),
      { dry: 0.38, body: 0.62, alpha: 0.5, taper: [0.38, 0.38] },
    );
  }
};

const paintHouseSky = (plate: ViewPlate, mode: "rain" | "twilight"): Paper => {
  const isTwilight = mode === "twilight";
  const b = makeBrush(plate, isTwilight, isTwilight ? 7112 : 7101);
  const { rect, reference: cam } = plate;
  const horizonY = horizonOf(cam);
  const ridgeY = project(cam, [0, house.ridgeY, house.ridgeZ]).y;
  const treeTopY = project(cam, [8.5, 0.5, 4.4]).y;

  if (!isTwilight) {
    const skyBase = rgb(houseRain.sky);
    const stormDark = mixRgb(rgb(rain.cloud.dark), rgb(houseRain.eavesDark), 0.34);
    const stormMid = mixRgb(skyBase, rgb(rain.cloud.mid), 0.38);
    const stormLight = mixRgb(skyBase, rgb(houseRain.lightningSky), 0.56);
    paintWash(
      b,
      rect.y0,
      rect.y1,
      (x, y) => {
        const t = Math.max(0, Math.min(1, (y - rect.y0) / Math.max(1, horizonY - rect.y0)));
        const drift = x * 0.08 + y * 0.03;
        const deck1 = fbm2((x + drift) / 620, y / 155, 7103, 3);
        const deck2 = fbm2((x - drift * 0.5) / 340, y / 110, 7104, 3);
        const vert = t < 0.38 ? mixRgb(shadeRgb(skyBase, 0.84), skyBase, t / 0.38) : mixRgb(skyBase, stormLight, ((t - 0.38) / 0.62) * 0.46);
        const layered = mixRgb(vert, deck1 < 0.48 ? stormDark : stormMid, Math.min(0.65, Math.abs(deck1 - 0.48) * 1.15));
        const bellies = Math.max(0, Math.min(1, 1 - Math.abs(y - (ridgeY - 175)) / 180));
        return mixRgb(layered, deck2 < 0.5 ? stormDark : stormLight, bellies * (0.5 - deck2) * 0.62);
      },
      0.015,
      7101,
    );

    const cloudDecks: [number, number, RGB, number][] = [
      [rect.y0 + 170, 95, mixRgb(stormDark, skyBase, 0.36), 0.24],
      [ridgeY - 220, 110, mixRgb(stormDark, skyBase, 0.24), 0.28],
      [ridgeY - 95, 85, mixRgb(stormDark, skyBase, 0.16), 0.3],
    ];
    for (const [yc, spread, col, alpha] of cloudDecks) {
      for (let i = 0; i < 24; i++) {
        const x = b.r.range(rect.x0 - 180, rect.x1 - 180);
        const y = yc + b.r.range(-spread * 0.5, spread * 0.5);
        const len = b.r.range(380, 880);
        line(b, curve([x, y], [x + len, y + b.r.range(-18, 18)], b.r.range(-0.03, 0.03), 5), b.r.range(48, 92), jitter(b, col, 0.015), {
          dry: 0.5,
          body: 0.44,
          alpha: b.r.range(alpha * 0.65, alpha * 1.15),
          taper: [0.44, 0.44],
          streak: 0.06,
        });
      }
      for (let i = 0; i < 10; i++) {
        const x = b.r.range(rect.x0 - 100, rect.x1 - 240);
        const y = yc - spread * b.r.range(0.18, 0.45);
        const len = b.r.range(260, 620);
        line(b, curve([x, y], [x + len, y + b.r.range(-10, 10)], b.r.range(-0.02, 0.02), 5), b.r.range(26, 52), jitter(b, stormLight, 0.015), {
          dry: 0.52,
          body: 0.38,
          alpha: b.r.range(0.1, 0.2),
          taper: [0.45, 0.45],
          streak: 0.05,
        });
      }
    }

    const { width, height, data } = b.c;
    const x0 = b.rect.x0;
    const y0 = b.rect.y0;
    const invK = 1 / b.k;
    const rainLight = mixRgb(skyBase, stormLight, 0.66);
    const rainDark = mixRgb(stormDark, skyBase, 0.46);
    for (let py = 0; py < height; py++) {
      const wy = y0 + py * invK;
      const vertFade = Math.max(0, Math.min(1, (wy - (ridgeY - 380)) / 240));
      if (vertFade <= 0.01) continue;
      for (let px = 0; px < width; px++) {
        const wx = x0 + px * invK;
        const slantX = wx - wy * 0.123;
        const sheet1 = fbm2(slantX / 105, wy / 620, 718, 3);
        const sheet2 = fbm2(slantX / 22, wy / 440, 719, 2);
        const veil = Math.max(0, sheet1 - 0.36) * 0.48 + Math.max(0, sheet2 - 0.48) * 0.24;
        const a = Math.min(0.3, veil * vertFade);
        if (a <= 0.005) continue;
        const col = sheet1 > 0.55 ? rainLight : rainDark;
        const idx = (py * width + px) * 4;
        const inv = 1 - a;
        data[idx] = data[idx] * inv + col[0] * a;
        data[idx + 1] = data[idx + 1] * inv + col[1] * a;
        data[idx + 2] = data[idx + 2] * inv + col[2] * a;
      }
    }

    mottle(b.c, 92 * b.k, 0.02, 71);
    return b.c;
  }

  const high = rgb(houseTwilight.skyHigh);
  const belt = rgb(houseTwilight.skyBelt);
  const earth = rgb(houseTwilight.earthShadow);
  const beltTop = ridgeY - 310;
  const beltMid = ridgeY - 105;
  const beltBot = ridgeY + 25;
  const twilightAt = (x: number, y: number): RGB => {
    const wave = (fbm2(x / 520, y / 220, 712, 2) - 0.5) * 24;
    const yy = y + wave;
    if (yy <= beltTop) {
      const u = Math.max(0, Math.min(1, (yy - rect.y0) / Math.max(1, beltTop - rect.y0)));
      return mixRgb(shadeRgb(high, 0.88), high, u);
    }
    if (yy <= beltMid) {
      const u = (yy - beltTop) / Math.max(1, beltMid - beltTop);
      const s = u * u * (3 - 2 * u);
      return mixRgb(high, belt, s);
    }
    if (yy <= beltBot) {
      const u = (yy - beltMid) / Math.max(1, beltBot - beltMid);
      const s = u * u * (3 - 2 * u);
      return mixRgb(belt, earth, s * 0.88);
    }
    const u = Math.max(0, Math.min(1, (yy - beltBot) / Math.max(1, treeTopY - beltBot + 140)));
    return mixRgb(mixRgb(belt, earth, 0.88), earth, u);
  };
  paintWash(b, rect.y0, rect.y1, twilightAt, 0.013, 7112);

  for (let i = 0; i < 48; i++) {
    const y = b.r.range(rect.y0 + 18, beltBot + 150);
    const x = b.r.range(rect.x0 - 120, rect.x1 - 240);
    const len = b.r.range(380, 920);
    const base = twilightAt(x + len * 0.5, y);
    const shift = y > beltTop && y < beltBot ? mixRgb(base, rgb(dusk.cloud.edge), 0.08) : mixRgb(base, high, 0.1);
    line(
      b,
      curve([x, y], [x + len, y + b.r.range(-6, 6)], b.r.range(-0.012, 0.012), 5),
      b.r.range(34, 68),
      jitter(b, shift, 0.012),
      { dry: 0.46, body: 0.38, alpha: b.r.range(0.12, 0.22), taper: [0.42, 0.42], streak: 0.04 },
    );
  }
  mottle(b.c, 112 * b.k, 0.016, 72);
  return b.c;
};

type RoofPoint = (u: number, v: number) => [number, number];

const paintKawara = (
  b: Brush,
  point: RoofPoint,
  count: number,
  base: RGB,
  shade: RGB,
  light: RGB,
  wet: boolean,
) => {
  const rows = 16;
  for (let c = 0; c < count; c++) {
    const course = (c + 0.14 * (noise1(c * 1.9, 7231) - 0.5)) / count;
    const next = (c + 1 + 0.14 * (noise1((c + 1) * 1.9, 7231) - 0.5)) / count;
    const offset = b.r.range(-0.32, 0.32);
    for (let r = rows - 1; r >= 0; r--) {
      const v = Math.max(0, (r + offset) / rows);
      const end = r === rows - 1 ? 1 : (r + 1 + offset) / rows;
      const start = r === 0 ? 0 : v;
      const origin = point(course, end);
      const width = Math.abs(point(next, end)[0] - origin[0]);
      const height = Math.abs(point(course, start)[1] - origin[1]);
      if (
        origin[0] < b.rect.x0 - width - 180 ||
        origin[0] > b.rect.x1 + width + 180 ||
        origin[1] < b.rect.y0 - height
      )
        continue;
      const detail =
        Math.max(0, Math.min(1, (Math.min(width, height * 3) - 3) / 14)) *
        (0.14 + 0.86 * end) *
        (0.62 + 0.38 * noise1(c * 0.19 + end, 7281));
      const arch = Math.min(width * b.r.range(0.13, 0.19), height * 0.62);
      const shift = b.r.range(-0.035, 0.035);
      const tile = (x: number, y: number, crown = 0): [number, number] => {
        const q = point(
          course + (next - course) * (x + shift),
          start + (end - start) * y,
        );
        return [q[0], q[1] - arch * crown];
      };
      const tone = mixRgb(base, shade, b.r.range(0.08, 0.46));
      const glaze = mixRgb(tone, light, b.r.range(0.28, 0.58));
      const chipped = b.r.next() < 0.045;
      fill(
        b,
        [
          tile(0, 0),
          tile(1, 0),
          tile(1, 1),
          tile(chipped ? 0.81 : 0.93, chipped ? 0.82 : 0.99),
          tile(0.65, 1.03),
          tile(0, 0.98),
        ],
        tone,
        0.5,
        0.32 + detail * 0.56,
      );
      const cap = (x: number, y: number) =>
        tile(0.07 + x * 0.5, y, Math.sin(Math.PI * x));
      const face = (left: number, right: number, color: RGB, alpha: number) =>
        fill(
          b,
          [
            cap(left, 0),
            cap(right, 0),
            cap(right, 1),
            cap((right + left) / 2, 1.025),
            cap(left, 1),
          ],
          color,
          0.42,
          alpha * detail,
        );
      face(0, 0.32, glaze, 0.9);
      face(0.32, 0.67, mixRgb(tone, light, 0.26), 0.95);
      face(0.67, 1, shade, 0.92);
      if (detail > 0.15 && b.r.next() < (wet ? 0.45 : 0.19)) {
        const along = b.r.range(0.08, 0.62);
        line(
          b,
          [cap(0.24, along), cap(0.27, along + b.r.range(0.13, 0.34))],
          Math.max(1, width * 0.065),
          light,
          { dry: 0.52, alpha: detail * 0.68, taper: [0.28, 0.36] },
        );
      }
      if (detail > 0.45 && b.r.next() < 0.035) {
        line(
          b,
          [tile(0.62, 0.77), tile(0.83, 0.89)],
          Math.max(1, height * 0.19),
          mixRgb(tone, rgb(houseRain.trees), 0.64),
          { dry: 0.46, alpha: 0.72 },
        );
      }
    }
  }
};

const paintHouseFront = (plate: ViewPlate, mode: "rain" | "twilight"): Paper => {
  const isTwilight = mode === "twilight";
  const b = makeBrush(plate, isTwilight, isTwilight ? 7212 : 7201);
  const { rect, reference: cam } = plate;
  const p = (x: number, y: number, z: number): [number, number] => proj(cam, [x, y, z]);

  const treeCol = isTwilight ? rgb(houseTwilight.trees) : rgb(houseRain.trees);
  const treeDeep = shadeRgb(treeCol, isTwilight ? 0.76 : 0.78);
  const treeFar = isTwilight ? mixRgb(treeCol, rgb(houseTwilight.earthShadow), 0.34) : mixRgb(treeCol, rgb(houseRain.sky), 0.3);
  const treeRim = isTwilight ? mixRgb(treeCol, rgb(houseTwilight.skyBelt), 0.42) : mixRgb(treeCol, rgb(houseRain.lightningSky), 0.3);

  const farWoodSpecs: [number, number, number, number, number][] = [
    [15.8, -2.5, 4.4, 2.3, 1.9],
    [13.4, -2.8, 4.0, 2.0, 1.7],
    [10.8, -3.0, 3.8, 1.9, 1.6],
    [8.2, -3.2, 3.6, 1.8, 1.5],
  ];
  for (const [tx, ty, th, rxM, ryM] of farWoodSpecs) {
    const c = p(tx, ty, th * 0.62);
    const sc = project(cam, [tx, ty, th * 0.62]).scale;
    paintSilhouetteCluster(b, c[0], c[1], rxM * sc, ryM * sc, treeFar, treeCol, treeRim, 12);
  }

  const midTreeSpecs: [number, number, number, number, number][] = [
    [14.2, 1.2, 3.8, 1.85, 1.6],
    [12.0, 0.5, 3.5, 1.65, 1.45],
    [10.1, -0.2, 3.1, 1.5, 1.3],
    [8.5, -0.5, 3.4, 1.6, 1.45],
    [7.1, -0.8, 2.8, 1.35, 1.2],
  ];
  for (const [tx, ty, th] of midTreeSpecs) {
    const basePt = p(tx, ty, 0);
    const topPt = p(tx, ty, th * 0.55);
    const w = Math.max(5, project(cam, [tx, ty, 0.8]).scale * 0.18);
    handLine(b, basePt, topPt, w, treeDeep, { dry: 0.22, body: 0.85, jitterPx: 2.2, taper: [0.05, 0.25] });
  }
  for (const [tx, ty, th, rxM, ryM] of midTreeSpecs) {
    const c = p(tx, ty, th * 0.62);
    const sc = project(cam, [tx, ty, th * 0.62]).scale;
    const crownCol = jitter(b, treeCol, 0.035);
    paintSilhouetteCluster(b, c[0], c[1], rxM * sc, ryM * sc, crownCol, treeDeep, treeRim, 16);
  }

  const shrubSpecs: [number, number, number, number][] = [
    [13.4, 2.2, 1.8, 1.5],
    [11.0, 1.8, 1.9, 1.45],
    [9.1, 1.5, 1.6, 1.3],
    [7.5, 1.2, 1.5, 1.25],
    [6.4, 0.9, 1.25, 1.05],
  ];
  for (const [tx, ty, th, radM] of shrubSpecs) {
    const c = p(tx, ty, th * 0.45);
    const sc = project(cam, [tx, ty, th * 0.45]).scale;
    paintSilhouetteCluster(b, c[0], c[1], radM * sc * 1.15, radM * sc * 0.72, shadeRgb(treeCol, 0.92), treeDeep, mixRgb(treeCol, treeRim, 0.52), 12);
  }

  const yardCol = isTwilight ? rgb(houseTwilight.yard) : rgb(houseRain.yard);
  const yardFarY = p(0, -0.9, 0)[1] - 8;
  const yardDark = shadeRgb(yardCol, 0.82);
  const yardWarm = isTwilight ? mixRgb(yardCol, rgb(houseTwilight.wall), 0.24) : mixRgb(yardCol, rgb(houseRain.wall), 0.26);
  fill(b, [[rect.x0, yardFarY], [rect.x1, yardFarY], [rect.x1, rect.y1], [rect.x0, rect.y1]], yardCol, 1);

  for (let row = 0; row < 44; row++) {
    const u = row / 43;
    const y = yardFarY + Math.pow(u, 1.38) * (rect.y1 - yardFarY + 14);
    const thick = 4.5 + u * 16;
    for (let x = rect.x0 - 50; x < rect.x1 + 30; ) {
      const len = b.r.range(70, 220) * (0.7 + u * 0.7);
      const n = fbm2((x + len * 0.5) / 260, y / 75, 725, 3);
      const col = n < 0.46 ? mixRgb(yardDark, yardCol, n / 0.46) : mixRgb(yardCol, yardWarm, ((n - 0.46) / 0.54) * 0.85);
      line(b, curve([x, y], [x + len, y + b.r.range(-2, 2)], 0.004, 4), thick, jitter(b, col, 0.036), {
        dry: 0.34,
        body: 0.55,
        alpha: 0.82,
        taper: [0.3, 0.3],
      });
      x += len * b.r.range(0.58, 0.88);
    }
  }

  const pathPts = yardPath.map(([x, y]) => p(x, y, 0));
  const pathCol = isTwilight ? mixRgb(yardCol, rgb(houseTwilight.wall), 0.28) : mixRgb(yardCol, rgb(houseRain.wall), 0.32);
  for (let i = 0; i < pathPts.length - 1; i++) {
    const w = Math.max(16, project(cam, [yardPath[i][0], yardPath[i][1], 0]).scale * 0.92);
    handLine(b, pathPts[i], pathPts[i + 1], w, jitter(b, pathCol, 0.025), { dry: 0.46, alpha: 0.42, jitterPx: 3.5, taper: [0.22, 0.22] });
  }

  const allPuddles = [...yardPuddlesWorld, puddleW1];
  for (const pd of allPuddles) {
    if (pd.y > 9.4) continue;
    const center = p(pd.x, pd.y, 0);
    const rx = Math.abs(p(pd.x + pd.rx, pd.y, 0)[0] - center[0]);
    const ry = Math.max(4, Math.abs(p(pd.x, pd.y + pd.ry, 0)[1] - center[1]));
    if (center[1] < yardFarY || center[1] > rect.y1 + 60) continue;
    const irrPoly: [number, number][] = [];
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      const w = 1 + 0.14 * Math.sin(a * 2 + pd.x) + 0.09 * noise1(i * 0.8 + pd.y * 2, 726);
      irrPoly.push([center[0] + Math.cos(a) * rx * w, center[1] + Math.sin(a) * ry * w]);
    }
    fill(
      b,
      irrPoly.map(([x, y]) => [center[0] + (x - center[0]) * 1.12, center[1] + (y - center[1]) * 1.18] as [number, number]),
      shadeRgb(yardDark, 0.82),
      2.2,
      0.62,
    );
    const refCol = isTwilight ? mixRgb(rgb(houseTwilight.skyBelt), rgb(houseTwilight.earthShadow), 0.46) : rgb(houseRain.puddle);
    fill(b, irrPoly, refCol, 1.8, 0.84);
    const rows = Math.max(5, Math.round(ry / 3.5));
    for (let i = 0; i < rows; i++) {
      const u = (i + 0.5) / rows;
      const yy = center[1] - ry + 2 * ry * u;
      const half = rx * Math.sqrt(Math.max(0.05, 1 - Math.pow(2 * u - 1, 2))) * 0.88;
      const glintCol = isTwilight
        ? mixRgb(refCol, rgb(houseTwilight.skyBelt), 0.24)
        : mixRgb(refCol, rgb(rain.cloud.edge), 0.28);
      line(b, [[center[0] - half * 0.78, yy], [center[0] + half * 0.78, yy + b.r.range(-0.6, 0.6)]], Math.max(1.8, (2 * ry) / rows), jitter(b, glintCol, 0.03), {
        dry: 0.36,
        alpha: 0.72,
        taper: [0.3, 0.3],
      });
    }
  }

  for (let x = 6.2; x <= 14.5; x += b.r.range(0.35, 0.8)) {
    const pt = p(x, 0.9 + b.r.range(-0.5, 0.7), 0);
    if (pt[0] < rect.x0 || pt[0] > rect.x1) continue;
    for (let k = 0; k < 4; k++) {
      const bx = pt[0] + b.r.range(-10, 10);
      const h = b.r.range(8, 22);
      line(b, [[bx, pt[1] + 2], [bx + b.r.range(-7, 7), pt[1] - h]], b.r.range(1.8, 3.2), jitter(b, treeCol, 0.06), {
        dry: 0.32,
        taper: [0.1, 0.65],
        alpha: 0.82,
      });
    }
  }

  const wallCol = isTwilight ? rgb(houseTwilight.wall) : rgb(houseRain.wall);
  const eavesDark = isTwilight ? rgb(houseTwilight.eavesDark) : rgb(houseRain.eavesDark);
  const roofCol = isTwilight ? rgb(houseTwilight.roof) : rgb(houseRain.roof);
  const plinthCol = mixRgb(eavesDark, yardCol, 0.52);

  const wallBL = p(house.xMax, house.wallY, house.verandaZ - 0.06);
  const wallBR = p(house.xMin, house.wallY, house.verandaZ - 0.06);
  const wallTR = p(house.xMin, house.wallY, house.eaveZ + 0.18);
  const wallTL = p(house.xMax, house.wallY, house.eaveZ + 0.18);
  fill(b, [wallTL, wallTR, wallBR, wallBL], shadeRgb(wallCol, 0.94), 1.4);

  let wx = house.xMin;
  while (wx < house.xMax) {
    const bw = b.r.range(0.24, 0.33);
    const wx1 = Math.min(house.xMax, wx + bw);
    const bTL = p(wx1, house.wallY, house.eaveZ + 0.14);
    const bTR = p(wx, house.wallY, house.eaveZ + 0.14);
    const bBR = p(wx, house.wallY, house.verandaZ - 0.04);
    const bBL = p(wx1, house.wallY, house.verandaZ - 0.04);
    const boardShade = b.r.range(0.92, 1.08);
    const boardCol = shadeRgb(jitter(b, wallCol, 0.025), boardShade);
    fill(b, [bTL, bTR, bBR, bBL], boardCol, 0.8, 0.97);
    const midTop: [number, number] = [(bTL[0] + bTR[0]) * 0.5, (bTL[1] + bTR[1]) * 0.5];
    const midBot: [number, number] = [(bBL[0] + bBR[0]) * 0.5, (bBL[1] + bBR[1]) * 0.5];
    const wPx = Math.max(4, Math.hypot(bTR[0] - bTL[0], bTR[1] - bTL[1]));
    handLine(b, midTop, midBot, wPx * 0.72, jitter(b, mixRgb(boardCol, eavesDark, b.r.range(0.05, 0.16)), 0.025), {
      dry: 0.42,
      body: 0.58,
      alpha: 0.55,
      jitterPx: 0.8,
      streak: 0.12,
      taper: [0.02, 0.02],
    });
    const splashTop = p((wx + wx1) * 0.5, house.wallY, house.verandaZ + b.r.range(0.22, 0.4));
    handLine(b, splashTop, midBot, wPx * 0.85, mixRgb(boardCol, eavesDark, 0.24), {
      dry: 0.5,
      alpha: 0.36,
      jitterPx: 0.8,
      taper: [0.04, 0.02],
    });
    handLine(b, bTL, bBL, Math.max(1.4, wPx * 0.09), mixRgb(eavesDark, boardCol, 0.3), {
      dry: 0.36,
      alpha: 0.65,
      jitterPx: 0.7,
      taper: [0.02, 0.02],
    });
    wx = wx1;
  }

  const eaveBandBL = p(house.xMax, house.wallY, 1.78);
  const eaveBandBR = p(house.xMin, house.wallY, 1.78);
  const eaveMidBL = p(house.xMax, house.wallY, 2.08);
  const eaveMidBR = p(house.xMin, house.wallY, 2.08);
  fill(b, [wallTL, wallTR, eaveBandBR, eaveBandBL], eavesDark, 2.0, 0.36);
  fill(b, [wallTL, wallTR, eaveMidBR, eaveMidBL], eavesDark, 1.6, 0.42);

  const lr = house.litRoom;
  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < 5; j++) {
      const x0 = lr.xMin + ((lr.xMax - lr.xMin) * i) / 6;
      const x1 = lr.xMin + ((lr.xMax - lr.xMin) * (i + 1)) / 6;
      const z0 = lr.zMin + ((lr.zMax - lr.zMin) * j) / 5;
      const z1 = lr.zMin + ((lr.zMax - lr.zMin) * (j + 1)) / 5;
      const paneCol = isTwilight
        ? mixRgb(wallCol, eavesDark, b.r.range(0.46, 0.62))
        : mixRgb(wallCol, eavesDark, b.r.range(0.24, 0.42));
      fill(
        b,
        [p(x1, house.wallY, z1), p(x0, house.wallY, z1), p(x0, house.wallY, z0), p(x1, house.wallY, z0)],
        jitter(b, paneCol, 0.028),
        0.6,
        0.96,
      );
    }
  }
  const mullionCol = isTwilight ? mixRgb(eavesDark, rgb(ink.color), 0.56) : mixRgb(eavesDark, wallCol, 0.25);
  for (let i = 0; i <= 6; i++) {
    const x = lr.xMin + ((lr.xMax - lr.xMin) * i) / 6;
    handLine(b, p(x, house.wallY, lr.zMin), p(x, house.wallY, lr.zMax), i % 2 === 0 ? 4.2 : 2.1, mullionCol, {
      dry: 0.24,
      alpha: 0.92,
      jitterPx: 0.8,
      wobble: 0.06,
      taper: [0.02, 0.02],
    });
  }
  for (let j = 0; j <= 5; j++) {
    const z = lr.zMin + ((lr.zMax - lr.zMin) * j) / 5;
    handLine(b, p(lr.xMax, house.wallY, z), p(lr.xMin, house.wallY, z), j === 0 || j === 5 ? 4.2 : 1.9, mullionCol, {
      dry: 0.24,
      alpha: 0.9,
      jitterPx: 0.8,
      wobble: 0.06,
      taper: [0.02, 0.02],
    });
  }

  const gx0 = house.genkan.x - house.genkan.width * 0.5;
  const gx1 = house.genkan.x + house.genkan.width * 0.5;
  for (let i = 0; i < 4; i++) {
    const x0 = gx0 + ((gx1 - gx0) * i) / 4;
    const x1 = gx0 + ((gx1 - gx0) * (i + 1)) / 4;
    fill(
      b,
      [p(x1, house.wallY, house.genkan.baseZ + house.genkan.height), p(x0, house.wallY, house.genkan.baseZ + house.genkan.height), p(x0, house.wallY, 0.05), p(x1, house.wallY, 0.05)],
      jitter(b, mixRgb(eavesDark, wallCol, b.r.range(0.28, 0.42)), 0.03),
      0.8,
    );
  }
  for (let i = 0; i <= 4; i++) {
    const x = gx0 + ((gx1 - gx0) * i) / 4;
    handLine(b, p(x, house.wallY, 0.05), p(x, house.wallY, house.genkan.baseZ + house.genkan.height), i === 0 || i === 4 ? 3.8 : 2.0, eavesDark, {
      dry: 0.24,
      jitterPx: 0.8,
      wobble: 0.06,
    });
  }
  for (let j = 0; j <= 4; j++) {
    const z = 0.05 + ((house.genkan.baseZ + house.genkan.height - 0.05) * j) / 4;
    handLine(b, p(gx1, house.wallY, z), p(gx0, house.wallY, z), 2.0, eavesDark, { dry: 0.24, jitterPx: 0.8, wobble: 0.06 });
  }

  const vBackL = p(house.xMax, house.wallY, house.verandaZ);
  const vBackR = p(house.xMin, house.wallY, house.verandaZ);
  const vFrontR = p(house.xMin, house.verandaY, house.verandaZ);
  const vFrontL = p(house.xMax, house.verandaY, house.verandaZ);
  const vBotR = p(house.xMin, house.verandaY, 0);
  const vBotL = p(house.xMax, house.verandaY, 0);
  fill(b, [vFrontL, vFrontR, vBotR, vBotL], shadeRgb(plinthCol, 0.85), 1.2);
  for (let x = house.xMin; x <= house.xMax; x += 0.9) {
    handLine(b, p(x, house.verandaY, 0), p(x, house.verandaY, house.verandaZ), 5, eavesDark, { dry: 0.35, alpha: 0.65, jitterPx: 0.8 });
  }
  const vDeckBase = mixRgb(wallCol, eavesDark, 0.38);
  fill(b, [vBackL, vBackR, vFrontR, vFrontL], vDeckBase, 0.9);
  for (let i = 0; i < 6; i++) {
    const y = house.wallY + ((house.verandaY - house.wallY) * (i + 0.5)) / 6;
    const pCol = jitter(b, mixRgb(vDeckBase, wallCol, b.r.range(-0.08, 0.22)), 0.03);
    handLine(b, p(house.xMax, y, house.verandaZ), p(house.xMin, y, house.verandaZ), 5.5, pCol, {
      dry: 0.34,
      body: 0.68,
      alpha: 0.78,
      jitterPx: 1.0,
    });
    if (i > 0) {
      const ySeam = house.wallY + ((house.verandaY - house.wallY) * i) / 6;
      handLine(b, p(house.xMax, ySeam, house.verandaZ), p(house.xMin, ySeam, house.verandaZ), 1.6, eavesDark, {
        dry: 0.38,
        alpha: 0.68,
        jitterPx: 0.8,
      });
    }
  }

  const eaveSag = (x: number) => {
    const u = Math.max(0, Math.min(1, (x - (house.xMin - 0.64)) / (house.xMax - house.xMin + 1.28)));
    return -Math.sin(Math.PI * u) * 0.11 + (noise1(u * 5.2, 728) - 0.5) * 0.03;
  };
  const ridgeXMin = house.xMin + 1.55;
  const ridgeXMax = house.xMax - 1.55;
  const ridgeSag = (x: number) => {
    const u = Math.max(0, Math.min(1, (x - ridgeXMin) / Math.max(0.1, ridgeXMax - ridgeXMin)));
    return -Math.sin(Math.PI * u) * 0.13 + (noise1(u * 4.4, 729) - 0.5) * 0.03;
  };

  const soffitPts: [number, number][] = [];
  for (let i = 0; i <= 14; i++) {
    const x = house.xMax + 0.58 - ((house.xMax - house.xMin + 1.16) * i) / 14;
    soffitPts.push(p(x, house.eaveY, house.eaveZ - 0.03 + eaveSag(x)));
  }
  soffitPts.push(p(house.xMin - 0.45, house.wallY, house.eaveZ + 0.18), p(house.xMax + 0.45, house.wallY, house.eaveZ + 0.18));
  fill(b, soffitPts, eavesDark, 1.0);
  for (let x = house.xMin - 0.1; x <= house.xMax + 0.1; x += 0.46) {
    handLine(b, p(x, house.wallY, house.eaveZ + 0.12), p(x, house.eaveY, house.eaveZ - 0.02 + eaveSag(x)), 2.8, shadeRgb(eavesDark, 1.3), {
      dry: 0.4,
      alpha: 0.65,
      jitterPx: 0.8,
    });
  }

  for (const px of house.pillarsX) {
    const bot = p(px, house.pillarY, 0);
    const top = p(px, house.pillarY, house.eaveZ + 0.02 + eaveSag(px));
    const w = Math.max(8, project(cam, [px, house.pillarY, 1.2]).scale * 0.15);
    handLine(b, bot, top, w, mixRgb(eavesDark, wallCol, 0.34), { dry: 0.2, body: 0.84, wobble: 0.06, jitterPx: 1.1, taper: [0.01, 0.01] });
    const rimCol = mixRgb(wallCol, eavesDark, 0.22);
    handLine(b, [bot[0] + w * 0.24, bot[1]], [top[0] + w * 0.24, top[1]], w * 0.26, rimCol, {
      dry: 0.35,
      alpha: 0.65,
      wobble: 0.06,
      jitterPx: 0.9,
      taper: [0.02, 0.02],
    });
  }

  const eaveLeftX = house.xMax + 0.68;
  const eaveRightX = house.xMin - 0.68;
  const roofFrontPt = (u: number, v: number): [number, number] => {
    const xTop = ridgeXMax + (ridgeXMin - ridgeXMax) * u;
    const xBot = eaveLeftX + (eaveRightX - eaveLeftX) * u;
    const x = xTop + (xBot - xTop) * v;
    const y = house.ridgeY + (house.eaveY - house.ridgeY) * v;
    const zTop = house.ridgeZ + ridgeSag(xTop);
    const zBot = house.eaveZ - 0.02 + eaveSag(xBot);
    const z = zTop + (zBot - zTop) * v - Math.sin(Math.PI * v) * 0.09;
    return p(x, y, z);
  };

  const tileShadow = mixRgb(roofCol, eavesDark, 0.62);
  const tileDeep = shadeRgb(tileShadow, 0.86);
  const tileSheen = isTwilight
    ? mixRgb(roofCol, rgb(houseTwilight.skyBelt), 0.34)
    : mixRgb(roofCol, rgb(houseRain.lightningSky), 0.46);
  const tileBrightWet = mixRgb(roofCol, rgb(houseRain.lightningSky), 0.62);

  const leftHipBack = p(eaveLeftX + 0.22, house.ridgeY + 1.0, house.eaveZ + 0.42);
  const leftHipTop = roofFrontPt(0, 0);
  const leftHipBot = roofFrontPt(0, 1);
  const leftHipCol = shadeRgb(roofCol, isTwilight ? 0.66 : 0.72);
  fill(b, [leftHipTop, leftHipBot, leftHipBack], leftHipCol, 1.8);
  const rightHipBack = p(eaveRightX - 0.24, house.ridgeY + 0.9, house.eaveZ + 0.42);
  const rightHipTop = roofFrontPt(1, 0);
  const rightHipBot = roofFrontPt(1, 1);
  const rightHipCol = isTwilight ? mixRgb(roofCol, rgb(houseTwilight.skyBelt), 0.18) : mixRgb(roofCol, rgb(houseRain.lightningSky), 0.14);
  fill(b, [rightHipTop, rightHipBack, rightHipBot], rightHipCol, 1.6);
  const frontPoly: [number, number][] = [];
  for (let i = 0; i <= 18; i++) frontPoly.push(roofFrontPt(i / 18, 0));
  for (let i = 18; i >= 0; i--) frontPoly.push(roofFrontPt(i / 18, 1));
  fill(b, frontPoly, roofCol, 1.5);

  const ribCount = 58;
  if (!isTwilight) paintKawara(b, roofFrontPt, ribCount, roofCol, tileDeep, tileBrightWet, true);

  const eavePts: [number, number][] = [];
  for (let s = 0; s <= 28; s++) eavePts.push(roofFrontPt(s / 28, 1));
  line(b, eavePts, 6.8, eavesDark, { dry: 0.22, body: 0.88, wobble: 0.05 });
  line(b, eavePts, 2.2, tileSheen, {dry: 0.42, alpha: isTwilight ? 0.62 : 0.38});

  const ridgePts: [number, number][] = [];
  for (let s = 0; s <= 18; s++) ridgePts.push(roofFrontPt(s / 18, 0));
  line(b, ridgePts, 10.5, shadeRgb(eavesDark, 1.08), { dry: 0.2, body: 0.88, wobble: 0.05 });
  line(
    b,
    ridgePts.map(([x, y]) => [x, y - 3.2] as [number, number]),
    4.6,
    mixRgb(roofCol, tileSheen, 0.48),
    { dry: 0.28, body: 0.75, alpha: 0.88, wobble: 0.05 },
  );
  handLine(b, leftHipTop, leftHipBot, 6.8, mixRgb(roofCol, eavesDark, 0.5), { dry: 0.24, body: 0.86, jitterPx: 1.4 });
  handLine(b, rightHipTop, rightHipBot, 6.0, mixRgb(roofCol, tileSheen, 0.26), { dry: 0.24, body: 0.84, jitterPx: 1.4 });

  mottle(b.c, 62 * b.k, 0.026, isTwilight ? 73 : 74);
  return b.c;
};

const paintHouseTwilightLamp = (plate: ViewPlate): Paper => {
  const b = makeBrush(plate, true, 7240);
  const { reference: cam } = plate;
  const p = (x: number, y: number, z: number): [number, number] => proj(cam, [x, y, z]);
  const lr = house.litRoom;
  const eavesDark = rgb(houseTwilight.eavesDark);
  const lampCol = rgb(houseTwilight.lamp);
  const lampGlow = rgb(houseTwilight.lampGlow);

  const doorTL = p(lr.xMax, house.wallY, lr.zMax);
  const doorTR = p(lr.xMin, house.wallY, lr.zMax);
  const doorBL = p(lr.xMax, house.wallY, lr.zMin);
  const doorCx = (doorTL[0] + doorTR[0]) * 0.5;
  const doorCy = (doorTL[1] + doorBL[1]) * 0.5;
  const doorRx = Math.abs(doorTR[0] - doorTL[0]) * 0.5;
  const doorRy = Math.abs(doorBL[1] - doorTL[1]) * 0.5;

  let wx = house.xMin;
  while (wx < house.xMax) {
    const bw = b.r.range(0.24, 0.33);
    const wx1 = Math.min(house.xMax, wx + bw);
    const lampDist = Math.abs((wx + wx1) * 0.5 - 1.0);
    if (lampDist < 3.4) {
      const bTL = p(wx1, house.wallY, house.eaveZ + 0.14);
      const bTR = p(wx, house.wallY, house.eaveZ + 0.14);
      const bBR = p(wx, house.wallY, house.verandaZ - 0.04);
      const bBL = p(wx1, house.wallY, house.verandaZ - 0.04);
      fill(b, [bTL, bTR, bBR, bBL], lampGlow, 0.8, (1 - lampDist / 3.4) * 0.22);
    }
    wx = wx1;
  }

  paintSoftGlowQuad(b, doorCx, doorCy, doorRx * 2.15, doorRy * 1.95, lampGlow, 0.16);
  paintSoftGlowQuad(b, doorCx, doorCy, doorRx * 1.48, doorRy * 1.38, lampGlow, 0.22);

  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < 5; j++) {
      const x0 = lr.xMin + ((lr.xMax - lr.xMin) * i) / 6;
      const x1 = lr.xMin + ((lr.xMax - lr.xMin) * (i + 1)) / 6;
      const z0 = lr.zMin + ((lr.zMax - lr.zMin) * j) / 5;
      const z1 = lr.zMin + ((lr.zMax - lr.zMin) * (j + 1)) / 5;
      const dist = Math.hypot((i + 0.5 - 3) / 3, (j + 0.5 - 2.6) / 2.5);
      const paneCol = mixRgb(rgb(warm.dropHighlight), lampCol, Math.min(1, 0.35 + dist * 0.65));
      const finalCol = dist > 0.85 ? mixRgb(paneCol, lampGlow, 0.35) : paneCol;
      fill(
        b,
        [p(x1, house.wallY, z1), p(x0, house.wallY, z1), p(x0, house.wallY, z0), p(x1, house.wallY, z0)],
        jitter(b, finalCol, 0.025),
        0.6,
        0.99,
      );
    }
  }

  const mullionCol = mixRgb(eavesDark, rgb(ink.color), 0.64);
  for (let i = 0; i <= 6; i++) {
    const x = lr.xMin + ((lr.xMax - lr.xMin) * i) / 6;
    handLine(b, p(x, house.wallY, lr.zMin), p(x, house.wallY, lr.zMax), i % 2 === 0 ? 4.2 : 2.1, mullionCol, {
      dry: 0.24,
      alpha: 0.94,
      jitterPx: 0.8,
      wobble: 0.06,
      taper: [0.02, 0.02],
    });
  }
  for (let j = 0; j <= 5; j++) {
    const z = lr.zMin + ((lr.zMax - lr.zMin) * j) / 5;
    handLine(b, p(lr.xMax, house.wallY, z), p(lr.xMin, house.wallY, z), j === 0 || j === 5 ? 4.2 : 1.9, mullionCol, {
      dry: 0.24,
      alpha: 0.92,
      jitterPx: 0.8,
      wobble: 0.06,
      taper: [0.02, 0.02],
    });
  }

  const spillCenter = p(1.0, 0.7, 0.15);
  paintSoftGlowQuad(b, spillCenter[0], spillCenter[1], doorRx * 1.9, doorRy * 0.95, lampGlow, 0.24);
  paintSoftGlowQuad(b, spillCenter[0], spillCenter[1] + 28, doorRx * 2.5, doorRy * 1.25, lampGlow, 0.12);
  for (let i = 0; i < 8; i++) {
    const y = house.wallY + ((house.verandaY - house.wallY) * (i + 0.5)) / 8;
    handLine(b, p(lr.xMax + 0.6, y, house.verandaZ), p(lr.xMin - 0.6, y, house.verandaZ), 4.8, lampGlow, {
      dry: 0.42,
      alpha: 0.38,
      jitterPx: 1.0,
    });
  }

  const yardFarY = p(0, -0.9, 0)[1] - 8;
  for (const pd of [...yardPuddlesWorld, puddleW1]) {
    if (pd.y > 9.4 || Math.abs(pd.x - 1.2) >= 3.4) continue;
    const center = p(pd.x, pd.y, 0);
    const rx = Math.abs(p(pd.x + pd.rx, pd.y, 0)[0] - center[0]);
    const ry = Math.max(4, Math.abs(p(pd.x, pd.y + pd.ry, 0)[1] - center[1]));
    if (center[1] < yardFarY || center[1] > plate.rect.y1 + 60) continue;
    const rows = Math.max(5, Math.round(ry / 3.5));
    for (let i = 0; i < rows; i++) {
      const u = (i + 0.5) / rows;
      const yy = center[1] - ry + 2 * ry * u;
      const half = rx * Math.sqrt(Math.max(0.05, 1 - Math.pow(2 * u - 1, 2))) * 0.84;
      line(
        b,
        [[center[0] - half * 0.75, yy], [center[0] + half * 0.75, yy + b.r.range(-0.5, 0.5)]],
        Math.max(1.8, (2 * ry) / rows),
        jitter(b, lampGlow, 0.025),
        { dry: 0.36, alpha: (0.65 - u * 0.28) * 0.72, taper: [0.3, 0.3] },
      );
    }
  }

  const eaveSag = (x: number) => {
    const u = Math.max(0, Math.min(1, (x - (house.xMin - 0.64)) / (house.xMax - house.xMin + 1.28)));
    return -Math.sin(Math.PI * u) * 0.11 + (noise1(u * 5.2, 728) - 0.5) * 0.03;
  };
  for (const px of house.pillarsX) {
    if (Math.abs(px - 1.0) >= 2.8) continue;
    const bot = p(px, house.pillarY, 0);
    const top = p(px, house.pillarY, house.eaveZ + 0.02 + eaveSag(px));
    const w = Math.max(8, project(cam, [px, house.pillarY, 1.2]).scale * 0.15);
    handLine(b, [bot[0] + w * 0.24, bot[1]], [top[0] + w * 0.24, top[1]], w * 0.3, lampGlow, {
      dry: 0.34,
      alpha: 0.76,
      wobble: 0.06,
      jitterPx: 0.9,
      taper: [0.02, 0.02],
    });
  }

  return b.c;
};

const paintHouseTakeoff = (plate: ViewPlate): Paper => {
  const b = makeBrush(plate, true, 7310);
  const { rect, reference: cam } = plate;
  const p = (x: number, y: number, z: number): [number, number] => proj(cam, [x, y, z]);
  const lineOnY = (y: number, z: number, xLeft: number, xRight: number): [[number, number], [number, number]] => {
    const a = p(xLeft, y, z);
    const c = p(xRight, y, z);
    const dx = c[0] - a[0];
    const dy = c[1] - a[1];
    const tL = Math.abs(dx) > 1e-3 ? (rect.x0 - 40 - a[0]) / dx : 0;
    const tR = Math.abs(dx) > 1e-3 ? (rect.x1 + 40 - a[0]) / dx : 1;
    return [
      [a[0] + dx * tL, a[1] + dy * tL],
      [a[0] + dx * tR, a[1] + dy * tR],
    ];
  };
  const yOnSegment = (seg: [[number, number], [number, number]], x: number) => {
    const dx = seg[1][0] - seg[0][0];
    const t = Math.abs(dx) > 1e-3 ? (x - seg[0][0]) / dx : 0;
    return seg[0][1] + (seg[1][1] - seg[0][1]) * t;
  };

  const roofCol = rgb(houseTakeoff.roof);
  const wallShade = rgb(houseTakeoff.wallShade);
  const wallLit = rgb(houseTakeoff.wallLit);
  const doorwayDark = rgb(houseTakeoff.doorwayDark);
  const verandaCol = rgb(houseTakeoff.veranda);
  const shadowViolet = rgb(dusk.shadowViolet);
  const woodBase = rgb(rain.wood);
  const warmGold = rgb(dusk.cloudGap[1]);

  const wainscotZ = 1.16;
  const [wallBL, wallBR] = lineOnY(house.wallY, house.verandaZ, -0.5, -14.0);
  const [wallTL, wallTR] = lineOnY(house.wallY, house.eaveZ + 0.18, -0.5, -14.0);
  const [sunL, sunR] = lineOnY(house.wallY, house.takeoffSunLineZ, -0.5, -14.0);
  const [wainL, wainR] = lineOnY(house.wallY, wainscotZ, -0.5, -14.0);
  const [verandaFL, verandaFR] = lineOnY(house.verandaY, house.verandaZ, -0.5, -14.0);
  const [verandaBotL, verandaBotR] = lineOnY(house.verandaY, 0, -0.5, -14.0);
  const [eaveFL, eaveFR] = lineOnY(house.eaveY, house.eaveZ, 0.0, -14.0);

  fill(b, [[rect.x0, rect.y0], [rect.x1, rect.y0], [rect.x1, rect.y1], [rect.x0, rect.y1]], wallLit, 0);
  fill(b, [wallTL, wallTR, wallBR, wallBL], wallLit, 1.0);

  const paintPlasterArea = (
    topL: [number, number],
    topR: [number, number],
    botR: [number, number],
    botL: [number, number],
    baseCol: RGB,
    coolCol: RGB,
    warmCol: RGB,
    seedBase: number,
    isShadow: boolean,
  ) => {
    const patches = isShadow ? 95 : 85;
    for (let i = 0; i < patches; i++) {
      const u = b.r.range(0.01, 0.99);
      const v = b.r.range(0.03, 0.97);
      const cPt = bilerp(topL, topR, botR, botL, u, v);
      const n = fbm2(u * 9.5, v * 5.2, seedBase, 3);
      const rx = b.r.range(24, 62);
      const ry = b.r.range(18, 44);
      let col = baseCol;
      if (isShadow) {
        const bounce = Math.pow(v, 2.2) * 0.22;
        col = n < 0.46 ? mixRgb(baseCol, coolCol, (0.46 - n) * 0.68) : mixRgb(baseCol, warmCol, (n - 0.46) * 0.42 + bounce);
      } else {
        col = n < 0.42 ? mixRgb(baseCol, coolCol, (0.42 - n) * 0.34) : mixRgb(baseCol, warmCol, (n - 0.42) * 0.45);
      }
      const dabPoly = arc(cPt[0], cPt[1], rx, 0, Math.PI * 2, 10)
        .slice(0, -1)
        .map(([x, y]) => [cPt[0] + (x - cPt[0]), cPt[1] + (y - cPt[1]) * (ry / rx)] as [number, number]);
      fill(b, dabPoly, jitter(b, col, 0.016), Math.max(2, ry * 0.14), b.r.range(0.14, 0.28));
    }
    const trowels = isShadow ? 60 : 54;
    for (let i = 0; i < trowels; i++) {
      const u = b.r.range(0.02, 0.98);
      const v = b.r.range(0.04, 0.96);
      const cPt = bilerp(topL, topR, botR, botL, u, v);
      const ang = b.r.range(-0.55, 0.55);
      const half = b.r.range(14, 34);
      const col = b.r.next() < 0.5 ? mixRgb(baseCol, coolCol, 0.22) : mixRgb(baseCol, warmCol, 0.2);
      line(
        b,
        curve(
          [cPt[0] - Math.cos(ang) * half, cPt[1] - Math.sin(ang) * half],
          [cPt[0] + Math.cos(ang) * half, cPt[1] + Math.sin(ang) * half],
          b.r.range(-0.18, 0.18),
          4,
        ),
        b.r.range(12, 24),
        jitter(b, col, 0.015),
        { dry: 0.56, body: 0.44, alpha: b.r.range(0.12, 0.24), taper: [0.4, 0.4], streak: 0.04 },
      );
    }
    if (isShadow) {
      for (let i = 0; i < 16; i++) {
        const u = b.r.range(0.03, 0.97);
        const topP = bilerp(topL, topR, botR, botL, u, 0.02);
        const botP = bilerp(topL, topR, botR, botL, u, b.r.range(0.24, 0.65));
        handLine(b, topP, botP, b.r.range(6, 15), jitter(b, mixRgb(baseCol, coolCol, 0.36), 0.02), {
          dry: 0.62,
          body: 0.34,
          alpha: b.r.range(0.1, 0.18),
          jitterPx: 1.4,
          taper: [0.15, 0.45],
        });
      }
    }
  };

  paintPlasterArea(sunL, sunR, wainR, wainL, wallLit, mixRgb(wallLit, wallShade, 0.38), warmGold, 7311, false);

  fill(b, [wainL, wainR, wallBR, wallBL], mixRgb(wallLit, verandaCol, 0.26), 0.8);
  let wx = -64.0;
  let boardIdx = 0;
  while (wx <= 0.4) {
    const bw = wx < -24 ? b.r.range(0.45, 0.72) : b.r.range(0.23, 0.33);
    const wx1 = wx + bw;
    boardIdx += 1;
    if (toCamera(cam, [wx, house.wallY, 0.8])[1] > 2.0 && toCamera(cam, [wx1, house.wallY, 0.8])[1] > 2.0) {
      const a = p(wx1, house.wallY, wainscotZ);
      const c = p(wx, house.wallY, wainscotZ);
      const d = p(wx, house.wallY, house.verandaZ);
      const e = p(wx1, house.wallY, house.verandaZ);
      if (Math.max(a[0], c[0]) >= rect.x0 - 40 && Math.min(a[0], c[0]) <= rect.x1 + 40) {
        const tone = (boardIdx * 0.37 + noise1(wx * 1.9, 7312)) % 1;
        const boardCol =
          tone < 0.34
            ? mixRgb(wallLit, verandaCol, b.r.range(0.24, 0.46))
            : tone > 0.7
              ? mixRgb(wallLit, warmGold, b.r.range(0.12, 0.28))
              : mixRgb(wallLit, wallShade, b.r.range(0.08, 0.2));
        fill(b, [a, c, d, e], jitter(b, boardCol, 0.025), 0.7, 0.98);
        const wPx = Math.max(3, Math.abs(c[0] - a[0]));
        const grainCount = wPx > 18 ? 4 : wPx > 9 ? 3 : 2;
        for (let g = 0; g < grainCount; g++) {
          const u = (g + 0.5 + b.r.range(-0.28, 0.28)) / grainCount;
          const gTop: [number, number] = [a[0] + (c[0] - a[0]) * u, a[1] + (c[1] - a[1]) * u];
          const gBot: [number, number] = [e[0] + (d[0] - e[0]) * u, e[1] + (d[1] - e[1]) * u];
          const gCol = g % 2 === 0 ? mixRgb(boardCol, verandaCol, b.r.range(0.2, 0.38)) : mixRgb(boardCol, wallShade, b.r.range(0.12, 0.24));
          handLine(b, gTop, gBot, Math.max(1.1, wPx * b.r.range(0.08, 0.18)), jitter(b, gCol, 0.028), {
            dry: 0.44,
            body: 0.56,
            alpha: b.r.range(0.36, 0.58),
            jitterPx: Math.min(1.0, wPx * 0.06),
            taper: [0.01, 0.01],
            streak: 0.14,
          });
        }
        const botMidT: [number, number] = [(a[0] + c[0]) * 0.5, (a[1] + c[1]) * 0.5 + ((e[1] + d[1]) * 0.5 - (a[1] + c[1]) * 0.5) * 0.76];
        const botMidB: [number, number] = [(e[0] + d[0]) * 0.5, (e[1] + d[1]) * 0.5];
        handLine(b, botMidT, botMidB, wPx * 0.88, mixRgb(boardCol, wallShade, 0.24), {
          dry: 0.54,
          alpha: 0.28,
          jitterPx: 0.6,
          taper: [0.22, 0.01],
        });
        handLine(b, a, e, Math.max(1.3, Math.min(3.2, wPx * 0.1)), mixRgb(verandaCol, wallShade, 0.64), {
          dry: 0.3,
          alpha: 0.78,
          jitterPx: 0.6,
          taper: [0.01, 0.01],
        });
        if (wPx > 10) {
          handLine(
            b,
            [a[0] + 1.8, a[1]],
            [e[0] + 1.8, e[1]],
            Math.max(1.0, wPx * 0.06),
            mixRgb(wallLit, warmGold, 0.4),
            { dry: 0.42, alpha: 0.44, jitterPx: 0.5, taper: [0.01, 0.01] },
          );
        }
      }
    }
    wx = wx1;
  }
  handLine(b, wainL, wainR, 6.5, mixRgb(verandaCol, wallShade, 0.48), { dry: 0.26, body: 0.8, jitterPx: 1.6 });
  handLine(b, [wainL[0], wainL[1] - 3], [wainR[0], wainR[1] - 3], 2.6, mixRgb(wallLit, warmGold, 0.36), {
    dry: 0.32,
    alpha: 0.78,
    jitterPx: 1.2,
  });

  const shadeEdgePts = handPath(b, sunL, sunR, 3.6, 0, 22);
  fill(b, [wallTL, wallTR, ...shadeEdgePts.slice().reverse()], wallShade, 2.0, 0.97);
  paintPlasterArea(wallTL, wallTR, sunR, sunL, wallShade, shadowViolet, mixRgb(wallLit, wallShade, 0.45), 7314, true);
  line(b, shadeEdgePts, 9, mixRgb(wallShade, wallLit, 0.26), { dry: 0.5, body: 0.44, alpha: 0.38, wobble: 0.1 });

  const gxMin = house.genkan.x - house.genkan.width * 0.5;
  const gxMax = house.genkan.x + house.genkan.width * 0.5;
  const gzBot = house.verandaZ;
  const gzTop = house.verandaZ + house.genkan.height;
  const dTL = p(gxMax + 0.55, house.wallY, gzTop);
  const dTR = p(gxMin - 0.65, house.wallY, gzTop);
  const dBR = p(gxMin - 0.65, house.wallY, gzBot);
  const dBL = p(gxMax + 0.55, house.wallY, gzBot);
  fill(b, [dTL, dTR, dBR, dBL], doorwayDark, 1.2, 0.99);
  for (let i = 0; i < 16; i++) {
    const v = b.r.range(0.06, 0.72);
    const a = bilerp(dTL, dTR, dBR, dBL, b.r.range(0.04, 0.45), v);
    const c = bilerp(dTL, dTR, dBR, dBL, b.r.range(0.5, 0.96), v + b.r.range(-0.04, 0.04));
    line(b, [a, c], b.r.range(14, 28), jitter(b, shadeRgb(doorwayDark, b.r.range(0.84, 1.08)), 0.025), {
      dry: 0.46,
      alpha: 0.45,
      taper: [0.35, 0.35],
    });
  }
  const clampDoor = (pt: [number, number]): [number, number] => [
    Math.max(dTL[0] + 5, Math.min(dTR[0] - 5, pt[0])),
    Math.max(dTL[1] + 5, Math.min(dBL[1] - 2, pt[1])),
  ];
  const stepRiserCol = mixRgb(doorwayDark, wallShade, 0.24);
  const stepTreadCol = mixRgb(doorwayDark, verandaCol, 0.28);
  const stepEdgeCol = mixRgb(doorwayDark, wallLit, 0.34);

  const hallTopL = clampDoor(p(gxMax + 0.38, house.wallY - 1.15, gzBot + 0.52));
  const hallTopR = clampDoor(p(gxMin - 0.48, house.wallY - 1.15, gzBot + 0.52));
  const step2FrontL = clampDoor(p(gxMax + 0.42, house.wallY - 0.65, gzBot + 0.42));
  const step2FrontR = clampDoor(p(gxMin - 0.52, house.wallY - 0.65, gzBot + 0.42));
  const step2BotL = clampDoor(p(gxMax + 0.42, house.wallY - 0.65, gzBot + 0.22));
  const step2BotR = clampDoor(p(gxMin - 0.52, house.wallY - 0.65, gzBot + 0.22));
  const step1FrontL = clampDoor(p(gxMax + 0.46, house.wallY - 0.24, gzBot + 0.2));
  const step1FrontR = clampDoor(p(gxMin - 0.56, house.wallY - 0.24, gzBot + 0.2));
  const step1BotL = clampDoor(p(gxMax + 0.46, house.wallY - 0.24, gzBot + 0.03));
  const step1BotR = clampDoor(p(gxMin - 0.56, house.wallY - 0.24, gzBot + 0.03));

  fill(b, [hallTopL, hallTopR, step2FrontR, step2FrontL], mixRgb(doorwayDark, stepTreadCol, 0.48), 1.2, 0.62);
  fill(b, [step2FrontL, step2FrontR, step2BotR, step2BotL], stepRiserCol, 1.0, 0.72);
  fill(b, [step2BotL, step2BotR, step1FrontR, step1FrontL], stepTreadCol, 1.2, 0.68);
  fill(b, [step1FrontL, step1FrontR, step1BotR, step1BotL], mixRgb(doorwayDark, wallShade, 0.18), 1.0, 0.78);
  handLine(b, step2FrontL, step2FrontR, 3.2, stepEdgeCol, { dry: 0.36, alpha: 0.58, jitterPx: 0.9 });
  handLine(b, step1FrontL, step1FrontR, 3.6, mixRgb(stepEdgeCol, verandaCol, 0.3), { dry: 0.34, alpha: 0.68, jitterPx: 0.9 });

  const frameCol = mixRgb(doorwayDark, woodBase, 0.58);
  const frameLit = mixRgb(frameCol, verandaCol, 0.45);
  handLine(b, dTL, dBL, 10, frameCol, { dry: 0.2, body: 0.85, jitterPx: 1.2, rough: 0.25 });
  handLine(b, dTR, dBR, 10, frameCol, { dry: 0.2, body: 0.85, jitterPx: 1.2, rough: 0.25 });
  handLine(b, dTL, dTR, 11, frameCol, { dry: 0.2, body: 0.85, jitterPx: 1.3, rough: 0.25 });
  handLine(b, [dTR[0] - 3, yOnSegment([sunL, sunR], dTR[0])], [dBR[0] - 3, dBR[1]], 3.5, frameLit, { dry: 0.3, alpha: 0.72, jitterPx: 0.9 });

  const slideL = p(gxMax + 1.45, house.wallY + 0.04, gzTop);
  const slideR = p(gxMax + 0.55, house.wallY + 0.04, gzTop);
  const slideSunL = p(gxMax + 1.45, house.wallY + 0.04, house.takeoffSunLineZ);
  const slideSunR = p(gxMax + 0.55, house.wallY + 0.04, house.takeoffSunLineZ);
  const slideBR = p(gxMax + 0.55, house.wallY + 0.04, gzBot);
  const slideBL = p(gxMax + 1.45, house.wallY + 0.04, gzBot);
  fill(b, [slideSunL, slideSunR, slideBR, slideBL], mixRgb(verandaCol, wallLit, 0.46), 0.9, 0.96);
  fill(b, [slideL, slideR, slideSunR, slideSunL], mixRgb(wallShade, woodBase, 0.34), 0.9, 0.96);
  for (let j = 0; j < 5; j++) {
    const z0 = gzBot + ((gzTop - gzBot) * j) / 5;
    const z1 = gzBot + ((gzTop - gzBot) * (j + 1)) / 5;
    const zm = (z0 + z1) * 0.5;
    const paneTint = zm < house.takeoffSunLineZ ? mixRgb(wallLit, warmGold, b.r.range(0.05, 0.22)) : mixRgb(wallShade, doorwayDark, b.r.range(0.08, 0.22));
    handLine(b, p(gxMax + 1.4, house.wallY + 0.04, zm), p(gxMax + 0.6, house.wallY + 0.04, zm), 12, jitter(b, paneTint, 0.03), {
      dry: 0.42,
      alpha: 0.55,
      jitterPx: 0.9,
    });
  }
  for (let j = 0; j <= 5; j++) {
    const z = gzBot + ((gzTop - gzBot) * j) / 5;
    handLine(b, p(gxMax + 1.45, house.wallY + 0.04, z), p(gxMax + 0.55, house.wallY + 0.04, z), j === 0 || j === 5 ? 4.2 : 2.2, frameCol, {
      dry: 0.24,
      jitterPx: 0.8,
    });
  }
  handLine(b, slideL, slideBL, 4.6, frameCol, { dry: 0.22, jitterPx: 0.9 });

  const deckBase = mixRgb(verandaCol, wallLit, 0.34);
  fill(b, [wallBL, wallBR, verandaFR, verandaFL], deckBase, 1.0);
  const planks = 7;
  for (let i = 0; i < planks; i++) {
    const y0 = house.wallY + ((house.verandaY - house.wallY) * i) / planks;
    const y1 = house.wallY + ((house.verandaY - house.wallY) * (i + 1)) / planks;
    const ym = (y0 + y1) * 0.5;
    const [sA, sB] = lineOnY(y1, house.verandaZ, -0.5, -14.0);
    const [tA, tB] = lineOnY(y0, house.verandaZ, -0.5, -14.0);
    const outerLift = (i / (planks - 1)) * 0.26 + (ym - house.wallY) * 0.0;
    const plankCol = mixRgb(verandaCol, i % 2 === 0 ? wallLit : warmGold, 0.14 + outerLift + b.r.range(-0.05, 0.07));
    fill(b, [tA, tB, sB, sA], jitter(b, plankCol, 0.022), 0.7, 0.94);
    for (let g = 0; g < 3; g++) {
      const f = 0.2 + g * 0.3;
      const yg = y0 + (y1 - y0) * f;
      const [gA, gB] = lineOnY(yg, house.verandaZ, -0.5, -14.0);
      const gCol = g === 1 ? mixRgb(plankCol, woodBase, 0.28) : mixRgb(plankCol, wallLit, 0.26);
      handLine(b, gA, gB, 1.4 + (1 - i / planks) * 0.8, jitter(b, gCol, 0.028), {
        dry: 0.46,
        body: 0.56,
        alpha: 0.48,
        jitterPx: 0.7,
        taper: [0.02, 0.02],
        streak: 0.16,
      });
    }
    handLine(b, sA, sB, 2.0, mixRgb(verandaCol, wallShade, 0.58), {
      dry: 0.32,
      alpha: 0.74,
      jitterPx: 0.8,
      taper: [0.01, 0.01],
    });
  }
  handLine(b, verandaFL, verandaFR, 4.2, mixRgb(wallLit, warmGold, 0.42), { dry: 0.26, alpha: 0.85, jitterPx: 1.2 });

  const apronCol = mixRgb(verandaCol, wallShade, 0.48);
  fill(b, [verandaFL, verandaFR, verandaBotR, verandaBotL], apronCol, 1.2);
  for (let i = 0; i < 4; i++) {
    const z = house.verandaZ * (0.18 + i * 0.22);
    const [aL, aR] = lineOnY(house.verandaY, z, -0.5, -14.0);
    handLine(b, aL, aR, 7 + i * 2, jitter(b, i === 0 ? mixRgb(doorwayDark, apronCol, 0.45) : apronCol, 0.035), {
      dry: 0.38,
      body: 0.62,
      alpha: 0.74,
      jitterPx: 1.2,
    });
  }

  fill(b, [verandaBotL, verandaBotR, [rect.x1 + 20, rect.y1 + 20], [rect.x0 - 20, rect.y1 + 20]], verandaCol, 1.0);
  const botSeg: [[number, number], [number, number]] = [verandaBotL, verandaBotR];
  for (let row = 0; row < 34; row++) {
    const u = row / 33;
    for (let x = rect.x0 - 30; x < rect.x1 + 30; ) {
      const len = b.r.range(90, 250);
      const xm = x + len * 0.5;
      const yTop = yOnSegment(botSeg, xm) + 4;
      const y = yTop + Math.pow(u, 1.2) * (rect.y1 - yTop + 18);
      if (y > yOnSegment(botSeg, x) + 2 && y > yOnSegment(botSeg, x + len) + 2) {
        const n = fbm2(xm / 240, y / 75, 7315, 3);
        const col = n < 0.44 ? mixRgb(verandaCol, wallShade, (0.44 - n) * 0.48) : mixRgb(verandaCol, wallLit, (n - 0.44) * 0.62);
        line(b, curve([x, y], [x + len, y + b.r.range(-2.5, 2.5)], 0.005, 4), 7 + u * 18, jitter(b, col, 0.034), {
          dry: 0.36,
          body: 0.56,
          alpha: 0.74,
          taper: [0.3, 0.3],
        });
      }
      x += len * b.r.range(0.58, 0.88);
    }
  }

  const castShadow = [p(-8.0, 0.0, 0), p(-6.2, 0.0, 0), p(-3.5, 2.2, 0), p(-5.5, 2.5, 0)];
  fill(b, castShadow, mixRgb(wallShade, verandaCol, 0.36), 6.0, 0.38);

  for (let i = 0; i < 24; i++) {
    const x = b.r.range(rect.x0 + 40, rect.x1 - 40);
    const yBase = yOnSegment(botSeg, x) + b.r.range(2, 16);
    if (yBase > rect.y1 - 10) continue;
    for (let k = 0; k < 3; k++) {
      const bx = x + b.r.range(-10, 10);
      const h = b.r.range(8, 22);
      line(b, [[bx, yBase], [bx + b.r.range(-6, 6), yBase - h]], b.r.range(1.6, 3.0), jitter(b, mixRgb(rgb(lowYard.hedge), verandaCol, 0.32), 0.05), {
        dry: 0.32,
        taper: [0.1, 0.65],
        alpha: 0.76,
      });
    }
  }

  for (const px of [-6.9, -1.4]) {
    if (toCamera(cam, [px, house.pillarY, 1.2])[1] < 1.8) continue;
    const bot = p(px, house.pillarY, 0);
    const top = p(px, house.pillarY, house.eaveZ + 0.15);
    const sunPt = p(px, house.pillarY, house.takeoffSunLineZ);
    const w = Math.max(14, project(cam, [px, house.pillarY, 1.2]).scale * 0.165);
    const halfW = w * 0.5;
    fill(
      b,
      arc(bot[0], bot[1] + 5, w * 0.95, 0, Math.PI * 2, 12)
        .slice(0, -1)
        .map(([x, y]) => [x, bot[1] + 5 + (y - bot[1] - 5) * 0.34] as [number, number]),
      mixRgb(wallShade, woodBase, 0.42),
      2.6,
      0.92,
    );
    handLine(b, [bot[0] - halfW * 0.85, bot[1] + 2], [bot[0] + halfW * 0.48, bot[1] + 1], 4.2, mixRgb(verandaCol, wallLit, 0.35), {
      dry: 0.36,
      alpha: 0.74,
      jitterPx: 1.2,
    });

    const pTL: [number, number] = [top[0] - halfW, top[1]];
    const pTR: [number, number] = [top[0] + halfW, top[1]];
    const pBR: [number, number] = [bot[0] + halfW * 1.03, bot[1]];
    const pBL: [number, number] = [bot[0] - halfW * 1.03, bot[1]];
    const arrisU = 0.44;
    const pMidT: [number, number] = [pTL[0] + (pTR[0] - pTL[0]) * arrisU, top[1]];
    const pMidB: [number, number] = [pBL[0] + (pBR[0] - pBL[0]) * arrisU, bot[1]];
    const pSunL: [number, number] = [sunPt[0] - halfW * 1.01, sunPt[1]];
    const pSunM: [number, number] = [pTL[0] + (pTR[0] - pTL[0]) * arrisU, sunPt[1] - 4];

    const edgeL = handPath(b, pTL, pBL, 2.2, 0, 14);
    const edgeM = handPath(b, pMidT, pMidB, 1.5, 0, 14);
    const edgeR = handPath(b, pTR, pBR, 2.2, 0, 14);

    const pillarDark = mixRgb(wallShade, woodBase, 0.58);
    const pillarShadeFront = mixRgb(wallShade, woodBase, 0.38);
    const pillarLit = mixRgb(wallLit, verandaCol, 0.36);

    fill(b, [...edgeL, ...edgeR.slice().reverse()], pillarDark, 1.6, 0.99);
    fill(b, [...edgeL, ...edgeM.slice().reverse()], pillarShadeFront, 1.2, 0.96);
    const litLeft = handPath(b, pSunL, pBL, 1.8, 0, 8);
    const litMid = handPath(b, pSunM, pMidB, 1.4, 0, 8);
    fill(b, [...litLeft, ...litMid.slice().reverse()], pillarLit, 1.2, 0.98);

    for (let g = 0; g < 7; g++) {
      const u = 0.08 + (g / 6) * 0.84;
      const gTop: [number, number] = [pTL[0] + (pTR[0] - pTL[0]) * u, pTL[1]];
      const gBot: [number, number] = [pBL[0] + (pBR[0] - pBL[0]) * u, pBL[1]];
      const gSun: [number, number] = [pTL[0] + (pTR[0] - pTL[0]) * u, sunPt[1] - (u < arrisU ? 0 : 4)];
      const onLitFace = u < arrisU;
      handLine(b, gTop, gSun, Math.max(1.4, w * 0.075), jitter(b, shadeRgb(pillarDark, b.r.range(0.76, 1.12)), 0.03), {
        dry: 0.44,
        alpha: 0.56,
        jitterPx: 1.0,
        taper: [0.02, 0.02],
        streak: 0.16,
      });
      handLine(b, gSun, gBot, Math.max(1.4, w * 0.075), jitter(b, onLitFace ? mixRgb(verandaCol, woodBase, 0.36) : shadeRgb(pillarDark, 0.84), 0.03), {
        dry: 0.42,
        alpha: 0.6,
        jitterPx: 1.0,
        taper: [0.02, 0.02],
        streak: 0.16,
      });
    }
    line(b, edgeM, Math.max(1.4, w * 0.055), mixRgb(doorwayDark, woodBase, 0.52), { dry: 0.34, alpha: 0.62, taper: [0.01, 0.01] });
    line(b, edgeL, 2.4, mixRgb(doorwayDark, woodBase, 0.56), { dry: 0.28, alpha: 0.78, taper: [0.01, 0.01] });
    line(b, edgeR, 2.6, mixRgb(doorwayDark, woodBase, 0.68), { dry: 0.28, alpha: 0.82, taper: [0.01, 0.01] });
    handLine(b, pSunL, pBL, 2.8, mixRgb(wallLit, warmGold, 0.42), { dry: 0.32, alpha: 0.72, jitterPx: 0.9, taper: [0.02, 0.02] });
  }

  const soffitDark = mixRgb(doorwayDark, wallShade, 0.42);
  fill(b, [wallTL, wallTR, eaveFR, eaveFL], soffitDark, 0.9);
  for (let i = 0; i < 6; i++) {
    const v = (i + 0.5) / 6;
    const a = bilerp(wallTL, wallTR, eaveFR, eaveFL, 0, v);
    const c = bilerp(wallTL, wallTR, eaveFR, eaveFL, 1, v);
    handLine(b, a, c, 7, jitter(b, mixRgb(soffitDark, woodBase, b.r.range(0.14, 0.34)), 0.025), {
      dry: 0.44,
      alpha: 0.52,
      jitterPx: 1.0,
    });
  }
  const eaveLineSeg: [[number, number], [number, number]] = [eaveFL, eaveFR];
  const wallTopSeg: [[number, number], [number, number]] = [wallTL, wallTR];
  const clipToSoffit = (pt: [number, number]): [number, number] => {
    const yTop = yOnSegment(eaveLineSeg, pt[0]) + 2;
    const yBot = yOnSegment(wallTopSeg, pt[0]) - 2;
    return [pt[0], Math.max(yTop, Math.min(yBot, pt[1]))];
  };
  for (let x = -48.0; x <= 0.6; x += 0.46) {
    if (toCamera(cam, [x, house.eaveY, house.eaveZ])[1] < 2.4 || toCamera(cam, [x, house.wallY, house.eaveZ + 0.18])[1] < 2.4) continue;
    const rWallRaw = p(x, house.wallY, house.eaveZ + 0.16);
    const rEaveRaw = p(x, house.eaveY, house.eaveZ - 0.01);
    if (Math.max(rWallRaw[0], rEaveRaw[0]) < rect.x0 - 40 || Math.min(rWallRaw[0], rEaveRaw[0]) > rect.x1 + 40) continue;
    const rWall = clipToSoffit(rWallRaw);
    const rEave = clipToSoffit(rEaveRaw);
    const dist = toCamera(cam, [x, house.eaveY, house.eaveZ])[1];
    const rw = Math.max(2.0, Math.min(8.5, 38 / Math.max(3, dist)));
    handLine(b, rWall, rEave, rw, jitter(b, mixRgb(doorwayDark, woodBase, 0.54), 0.03), {
      dry: 0.28,
      body: 0.78,
      alpha: 0.82,
      jitterPx: 0.5,
      taper: [0.06, 0.08],
    });
    handLine(b, [rWall[0], rWall[1] + rw * 0.24], [rEave[0], rEave[1] + rw * 0.24], Math.max(1.2, rw * 0.26), jitter(b, mixRgb(verandaCol, wallShade, 0.42), 0.025), {
      dry: 0.42,
      alpha: 0.52,
      jitterPx: 0.4,
      taper: [0.08, 0.18],
    });
  }

  const roofTopL: [number, number] = [rect.x0 - 20, rect.y0 - 20];
  const roofTopR: [number, number] = [rect.x1 + 20, rect.y0 - 20];
  fill(b, [roofTopL, roofTopR, eaveFR, eaveFL], roofCol, 1.4);

  const takeoffTile: RoofPoint = (u, v) => p(
    1.4 - 22 * u,
    house.ridgeY + (house.eaveY - house.ridgeY) * v,
    house.ridgeZ + (house.eaveZ - house.ridgeZ) * v,
  );
  paintKawara(b, takeoffTile, 82, roofCol, mixRgb(roofCol, doorwayDark, 0.68), mixRgb(roofCol, wallLit, 0.58), false);

  handLine(b, eaveFL, eaveFR, 11, mixRgb(doorwayDark, woodBase, 0.55), { dry: 0.2, body: 0.88, jitterPx: 1.6 });
  handLine(b, [eaveFL[0], eaveFL[1] - 3.5], [eaveFR[0], eaveFR[1] - 3.5], 3.8, mixRgb(roofCol, wallLit, 0.42), {
    dry: 0.28,
    alpha: 0.84,
    jitterPx: 1.3,
  });

  mottle(b.c, 58 * b.k, 0.026, 75);
  return b.c;
};

const paintLowYard = (plate: ViewPlate, variant: "s4" | "s6"): Paper => {
  const isS6 = variant === "s6";
  const b = makeBrush(plate, true, isS6 ? 7406 : 7404);
  const { rect, reference: cam } = plate;
  const p = (x: number, y: number, z: number): [number, number] => proj(cam, [x, y, z]);
  const horizonY = horizonOf(cam);
  const hedgeBaseY = p(isS6 ? 0.5 : -2.0, hedgeWorld.y, 0)[1];

  const skyBase = isS6 ? rgb(lowYard.skyS6) : rgb(lowYard.skyS4);
  const skyCool = rgb(closeup.s5.cloudCool);
  const skyWarm = rgb(closeup.s5.skyWarm);
  const skyTop = isS6 ? mixRgb(skyBase, skyCool, 0.2) : mixRgb(skyBase, skyCool, 0.26);
  const skyBright = isS6 ? mixRgb(skyBase, rgb(dusk.cloudGap[0]), 0.44) : mixRgb(skyBase, skyWarm, 0.42);
  const sunX = isS6 ? 1280 : 1780;
  const skyAt = (x: number, y: number): RGB => {
    const t = Math.max(0, Math.min(1, (y - rect.y0) / Math.max(1, horizonY - rect.y0)));
    const sunGlow = Math.exp(-Math.hypot((x - sunX) / 1.45, y - rect.y0 - 40) / 860);
    return mixRgb(mixRgb(skyTop, skyBase, t), skyBright, sunGlow * 0.54);
  };
  paintWash(b, rect.y0, hedgeBaseY + 24, skyAt, 0.014, isS6 ? 746 : 744);

  for (let i = 0; i < 36; i++) {
    const y = b.r.range(rect.y0 + 18, hedgeBaseY - 70);
    const x = b.r.range(rect.x0 - 80, rect.x1 - 160);
    const len = b.r.range(260, 620);
    const base = skyAt(x + len * 0.5, y);
    const tint = b.r.next() < 0.45 ? mixRgb(base, skyWarm, 0.16) : mixRgb(base, skyCool, 0.12);
    line(
      b,
      curve([x, y], [x + len, y + b.r.range(-10, 10)], b.r.range(-0.022, 0.022), 5),
      b.r.range(28, 56),
      jitter(b, tint, 0.016),
      { dry: 0.4, body: 0.42, alpha: b.r.range(0.22, 0.34), taper: [0.4, 0.4], streak: 0.05 },
    );
  }

  const purpleCloudTones: MassTones = {
    shadow: mixRgb(rgb(dusk.cloud.shadow), skyCool, 0.34),
    mid: mixRgb(skyCool, rgb(dusk.cloud.edge), 0.34),
    lit: mixRgb(skyWarm, rgb(dusk.cloud.edge), 0.58),
    rim: rgb(dusk.cloudGap[0]),
  };
  const sunPt = { x: sunX, y: rect.y0 - 60 };
  if (!isS6) {
    cloudCauliflower(b, billows(b.r, 380, 275, 1040, 290, 0.18), purpleCloudTones, sunPt, true);
    cloudCauliflower(b, billows(b.r, 1240, 195, 580, 165, 0.2), purpleCloudTones, sunPt, true);
  } else {
    cloudCauliflower(b, billows(b.r, 290, 240, 880, 240, 0.18), purpleCloudTones, sunPt, true);
    cloudCauliflower(b, billows(b.r, 1840, 230, 740, 220, 0.18), purpleCloudTones, sunPt, true);
  }

  if (isS6) {
    const gL = p(hedgeWorld.gateXMin, hedgeWorld.y, 0);
    const gR = p(hedgeWorld.gateXMax, hedgeWorld.y, 0);
    const gapY0 = Math.max(horizonY + 2, Math.min(gL[1], gR[1]) - 64);
    const gapY1 = Math.max(gL[1], gR[1]) + 4;
    const gapX0 = Math.min(gL[0], gR[0]) - 26;
    const gapX1 = Math.max(gL[0], gR[0]) + 26;
    fill(b, [[gapX0, gapY0 - 10], [gapX1, gapY0 - 10], [gapX1, gapY0 + 6], [gapX0, gapY0 + 6]], mixRgb(rgb(dusk.shadowTeal), rgb(dusk.cloudGap[1]), 0.46), 3.0, 0.82);
    fill(b, [[gapX0, gapY0], [gapX1, gapY0], [gapX1, gapY1], [gapX0, gapY1]], mixRgb(rgb(dusk.paddyLit[0]), rgb(dusk.cloudGap[1]), 0.34), 1.5);
    for (let i = 0; i < 12; i++) {
      const u = i / 11;
      const y = gapY0 + 2 + u * (gapY1 - gapY0 - 2);
      const col = mixRgb(rgb(dusk.paddyLit[0]), rgb(dusk.paddyLit[1]), b.r.next());
      line(b, curve([gapX0, y], [gapX1, y + b.r.range(-1.5, 1.5)], 0.008, 4), b.r.range(4.5, 8.5), jitter(b, col, 0.04), {
        dry: 0.36,
        body: 0.58,
        alpha: 0.82,
      });
    }
  }

  const hedgeCol = rgb(lowYard.hedge);
  const bushTones = (k: number): MassTones => ({
    shadow: shadeRgb(mixRgb(hedgeCol, rgb(dusk.shadowTeal), 0.42), 0.84 + 0.12 * k),
    mid: mixRgb(hedgeCol, rgb(rain.hedge), 0.35 + 0.25 * k),
    lit: mixRgb(hedgeCol, rgb(dusk.paddyLit[0]), 0.62 + 0.12 * k),
    rim: mixRgb(rgb(dusk.paddyLit[0]), rgb(dusk.cloudGap[1]), 0.68),
  });

  const treeBehindX = isS6 ? -3.4 : -6.6;
  const treeBehindBase = p(treeBehindX, hedgeWorld.y + 2.8, 0);
  const treeForkPt = p(treeBehindX, hedgeWorld.y + 2.8, 2.35);
  const treeCrownPt = p(treeBehindX, hedgeWorld.y + 2.8, 3.85);
  if (treeCrownPt[0] > rect.x0 - 200 && treeCrownPt[0] < rect.x1 + 200) {
    const trunkCol = mixRgb(rgb(rain.wood), rgb(dusk.shadowViolet), 0.36);
    const spanH = Math.max(80, treeBehindBase[1] - treeCrownPt[1]);
    const trunkW = Math.max(12, spanH * 0.052);
    handLine(b, [treeBehindBase[0] + 6, treeBehindBase[1] + 4], [treeForkPt[0] - 4, treeForkPt[1] - 18], trunkW, trunkCol, {
      dry: 0.18,
      body: 0.85,
      jitterPx: 2.8,
      taper: [0.05, 0.25],
    });
    handLine(b, [treeForkPt[0] - 3, treeForkPt[1] + 10], [treeCrownPt[0] - trunkW * 3.8, treeCrownPt[1] + 24], trunkW * 0.52, trunkCol, {
      dry: 0.22,
      body: 0.8,
      jitterPx: 2.2,
      taper: [0.05, 0.52],
    });
    handLine(b, [treeForkPt[0] + 1, treeForkPt[1] + 4], [treeCrownPt[0] + trunkW * 4.2, treeCrownPt[1] + 16], trunkW * 0.46, trunkCol, {
      dry: 0.22,
      body: 0.8,
      jitterPx: 2.2,
      taper: [0.05, 0.52],
    });
    handLine(b, [treeBehindBase[0] + trunkW * 0.38, treeBehindBase[1] - 12], [treeForkPt[0] + trunkW * 0.24, treeForkPt[1]], trunkW * 0.22, rgb(dusk.cloud.edge), {
      dry: 0.38,
      alpha: 0.62,
      jitterPx: 1.5,
    });
    const trRad = Math.max(58, spanH * 0.3);
    const cxT = treeCrownPt[0];
    const cyT = treeCrownPt[1];
    const treePuffs: Puff[] = [
      [cxT - trRad * 0.58, cyT + trRad * 0.14, trRad * 0.46],
      [cxT + trRad * 0.56, cyT + trRad * 0.12, trRad * 0.42],
      [cxT - trRad * 0.12, cyT - trRad * 0.26, trRad * 0.5],
      [cxT + trRad * 0.34, cyT - trRad * 0.22, trRad * 0.4],
    ];
    for (let i = 0; i < 16; i++) {
      const a = b.r.range(-Math.PI, Math.PI * 0.18);
      const dd = b.r.range(0.32, 0.98) * trRad;
      treePuffs.push([cxT + Math.cos(a) * dd * 1.24, cyT + Math.sin(a) * dd * 0.72, trRad * b.r.range(0.18, 0.34)]);
    }
    mass(b, treePuffs, {
      tones: bushTones(0.32),
      sun: sunPt,
      strokeLength: [9, 18],
      strokeWidth: [4.5, 9],
      density: 4.8,
      rimWidth: 3.8,
      dab: true,
      backlit: true,
    });
  }

  const xMin = isS6 ? -11 : -24;
  const xMax = isS6 ? 13 : 7;
  const hedgeSegments: [number, number][] = isS6
    ? [
        [xMin, hedgeWorld.gateXMin - 0.06],
        [hedgeWorld.gateXMax + 0.06, xMax],
      ]
    : [[xMin, xMax]];

  for (const [sx0, sx1] of hedgeSegments) {
    const bandTop: [number, number][] = [];
    for (let s = 0; s <= 18; s++) {
      const wx = sx0 + ((sx1 - sx0) * s) / 18;
      if (toCamera(cam, [wx, hedgeWorld.y, 0.4])[1] < 1.6) continue;
      bandTop.push(p(wx, hedgeWorld.y, hedgeWorld.height * (0.48 + 0.14 * noise1(wx * 0.7, 740))));
    }
    if (bandTop.length >= 2) {
      const bR = p(sx1, hedgeWorld.y, -0.04);
      const bL = p(sx0, hedgeWorld.y, -0.04);
      fill(b, [...bandTop, bR, bL], bushTones(0.2).shadow, 2.0);
    }

    for (let row = 0; row < 2; row++) {
      let x = sx0;
      while (x < sx1) {
        const bushW = b.r.range(1.9, 3.4);
        const bx1 = Math.min(sx1, x + bushW);
        const cxM = (x + bx1) * 0.5;
        if (toCamera(cam, [cxM, hedgeWorld.y, 0.6])[1] < 1.8) {
          x += bushW * 0.65;
          continue;
        }
        const baseL = p(x, hedgeWorld.y, 0);
        const baseR = p(bx1, hedgeWorld.y, 0);
        if (Math.max(baseL[0], baseR[0]) < rect.x0 - 160 || Math.min(baseL[0], baseR[0]) > rect.x1 + 160) {
          x += bushW * 0.68;
          continue;
        }
        const hScale = row === 0 ? 1.0 : 0.56;
        const nearGateTap = isS6 && bx1 > hedgeWorld.gateXMin - 1.2 && x < hedgeWorld.gateXMin ? 0.88 : 1.0;
        const hWorld = hedgeWorld.height * hScale * nearGateTap * (0.8 + 0.28 * noise1(cxM * 0.58, 741 + row) + b.r.range(-0.08, 0.08));
        const puffs: Puff[] = [];
        const samples = 15;
        for (let i = 0; i < samples; i++) {
          const t = i / (samples - 1);
          const wx = x + (bx1 - x) * t;
          const dome = 0.46 + 0.54 * Math.sin(Math.PI * t) * (0.76 + 0.38 * noise1(t * 5.2 + cxM, 742));
          const bPt = p(wx, hedgeWorld.y, 0);
          const tPt = p(wx, hedgeWorld.y, hWorld * dome);
          const hPx = Math.max(18, bPt[1] - tPt[1]);
          const rad = hPx * b.r.range(0.14, 0.3);
          puffs.push([tPt[0] + b.r.range(-20, 20), tPt[1] + rad * b.r.range(0.55, 1.35) + (row === 0 ? 0 : hPx * 0.32), rad]);
        }
        const midBase = p(cxM, hedgeWorld.y, 0);
        const midTop = p(cxM, hedgeWorld.y, hWorld);
        const midHPx = Math.max(24, midBase[1] - midTop[1]);
        puffs.push([midBase[0], midBase[1] - midHPx * (row === 0 ? 0.3 : 0.2), midHPx * 0.44]);
        mass(b, puffs, {
          tones: bushTones(row === 0 ? b.r.range(0, 0.45) : b.r.range(0.45, 0.9)),
          floor: midBase[1] + 12,
          sun: sunPt,
          strokeLength: [9, 19],
          strokeWidth: [4.5, 9],
          density: 4.5,
          rimWidth: 3.8,
          dab: true,
          backlit: true,
        });
        x += bushW * b.r.range(0.52, 0.76);
      }
    }
  }

  const mudBase = isS6 ? rgb(lowYard.mudS6) : rgb(lowYard.mudS4);
  const mudDark = mixRgb(mudBase, rgb(lowYard.shadow), 0.48);
  const mudDeep = shadeRgb(mudDark, 0.78);
  const mudWarm = isS6 ? mixRgb(mudBase, rgb(lowYard.mudGlint), 0.44) : mixRgb(mudBase, rgb(dusk.cloud.edge), 0.26);
  fill(b, [[rect.x0, hedgeBaseY - 4], [rect.x1, hedgeBaseY - 4], [rect.x1, rect.y1], [rect.x0, rect.y1]], mudDark, 1);

  for (let row = 0; row < 54; row++) {
    const u = row / 53;
    const y = hedgeBaseY - 2 + Math.pow(u, 1.48) * (rect.y1 - hedgeBaseY + 18);
    const thick = 4 + u * 22;
    for (let x = rect.x0 - 60; x < rect.x1 + 40; ) {
      const len = b.r.range(70, 230) * (0.65 + u * 0.9);
      const xm = x + len * 0.5;
      const n = fbm2(xm / 280, y / 70, isS6 ? 748 : 747, 3);
      const col = n < 0.45 ? mixRgb(mudDark, mudBase, n / 0.45) : mixRgb(mudBase, mudWarm, (n - 0.45) / 0.55);
      line(b, curve([x, y], [x + len, y + b.r.range(-2.2, 2.2)], 0.004, 4), thick, jitter(b, col, 0.04), {
        dry: 0.34,
        body: 0.56,
        alpha: 0.86,
        taper: [0.3, 0.3],
      });
      x += len * b.r.range(0.56, 0.86);
    }
  }

  for (const offset of [-0.36, 0.36]) {
    const rutPts: [number, number][] = [];
    for (let i = 0; i < yardPath.length - 1; i++) {
      const [ax, ay] = yardPath[i];
      const [bx, by] = yardPath[i + 1];
      const dx = bx - ax;
      const dy = by - ay;
      const l = Math.hypot(dx, dy) || 1;
      const nx = -dy / l;
      const ny = dx / l;
      for (let s = 0; s < 5; s++) {
        const t = s / 5;
        const wx = ax + dx * t + nx * offset + (noise1(i * 5 + s + offset * 3, 743) - 0.5) * 0.08;
        const wy = ay + dy * t + ny * offset;
        if (toCamera(cam, [wx, wy, 0])[1] < 0.8) continue;
        const q = p(wx, wy, 0);
        if (q[1] > hedgeBaseY - 4 && q[1] < rect.y1 + 60) rutPts.push(q);
      }
    }
    if (rutPts.length >= 2) {
      line(b, rutPts, isS6 ? 12 : 14, mudDeep, { dry: 0.44, body: 0.52, alpha: 0.38, wobble: 0.14 });
      line(
        b,
        rutPts.map(([x, y]) => [x + 3, y - 4] as [number, number]),
        isS6 ? 4.5 : 5.5,
        mixRgb(mudWarm, rgb(lowYard.mudGlint), 0.42),
        { dry: 0.48, alpha: 0.34, wobble: 0.12 },
      );
      line(
        b,
        rutPts.map(([x, y]) => [x, y + 1] as [number, number]),
        isS6 ? 3.5 : 4.5,
        mixRgb(rgb(lowYard.puddleSky), rgb(lowYard.mudGlint), isS6 ? 0.6 : 0.25),
        { dry: 0.58, alpha: 0.32, wobble: 0.1 },
      );
    }
  }

  for (let i = 0; i < 14; i++) {
    const seg = Math.min(yardPath.length - 2, Math.floor(b.r.range(1, yardPath.length - 1)));
    const t = b.r.next();
    const wx = yardPath[seg][0] + (yardPath[seg + 1][0] - yardPath[seg][0]) * t + b.r.range(-0.42, 0.42);
    const wy = yardPath[seg][1] + (yardPath[seg + 1][1] - yardPath[seg][1]) * t + b.r.range(-0.32, 0.32);
    if (Math.hypot(wx - puddleW1.x, wy - puddleW1.y) < 0.72) continue;
    const camP = toCamera(cam, [wx, wy, 0]);
    if (camP[1] < 1.3 || camP[1] > 8.5) continue;
    const pt = p(wx, wy, 0);
    if (pt[1] < hedgeBaseY + 14 || pt[1] > rect.y1 - 20) continue;
    const sc = project(cam, [wx, wy, 0]).scale;
    const rx = Math.min(34, Math.max(7, 0.068 * sc));
    const ry = Math.max(2.5, rx * 0.24);
    fill(
      b,
      arc(pt[0], pt[1], rx, 0, Math.PI * 2, 10)
        .slice(0, -1)
        .map(([x, y]) => [x, pt[1] + (y - pt[1]) * (ry / rx)] as [number, number]),
      mudDeep,
      1.4,
      0.42,
    );
    line(b, [[pt[0] - rx * 0.55, pt[1] + ry * 0.32], [pt[0] + rx * 0.55, pt[1] + ry * 0.2]], Math.max(1.5, ry * 0.4), mixRgb(mudWarm, rgb(lowYard.mudGlint), 0.48), {
      dry: 0.42,
      alpha: 0.52,
      taper: [0.35, 0.35],
    });
  }

  for (let i = 0; i < 18; i++) {
    const u = b.r.range(0.08, 0.92);
    const y = hedgeBaseY + 12 + Math.pow(u, 1.4) * (rect.y1 - hedgeBaseY - 30);
    const x = b.r.range(rect.x0 + 60, rect.x1 - 140);
    const len = b.r.range(55, 190) * (0.6 + u * 0.8);
    const sheenCol = isS6 ? mixRgb(rgb(lowYard.mudGlint), rgb(lowYard.skyS6), 0.4) : mixRgb(rgb(lowYard.puddleSky), rgb(lowYard.mudGlint), 0.35);
    line(b, curve([x, y], [x + len, y + b.r.range(-2, 2)], 0.004, 4), b.r.range(3.5, 9.5) * (0.5 + u * 0.6), jitter(b, sheenCol, 0.03), {
      dry: 0.48,
      body: 0.48,
      alpha: b.r.range(0.28, 0.52),
      taper: [0.38, 0.38],
    });
  }

  if (isS6) {
    const glintCenter = p(-0.6, 7.6, 0);
    for (let i = 0; i < 20; i++) {
      const dy = b.r.range(-30, 32);
      const dx = b.r.range(-480, 480);
      const len = b.r.range(100, 260);
      line(b, curve([glintCenter[0] + dx - len * 0.5, glintCenter[1] + dy], [glintCenter[0] + dx + len * 0.5, glintCenter[1] + dy + b.r.range(-1.5, 1.5)], 0.003, 4), b.r.range(4, 10), jitter(b, rgb(lowYard.mudGlint), 0.03), {
        dry: 0.44,
        alpha: b.r.range(0.32, 0.56),
        taper: [0.36, 0.36],
      });
    }
  }

  const paintGroundPuddle = (wx: number, wy: number, rxM: number, ryM: number, skyReflect: RGB, isHero: boolean) => {
    const center = p(wx, wy, 0);
    const depth = project(cam, [wx, wy, 0]).depth;
    if (depth < 0.6 || center[1] > rect.y1 + 120) return;
    const ptsWater: [number, number][] = [];
    const steps = isHero ? 42 : 28;
    const seedP = Math.floor(Math.abs(wx * 17 + wy * 31) + 749);
    for (let i = 0; i < steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      const lobe =
        1 +
        0.16 * Math.sin(a * 2 + 0.7) +
        0.12 * Math.cos(a * 3 - 0.5) +
        0.09 * Math.sin(a * 5 + 1.4) +
        (noise1(i * 0.75 + wx * 2, seedP) - 0.5) * 0.16;
      ptsWater.push(p(wx + Math.cos(a) * rxM * lobe, wy + Math.sin(a) * ryM * lobe, 0));
    }
    const yMin = Math.min(...ptsWater.map((q) => q[1]));
    const yMax = Math.max(...ptsWater.map((q) => q[1]));
    const xMinP = Math.min(...ptsWater.map((q) => q[0]));
    const xMaxP = Math.max(...ptsWater.map((q) => q[0]));
    const cxP = (xMinP + xMaxP) * 0.5;
    const cyP = (yMin + yMax) * 0.5;
    const bankPoly = ptsWater.map(([x, y]) => [cxP + (x - cxP) * 1.07, cyP + (y - cyP) * 1.14] as [number, number]);
    fill(b, bankPoly, mudDeep, 2.8, 0.72);
    fill(b, ptsWater, skyReflect, 2.2, 0.96);

    const cloudRef = mixRgb(skyCool, rgb(dusk.cloud.shadow), 0.34);
    const warmRef = mixRgb(skyWarm, rgb(dusk.cloudGap[1]), 0.45);
    const rows = Math.max(14, Math.round((yMax - yMin) / (isHero ? 2.8 : 5)));
    for (let i = 0; i < rows; i++) {
      const u = (i + 0.5) / rows;
      const yy = yMin + (yMax - yMin) * u;
      let leftX = Infinity;
      let rightX = -Infinity;
      for (let e = 0; e < ptsWater.length; e++) {
        const a = ptsWater[e];
        const c = ptsWater[(e + 1) % ptsWater.length];
        if ((a[1] <= yy && c[1] > yy) || (c[1] <= yy && a[1] > yy)) {
          const ix = a[0] + ((yy - a[1]) / (c[1] - a[1])) * (c[0] - a[0]);
          leftX = Math.min(leftX, ix);
          rightX = Math.max(rightX, ix);
        }
      }
      if (!Number.isFinite(leftX) || rightX - leftX < 10) continue;
      const segs = isHero ? 5 : 2;
      for (let s = 0; s < segs; s++) {
        const t0 = s / segs;
        const t1 = (s + 1) / segs;
        const sx0 = leftX + (rightX - leftX) * t0 + 3;
        const sx1 = leftX + (rightX - leftX) * t1 - 3;
        if (sx1 <= sx0 + 4) continue;
        const xm = (sx0 + sx1) * 0.5;
        const cloudMask = fbm2(xm / 155, yy / 22, seedP + 5, 3);
        let col = skyReflect;
        if (u < 0.24) {
          col = mixRgb(hedgeCol, skyReflect, (u / 0.24) * 0.68);
        } else if (cloudMask < 0.52) {
          col = mixRgb(skyReflect, cloudRef, Math.min(0.62, (0.52 - cloudMask) * 1.85));
        } else if (xm > cxP - (xMaxP - xMinP) * 0.08) {
          col = mixRgb(skyReflect, warmRef, Math.min(0.5, ((xm - cxP + (xMaxP - xMinP) * 0.1) / Math.max(1, xMaxP - cxP)) * 0.45));
        }
        line(b, [[sx0, yy], [sx1, yy + b.r.range(-0.7, 0.7)]], Math.max(2.4, ((yMax - yMin) / rows) * 1.48), jitter(b, col, 0.022), {
          dry: 0.24,
          body: 0.76,
          alpha: 0.88,
          taper: [0.22, 0.22],
        });
      }
    }

    const rippleCount = isHero ? 16 : 5;
    for (let i = 0; i < rippleCount; i++) {
      const u = b.r.range(0.18, 0.86);
      const yy = yMin + (yMax - yMin) * u;
      const halfSpan = (xMaxP - xMinP) * 0.38 * Math.sqrt(Math.max(0.08, 1 - Math.pow(2 * u - 1, 2)));
      const rx0 = cxP + b.r.range(-halfSpan * 0.9, halfSpan * 0.3);
      const rLen = b.r.range(24, Math.max(36, halfSpan * 0.95));
      const rx1 = Math.min(xMaxP - 12, rx0 + rLen);
      if (rx1 <= rx0 + 10) continue;
      line(b, curve([rx0, yy + 1.4], [rx1, yy + 1.4 + b.r.range(-0.6, 0.6)], 0.008, 4), b.r.range(1.3, 2.4), mixRgb(cloudRef, mudDark, 0.38), {
        dry: 0.42,
        alpha: 0.5,
        taper: [0.35, 0.35],
      });
      line(b, curve([rx0 + 4, yy], [rx1 - 4, yy + b.r.range(-0.5, 0.5)], 0.008, 4), b.r.range(1.2, 2.2), rgb(warm.dropHighlight), {
        dry: 0.36,
        alpha: 0.72,
        taper: [0.35, 0.35],
      });
    }
  };

  paintGroundPuddle(
    puddleW1.x,
    puddleW1.y,
    puddleW1.rx,
    puddleW1.ry,
    isS6 ? mixRgb(rgb(lowYard.puddleSky), rgb(lowYard.skyS6), 0.48) : rgb(lowYard.puddleSky),
    true,
  );
  for (const pd of yardPuddlesWorld) {
    const q = project(cam, [pd.x, pd.y, 0]);
    if (q.depth > 1.2 && q.x > rect.x0 - 200 && q.x < rect.x1 + 200) {
      paintGroundPuddle(pd.x, pd.y, pd.rx * 0.85, pd.ry * 0.85, isS6 ? rgb(lowYard.mudGlint) : rgb(lowYard.puddleSky), false);
    }
  }

  for (let x = rect.x0 + 16; x < rect.x1 - 16; x += b.r.range(48, 125)) {
    const blades = 4 + Math.floor(b.r.next() * 5);
    const yBase = hedgeBaseY + b.r.range(-2, 10);
    for (let k = 0; k < blades; k++) {
      const bx = x + b.r.range(-18, 18);
      const h = b.r.range(12, 34);
      const lean = b.r.range(-14, 14);
      const litBlade = b.r.next() < 0.34;
      const col = litBlade ? mixRgb(hedgeCol, rgb(dusk.paddyLit[0]), 0.68) : shadeRgb(hedgeCol, 0.82);
      line(b, curve([bx, yBase], [bx + lean, yBase - h], b.r.range(-0.15, 0.15), 3), b.r.range(2.0, 3.8), jitter(b, col, 0.05), {
        dry: 0.28,
        taper: [0.1, 0.72],
        alpha: 0.9,
      });
    }
  }

  for (let i = 0; i < 22; i++) {
    const wx = b.r.range(isS6 ? -3.6 : -5.4, isS6 ? 4.4 : 1.6);
    const wy = b.r.range(4.4, 10.4);
    if (Math.hypot(wx - puddleW1.x, wy - puddleW1.y) < 0.55) continue;
    if (toCamera(cam, [wx, wy, 0])[1] < 1.1) continue;
    const pt = p(wx, wy, 0);
    if (pt[1] < hedgeBaseY + 12 || pt[1] > rect.y1 - 16) continue;
    const sc = project(cam, [wx, wy, 0]).scale;
    const blades = 3 + Math.floor(b.r.next() * 4);
    for (let k = 0; k < blades; k++) {
      const bx = pt[0] + b.r.range(-10, 10);
      const h = Math.max(8, b.r.range(0.06, 0.14) * sc);
      const col = k === 0 ? mixRgb(hedgeCol, rgb(dusk.paddyLit[0]), 0.55) : shadeRgb(hedgeCol, 0.85);
      line(b, curve([bx, pt[1] + 2], [bx + b.r.range(-h * 0.4, h * 0.4), pt[1] - h], b.r.range(-0.16, 0.16), 3), Math.max(1.8, h * 0.11), jitter(b, col, 0.05), {
        dry: 0.28,
        taper: [0.1, 0.7],
        alpha: 0.86,
      });
    }
  }

  for (let i = 0; i < 38; i++) {
    const wx = b.r.range(isS6 ? -3.5 : -5.5, isS6 ? 4.5 : 1.5);
    const wy = b.r.range(4.6, 10.6);
    if (toCamera(cam, [wx, wy, 0])[1] < 1.0) continue;
    const pt = p(wx, wy, 0);
    if (pt[1] < hedgeBaseY || pt[1] > rect.y1) continue;
    const d = project(cam, [wx, wy, 0]).depth;
    const sz = Math.max(3, 34 / Math.max(1, d));
    const col = b.r.next() < 0.5 ? shadeRgb(mudDark, 0.86) : mixRgb(mudWarm, rgb(lowYard.mudGlint), 0.25);
    fill(b, arc(pt[0], pt[1], sz, 0, Math.PI * 2, 7).slice(0, -1).map(([x, y]) => [x, pt[1] + (y - pt[1]) * 0.35] as [number, number]), jitter(b, col, 0.05), 1.4, 0.74);
  }
  mottle(b.c, 54 * b.k, 0.032, isS6 ? 76 : 77);
  return b.c;
};

const paintPaddyWide = (plate: ViewPlate): Paper => {
  const b = makeBrush(plate, true, 7511);
  const { rect, reference: cam } = plate;
  const p = (x: number, y: number, z: number): [number, number] => proj(cam, [x, y, z]);
  const horizonY = horizonOf(cam);

  const skyCool = rgb(paddyWide.skyCool);
  const skyWarm = rgb(paddyWide.skyWarm);
  const mistCol = rgb(paddyWide.mist);
  const farGold = rgb(paddyWide.paddyFar);
  const nearGold = rgb(paddyWide.paddyNear);
  const rowShadow = rgb(paddyWide.rowShadow);
  const silCol = rgb(paddyWide.silhouette);
  const greenGold = rgb(dusk.paddyLit[1]);
  const brightGold = rgb(dusk.cloudGap[1]);
  const zenithCool = mixRgb(skyCool, rgb(houseTwilight.skyHigh), 0.46);
  const coolViolet = mixRgb(skyCool, rgb(houseTwilight.skyHigh), 0.38);
  const shadowViolet = rgb(dusk.shadowViolet);
  const smoothstep = (a: number, b: number, x: number) => {
    const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };

  const sunAz = (28.3 * Math.PI) / 180;
  const sunEl = (16.0 * Math.PI) / 180;
  const sunScreen = project(cam, [
    cam.position[0] + Math.sin(sunAz) * Math.cos(sunEl) * 1e4,
    cam.position[1] + Math.cos(sunAz) * Math.cos(sunEl) * 1e4,
    cam.position[2] + Math.sin(sunEl) * 1e4,
  ]);

  const skyAt = (x: number, y: number): RGB => {
    const t = Math.max(0, Math.min(1, (y - rect.y0) / Math.max(1, horizonY - rect.y0)));
    const sideWarm = Math.max(0, Math.min(1, 1 - (x - (sunScreen.x + 40)) / 760));
    const sideCool = smoothstep(sunScreen.x + 200, sunScreen.x + 1700, x);
    const dSun = Math.hypot((x - sunScreen.x) / 1.5, (y - sunScreen.y) / 1.08);
    const glow = Math.exp(-dSun / 880);
    const glowNear = Math.exp(-dSun / 430);
    const core = Math.exp(-dSun / 360);
    let c = t < 0.46 ? mixRgb(zenithCool, skyCool, t / 0.46) : mixRgb(skyCool, mistCol, Math.pow((t - 0.46) / 0.54, 1.28) * 0.72);
    c = mixRgb(c, coolViolet, Math.min(1, sideCool * (0.72 - 0.36 * Math.max(0, (t - 0.62) / 0.38))));
    const warmGlow = 1 - sideCool * 0.7;
    c = mixRgb(c, skyWarm, Math.min(1, sideWarm * (0.44 + 0.5 * (1 - t)) + glowNear * 0.45 * warmGlow));
    c = mixRgb(c, brightGold, Math.min(1, glowNear * 0.6 * warmGlow));
    c = mixRgb(c, rgb(dusk.cloudGap[0]), core * 0.7 * warmGlow);

    const cloudAlt = Math.sin(Math.PI * Math.max(0, Math.min(1, (t - 0.04) / 0.82)));
    const warp = fbm2(x / 460, y / 180, 7514, 2) * 1.4;
    const deck = fbm2(x / 520 + warp * 0.35, y / 115 - warp * 0.2, 7515, 4);
    const under = fbm2(x / 520 + warp * 0.35, (y - 26) / 115 - warp * 0.2, 7515, 4);
    const cloudMask = Math.max(0, Math.min(1, (deck - 0.46) * 2.6)) * cloudAlt;
    if (cloudMask > 0.01) {
      const litEdge = Math.max(0, Math.min(1, (under - deck) * 2.4 + 0.32));
      const cloudShade = mixRgb(mixRgb(skyCool, mistCol, 0.3), rgb(dusk.cloud.shadow), 0.42);
      const cloudSun = mixRgb(skyWarm, brightGold, 0.35 + glow * 0.45);
      const cloudCol = mixRgb(cloudShade, cloudSun, Math.min(1, litEdge * (0.2 + sideWarm * 0.74)));
      c = mixRgb(c, cloudCol, cloudMask * 0.68);
    }
    return c;
  };
  paintWash(b, rect.y0, horizonY + 35, skyAt, 0.013, 7511);

  for (let i = 0; i < 84; i++) {
    const y = b.r.range(rect.y0 + 16, horizonY - 20);
    const x = b.r.range(rect.x0 - 160, rect.x1 - 180);
    const len = b.r.range(420, 980);
    const mx = x + len * 0.5;
    const base = skyAt(mx, y);
    const nearSun = Math.exp(-Math.hypot(mx - sunScreen.x, y - sunScreen.y) / 1080);
    const col =
      b.r.next() < 0.52
        ? mixRgb(base, nearSun > 0.32 ? brightGold : skyWarm, 0.14 + nearSun * 0.14)
        : mixRgb(base, mixRgb(skyCool, mistCol, 0.45), 0.16);
    line(b, curve([x, y], [x + len, y + b.r.range(-18, 18)], b.r.range(-0.02, 0.02), 5), b.r.range(42, 88), jitter(b, col, 0.012), {
      dry: 0.5,
      body: 0.34,
      alpha: b.r.range(0.1, 0.2),
      taper: [0.46, 0.46],
      streak: 0.03,
    });
  }

  const farRidgePts: [number, number][] = [];
  for (let x = rect.x0; x <= rect.x1; x += 14) {
    const h = 42 + 72 * fbm2(x / 520, 0.4, 752, 4);
    farRidgePts.push([x, horizonY - h * 0.74]);
  }
  fill(b, [...farRidgePts, [rect.x1, horizonY + 30], [rect.x0, horizonY + 30]], mixRgb(mistCol, skyCool, 0.38), 2.5, 0.92);
  for (let x = rect.x0; x < rect.x1; x += b.r.range(42, 100)) {
    const h = 42 + 72 * fbm2(x / 520, 0.4, 752, 4);
    const y = horizonY - h * 0.74 + 8;
    line(b, curve([x, y], [x + b.r.range(32, 92), y + b.r.range(14, 38)], 0.06, 4), b.r.range(12, 26), mixRgb(mistCol, skyWarm, 0.24), {
      dry: 0.54,
      alpha: 0.32,
    });
  }

  for (let i = 0; i < 18; i++) {
    const cx = b.r.range(rect.x0 + 40, rect.x1 - 40);
    const cy = horizonY - b.r.range(6, 30);
    const len = b.r.range(300, 700);
    line(b, curve([cx - len * 0.5, cy], [cx + len * 0.5, cy + b.r.range(-4, 4)], 0.008, 4), b.r.range(18, 36), jitter(b, mistCol, 0.014), {
      dry: 0.56,
      body: 0.38,
      alpha: b.r.range(0.36, 0.52),
      taper: [0.44, 0.44],
    });
  }

  fill(b, [[rect.x0, horizonY + 2], [rect.x1, horizonY + 2], [rect.x1, rect.y1], [rect.x0, rect.y1]], nearGold, 0);

  const windWaveAt = (wx: number, wy: number) => {
    const warp = fbm2(wx / 54, wy / 44, 7518, 2) * 3.4;
    const sweep1 = Math.sin(wx * 0.052 - wy * 0.074 + warp) * 0.5 + 0.5;
    const sweep2 = Math.sin(wx * 0.024 + wy * 0.058 - warp * 0.52) * 0.5 + 0.5;
    const smoothBand = sweep1 * 0.74 + sweep2 * 0.26;
    return Math.max(0, Math.min(1, smoothBand));
  };

  const parcelAt = (wx: number, wy: number) => {
    const warpX = wx + (fbm2(wx / 68, wy / 68, 7541, 2) - 0.5) * 8.0;
    const warpY = wy + (fbm2(wx / 68, wy / 68, 7542, 2) - 0.5) * 5.5;
    const px = Math.floor(warpX / 26);
    const py = Math.floor(warpY / 19);
    const id = noise1(px * 4.3 + py * 13.7, 754);
    const rowMode = Math.abs(px * 3 + py * 5) % 3;
    return { id, rowMode };
  };

  const deepWaveShadow = mixRgb(rowShadow, silCol, 0.36);
  const richGold = mixRgb(nearGold, rgb(dusk.paddyLit[0]), 0.42);

  const backlitBand = (wx: number, wy: number, dist: number) => {
    const bearing = Math.atan2(wx - cam.position[0], wy - cam.position[1]);
    const lateral = Math.exp(-Math.pow(Math.abs(bearing - sunAz) / 0.13, 2));
    return lateral * Math.max(0, Math.min(1, (dist - 18) / 36));
  };
  const cloudShadow = (wx: number, wy: number) => {
    const dx = wx - 19.2;
    const dy = wy - 17.6;
    const along = (dx * Math.sin(1.187) + dy * Math.cos(1.187)) / 7.6;
    const across = (dx * Math.cos(1.187) - dy * Math.sin(1.187)) / 4.2;
    const r = Math.hypot(along, across) + (fbm2(wx / 5.5, wy / 5.5, 7561, 3) - 0.5) * 0.5;
    return 1 - smoothstep(0.62, 1.05, r);
  };
  const underCloud = (col: RGB, shadow: number) =>
    shadow > 0.01 ? mixRgb(col, shadeRgb(mixRgb(col, shadowViolet, 0.36), 0.7), shadow * 0.94) : col;

  paintWash(
    b,
    horizonY + 2,
    rect.y1,
    (sx, sy) => {
      const u = Math.max(0, Math.min(1, (sy - horizonY) / Math.max(1, rect.y1 - horizonY)));
      const gw = screenToGround(cam, sx, sy);
      const wx = gw ? gw[0] : sx * 0.2;
      const wy = gw ? gw[1] : 90;
      const dist = gw ? Math.hypot(wx - cam.position[0], wy - cam.position[1]) : 160;
      const farMist = Math.max(0, Math.min(0.84, Math.pow(Math.max(0, (dist - 40) / 210), 0.76)));
      const { id } = parcelAt(wx, wy);
      const wave = windWaveAt(wx, wy);
      const sunBand = Math.exp(-Math.abs(sx - sunScreen.x - 140) / 1080) * (1 - u * 0.38);

      let col =
        id < 0.34
          ? mixRgb(richGold, greenGold, 0.5)
          : id > 0.66
            ? mixRgb(richGold, farGold, 0.44)
            : mixRgb(richGold, rowShadow, 0.18);
      col = mixRgb(col, farGold, Math.pow(1 - u, 1.38) * 0.48);
      col = mixRgb(col, nearGold, 0.26 + 0.34 * u);
      col = shadeRgb(col, 1 - 0.14 * Math.pow(u, 1.3));
      if (wave < 0.5) {
        const trough = Math.pow((0.5 - wave) / 0.5, 0.92);
        col = mixRgb(col, deepWaveShadow, Math.min(0.9, trough * (0.66 + 0.4 * u)));
      } else {
        const crest = Math.pow((wave - 0.5) / 0.5, 0.92);
        col = mixRgb(col, brightGold, Math.min(0.8, crest * 0.72));
      }
      col = mixRgb(col, brightGold, sunBand * 0.14);
      if (gw) col = mixRgb(col, brightGold, backlitBand(wx, wy, dist) * 0.78 * (0.5 + 0.5 * (1 - u)));
      if (gw) col = underCloud(col, cloudShadow(wx, wy));
      const hazeCol = mixRgb(mistCol, farGold, 0.24 + sunBand * 0.3);
      return mixRgb(col, hazeCol, Math.min(0.72, farMist));
    },
    0.015,
    7512,
  );

  let sy = horizonY + 5;
  while (sy < rect.y1 + 24) {
    const u = Math.max(0, Math.min(1, (sy - horizonY) / Math.max(1, rect.y1 - horizonY)));
    const stepY = 3.2 + Math.pow(u, 1.46) * 16.0;
    const thick = stepY * 1.16;
    let sx = rect.x0 - 40;
    while (sx < rect.x1 + 40) {
      const len = b.r.range(78, 210) * (0.55 + u * 1.12);
      const xm = sx + len * 0.5;
      const gw = screenToGround(cam, xm, sy);
      const wx = gw ? gw[0] : xm * 0.2;
      const wy = gw ? gw[1] : 80;
      const dist = gw ? Math.hypot(wx - cam.position[0], wy - cam.position[1]) : 140;
      const farMist = Math.max(0, Math.min(0.82, Math.pow(Math.max(0, (dist - 40) / 210), 0.76)));
      const { id, rowMode } = parcelAt(wx, wy);
      const wave = windWaveAt(wx, wy);
      const sunBand = Math.exp(-Math.abs(xm - sunScreen.x - 140) / 1080) * (1 - u * 0.38);

      const trough = wave < 0.5 ? 1 - wave * 2 : 0;
      let col =
        id < 0.34
          ? mixRgb(richGold, greenGold, 0.5)
          : id > 0.66
            ? mixRgb(richGold, farGold, 0.44)
            : mixRgb(richGold, rowShadow, 0.18);
      col = mixRgb(col, farGold, Math.pow(1 - u, 1.38) * 0.46);
      col = mixRgb(col, nearGold, 0.24 + 0.3 * u);
      col = shadeRgb(col, 1 - 0.14 * Math.pow(u, 1.3));
      if (wave < 0.5) {
        col = mixRgb(col, deepWaveShadow, Math.min(0.9, trough * (0.66 + 0.4 * u)));
      } else {
        col = mixRgb(col, brightGold, Math.min(0.78, ((wave - 0.5) / 0.5) * 0.7));
      }
      col = mixRgb(col, brightGold, sunBand * 0.14);
      if (gw && dist < 210) {
        col = mixRgb(col, brightGold, backlitBand(wx, wy, dist) * 0.68 * (0.5 + 0.5 * (1 - u)));
        col = underCloud(col, cloudShadow(wx, wy));
      }
      const hazeCol = mixRgb(mistCol, farGold, 0.24 + sunBand * 0.3);
      col = mixRgb(col, hazeCol, farMist);

      let dxDir = 1;
      let dyDir = 0;
      if (gw && dist < 210) {
        const stepX = rowMode === 0 ? 3.2 : rowMode === 1 ? 0.5 : 2.5;
        const stepY3 = rowMode === 0 ? 0.25 : rowMode === 1 ? 3.2 : -1.5;
        const p2 = p(wx + stepX, wy + stepY3, 0);
        const vx = p2[0] - xm;
        const vy = p2[1] - sy;
        const vl = Math.hypot(vx, vy) || 1;
        dxDir = vx / vl;
        dyDir = vy / vl;
        if (dxDir < 0) {
          dxDir = -dxDir;
          dyDir = -dyDir;
        }
        dyDir = Math.max(-0.38, Math.min(0.38, dyDir));
      }
      const x1 = sx + len * dxDir;
      const y1 = sy + len * dyDir + b.r.range(-1.4, 1.4);
      const bend = b.r.range(-0.025, 0.025);
      line(b, curve([sx, sy], [x1, y1], bend, 4), thick, jitter(b, col, 0.028), {
        dry: 0.38,
        body: 0.56,
        alpha: 0.72,
        taper: [0.34, 0.34],
        streak: 0.14,
      });
      const shadeT = Math.max(0, Math.min(1, (78 - dist) / 60));
      if (shadeT > 0.04) {
        const shadowCol = mixRgb(mixRgb(rowShadow, silCol, 0.16), mistCol, farMist * 0.8);
        line(b, curve([sx, sy + thick * 0.6], [x1, y1 + thick * 0.6], bend * 0.6, 4), Math.max(1.2, thick * 0.36), jitter(b, shadowCol, 0.02), {
          dry: 0.42,
          body: 0.5,
          alpha: (0.42 + 0.24 * trough) * shadeT,
          taper: [0.3, 0.3],
        });
      }
      sx += len * b.r.range(0.58, 0.88);
    }
    sy += stepY;
  }

  const groveBaseY = horizonY + 8;
  const farBeltCol = mixRgb(mistCol, silCol, 0.34);
  const nearBeltCol = mixRgb(mistCol, mixRgb(rowShadow, silCol, 0.5), 0.56);
  const beltLit = mixRgb(mistCol, skyWarm, 0.54);

  const beltTopPts: [number, number][] = [];
  for (let x = rect.x0 - 20; x <= rect.x1 + 20; x += 8) {
    const groveWave = fbm2(x / 230, 0.3, 753, 3);
    const clump = fbm2(x / 54, 0.7, 7531, 3);
    const tallClump = Math.max(0, fbm2(x / 95, 1.4, 7532, 2) - 0.52) * 34;
    const h = 6 + Math.max(0, groveWave - 0.14) * 38 + clump * 16 + tallClump;
    beltTopPts.push([x, groveBaseY - h]);
  }
  fill(b, [...beltTopPts, [rect.x1 + 20, groveBaseY + 6], [rect.x0 - 20, groveBaseY + 6]], farBeltCol, 2.2, 0.86);

  for (let gx = rect.x0 + 20; gx <= rect.x1 - 20; gx += b.r.range(64, 138)) {
    const groveWave = fbm2(gx / 230, 0.3, 753, 3);
    if (groveWave < 0.24 && b.r.next() < 0.55) continue;
    const treesInCluster = 3 + Math.floor(b.r.next() * 4);
    for (let k = 0; k < treesInCluster; k++) {
      const tx = gx + b.r.range(-36, 36);
      const tr = b.r.range(7, 17) * (0.65 + groveWave * 0.65);
      const ty = groveBaseY - b.r.range(4, tr * 1.45);
      const subPuffs = 3;
      for (let m = 0; m < subPuffs; m++) {
        const px = tx + b.r.range(-tr * 0.55, tr * 0.55);
        const py = ty + b.r.range(-tr * 0.35, tr * 0.25);
        const pr = tr * b.r.range(0.55, 0.92);
        const col = m === 0 ? nearBeltCol : mixRgb(nearBeltCol, farBeltCol, b.r.range(0.15, 0.45));
        fill(
          b,
          arc(px, py, pr, 0, Math.PI * 2, 9)
            .slice(0, -1)
            .map(([ax, ay]) => [px + (ax - px) * b.r.range(0.95, 1.35), py + (ay - py) * b.r.range(0.7, 1.0)] as [number, number]),
          jitter(b, col, 0.025),
          Math.max(1.4, pr * 0.22),
          0.78,
        );
      }
      if (b.r.next() < 0.48) {
        line(
          b,
          curve([tx - tr * 0.6, ty - tr * 0.35], [tx + tr * 0.25, ty - tr * 0.52], -0.18, 4),
          Math.max(2.0, tr * 0.26),
          jitter(b, beltLit, 0.025),
          { dry: 0.48, alpha: 0.46, taper: [0.4, 0.4] },
        );
      }
    }
  }

  const farmSpecs: [number, number, number][] = [
    [rect.x0 + 360, 74, 24],
    [rect.x0 + 432, 46, 16],
    [rect.x0 + 910, 82, 26],
    [rect.x0 + 988, 50, 17],
    [rect.x0 + 1470, 72, 23],
    [rect.x0 + 1542, 44, 15],
    [rect.x0 + 1950, 68, 22],
  ];
  for (const [fx, fw, fh] of farmSpecs) {
    const fy = groveBaseY + 2;
    const roofMist = mixRgb(silCol, mistCol, 0.42);
    const roofLit = mixRgb(mistCol, brightGold, 0.44);
    const wallMist = mixRgb(mistCol, mixRgb(farGold, rowShadow, 0.35), 0.34);
    const wallShade = mixRgb(mistCol, silCol, 0.28);
    fill(
      b,
      [[fx - fw * 0.42, fy - fh * 0.48], [fx + fw * 0.42, fy - fh * 0.48], [fx + fw * 0.42, fy + 1], [fx - fw * 0.42, fy + 1]],
      jitter(b, wallMist, 0.02),
      0.8,
      0.88,
    );
    fill(
      b,
      [[fx - fw * 0.42, fy - fh * 0.48], [fx + fw * 0.42, fy - fh * 0.48], [fx + fw * 0.42, fy - fh * 0.3], [fx - fw * 0.42, fy - fh * 0.3]],
      wallShade,
      0.6,
      0.48,
    );
    fill(
      b,
      [[fx - fw * 0.56, fy - fh * 0.44], [fx - fw * 0.24, fy - fh], [fx + fw * 0.24, fy - fh], [fx + fw * 0.56, fy - fh * 0.44]],
      jitter(b, roofMist, 0.02),
      1.0,
      0.92,
    );
    line(b, [[fx - fw * 0.52, fy - fh * 0.46], [fx - fw * 0.22, fy - fh]], 2.6, roofLit, { dry: 0.36, alpha: 0.66 });
    line(b, [[fx - fw * 0.22, fy - fh], [fx + fw * 0.22, fy - fh]], 1.8, mixRgb(silCol, mistCol, 0.34), { dry: 0.34, alpha: 0.68 });
  }

  for (let i = 0; i < 24; i++) {
    const cx = b.r.range(rect.x0 + 40, rect.x1 - 40);
    const cy = groveBaseY + b.r.range(-4, 18);
    const len = b.r.range(280, 660);
    const nearSun = Math.exp(-Math.abs(cx - sunScreen.x) / 1100);
    const veilCol = mixRgb(mistCol, skyWarm, 0.14 + nearSun * 0.34);
    line(b, curve([cx - len * 0.5, cy], [cx + len * 0.5, cy + b.r.range(-4, 4)], 0.008, 4), b.r.range(16, 32), jitter(b, veilCol, 0.015), {
      dry: 0.56,
      body: 0.36,
      alpha: b.r.range(0.28, 0.46),
      taper: [0.45, 0.45],
    });
  }

  const drawOrganicBundY = (
    yWorld: number,
    emphasis: number,
    bendAmp: number,
    gaps: readonly [number, number][],
  ) => {
    const isGap = (x: number) => gaps.some(([g0, g1]) => x >= g0 && x <= g1);
    type BundSample = { pt: [number, number]; dist: number; scale: number; halfW: number };
    const segments: BundSample[][] = [];
    let current: BundSample[] = [];
    for (let x = -20; x <= 680; x += x < 140 ? 2.2 : 10) {
      if (isGap(x)) {
        if (current.length >= 2) segments.push(current);
        current = [];
        continue;
      }
      const macroBend =
        Math.sin(x * 0.052 + yWorld * 0.21) * bendAmp +
        (fbm2(x * 0.044, yWorld * 0.085, 755, 2) - 0.5) * bendAmp * 2.4;
      const wy = yWorld + macroBend;
      const camPt = toCamera(cam, [x, wy, 0.12]);
      if (camPt[1] < 2.2) continue;
      const pr = project(cam, [x, wy, 0.12]);
      if (pr.x < rect.x0 - 220 || pr.x > rect.x1 + 220 || pr.y > rect.y1 + 200) continue;
      const widthMul = 0.62 + 0.8 * noise1(x * 0.16 + yWorld * 0.5, 7552);
      const halfW = Math.max(1.0, Math.min(11.5, 0.21 * pr.scale * emphasis * widthMul));
      current.push({
        pt: [pr.x, pr.y],
        dist: Math.hypot(x - cam.position[0], wy - cam.position[1]),
        scale: pr.scale,
        halfW,
      });
    }
    if (current.length >= 2) segments.push(current);

    for (const seg of segments) {
      const chunkSize = 14;
      for (let start = 0; start < seg.length - 1; start += chunkSize) {
        const end = Math.min(seg.length - 1, start + chunkSize);
        const sub = seg.slice(start, end + 1);
        if (sub.length < 2) continue;
        const mid = sub[Math.floor(sub.length * 0.5)];
        const mistT = Math.max(0, Math.min(0.84, (mid.dist - 36) / 145));
        const bundShadow = mixRgb(mixRgb(rowShadow, silCol, 0.14), mistCol, mistT);
        const bundEarth = mixRgb(mixRgb(nearGold, rowShadow, 0.56), mistCol, mistT);
        const bundGrass = mixRgb(mixRgb(greenGold, rgb(lowYard.hedge), 0.44), mistCol, mistT);

        const upper: [number, number][] = [];
        const lower: [number, number][] = [];
        const crownPts: [number, number][] = [];
        for (let i = 0; i < sub.length; i++) {
          const globalI = start + i;
          const s = sub[i];
          const prev = seg[Math.max(0, globalI - 1)].pt;
          const next = seg[Math.min(seg.length - 1, globalI + 1)].pt;
          const dx = next[0] - prev[0];
          const dy = next[1] - prev[1];
          const l = Math.hypot(dx, dy) || 1;
          let nx = -dy / l;
          let ny = dx / l;
          if (ny > 0) {
            nx = -nx;
            ny = -ny;
          }
          const endTaper =
            globalI === 0 || globalI === seg.length - 1
              ? 0.32
              : globalI === 1 || globalI === seg.length - 2
                ? 0.76
                : 1.0;
          const hw = s.halfW * endTaper;
          upper.push([s.pt[0] + nx * hw * 0.85, s.pt[1] + ny * hw * 0.85]);
          lower.push([s.pt[0] - nx * hw * 1.15, s.pt[1] - ny * hw * 1.15]);
          crownPts.push([s.pt[0] + nx * hw * 0.28, s.pt[1] + ny * hw * 0.28]);
        }

        fill(b, [...upper, ...lower.slice().reverse()], bundShadow, Math.max(1.1, mid.halfW * 0.24), 0.82 * (1 - mistT * 0.3));
        line(b, crownPts, Math.max(1.3, mid.halfW * 0.94), jitter(b, bundEarth, 0.028), {
          dry: 0.42,
          body: 0.62,
          alpha: 0.8 * (1 - mistT * 0.32),
          taper: [start === 0 ? 0.08 : 0.01, end === seg.length - 1 ? 0.08 : 0.01],
          wobble: 0.14,
        });
        line(b, lower, Math.max(1.1, mid.halfW * 0.68), jitter(b, bundGrass, 0.035), {
          dry: 0.46,
          body: 0.54,
          alpha: 0.72 * (1 - mistT * 0.36),
          taper: [start === 0 ? 0.1 : 0.01, end === seg.length - 1 ? 0.1 : 0.01],
          wobble: 0.18,
        });
      }

      for (let i = 0; i < seg.length; i++) {
        const s = seg[i];
        if (s.dist > 86 || (s.dist > 48 && i % 2 === 1) || b.r.next() < 0.1) continue;
        const [gx, gy] = s.pt;
        const tufts = s.dist < 42 ? 5 + Math.floor(b.r.next() * 5) : 3 + Math.floor(b.r.next() * 3);
        const grassBase = Math.max(3.5, Math.min(25, s.scale * 0.44));
        for (let t = 0; t < tufts; t++) {
          const sideY = b.r.range(-s.halfW * 0.95, s.halfW * 1.0);
          const tx = gx + b.r.range(-16, 16);
          const th = grassBase * b.r.range(0.5, 1.5);
          const gCol =
            t === 0
              ? mixRgb(greenGold, brightGold, 0.46)
              : t % 2 === 1
                ? mixRgb(greenGold, rgb(lowYard.hedge), 0.48)
                : mixRgb(rowShadow, rgb(lowYard.hedge), 0.56);
          line(
            b,
            curve([tx, gy + sideY], [tx + b.r.range(-th * 0.6, th * 0.6), gy + sideY - th], b.r.range(-0.2, 0.2), 3),
            Math.max(1.2, th * 0.14),
            jitter(b, gCol, 0.05),
            {
              dry: 0.32,
              taper: [0.08, 0.74],
              alpha: 0.86 * Math.max(0.25, 1 - s.dist / 98),
            },
          );
        }
      }
    }
  };

  drawOrganicBundY(19.5, 1.05, 1.2, [[17.0, 18.2], [45.0, 46.2]]);
  drawOrganicBundY(paddyWorld.farmerRidgeY, 1.12, 0.48, [[41.5, 42.6]]);
  drawOrganicBundY(paddyWorld.powerLineY, 0.88, 0.64, [[29.0, 30.4], [64.0, 65.5]]);
  drawOrganicBundY(54, 0.72, 1.35, [[35.0, 37.0], [80.0, 82.0]]);
  drawOrganicBundY(78, 0.6, 1.6, [[50.0, 52.5]]);

  for (let row = 0; row < 28; row++) {
    const u = 0.34 + (row / 27) * 0.66;
    const y = horizonY + 22 + Math.pow(u, 1.66) * (rect.y1 - horizonY - 12);
    const clusters = Math.floor(14 + u * 28);
    for (let s = 0; s < clusters; s++) {
      const cx = b.r.range(rect.x0, rect.x1);
      const gw = screenToGround(cam, cx, y);
      const wave = gw ? windWaveAt(gw[0], gw[1]) : 0.5;
      const blades = 2 + Math.floor(b.r.next() * 3);
      for (let k = 0; k < blades; k++) {
        const sx = cx + b.r.range(-14, 14);
        const h = (7 + u * 22) * b.r.range(0.7, 1.25);
        const bend = (6 + u * 14) * (0.65 + wave * 0.75);
        const col =
          wave < 0.44 || k === 0
            ? mixRgb(nearGold, rowShadow, b.r.range(0.35, 0.62))
            : mixRgb(nearGold, brightGold, b.r.range(0.38, 0.74));
        line(
          b,
          curve([sx, y + 2], [sx + bend, y - h], -0.22, 4),
          Math.max(1.2, h * 0.095),
          jitter(b, col, 0.045),
          { dry: 0.3, taper: [0.08, 0.76], alpha: 0.66 },
        );
      }
    }
  }

  const poleXs = [
    paddyWorld.powerLineXStart,
    paddyWorld.powerLineXStart + paddyWorld.poleSpacing,
    paddyWorld.powerLineXStart + paddyWorld.poleSpacing * 2,
    paddyWorld.powerLineXStart + paddyWorld.poleSpacing * 3,
    paddyWorld.powerLineXStart + paddyWorld.poleSpacing * 4,
  ];
  type PoleGeom = {
    x: number;
    top: Vec3;
    crossL: Vec3;
    crossR: Vec3;
    mistT: number;
  };
  const poleGeoms: PoleGeom[] = [];
  for (const poleX of poleXs) {
    const leanX = (noise1(poleX * 0.13, 757) - 0.5) * 0.34;
    const leanY = (noise1(poleX * 0.17, 758) - 0.5) * 0.22;
    const hVar = paddyWorld.wireHeight + (noise1(poleX * 0.21, 759) - 0.5) * 0.26;
    const crossTilt = (noise1(poleX * 0.29, 760) - 0.5) * 0.14;
    const topPos: Vec3 = [poleX + leanX, paddyWorld.powerLineY + leanY, hVar + 0.42];
    const crossL: Vec3 = [poleX + leanX - 0.58, paddyWorld.powerLineY + leanY, hVar + crossTilt];
    const crossR: Vec3 = [poleX + leanX + 0.58, paddyWorld.powerLineY + leanY, hVar - crossTilt];
    const dist = Math.hypot(poleX - cam.position[0], paddyWorld.powerLineY - cam.position[1]);
    const mistT = Math.max(0, Math.min(0.62, (dist - 36) / 170));
    poleGeoms.push({ x: poleX, top: topPos, crossL, crossR, mistT });

    if (toCamera(cam, [poleX, paddyWorld.powerLineY, 2.5])[1] < 2.0) continue;
    const bot = p(poleX, paddyWorld.powerLineY, 0);
    const top = p(topPos[0], topPos[1], topPos[2]);
    if (bot[0] < rect.x0 - 160 || bot[0] > rect.x1 + 160) continue;
    const cL = p(crossL[0], crossL[1], crossL[2]);
    const cR = p(crossR[0], crossR[1], crossR[2]);
    const w = Math.max(2.6, project(cam, [poleX, paddyWorld.powerLineY, 2.5]).scale * 0.21);
    const poleCol = mixRgb(silCol, mistCol, mistT);
    const shadowCol = mixRgb(rowShadow, mistCol, mistT * 0.6);
    handLine(b, bot, [bot[0] + w * 4.8, bot[1] + w * 1.5], Math.max(1.8, w * 0.65), shadowCol, {
      dry: 0.46,
      alpha: 0.44 * (1 - mistT * 0.5),
      jitterPx: 1.4,
    });
    handLine(b, bot, top, w, poleCol, { dry: 0.22, body: 0.85, wobble: 0.08, jitterPx: 1.4, taper: [0.03, 0.14] });
    handLine(b, cL, cR, Math.max(2.0, w * 0.6), poleCol, { dry: 0.24, body: 0.82, wobble: 0.07, jitterPx: 1.0 });
    handLine(b, [bot[0] - w * 0.3, bot[1]], [top[0] - w * 0.3, top[1]], Math.max(1.0, w * 0.24), mixRgb(rgb(warm.lowRim), mistCol, mistT * 0.5), {
      dry: 0.34,
      alpha: 0.72 * (1 - mistT * 0.4),
      jitterPx: 0.9,
    });
  }

  for (let i = 0; i < poleGeoms.length - 1; i++) {
    const a = poleGeoms[i];
    const c = poleGeoms[i + 1];
    const mistAvg = (a.mistT + c.mistT) * 0.5;
    const wireCol = mixRgb(silCol, mistCol, mistAvg * 0.85);
    const wireConfigs: [number, number, number][] = [
      [-0.48, 0.52, 1.0],
      [0.48, 0.58, 0.95],
      [0.0, 0.76, 0.72],
    ];
    for (const [xOff, sagM, thickMul] of wireConfigs) {
      const pts: [number, number][] = [];
      const steps = 18;
      for (let s = 0; s <= steps; s++) {
        const u = s / steps;
        const wx = a.top[0] + (c.top[0] - a.top[0]) * u + xOff * 0.15;
        const wy = a.top[1] + (c.top[1] - a.top[1]) * u + xOff * 0.85;
        const zBase = (a.crossL[2] + a.crossR[2]) * 0.5 * (1 - u) + (c.crossL[2] + c.crossR[2]) * 0.5 * u;
        const wz = zBase - 4 * sagM * u * (1 - u);
        if (toCamera(cam, [wx, wy, wz])[1] < 2.0) continue;
        const q = p(wx, wy, wz);
        if (q[0] > rect.x0 - 200 && q[0] < rect.x1 + 200) pts.push(q);
      }
      if (pts.length >= 2) {
        const midScale = project(cam, [(a.x + c.x) * 0.5, paddyWorld.powerLineY, paddyWorld.wireSag]).scale;
        const wireW = Math.max(1.2, Math.min(2.8, midScale * 0.042 * thickMul));
        line(b, pts, wireW, wireCol, { dry: 0.24, body: 0.82, alpha: 0.84 * (1 - mistAvg * 0.4), wobble: 0.05 });
      }
    }
  }

  mottle(b.c, 82 * b.k, 0.022, 78);
  return b.c;
};

const paintSoftBokehLayer = (
  b: Brush,
  count: number,
  xRange: [number, number],
  yRange: [number, number],
  rRange: [number, number],
  colors: RGB[],
  quietCenter: { x: number; y: number; rx: number; ry: number },
  alphaRange: [number, number] = [0.16, 0.32],
  ringBoost = 0.18,
) => {
  for (let i = 0; i < count; i++) {
    const x = b.r.range(xRange[0], xRange[1]);
    const y = b.r.range(yRange[0], yRange[1]);
    const r = b.r.range(rRange[0], rRange[1]);
    let alpha = b.r.range(alphaRange[0], alphaRange[1]);
    const q = Math.hypot((x - quietCenter.x) / quietCenter.rx, (y - quietCenter.y) / quietCenter.ry);
    if (q < 1) alpha *= 0.22 + 0.78 * q;
    const col = jitter(b, colors[Math.floor(b.r.next() * colors.length)], 0.025);
    const aspect = b.r.range(0.92, 1.16);
    paintSoftDisk(b, x, y, r * aspect, r / Math.sqrt(aspect), col, alpha, ringBoost);
  }
};

const paintCloseup = (plate: ViewPlate): Paper => {
  const { id, rect } = plate;
  const isS8End = id === "closeup-s8-end";
  const seed = id === "closeup-s8-start" || isS8End ? 7608 : id === "closeup-s2" ? 7602 : id === "closeup-s5" ? 7605 : id === "closeup-s7" ? 7607 : 7609;
  const b = makeBrush(plate, id !== "closeup-s2", seed);

  if (id === "closeup-s2") {
    const eaveCol = rgb(closeup.s2.eavesDark);
    const mistCol = rgb(closeup.s2.farMist);
    const hedgeCol = rgb(closeup.s2.hedgeYard);
    paintWash(
      b,
      rect.y0,
      rect.y1,
      (x, y) => {
        const wave = (fbm2(x / 360, y / 220, 762, 2) - 0.5) * 44;
        const yy = y + wave;
        if (yy < 115) {
          const u = Math.max(0, Math.min(1, (yy - 65) / 55));
          return mixRgb(eaveCol, mistCol, u * u * (3 - 2 * u));
        }
        const u = Math.max(0, Math.min(1, (yy - 540) / 150));
        return mixRgb(mistCol, hedgeCol, u * u * (3 - 2 * u));
      },
      0.016,
      7602,
    );
    paintSoftBokehLayer(b, 18, [rect.x0, rect.x1], [140, 560], [70, 170], [mixRgb(mistCol, rgb(rain.cloud.edge), 0.2), mistCol], { x: 1360, y: 740, rx: 340, ry: 260 }, [0.14, 0.24], 0.06);
    paintSoftBokehLayer(b, 18, [rect.x0, rect.x1], [620, rect.y1], [80, 190], [hedgeCol, mixRgb(hedgeCol, rgb(rain.hedge), 0.35)], { x: 1360, y: 740, rx: 320, ry: 260 }, [0.16, 0.28], 0.04);
    mottle(b.c, 90 * b.k, 0.02, 82);
    return b.c;
  }

  if (id === "closeup-s5") {
    const cool = rgb(closeup.s5.cloudCool);
    const warmSky = rgb(closeup.s5.skyWarm);
    const hedgeCol = rgb(closeup.s5.hedge);
    paintWash(
      b,
      rect.y0,
      rect.y1,
      (x, y) => {
        const wave = (fbm2(x / 380, y / 260, 765, 3) - 0.5) * 180;
        const split = (x - 980 + (y - 320) * 0.38 + wave) / 440;
        const u = Math.max(0, Math.min(1, split));
        const skyC = mixRgb(cool, warmSky, u * u * (3 - 2 * u));
        const sunBoost = Math.exp(-Math.hypot((x - 1680) / 1.3, y - 160) / 580);
        const litSky = mixRgb(skyC, rgb(dusk.cloudGap[0]), sunBoost * 0.42);
        const hU = Math.max(0, Math.min(1, (y - 960 + (noise1(x / 180, 765) - 0.5) * 34) / 60));
        return mixRgb(litSky, hedgeCol, hU * hU * (3 - 2 * hU));
      },
      0.015,
      7605,
    );
    paintSoftBokehLayer(b, 16, [rect.x0, 1280], [rect.y0, 880], [110, 240], [cool, mixRgb(cool, rgb(dusk.cloud.shadow), 0.32)], { x: 1120, y: 710, rx: 280, ry: 240 }, [0.16, 0.28], 0.05);
    paintSoftBokehLayer(b, 16, [1040, rect.x1], [rect.y0, 860], [100, 220], [warmSky, rgb(dusk.cloudGap[1]), rgb(dusk.cloudGap[0])], { x: 1120, y: 710, rx: 260, ry: 220 }, [0.14, 0.26], 0.08);
    mottle(b.c, 95 * b.k, 0.018, 85);
    return b.c;
  }

  if (id === "closeup-s7") {
    const cool = rgb(closeup.s7.skyCool);
    const warmSky = rgb(closeup.s7.skyWarm);
    const hedgeCol = rgb(closeup.s7.hedge);
    paintWash(
      b,
      rect.y0,
      rect.y1,
      (x, y) => {
        const wave = (fbm2(x / 400, y / 280, 767, 2) - 0.5) * 140;
        const u = Math.max(0, Math.min(1, (x - 940 + (y - 420) * 0.25 + wave) / 480));
        const skyC = mixRgb(cool, warmSky, u * u * (3 - 2 * u));
        const hU = Math.max(0, Math.min(1, (y - 905 + (noise1(x / 160, 767) - 0.5) * 44) / 76));
        return mixRgb(skyC, hedgeCol, hU * hU * (3 - 2 * hU));
      },
      0.015,
      7607,
    );
    paintSoftBokehLayer(b, 14, [rect.x0, 1140], [rect.y0, 860], [100, 220], [cool, mixRgb(cool, warmSky, 0.22)], { x: 1110, y: 650, rx: 320, ry: 260 }, [0.14, 0.24], 0.06);
    paintSoftBokehLayer(b, 16, [1020, rect.x1], [rect.y0, 860], [95, 210], [warmSky, rgb(dusk.cloudGap[1])], { x: 1110, y: 650, rx: 320, ry: 260 }, [0.14, 0.26], 0.1);
    paintSoftBokehLayer(b, 14, [rect.x0, rect.x1], [955, rect.y1], [70, 150], [hedgeCol, mixRgb(hedgeCol, rgb(dusk.paddyLit[1]), 0.18)], { x: 1110, y: 650, rx: 280, ry: 240 }, [0.18, 0.3], 0.04);
    mottle(b.c, 95 * b.k, 0.018, 87);
    return b.c;
  }

  if (id === "closeup-s8-start" || isS8End) {
    const pal = isS8End ? closeup.s8End : closeup.s8Start;
    const bright = rgb(pal.bokehBright);
    const mid = rgb(pal.bokehMid);
    const green = rgb(pal.green);
    const gleam = isS8End ? mixRgb(bright, rgb(dusk.cloudGap[1]), 0.45) : mixRgb(bright, rgb(dusk.cloudGap[0]), 0.48);
    paintWash(
      b,
      rect.y0,
      rect.y1,
      (x, y) => {
        const wave = (fbm2(x / 360, y / 220, 768, 2) - 0.5) * 70;
        const yy = y + wave;
        const sunLift = Math.exp(-Math.hypot((x - 1680) / 1.4, yy - 180) / 720);
        const topU = Math.max(0, Math.min(1, (yy - 160) / 400));
        const botU = Math.max(0, Math.min(1, (yy - 560) / 420));
        const topS = topU * topU * (3 - 2 * topU);
        const botS = botU * botU * (3 - 2 * botU);
        const base = yy < 560 ? mixRgb(bright, mid, topS) : mixRgb(mid, green, botS);
        const liftFade = Math.max(0, 1 - Math.max(0, (yy - 120) / 620));
        return mixRgb(base, gleam, sunLift * 0.42 * liftFade);
      },
      0.015,
      7608,
    );
    const quiet = { x: 1056, y: 626, rx: 320, ry: 270 };
    paintSoftBokehLayer(b, 26, [rect.x0, rect.x1], [rect.y0, 560], [60, 175], [bright, gleam, mid], quiet, [0.18, 0.34], 0.22);
    paintSoftBokehLayer(b, 22, [rect.x0, rect.x1], [440, 860], [45, 135], [mid, bright, mixRgb(mid, green, 0.35)], quiet, [0.16, 0.3], 0.2);
    paintSoftBokehLayer(b, 18, [rect.x0, rect.x1], [780, rect.y1], [65, 155], [green, mixRgb(green, mid, 0.38)], quiet, [0.2, 0.34], 0.1);
    mottle(b.c, 95 * b.k, 0.018, 88);
    return b.c;
  }

  const cool = rgb(closeup.s9.skyCool);
  const warmSky = rgb(closeup.s9.skyWarm);
  const trees = rgb(closeup.s9.trees);
  paintWash(
    b,
    rect.y0,
    rect.y1,
    (x, y) => {
      const wave = (fbm2(x / 400, y / 260, 769, 2) - 0.5) * 140;
      const u = Math.max(0, Math.min(1, (x - 760 + (y - 360) * 0.24 + wave) / 480));
      const skyC = mixRgb(cool, warmSky, u * u * (3 - 2 * u));
      const sunLift = Math.exp(-Math.hypot((x - 1720) / 1.3, y - 160) / 640);
      const litSky = mixRgb(skyC, rgb(dusk.cloudGap[1]), sunLift * 0.38);
      const tU = Math.max(0, Math.min(1, (y - 755 + (noise1(x / 170, 769) - 0.5) * 52) / 92));
      return mixRgb(litSky, trees, tU * tU * (3 - 2 * tU));
    },
    0.015,
    7609,
  );
  paintSoftBokehLayer(b, 14, [rect.x0, 980], [rect.y0, 740], [100, 220], [cool, mixRgb(cool, warmSky, 0.24)], { x: 920, y: 605, rx: 320, ry: 270 }, [0.14, 0.24], 0.06);
  paintSoftBokehLayer(b, 18, [960, rect.x1], [rect.y0, 740], [90, 210], [warmSky, rgb(dusk.cloudGap[1])], { x: 920, y: 605, rx: 300, ry: 250 }, [0.14, 0.26], 0.12);
  paintSoftBokehLayer(b, 16, [rect.x0, rect.x1], [810, rect.y1], [75, 165], [trees, mixRgb(trees, rgb(dusk.shadowTeal), 0.25)], { x: 920, y: 605, rx: 280, ry: 240 }, [0.18, 0.3], 0.04);
  mottle(b.c, 95 * b.k, 0.018, 89);
  return b.c;
};

export const paintViewPlate = (plate: ViewPlate): Paper => {
  switch (plate.id) {
    case "house-sky-rain":
      return paintHouseSky(plate, "rain");
    case "house-front-rain":
      return paintHouseFront(plate, "rain");
    case "house-sky-twilight":
      return paintHouseSky(plate, "twilight");
    case "house-front-twilight":
      return paintHouseFront(plate, "twilight");
    case "house-front-twilight-lamp":
      return paintHouseTwilightLamp(plate);
    case "house-takeoff":
      return paintHouseTakeoff(plate);
    case "low-s4":
      return paintLowYard(plate, "s4");
    case "low-s6":
      return paintLowYard(plate, "s6");
    case "paddy-wide":
      return paintPaddyWide(plate);
    case "closeup-s2":
    case "closeup-s5":
    case "closeup-s7":
    case "closeup-s8-start":
    case "closeup-s8-end":
    case "closeup-s9":
      return paintCloseup(plate);
  }
};

export const paintPoleStandSheet = (): Paper => {
  const b = makeBrush({ rect: { x0: 0, y0: 0, x1: 1600, y1: 900 }, k: 1 }, true, 7801);
  fill(b, [[0, 0], [1600, 0], [1600, 900], [0, 900]], rgb(sheet.ground), 0);
  const guide = rgb(sheet.guide);
  const shadowCol = rgb(sheet.shadow);
  const inkCol = rgb(ink.color);
  const baseY = 760;
  const topY = 180;
  for (const y of [baseY, 622, topY, 134]) {
    line(b, [[80, y], [1520, y]], 1.6, guide, { dry: 0.1, alpha: 0.9, wobble: 0.02 });
  }
  const drawSideView = (cx: number, litCol: RGB, shadeCol: RGB) => {
    fill(b, arc(cx, baseY + 6, 120, 0, Math.PI * 2, 18).slice(0, -1).map(([x, y]) => [x, baseY + 6 + (y - baseY - 6) * 0.14] as [number, number]), shadowCol, 2, 0.8);
    line(b, [[cx - 95, baseY], [cx - 12, 540]], 20, shadeCol, { dry: 0.16, body: 0.82, wobble: 0.04, taper: [0.04, 0.08] });
    line(b, [[cx + 95, baseY], [cx + 12, 540]], 20, litCol, { dry: 0.16, body: 0.82, wobble: 0.04, taper: [0.04, 0.08] });
    line(b, [[cx - 72, 622], [cx + 72, 622]], 16, shadeCol, { dry: 0.18, body: 0.8, wobble: 0.04 });
    line(b, [[cx, baseY], [cx, topY]], 26, shadeCol, { dry: 0.14, body: 0.86, wobble: 0.03, taper: [0.02, 0.04] });
    line(b, [[cx + 7, baseY], [cx + 7, topY]], 10, litCol, { dry: 0.25, body: 0.72, wobble: 0.03 });
    line(b, [[cx - 2, topY + 6], [cx - 38, 134]], 18, shadeCol, { dry: 0.16, body: 0.82, wobble: 0.04, taper: [0.08, 0.16] });
    line(b, [[cx + 2, topY + 6], [cx + 38, 134]], 18, litCol, { dry: 0.16, body: 0.82, wobble: 0.04, taper: [0.08, 0.16] });
    line(b, [[cx - 110, topY - 4], [cx + 110, topY - 4]], 15, mixRgb(litCol, rgb(dusk.cloudGap[1]), 0.18), { dry: 0.14, body: 0.86, wobble: 0.03 });
    line(b, [[cx - 110, topY + 3], [cx + 110, topY + 3]], 4, inkCol, { dry: 0.35, alpha: 0.65, wobble: 0.03 });
  };
  drawSideView(380, rgb(props.pole.rain.lit), rgb(props.pole.rain.shade));
  drawSideView(840, rgb(props.pole.dusk.lit), rgb(props.pole.dusk.shade));
  const topCx = 1280;
  const topCy = 470;
  fill(b, arc(topCx, topCy, 140, 0, Math.PI * 2, 20).slice(0, -1), shadowCol, 3, 0.32);
  line(b, [[topCx - 115, topCy - 95], [topCx + 115, topCy + 95]], 22, rgb(props.pole.dusk.shade), { dry: 0.16, body: 0.82, wobble: 0.04 });
  line(b, [[topCx - 115, topCy + 95], [topCx + 115, topCy - 95]], 22, rgb(props.pole.dusk.lit), { dry: 0.16, body: 0.82, wobble: 0.04 });
  fill(b, arc(topCx, topCy, 24, 0, Math.PI * 2, 14).slice(0, -1), rgb(props.pole.dusk.shade), 1.5);
  line(b, [[topCx - 160, topCy - 12], [topCx + 160, topCy + 12]], 18, rgb(props.pole.dusk.lit), { dry: 0.14, body: 0.86, wobble: 0.03 });
  line(b, [[topCx - 160, topCy - 4], [topCx + 160, topCy + 20]], 3, inkCol, { dry: 0.35, alpha: 0.65, wobble: 0.03 });
  mottle(b.c, 60, 0.018, 79);
  return b.c;
};

/**
 * 《雨后》正片各新机位的水粉底图绘制（第 2 轮精修版）：
 * 1. 老屋正面反向机位（第 1 镜暴雨版、第 12 镜暮色亮灯版，天空与老屋院子两层）：左侧改为错落灌木与乔木林带，补齐檐口贴合，暮色格子门灯光改为多层柔和溢光与湿瓦水粉笔触；
 * 2. 第 10 镜低夕光回看老屋正面：严格按透视前后次序绘制，保证 1.8×1.8 米开着的玄关门洞与 1.64 米檐影界线清晰完整、不被院子地面遮挡；
 * 3. 第 4、6 镜贴地低机位院子：树篱向左自然延伸并打碎成有机叶团，湿泥地面改用水粉底色加自然水痕与碎石；
 * 4. 第 11 镜稻田上空大远景：田埂成网贯通无断头，稻田改用随风起伏的宽笔触稻浪与远方薄雾树带；
 * 5. 第 2、5、7、8（起/止）、9 镜近景/特写虚化背景：改用浮点画布上的柔和光学水粉光斑，消除硬边多边形与水平接缝。
 * 所有几何位置按 scene.ts（同 layout.md / layout.svg）经 camera.ts 投影，色值全部取自 tokens.ts。
 */
import { project, toCamera } from "../../src/kit/engine/camera.ts";
import type { Camera, Vec3 } from "../../src/kit/engine/camera.ts";
import { fbm2, noise1 } from "../../src/kit/engine/random.ts";
import { curve, mixRgb, mottle, rgb, shadeRgb } from "../../src/kit/engine/paint.ts";
import type { Paper, RGB } from "../../src/kit/engine/paint.ts";
import {
  arc,
  billows,
  cloudVolumetric,
  fill,
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
  poleStand,
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

const paintHouseSky = (plate: ViewPlate, mode: "rain" | "twilight"): Paper => {
  const isTwilight = mode === "twilight";
  const b = makeBrush(plate, isTwilight, isTwilight ? 7112 : 7101);
  const { rect, reference: cam } = plate;
  const horizonY = horizonOf(cam);
  const ridgeY = project(cam, [0, house.ridgeY, house.ridgeZ]).y;
  const treeTopY = project(cam, [8.5, 0.5, 4.4]).y;

  if (!isTwilight) {
    const topCol = shadeRgb(rgb(houseRain.sky), 0.84);
    const midCol = rgb(houseRain.sky);
    const lowCol = mixRgb(rgb(houseRain.sky), rgb(houseRain.lightningSky), 0.34);
    paintWash(
      b,
      rect.y0,
      rect.y1,
      (_x, y) => {
        const t = Math.max(0, Math.min(1, (y - rect.y0) / Math.max(1, horizonY - rect.y0)));
        return t < 0.55 ? mixRgb(topCol, midCol, t / 0.55) : mixRgb(midCol, lowCol, (t - 0.55) / 0.45);
      },
      0.018,
      7101,
    );
    const stormTones: MassTones = {
      shadow: mixRgb(rgb(rain.cloud.dark), rgb(houseRain.eavesDark), 0.28),
      mid: rgb(houseRain.sky),
      lit: mixRgb(rgb(houseRain.sky), rgb(houseRain.lightningSky), 0.42),
      rim: rgb(houseRain.lightningSky),
    };
    const sunHigh = { x: 900, y: rect.y0 - 200 };
    cloudVolumetric(b, billows(b.r, 420, ridgeY - 30, 1320, 380, 0.35), stormTones, sunHigh, false, ridgeY - 15);
    cloudVolumetric(b, billows(b.r, 1580, ridgeY - 65, 1180, 350, 0.35), stormTones, sunHigh, false, ridgeY - 45);
    mottle(b.c, 95 * b.k, 0.02, 71);
    return b.c;
  }

  const high = rgb(houseTwilight.skyHigh);
  const belt = rgb(houseTwilight.skyBelt);
  const earth = rgb(houseTwilight.earthShadow);
  const beltTop = ridgeY - 310;
  const beltMid = ridgeY - 105;
  const beltBot = ridgeY + 25;
  paintWash(
    b,
    rect.y0,
    rect.y1,
    (x, y) => {
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
    },
    0.014,
    7112,
  );
  for (let i = 0; i < 10; i++) {
    const y = b.r.range(beltTop - 20, beltBot - 15);
    const x = b.r.range(rect.x0 + 80, rect.x1 - 240);
    const len = b.r.range(260, 560);
    const warmWisp = y > beltTop + 60 ? mixRgb(belt, rgb(dusk.cloud.edge), 0.14) : mixRgb(high, belt, 0.42);
    paintSoftDisk(b, x + len * 0.5, y, len * 0.5, b.r.range(12, 24), jitter(b, warmWisp, 0.015), 0.22, 0);
  }
  mottle(b.c, 110 * b.k, 0.016, 72);
  return b.c;
};

const drawWoodenStand = (b: Brush, cam: Camera, litCol: RGB, shadeCol: RGB, strokeCol: RGB) => {
  const [bx, by] = poleStand.base;
  const h = poleStand.topHeight;
  const sx = poleStand.legSpanX;
  const sy = poleStand.legSpanY;
  const postBot = proj(cam, [bx, by, 0]);
  const postTop = proj(cam, [bx, by, h]);
  const forkL = proj(cam, [bx - 0.11, by - 0.05, poleStand.forkTopZ]);
  const forkR = proj(cam, [bx + 0.11, by + 0.05, poleStand.forkTopZ]);
  const legA = proj(cam, [bx - sx * 0.5, by - sy * 0.45, 0]);
  const legB = proj(cam, [bx + sx * 0.5, by + sy * 0.45, 0]);
  const legMidA = proj(cam, [bx - sx * 0.12, by - sy * 0.1, poleStand.crossbarZ + 0.22]);
  const legMidB = proj(cam, [bx + sx * 0.12, by + sy * 0.1, poleStand.crossbarZ + 0.22]);
  const barA = proj(cam, [bx - sx * 0.36, by - sy * 0.32, poleStand.crossbarZ]);
  const barB = proj(cam, [bx + sx * 0.36, by + sy * 0.32, poleStand.crossbarZ]);
  const scale = project(cam, [bx, by, h * 0.5]).scale;
  const postW = Math.max(4, poleStand.postRadius * 2 * scale);
  line(b, [legA, legMidA], postW * 0.78, shadeCol, { dry: 0.18, body: 0.78, wobble: 0.06, taper: [0.04, 0.06] });
  line(b, [legB, legMidB], postW * 0.78, litCol, { dry: 0.18, body: 0.78, wobble: 0.06, taper: [0.04, 0.06] });
  line(b, [barA, barB], postW * 0.65, shadeCol, { dry: 0.2, body: 0.75, wobble: 0.05, taper: [0.06, 0.06] });
  line(b, [postBot, postTop], postW, shadeCol, { dry: 0.15, body: 0.82, wobble: 0.05, taper: [0.02, 0.04] });
  line(b, [[postBot[0] + postW * 0.22, postBot[1]], [postTop[0] + postW * 0.22, postTop[1]]], postW * 0.4, litCol, {
    dry: 0.25,
    body: 0.68,
    wobble: 0.05,
    taper: [0.04, 0.06],
  });
  line(b, [postTop, forkL], postW * 0.62, shadeCol, { dry: 0.18, body: 0.8, wobble: 0.05, taper: [0.06, 0.14] });
  line(b, [postTop, forkR], postW * 0.62, litCol, { dry: 0.18, body: 0.8, wobble: 0.05, taper: [0.06, 0.14] });
  line(b, [postBot, postTop], Math.max(1.2, postW * 0.16), strokeCol, { dry: 0.35, alpha: 0.58, wobble: 0.05 });
};

const paintHouseFront = (plate: ViewPlate, mode: "rain" | "twilight"): Paper => {
  const isTwilight = mode === "twilight";
  const b = makeBrush(plate, isTwilight, isTwilight ? 7212 : 7201);
  const { rect, reference: cam } = plate;
  const p = (x: number, y: number, z: number): [number, number] => proj(cam, [x, y, z]);

  const treeCol = isTwilight ? rgb(houseTwilight.trees) : rgb(houseRain.trees);
  const treeTones: MassTones = {
    shadow: shadeRgb(treeCol, 0.82),
    mid: treeCol,
    lit: isTwilight ? mixRgb(treeCol, rgb(houseTwilight.skyBelt), 0.24) : mixRgb(treeCol, rgb(houseRain.sky), 0.22),
    rim: isTwilight ? mixRgb(treeCol, rgb(houseTwilight.skyBelt), 0.44) : mixRgb(treeCol, rgb(houseRain.lightningSky), 0.32),
  };
  const groundLineY = p(8.5, 0.0, 0)[1];
  const grovePuffs: Puff[] = [];
  const groveSpecs: [number, number, number, number][] = [
    [14.2, 1.5, 3.6, 1.7],
    [12.0, 0.6, 3.3, 1.5],
    [10.2, 0.0, 2.9, 1.35],
    [8.6, -0.4, 3.2, 1.4],
    [7.2, -0.8, 2.7, 1.2],
    [11.0, 1.6, 2.0, 1.5],
    [8.8, 1.4, 1.8, 1.35],
    [7.0, 1.2, 1.6, 1.2],
  ];
  for (const [tx, ty, th, tr] of groveSpecs) {
    const top = p(tx, ty, th);
    const mid = p(tx, ty, th * 0.55);
    const rad = tr * project(cam, [tx, ty, th * 0.5]).scale;
    grovePuffs.push([top[0], top[1] + rad * 0.35, rad * 0.72]);
    grovePuffs.push([mid[0], mid[1], rad * 0.82]);
    for (let i = 0; i < 6; i++) {
      const a = b.r.range(-Math.PI, Math.PI * 0.2);
      const rr = b.r.range(0.3, 0.95) * rad;
      grovePuffs.push([top[0] + Math.cos(a) * rr * 1.15, top[1] + rad * 0.5 + Math.sin(a) * rr * 0.8, rad * b.r.range(0.24, 0.44)]);
    }
  }
  const underPts: [number, number][] = [
    [rect.x0 - 20, groundLineY - 120],
    p(6.4, 0.4, 1.6),
    p(6.2, 0.4, 0),
    [rect.x0 - 20, groundLineY + 8],
  ];
  fill(b, underPts, treeTones.shadow, 3);
  mass(b, grovePuffs, {
    tones: treeTones,
    floor: groundLineY + 6,
    sun: isTwilight ? { x: 1100, y: 120 } : { x: 800, y: -200 },
    strokeLength: [10, 20],
    strokeWidth: [5, 10],
    density: 2.8,
    rimWidth: 2.8,
    dab: true,
    backlit: false,
  });

  const yardCol = isTwilight ? rgb(houseTwilight.yard) : rgb(houseRain.yard);
  const yardFarY = p(0, -0.9, 0)[1] - 10;
  const yardDark = shadeRgb(yardCol, 0.82);
  const yardWarm = isTwilight ? mixRgb(yardCol, rgb(houseTwilight.wall), 0.22) : mixRgb(yardCol, rgb(houseRain.wall), 0.24);
  paintWash(
    b,
    yardFarY,
    rect.y1,
    (x, y) => {
      const u = Math.max(0, Math.min(1, (y - yardFarY) / Math.max(1, rect.y1 - yardFarY)));
      const n = fbm2(x / 240, y / 70, 725, 3);
      return mixRgb(mixRgb(yardDark, yardCol, 0.4 + 0.6 * u), yardWarm, Math.max(0, n - 0.35) * 0.8);
    },
    0.022,
    7205,
  );
  for (let row = 0; row < 18; row++) {
    const u = row / 17;
    const y = yardFarY + 8 + Math.pow(u, 1.35) * (rect.y1 - yardFarY - 8);
    for (let x = rect.x0; x < rect.x1; x += b.r.range(180, 380)) {
      const len = b.r.range(120, 300);
      const col = b.r.next() < 0.5 ? yardDark : yardWarm;
      line(b, curve([x, y], [x + len, y + b.r.range(-2, 2)], 0.004), 5 + u * 12, jitter(b, col, 0.03), {
        dry: 0.42,
        body: 0.45,
        alpha: 0.34,
        taper: [0.35, 0.35],
      });
    }
  }
  const pathPts = yardPath.map(([x, y]) => p(x, y, 0));
  const pathCol = isTwilight ? mixRgb(yardCol, rgb(houseTwilight.wall), 0.26) : mixRgb(yardCol, rgb(houseRain.wall), 0.3);
  for (let i = 0; i < pathPts.length - 1; i++) {
    const w = Math.max(14, project(cam, [yardPath[i][0], yardPath[i][1], 0]).scale * 0.85);
    line(b, [pathPts[i], pathPts[i + 1]], w, jitter(b, pathCol, 0.025), { dry: 0.48, alpha: 0.38, taper: [0.2, 0.2] });
  }
  const allPuddles = [...yardPuddlesWorld, puddleW1];
  for (const pd of allPuddles) {
    if (pd.y > 9.4) continue;
    const center = p(pd.x, pd.y, 0);
    const rx = Math.abs(p(pd.x + pd.rx, pd.y, 0)[0] - center[0]);
    const ry = Math.max(4, Math.abs(p(pd.x, pd.y + pd.ry, 0)[1] - center[1]));
    if (center[1] < yardFarY || center[1] > rect.y1 + 60) continue;
    paintSoftDisk(b, center[0], center[1], rx * 1.15, ry * 1.25, yardDark, 0.55, 0);
    const refCol = isTwilight ? mixRgb(rgb(houseTwilight.skyBelt), rgb(houseTwilight.earthShadow), 0.45) : rgb(houseRain.puddle);
    const waterPoly = arc(center[0], center[1], rx, 0, Math.PI * 2, 20)
      .slice(0, -1)
      .map(([x, y]) => [x, center[1] + ((y - center[1]) * ry) / Math.max(1, rx)] as [number, number]);
    fill(b, waterPoly, refCol, 1.6, 0.86);
    for (let i = 0; i < 4; i++) {
      const yy = center[1] + b.r.range(-ry * 0.55, ry * 0.55);
      const half = rx * Math.sqrt(Math.max(0.1, 1 - Math.pow((yy - center[1]) / Math.max(1, ry), 2))) * 0.8;
      const glintCol = isTwilight && Math.abs(pd.x - 1.2) < 2.8 ? mixRgb(rgb(houseTwilight.lampGlow), refCol, 0.35) : mixRgb(refCol, rgb(rain.cloud.edge), 0.25);
      line(b, [[center[0] - half * 0.7, yy], [center[0] + half * 0.7, yy]], Math.max(1.8, ry * 0.16), jitter(b, glintCol, 0.03), {
        dry: 0.42,
        alpha: 0.75,
        taper: [0.3, 0.3],
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
  fill(b, [wallTL, wallTR, wallBR, wallBL], wallCol, 1.2);

  for (let x = house.xMin; x <= house.xMax; x += 0.28) {
    const a = p(x, house.wallY, house.verandaZ);
    const c = p(x, house.wallY, house.eaveZ);
    const shade = x > 2.6 || x < -3.6 ? shadeRgb(wallCol, 0.88) : mixRgb(wallCol, eavesDark, 0.14);
    line(b, [a, c], 2.0, jitter(b, shade, 0.04), { dry: 0.48, alpha: 0.5, wobble: 0.05 });
  }
  const upperBandBL = p(house.xMax, house.wallY, 1.82);
  const upperBandBR = p(house.xMin, house.wallY, 1.82);
  fill(b, [wallTL, wallTR, upperBandBR, upperBandBL], eavesDark, 1.2, 0.44);

  const lr = house.litRoom;
  const doorTL = p(lr.xMax, house.wallY, lr.zMax);
  const doorTR = p(lr.xMin, house.wallY, lr.zMax);
  const doorBR = p(lr.xMin, house.wallY, lr.zMin);
  const doorBL = p(lr.xMax, house.wallY, lr.zMin);
  const doorCx = (doorTL[0] + doorTR[0]) * 0.5;
  const doorCy = (doorTL[1] + doorBL[1]) * 0.5;
  const doorRx = Math.abs(doorTR[0] - doorTL[0]) * 0.5;
  const doorRy = Math.abs(doorBL[1] - doorTL[1]) * 0.5;
  if (isTwilight) {
    paintSoftGlowQuad(b, doorCx, doorCy, doorRx * 2.1, doorRy * 1.9, rgb(houseTwilight.lampGlow), 0.16);
    paintSoftGlowQuad(b, doorCx, doorCy, doorRx * 1.45, doorRy * 1.35, rgb(houseTwilight.lampGlow), 0.22);
    fill(b, [doorTL, doorTR, doorBR, doorBL], rgb(houseTwilight.lamp), 0.8, 0.99);
    paintSoftGlowQuad(b, doorCx, doorCy - doorRy * 0.08, doorRx * 0.78, doorRy * 0.75, rgb(warm.dropHighlight), 0.34);
  } else {
    fill(b, [doorTL, doorTR, doorBR, doorBL], mixRgb(wallCol, eavesDark, 0.25), 0.8, 0.92);
  }
  const mullionCol = isTwilight ? mixRgb(eavesDark, rgb(ink.color), 0.62) : mixRgb(eavesDark, wallCol, 0.28);
  for (let i = 0; i <= 6; i++) {
    const x = lr.xMin + ((lr.xMax - lr.xMin) * i) / 6;
    line(b, [p(x, house.wallY, lr.zMin), p(x, house.wallY, lr.zMax)], i % 2 === 0 ? 4.0 : 2.0, mullionCol, { dry: 0.2, alpha: 0.92, wobble: 0.04 });
  }
  for (let j = 0; j <= 5; j++) {
    const z = lr.zMin + ((lr.zMax - lr.zMin) * j) / 5;
    line(b, [p(lr.xMax, house.wallY, z), p(lr.xMin, house.wallY, z)], j === 0 || j === 5 ? 4.0 : 1.8, mullionCol, { dry: 0.2, alpha: 0.9, wobble: 0.04 });
  }

  const gx0 = house.genkan.x - house.genkan.width * 0.5;
  const gx1 = house.genkan.x + house.genkan.width * 0.5;
  const gTL = p(gx1, house.wallY, house.genkan.baseZ + house.genkan.height);
  const gTR = p(gx0, house.wallY, house.genkan.baseZ + house.genkan.height);
  const gBR = p(gx0, house.wallY, 0.05);
  const gBL = p(gx1, house.wallY, 0.05);
  fill(b, [gTL, gTR, gBR, gBL], mixRgb(eavesDark, wallCol, 0.34), 1.0);
  for (let i = 0; i <= 4; i++) {
    const x = gx0 + ((gx1 - gx0) * i) / 4;
    line(b, [p(x, house.wallY, 0.05), p(x, house.wallY, house.genkan.baseZ + house.genkan.height)], i === 0 || i === 4 ? 3.6 : 1.9, eavesDark, { dry: 0.22, wobble: 0.04 });
  }
  for (let j = 0; j <= 4; j++) {
    const z = 0.05 + ((house.genkan.baseZ + house.genkan.height - 0.05) * j) / 4;
    line(b, [p(gx1, house.wallY, z), p(gx0, house.wallY, z)], 1.9, eavesDark, { dry: 0.22, wobble: 0.04 });
  }

  const vBackL = p(house.xMax, house.wallY, house.verandaZ);
  const vBackR = p(house.xMin, house.wallY, house.verandaZ);
  const vFrontR = p(house.xMin, house.verandaY, house.verandaZ);
  const vFrontL = p(house.xMax, house.verandaY, house.verandaZ);
  const vBotR = p(house.xMin, house.verandaY, 0);
  const vBotL = p(house.xMax, house.verandaY, 0);
  fill(b, [vFrontL, vFrontR, vBotR, vBotL], plinthCol, 1.0);
  fill(b, [vBackL, vBackR, vFrontR, vFrontL], mixRgb(wallCol, eavesDark, 0.36), 0.9);
  for (let i = 1; i <= 3; i++) {
    const y = house.wallY + ((house.verandaY - house.wallY) * i) / 4;
    line(b, [p(house.xMax, y, house.verandaZ), p(house.xMin, y, house.verandaZ)], 1.6, eavesDark, { dry: 0.38, alpha: 0.62, wobble: 0.04 });
  }
  if (isTwilight) {
    const spillCenter = p(1.0, 0.7, 0.15);
    paintSoftGlowQuad(b, spillCenter[0], spillCenter[1], doorRx * 1.9, doorRy * 0.95, rgb(houseTwilight.lampGlow), 0.26);
    paintSoftGlowQuad(b, spillCenter[0], spillCenter[1] + 28, doorRx * 2.5, doorRy * 1.25, rgb(houseTwilight.lampGlow), 0.13);
  }

  const soffitFL = p(house.xMax + 0.58, house.eaveY, house.eaveZ - 0.03);
  const soffitFR = p(house.xMin - 0.58, house.eaveY, house.eaveZ - 0.03);
  const soffitBR = p(house.xMin - 0.45, house.wallY, house.eaveZ + 0.18);
  const soffitBL = p(house.xMax + 0.45, house.wallY, house.eaveZ + 0.18);
  fill(b, [soffitBL, soffitBR, soffitFR, soffitFL], eavesDark, 0.8);
  for (let x = house.xMin; x <= house.xMax; x += 0.55) {
    line(b, [p(x, house.wallY, house.eaveZ + 0.12), p(x, house.eaveY, house.eaveZ - 0.02)], 2.2, shadeRgb(eavesDark, 1.2), { dry: 0.45, alpha: 0.55, wobble: 0.04 });
  }

  for (const px of house.pillarsX) {
    const bot = p(px, house.pillarY, 0);
    const top = p(px, house.pillarY, house.eaveZ + 0.02);
    const w = Math.max(8, project(cam, [px, house.pillarY, 1.2]).scale * 0.15);
    line(b, [bot, top], w, mixRgb(eavesDark, wallCol, 0.35), { dry: 0.18, body: 0.82, wobble: 0.04, taper: [0.01, 0.01] });
    const rimCol = isTwilight && Math.abs(px - 1.0) < 2.8 ? rgb(houseTwilight.lampGlow) : mixRgb(wallCol, eavesDark, 0.15);
    line(b, [[bot[0] + w * 0.25, bot[1]], [top[0] + w * 0.25, top[1]]], w * 0.28, rimCol, { dry: 0.32, alpha: 0.72, wobble: 0.04 });
  }

  const ridgeL = p(house.xMax + 0.62, house.ridgeY, house.ridgeZ);
  const ridgeR = p(house.xMin - 0.62, house.ridgeY, house.ridgeZ);
  const eaveTopL = p(house.xMax + 0.64, house.eaveY, house.eaveZ - 0.02);
  const eaveTopR = p(house.xMin - 0.64, house.eaveY, house.eaveZ - 0.02);
  fill(b, [ridgeL, ridgeR, eaveTopR, eaveTopL], roofCol, 1.6);
  const tileShadow = mixRgb(roofCol, eavesDark, 0.5);
  const tileSheen = isTwilight ? mixRgb(roofCol, rgb(houseTwilight.skyBelt), 0.3) : mixRgb(roofCol, rgb(houseRain.lightningSky), 0.36);
  for (let i = 0; i < 24; i++) {
    const u = b.r.range(0.08, 0.92);
    const ry = house.ridgeY + (house.eaveY - house.ridgeY) * u;
    const rz = house.ridgeZ + (house.eaveZ - house.ridgeZ) * u;
    const x0 = b.r.range(house.xMin, house.xMax - 1.2);
    const span = b.r.range(1.2, 3.6);
    const col = b.r.next() < 0.55 ? tileShadow : tileSheen;
    line(b, [p(x0, ry, rz), p(Math.min(house.xMax + 0.3, x0 + span), ry, rz)], b.r.range(6, 14), jitter(b, col, 0.03), {
      dry: 0.45,
      alpha: 0.28,
      taper: [0.3, 0.3],
    });
  }
  const rows = 13;
  for (let r = 1; r < rows; r++) {
    const u = r / rows;
    const ry = house.ridgeY + (house.eaveY - house.ridgeY) * u;
    const rz = house.ridgeZ + (house.eaveZ - house.ridgeZ) * u;
    line(b, [p(house.xMax + 0.5, ry, rz), p(house.xMin - 0.5, ry, rz)], 2.0, jitter(b, tileShadow, 0.04), { dry: 0.36, alpha: 0.52, wobble: 0.05 });
    if (r % 2 === 0) {
      for (let x = house.xMin; x <= house.xMax; x += b.r.range(1.5, 3.2)) {
        line(b, [p(x, ry, rz + 0.03), p(Math.min(house.xMax, x + b.r.range(0.7, 1.9)), ry, rz + 0.03)], 2.4, jitter(b, tileSheen, 0.03), {
          dry: 0.44,
          alpha: isTwilight ? 0.32 : 0.48,
          taper: [0.3, 0.3],
        });
      }
    }
  }
  for (let x = house.xMin - 0.1; x <= house.xMax + 0.1; x += 0.48) {
    line(b, [p(x, house.ridgeY, house.ridgeZ), p(x, house.eaveY, house.eaveZ)], 1.6, jitter(b, tileShadow, 0.04), { dry: 0.45, alpha: 0.35, wobble: 0.05 });
  }
  line(b, [ridgeL, ridgeR], 8.5, mixRgb(roofCol, tileSheen, 0.34), { dry: 0.22, body: 0.78, wobble: 0.04 });
  line(b, [eaveTopL, eaveTopR], 6.5, eavesDark, { dry: 0.2, body: 0.88, wobble: 0.04 });

  const standLit = isTwilight ? mixRgb(rgb(props.pole.twilight.lit), rgb(houseTwilight.lampGlow), 0.28) : rgb(props.pole.rain.lit);
  const standShade = isTwilight ? rgb(props.pole.twilight.shade) : rgb(props.pole.rain.shade);
  drawWoodenStand(b, cam, standLit, standShade, rgb(ink.color));

  mottle(b.c, 65 * b.k, 0.026, isTwilight ? 73 : 74);
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

  const [wallBL, wallBR] = lineOnY(house.wallY, house.verandaZ, -0.5, -14.0);
  const [wallTL, wallTR] = lineOnY(house.wallY, house.eaveZ + 0.18, -0.5, -14.0);
  const [sunL, sunR] = lineOnY(house.wallY, house.takeoffSunLineZ, -0.5, -14.0);
  const [verandaFL, verandaFR] = lineOnY(house.verandaY, house.verandaZ, -0.5, -14.0);
  const [verandaBotL, verandaBotR] = lineOnY(house.verandaY, 0, -0.5, -14.0);
  const [eaveFL, eaveFR] = lineOnY(house.eaveY, house.eaveZ, 0.0, -14.0);

  fill(b, [[rect.x0, rect.y0], [rect.x1, rect.y0], [rect.x1, rect.y1], [rect.x0, rect.y1]], wallLit, 0);
  fill(b, [wallTL, wallTR, wallBR, wallBL], wallLit, 1.0);

  for (let x = -18.0; x <= 0.2; x += 0.34) {
    if (toCamera(cam, [x, house.wallY, 1.2])[1] < 2.2) continue;
    const a = p(x, house.wallY, house.verandaZ);
    const c = p(x, house.wallY, house.eaveZ + 0.1);
    if (a[0] < rect.x0 - 40 || a[0] > rect.x1 + 40) continue;
    line(b, [a, c], 2.2, jitter(b, mixRgb(wallLit, verandaCol, 0.36), 0.035), { dry: 0.45, alpha: 0.44, wobble: 0.05 });
  }
  for (let i = 0; i < 20; i++) {
    const x = b.r.range(-15.5, -1.0);
    const z = b.r.range(0.55, house.takeoffSunLineZ - 0.12);
    line(b, [p(x, house.wallY, z), p(x - b.r.range(0.6, 1.6), house.wallY, z + b.r.range(-0.03, 0.03))], b.r.range(12, 24), jitter(b, mixRgb(wallLit, rgb(dusk.cloudGap[1]), 0.22), 0.025), {
      dry: 0.45,
      alpha: 0.36,
    });
  }

  fill(b, [wallTL, wallTR, sunR, sunL], wallShade, 1.8, 0.96);
  for (let x = -18.0; x <= 0.2; x += 0.38) {
    if (toCamera(cam, [x, house.wallY, 2.0])[1] < 2.2) continue;
    const a = p(x, house.wallY, house.takeoffSunLineZ);
    if (a[0] < rect.x0 - 40 || a[0] > rect.x1 + 40) continue;
    line(b, [a, p(x, house.wallY, house.eaveZ)], 2.0, jitter(b, mixRgb(wallShade, shadowViolet, 0.32), 0.035), {
      dry: 0.48,
      alpha: 0.46,
      wobble: 0.05,
    });
  }

  const gxMin = house.genkan.x - house.genkan.width * 0.5;
  const gxMax = house.genkan.x + house.genkan.width * 0.5;
  const gzBot = house.verandaZ;
  const gzTop = house.verandaZ + house.genkan.height;
  const dTL = p(gxMax + 0.55, house.wallY, gzTop);
  const dTR = p(gxMin - 0.65, house.wallY, gzTop);
  const dBR = p(gxMin - 0.65, house.wallY, gzBot);
  const dBL = p(gxMax + 0.55, house.wallY, gzBot);
  fill(b, [dTL, dTR, dBR, dBL], doorwayDark, 1.0, 0.99);
  const innerFloorA = p(gxMax + 0.35, house.wallY - 0.5, gzBot + 0.36);
  const innerFloorB = p(gxMin - 0.45, house.wallY - 0.5, gzBot + 0.36);
  const innerStepA = p(gxMax + 0.35, house.wallY - 0.5, gzBot + 0.14);
  const innerStepB = p(gxMin - 0.45, house.wallY - 0.5, gzBot + 0.14);
  const clampX = (pt: [number, number]): [number, number] => [Math.max(dTL[0] + 6, Math.min(dTR[0] - 6, pt[0])), pt[1]];
  fill(b, [clampX(innerFloorA), clampX(innerFloorB), clampX(innerStepB), clampX(innerStepA)], mixRgb(doorwayDark, wallShade, 0.2), 1.2, 0.58);

  const frameCol = mixRgb(doorwayDark, rgb(rain.wood), 0.55);
  line(b, [dTL, dBL], 9, frameCol, { dry: 0.18, body: 0.85, wobble: 0.03, rough: 0.18 });
  line(b, [dTR, dBR], 9, frameCol, { dry: 0.18, body: 0.85, wobble: 0.03, rough: 0.18 });
  line(b, [dTL, dTR], 10, frameCol, { dry: 0.18, body: 0.85, wobble: 0.03, rough: 0.18 });
  const slideL = p(gxMax + 1.45, house.wallY + 0.04, gzTop);
  const slideR = p(gxMax + 0.55, house.wallY + 0.04, gzTop);
  const slideSunL = p(gxMax + 1.45, house.wallY + 0.04, house.takeoffSunLineZ);
  const slideSunR = p(gxMax + 0.55, house.wallY + 0.04, house.takeoffSunLineZ);
  const slideBR = p(gxMax + 0.55, house.wallY + 0.04, gzBot);
  const slideBL = p(gxMax + 1.45, house.wallY + 0.04, gzBot);
  fill(b, [slideSunL, slideSunR, slideBR, slideBL], mixRgb(verandaCol, wallLit, 0.42), 0.8, 0.96);
  fill(b, [slideL, slideR, slideSunR, slideSunL], mixRgb(wallShade, rgb(rain.wood), 0.35), 0.8, 0.96);
  for (let j = 0; j <= 5; j++) {
    const z = gzBot + ((gzTop - gzBot) * j) / 5;
    line(b, [p(gxMax + 1.45, house.wallY + 0.04, z), p(gxMax + 0.55, house.wallY + 0.04, z)], j === 0 || j === 5 ? 3.5 : 2.0, frameCol, { dry: 0.22, wobble: 0.03, rough: 0.15 });
  }
  line(b, [slideL, slideBL], 4.0, frameCol, { dry: 0.2, wobble: 0.03, rough: 0.15 });

  fill(b, [wallBL, wallBR, verandaFR, verandaFL], mixRgb(verandaCol, wallLit, 0.34), 1.0);
  for (let i = 1; i <= 3; i++) {
    const y = house.wallY + ((house.verandaY - house.wallY) * i) / 4;
    const [plA, plB] = lineOnY(y, house.verandaZ, -0.5, -14.0);
    line(b, [plA, plB], 1.8, mixRgb(verandaCol, wallShade, 0.45), { dry: 0.36, alpha: 0.55, wobble: 0.04 });
  }
  fill(b, [verandaFL, verandaFR, verandaBotR, verandaBotL], mixRgb(verandaCol, wallShade, 0.42), 1.0);
  fill(b, [verandaBotL, verandaBotR, [rect.x1 + 20, rect.y1 + 20], [rect.x0 - 20, rect.y1 + 20]], verandaCol, 1.0);

  const botSeg: [[number, number], [number, number]] = [verandaBotL, verandaBotR];
  for (let row = 0; row < 20; row++) {
    const u = row / 19;
    const x0 = rect.x0 - 20;
    const x1 = rect.x1 + 20;
    for (let x = x0; x < x1; ) {
      const len = b.r.range(140, 320);
      const xm = x + len * 0.5;
      const yTop = yOnSegment(botSeg, xm) + 6;
      const y = yTop + u * (rect.y1 - yTop + 14);
      if (y > yOnSegment(botSeg, x) + 4 && y > yOnSegment(botSeg, x + len) + 4) {
        const col = mixRgb(verandaCol, b.r.next() < 0.45 ? wallLit : mixRgb(verandaCol, wallShade, 0.3), b.r.range(0.08, 0.32));
        line(b, curve([x, y], [x + len, y + b.r.range(-2, 2)], 0.004), 8 + u * 16, jitter(b, col, 0.03), {
          dry: 0.4,
          body: 0.46,
          alpha: 0.48,
          taper: [0.32, 0.32],
        });
      }
      x += len * b.r.range(0.7, 0.96);
    }
  }
  const castShadow = [p(-8.0, 0.0, 0), p(-6.2, 0.0, 0), p(-3.5, 2.2, 0), p(-5.5, 2.5, 0)];
  fill(b, castShadow, mixRgb(wallShade, verandaCol, 0.34), 3, 0.42);

  for (const px of [-6.9, -1.4]) {
    if (toCamera(cam, [px, house.pillarY, 1.2])[1] < 1.8) continue;
    const bot = p(px, house.pillarY, 0);
    const top = p(px, house.pillarY, house.eaveZ + 0.15);
    const w = Math.max(12, project(cam, [px, house.pillarY, 1.2]).scale * 0.16);
    fill(b, arc(bot[0], bot[1] + 4, w * 0.85, 0, Math.PI * 2, 10).slice(0, -1).map(([x, y]) => [x, bot[1] + 4 + (y - bot[1] - 4) * 0.3] as [number, number]), mixRgb(wallShade, verandaCol, 0.35), 1.5, 0.9);
    line(b, [bot, top], w, mixRgb(wallShade, rgb(rain.wood), 0.48), { dry: 0.12, body: 0.9, wobble: 0.015, rough: 0.12, taper: [0.01, 0.01] });
    const midLit = p(px, house.pillarY, house.takeoffSunLineZ);
    line(b, [[bot[0] - w * 0.24, bot[1]], [midLit[0] - w * 0.24, midLit[1]]], w * 0.42, mixRgb(wallLit, verandaCol, 0.28), {
      dry: 0.22,
      alpha: 0.88,
      wobble: 0.015,
      rough: 0.14,
    });
  }

  fill(b, [wallTL, wallTR, eaveFR, eaveFL], mixRgb(doorwayDark, wallShade, 0.45), 0.9);
  fill(b, [[rect.x0 - 20, rect.y0 - 20], [rect.x1 + 20, rect.y0 - 20], eaveFR, eaveFL], roofCol, 1.2);
  for (let i = 0; i < 16; i++) {
    const u = b.r.range(0.15, 0.85);
    const [rL, rR] = lineOnY(house.eaveY - 1.5 * u, house.eaveZ + 0.8 * u, 0.0, -14.0);
    line(b, [rL, rR], b.r.range(6, 14), jitter(b, mixRgb(roofCol, wallShade, b.r.range(0.15, 0.35)), 0.03), {
      dry: 0.45,
      alpha: 0.32,
      wobble: 0.04,
    });
  }
  for (let x = -18.0; x <= 0.6; x += 0.46) {
    if (toCamera(cam, [x, house.eaveY, house.eaveZ])[1] < 1.8) continue;
    const a = p(x, house.eaveY - 1.4, house.eaveZ + 0.8);
    const c = p(x, house.eaveY, house.eaveZ);
    if (c[0] < rect.x0 - 60 || c[0] > rect.x1 + 60) continue;
    line(b, [a, c], 2.6, jitter(b, mixRgb(roofCol, wallShade, 0.48), 0.035), {
      dry: 0.32,
      alpha: 0.56,
      wobble: 0.04,
    });
  }
  line(b, [eaveFL, eaveFR], 8, mixRgb(roofCol, wallLit, 0.34), { dry: 0.2, body: 0.82, wobble: 0.03 });

  mottle(b.c, 60 * b.k, 0.026, 75);
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
  const skyTop = isS6 ? mixRgb(skyBase, rgb(dusk.cloud.edge), 0.2) : mixRgb(skyBase, rgb(dusk.cloud.shadow), 0.14);
  const skyBright = isS6 ? mixRgb(skyBase, rgb(dusk.cloudGap[0]), 0.42) : mixRgb(skyBase, rgb(dusk.cloudGap[1]), 0.24);
  const sunX = isS6 ? 1280 : 1760;
  paintWash(
    b,
    rect.y0,
    hedgeBaseY + 18,
    (x, y) => {
      const t = Math.max(0, Math.min(1, (y - rect.y0) / Math.max(1, horizonY - rect.y0)));
      const sunGlow = Math.exp(-Math.hypot((x - sunX) / 1.4, y - rect.y0 - 40) / 760);
      return mixRgb(mixRgb(skyTop, skyBase, t), skyBright, sunGlow * 0.52);
    },
    0.013,
    isS6 ? 746 : 744,
  );
  for (let i = 0; i < 8; i++) {
    const cx = b.r.range(rect.x0 + 140, rect.x1 - 140);
    const cy = b.r.range(rect.y0 + 50, horizonY - 140);
    paintSoftDisk(b, cx, cy, b.r.range(180, 340), b.r.range(28, 56), mixRgb(skyBase, rgb(dusk.cloud.shadow), 0.12), 0.18, 0);
  }

  const hedgeCol = rgb(lowYard.hedge);
  const hedgeTones: MassTones = {
    shadow: mixRgb(hedgeCol, rgb(dusk.shadowTeal), 0.45),
    mid: hedgeCol,
    lit: mixRgb(hedgeCol, rgb(dusk.paddyLit[1]), 0.52),
    rim: mixRgb(rgb(dusk.paddyLit[0]), rgb(dusk.cloudGap[1]), 0.58),
  };
  const xMin = isS6 ? -11 : -24;
  const xMax = isS6 ? 13 : 7;
  if (isS6) {
    const gL = p(hedgeWorld.gateXMin, hedgeWorld.y, 0);
    const gR = p(hedgeWorld.gateXMax, hedgeWorld.y, 0);
    const gTL = p(hedgeWorld.gateXMin, hedgeWorld.y, hedgeWorld.height);
    const gTR = p(hedgeWorld.gateXMax, hedgeWorld.y, hedgeWorld.height);
    fill(b, [gTL, gTR, gR, gL], mixRgb(rgb(dusk.paddyLit[0]), rgb(dusk.cloudGap[1]), 0.45), 2);
  }
  const hedgeSegments: [number, number][] = isS6
    ? [
        [xMin, hedgeWorld.gateXMin - 0.1],
        [hedgeWorld.gateXMax + 0.1, xMax],
      ]
    : [[xMin, xMax]];
  for (const [sx0, sx1] of hedgeSegments) {
    const baseL = p(sx0, hedgeWorld.y, -0.04);
    const baseR = p(sx1, hedgeWorld.y, -0.04);
    const midL = p(sx0, hedgeWorld.y, hedgeWorld.height * 0.62);
    const midR = p(sx1, hedgeWorld.y, hedgeWorld.height * 0.62);
    fill(b, [midL, midR, baseR, baseL], hedgeTones.shadow, 2.0);
    const allPuffs: Puff[] = [];
    for (let x = sx0; x <= sx1; x += b.r.range(0.36, 0.66)) {
      if (toCamera(cam, [x, hedgeWorld.y, 0.7])[1] < 2.0) continue;
      const basePt = p(x, hedgeWorld.y, 0);
      if (basePt[0] < rect.x0 - 160 || basePt[0] > rect.x1 + 160) continue;
      const hVar = hedgeWorld.height * (0.9 + 0.18 * noise1(x * 0.55, 74) + b.r.range(-0.05, 0.06));
      const topPt = p(x, hedgeWorld.y, hVar);
      const hPx = Math.max(22, basePt[1] - topPt[1]);
      allPuffs.push([basePt[0], basePt[1] - hPx * 0.38, hPx * b.r.range(0.4, 0.54)]);
      allPuffs.push([topPt[0] + b.r.range(-20, 20), topPt[1] + hPx * b.r.range(0.16, 0.34), hPx * b.r.range(0.24, 0.34)]);
      allPuffs.push([topPt[0] + b.r.range(-22, 22), topPt[1] + hPx * b.r.range(0.06, 0.2), hPx * b.r.range(0.12, 0.19)]);
    }
    if (allPuffs.length > 0) {
      mass(b, allPuffs, {
        tones: hedgeTones,
        floor: hedgeBaseY + 14,
        sun: { x: sunX, y: rect.y0 - 60 },
        strokeLength: [8, 18],
        strokeWidth: [4, 8],
        density: 3.0,
        rimWidth: 3.4,
        dab: true,
        backlit: true,
      });
    }
  }

  const mudBase = isS6 ? rgb(lowYard.mudS6) : rgb(lowYard.mudS4);
  const mudDark = mixRgb(mudBase, rgb(lowYard.shadow), 0.42);
  const mudWarm = isS6 ? mixRgb(mudBase, rgb(lowYard.mudGlint), 0.44) : mixRgb(mudBase, rgb(dusk.cloud.edge), 0.24);
  paintWash(
    b,
    hedgeBaseY - 4,
    rect.y1,
    (x, y) => {
      const u = Math.max(0, Math.min(1, (y - hedgeBaseY) / Math.max(1, rect.y1 - hedgeBaseY)));
      const n1 = fbm2(x / 310, y / 75, isS6 ? 748 : 747, 3);
      const n2 = fbm2(x / 110, y / 28, 749, 2);
      const c = n1 < 0.45 ? mixRgb(mudDark, mudBase, n1 / 0.45) : mixRgb(mudBase, mudWarm, (n1 - 0.45) / 0.55);
      return mixRgb(c, mudDark, (1 - u) * 0.12 + (0.5 - n2) * 0.15);
    },
    0.022,
    isS6 ? 7406 : 7404,
  );
  for (let row = 0; row < 16; row++) {
    const u = row / 15;
    const y = hedgeBaseY + 4 + Math.pow(u, 1.4) * (rect.y1 - hedgeBaseY);
    for (let x = rect.x0 - 40; x < rect.x1; x += b.r.range(220, 420)) {
      const len = b.r.range(200, 460);
      const col = b.r.next() < 0.45 ? mudDark : mudWarm;
      line(b, curve([x, y], [x + len, y + b.r.range(-3, 3)], 0.005), 8 + u * 20, jitter(b, col, 0.03), {
        dry: 0.45,
        body: 0.42,
        alpha: 0.22,
        taper: [0.38, 0.38],
      });
    }
  }
  for (let x = rect.x0 + 20; x < rect.x1 - 20; x += b.r.range(95, 220)) {
    const blades = 3 + Math.floor(b.r.next() * 4);
    for (let k = 0; k < blades; k++) {
      const bx = x + b.r.range(-18, 18);
      const h = b.r.range(10, 28);
      const lean = b.r.range(-12, 12);
      line(b, [[bx, hedgeBaseY + 3], [bx + lean, hedgeBaseY - h]], b.r.range(2.0, 3.8), jitter(b, hedgeTones.shadow, 0.05), {
        dry: 0.3,
        taper: [0.1, 0.65],
        alpha: 0.85,
      });
    }
  }

  if (isS6) {
    const glintCenter = p(-0.6, 7.6, 0);
    paintSoftDisk(b, glintCenter[0], glintCenter[1], 560, 42, rgb(lowYard.mudGlint), 0.36, 0);
    for (let i = 0; i < 12; i++) {
      const dy = b.r.range(-26, 26);
      const dx = b.r.range(-440, 440);
      const len = b.r.range(120, 280);
      line(b, curve([glintCenter[0] + dx - len * 0.5, glintCenter[1] + dy], [glintCenter[0] + dx + len * 0.5, glintCenter[1] + dy + b.r.range(-1.5, 1.5)], 0.003), b.r.range(5, 11), jitter(b, rgb(lowYard.mudGlint), 0.025), {
        dry: 0.45,
        alpha: 0.44,
        taper: [0.35, 0.35],
      });
    }
  }

  const paintGroundPuddle = (wx: number, wy: number, rxM: number, ryM: number, skyReflect: RGB) => {
    const center = p(wx, wy, 0);
    const depth = project(cam, [wx, wy, 0]).depth;
    if (depth < 0.6 || center[1] > rect.y1 + 120) return;
    const ptsWater: [number, number][] = [];
    const steps = 28;
    for (let i = 0; i < steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      const wobble = 1 + 0.08 * noise1(i * 0.9 + wx * 3, 749);
      ptsWater.push(p(wx + Math.cos(a) * rxM * wobble, wy + Math.sin(a) * ryM * wobble, 0));
    }
    const yMin = Math.min(...ptsWater.map((q) => q[1]));
    const yMax = Math.max(...ptsWater.map((q) => q[1]));
    const xMinP = Math.min(...ptsWater.map((q) => q[0]));
    const xMaxP = Math.max(...ptsWater.map((q) => q[0]));
    paintSoftDisk(b, (xMinP + xMaxP) * 0.5, (yMin + yMax) * 0.5, (xMaxP - xMinP) * 0.58, (yMax - yMin) * 0.68, shadeRgb(mudDark, 0.8), 0.52, 0);
    fill(b, ptsWater, skyReflect, 2.0, 0.96);
    const rows = Math.max(8, Math.round((yMax - yMin) / 6));
    for (let i = 0; i < rows; i++) {
      const u = (i + 0.5) / rows;
      const yy = yMin + (yMax - yMin) * u;
      const span = Math.sqrt(Math.max(0, 1 - Math.pow(2 * u - 1, 2))) * (xMaxP - xMinP) * 0.46;
      if (span < 12) continue;
      const cx = (xMinP + xMaxP) * 0.5;
      const col = u < 0.22 ? mixRgb(hedgeCol, skyReflect, 0.58 + u * 1.4) : mixRgb(skyReflect, rgb(warm.dropHighlight), (1 - Math.abs(u - 0.55) * 1.8) * 0.2);
      line(b, [[cx - span, yy], [cx + span, yy + b.r.range(-1, 1)]], Math.max(3, ((yMax - yMin) / rows) * 1.4), jitter(b, col, 0.02), {
        dry: 0.24,
        body: 0.72,
        alpha: 0.82,
        taper: [0.22, 0.22],
      });
    }
  };

  paintGroundPuddle(puddleW1.x, puddleW1.y, puddleW1.rx, puddleW1.ry, isS6 ? mixRgb(rgb(lowYard.puddleSky), rgb(lowYard.skyS6), 0.5) : rgb(lowYard.puddleSky));
  for (const pd of yardPuddlesWorld) {
    const q = project(cam, [pd.x, pd.y, 0]);
    if (q.depth > 1.2 && q.x > rect.x0 - 200 && q.x < rect.x1 + 200) {
      paintGroundPuddle(pd.x, pd.y, pd.rx * 0.85, pd.ry * 0.85, isS6 ? rgb(lowYard.mudGlint) : rgb(lowYard.puddleSky));
    }
  }

  for (let i = 0; i < 36; i++) {
    const wx = b.r.range(isS6 ? -3.5 : -5.5, isS6 ? 4.5 : 1.5);
    const wy = b.r.range(4.6, 10.6);
    if (toCamera(cam, [wx, wy, 0])[1] < 1.0) continue;
    const pt = p(wx, wy, 0);
    if (pt[1] < hedgeBaseY || pt[1] > rect.y1) continue;
    const d = project(cam, [wx, wy, 0]).depth;
    const sz = Math.max(3, 34 / Math.max(1, d));
    const col = b.r.next() < 0.5 ? shadeRgb(mudDark, 0.88) : mixRgb(mudWarm, rgb(lowYard.mudGlint), 0.25);
    fill(b, arc(pt[0], pt[1], sz, 0, Math.PI * 2, 7).slice(0, -1).map(([x, y]) => [x, pt[1] + (y - pt[1]) * 0.35] as [number, number]), jitter(b, col, 0.05), 1.4, 0.72);
  }
  mottle(b.c, 55 * b.k, 0.03, isS6 ? 76 : 77);
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

  const sunAz = (28.3 * Math.PI) / 180;
  const sunEl = (16.0 * Math.PI) / 180;
  const sunScreen = project(cam, [
    cam.position[0] + Math.sin(sunAz) * Math.cos(sunEl) * 1e4,
    cam.position[1] + Math.cos(sunAz) * Math.cos(sunEl) * 1e4,
    cam.position[2] + Math.sin(sunEl) * 1e4,
  ]);

  paintWash(
    b,
    rect.y0,
    horizonY + 35,
    (x, y) => {
      const t = Math.max(0, Math.min(1, (y - rect.y0) / Math.max(1, horizonY - rect.y0)));
      const dSun = Math.hypot((x - sunScreen.x) / 1.45, (y - sunScreen.y) / 1.0);
      const glow = Math.exp(-dSun / 860);
      const core = Math.exp(-dSun / 340);
      let c = mixRgb(skyCool, mistCol, Math.pow(t, 1.35) * 0.72);
      c = mixRgb(c, skyWarm, glow * 0.78);
      c = mixRgb(c, rgb(dusk.cloudGap[0]), core * 0.62);
      return c;
    },
    0.014,
    7511,
  );
  for (let i = 0; i < 10; i++) {
    const cx = b.r.range(rect.x0 + 180, rect.x1 - 180);
    const cy = b.r.range(rect.y0 + 30, horizonY - 50);
    const nearSun = Math.exp(-Math.hypot(cx - sunScreen.x, cy - sunScreen.y) / 760);
    const col = mixRgb(mistCol, skyWarm, 0.35 + 0.5 * nearSun);
    paintSoftDisk(b, cx, cy, b.r.range(180, 380), b.r.range(16, 36), jitter(b, col, 0.02), 0.24, 0);
  }

  const ridgePts: [number, number][] = [];
  for (let x = rect.x0; x <= rect.x1; x += 18) {
    const h = 38 + 46 * fbm2(x / 420, 0.4, 752, 3);
    ridgePts.push([x, horizonY - h * 0.65]);
  }
  fill(b, [...ridgePts, [rect.x1, horizonY + 30], [rect.x0, horizonY + 30]], mixRgb(mistCol, skyCool, 0.24), 2.5, 0.88);
  const treeLinePts: [number, number][] = [];
  for (let x = rect.x0; x <= rect.x1; x += 12) {
    const h = 10 + 20 * noise1(x / 70, 753);
    treeLinePts.push([x, horizonY - h * 0.42]);
  }
  fill(b, [...treeLinePts, [rect.x1, horizonY + 24], [rect.x0, horizonY + 24]], mixRgb(mistCol, rowShadow, 0.36), 1.5, 0.9);

  paintWash(
    b,
    horizonY,
    rect.y1,
    (x, y) => {
      const t = Math.max(0, Math.min(1, (y - horizonY) / Math.max(1, rect.y1 - horizonY)));
      const sunBand = Math.exp(-Math.abs(x - sunScreen.x - 180) / 980) * (1 - t * 0.42);
      const wave = fbm2(x / 360 + y / 420, y / 85, 7518, 3);
      const base = t < 0.2 ? mixRgb(mistCol, farGold, t / 0.2) : mixRgb(farGold, nearGold, Math.pow((t - 0.2) / 0.8, 0.85));
      const withWave = wave < 0.44 ? mixRgb(base, rowShadow, (0.44 - wave) * 0.85 * (0.3 + 0.7 * t)) : mixRgb(base, farGold, (wave - 0.44) * 0.65);
      return mixRgb(withWave, rgb(dusk.cloudGap[1]), sunBand * 0.28);
    },
    0.018,
    7512,
  );

  const paddyYSteps = [16, 22, 30, 37, 50, 68, 92, 130, 190, 290];
  const paddyXSteps = [-10, 14, 38, 64, 94, 130, 175, 235, 320, 440, 620, 880, 1250];
  for (let yi = paddyYSteps.length - 1; yi >= 1; yi--) {
    const yFar = paddyYSteps[yi];
    const yNear = paddyYSteps[yi - 1];
    const farFactor = Math.min(1, yNear / 180);
    for (let xi = 0; xi < paddyXSteps.length - 1; xi++) {
      const x0 = paddyXSteps[xi];
      const x1 = paddyXSteps[xi + 1];
      const corners: Vec3[] = [
        [x0, yFar, 0],
        [x1, yFar, 0],
        [x1, yNear, 0],
        [x0, yNear, 0],
      ];
      if (corners.some((pt) => toCamera(cam, pt)[1] < 3.0)) continue;
      const [a, c, d, e] = corners.map((pt) => proj(cam, pt));
      if (Math.max(a[0], c[0], d[0], e[0]) < rect.x0 - 80 || Math.min(a[0], c[0], d[0], e[0]) > rect.x1 + 80) continue;
      if (Math.min(a[1], c[1], d[1], e[1]) > rect.y1 + 60) continue;
      const plotTint = noise1(x0 * 0.17 + yNear * 0.23, 754);
      const col = plotTint < 0.5 ? mixRgb(nearGold, rowShadow, (0.5 - plotTint) * 0.22 * (1 - farFactor * 0.5)) : mixRgb(nearGold, farGold, 0.3 + farFactor * 0.55);
      fill(b, [a, c, d, e], jitter(b, col, 0.02), 1.2, 0.36);
    }
  }

  for (let i = 0; i < 44; i++) {
    const u = b.r.next();
    const y = horizonY + 24 + Math.pow(u, 1.5) * (rect.y1 - horizonY - 24);
    const cx = b.r.range(rect.x0, rect.x1);
    const isTrough = b.r.next() < 0.42;
    const base = mixRgb(farGold, nearGold, u);
    const col = isTrough ? mixRgb(base, rowShadow, 0.34 + u * 0.16) : mixRgb(base, rgb(dusk.cloudGap[1]), 0.34);
    paintSoftDisk(b, cx, y, b.r.range(160, 420) * (0.6 + u * 0.7), b.r.range(14, 36) * (0.4 + u * 0.8), jitter(b, col, 0.02), 0.32, 0);
  }
  for (let row = 0; row < 18; row++) {
    const u = 0.42 + (row / 17) * 0.58;
    const y = horizonY + 18 + Math.pow(u, 1.72) * (rect.y1 - horizonY - 12);
    const clusters = Math.floor(16 + u * 26);
    for (let s = 0; s < clusters; s++) {
      const sx = b.r.range(rect.x0, rect.x1);
      const h = (9 + u * 20) * b.r.range(0.75, 1.2);
      const bend = b.r.range(5, 12) * u;
      const col = b.r.next() < 0.28 ? mixRgb(nearGold, rowShadow, 0.52) : mixRgb(nearGold, rgb(dusk.cloudGap[1]), b.r.range(0.22, 0.52));
      line(b, [[sx, y + 2], [sx - bend, y - h]], Math.max(1.4, h * 0.12), jitter(b, col, 0.04), {
        dry: 0.32,
        taper: [0.1, 0.7],
        alpha: 0.65,
      });
    }
  }

  const drawConnectedBundY = (yWorld: number, emphasis = 1) => {
    const pts: [number, number][] = [];
    for (let x = -20; x <= 1400; x += x < 240 ? 4 : 24) {
      if (toCamera(cam, [x, yWorld, 0.15])[1] < 2.2) continue;
      const q = proj(cam, [x, yWorld, 0.15]);
      if (q[0] < rect.x0 - 300 || q[0] > rect.x1 + 300 || q[1] > rect.y1 + 240) continue;
      pts.push(q);
    }
    if (pts.length < 2) return;
    const scale = project(cam, [28, yWorld, 0]).scale;
    const w = Math.max(2.6, 0.42 * scale * emphasis);
    line(b, pts, w * 1.15, mixRgb(rowShadow, silCol, 0.2), { dry: 0.32, body: 0.72, alpha: 0.82 });
    line(b, pts.map(([x, y]) => [x, y - w * 0.22] as [number, number]), w * 0.46, mixRgb(nearGold, rowShadow, 0.42), {
      dry: 0.36,
      alpha: 0.76,
    });
  };
  for (const yBund of [paddyWorld.farmerRidgeY, paddyWorld.powerLineY, 50, 68, 92, 130]) {
    drawConnectedBundY(yBund, yBund === paddyWorld.farmerRidgeY ? 1.15 : 0.78);
  }
  for (const xBund of [14, 38, 64, 94, 130, 175, 235, 320]) {
    const pts: [number, number][] = [];
    for (let y = 16; y <= 290; y += 6) {
      if (toCamera(cam, [xBund, y, 0.12])[1] < 3.5) continue;
      const q = proj(cam, [xBund, y, 0.12]);
      if (q[0] < rect.x0 - 200 || q[0] > rect.x1 + 200 || q[1] > rect.y1 + 180) continue;
      pts.push(q);
    }
    if (pts.length >= 2) {
      line(b, pts, 3.2, mixRgb(rowShadow, nearGold, 0.3), { dry: 0.38, alpha: 0.58 });
    }
  }

  for (const poleX of [paddyWorld.powerLineXStart, paddyWorld.powerLineXStart + paddyWorld.poleSpacing]) {
    const bot = p(poleX, paddyWorld.powerLineY, 0);
    const top = p(poleX, paddyWorld.powerLineY, paddyWorld.wireHeight + 0.45);
    const crossL = p(poleX - 0.55, paddyWorld.powerLineY, paddyWorld.wireHeight);
    const crossR = p(poleX + 0.55, paddyWorld.powerLineY, paddyWorld.wireHeight);
    const w = Math.max(3.5, project(cam, [poleX, paddyWorld.powerLineY, 2.5]).scale * 0.2);
    line(b, [bot, [bot[0] + w * 4.5, bot[1] + w * 1.4]], Math.max(2, w * 0.65), rowShadow, { dry: 0.42, alpha: 0.48 });
    line(b, [bot, top], w, silCol, { dry: 0.2, body: 0.84, wobble: 0.04, taper: [0.04, 0.08] });
    line(b, [crossL, crossR], Math.max(2.4, w * 0.62), silCol, { dry: 0.22, body: 0.82, wobble: 0.04 });
    line(b, [[bot[0] - w * 0.3, bot[1]], [top[0] - w * 0.3, top[1]]], Math.max(1.2, w * 0.24), rgb(warm.lowRim), {
      dry: 0.32,
      alpha: 0.72,
    });
  }

  for (let i = 0; i < 14; i++) {
    const cx = b.r.range(rect.x0 + 100, rect.x1 - 100);
    const cy = horizonY + b.r.range(-6, 14);
    paintSoftDisk(b, cx, cy, b.r.range(180, 360), b.r.range(12, 24), mixRgb(mistCol, skyWarm, 0.36), 0.34, 0);
  }
  mottle(b.c, 85 * b.k, 0.02, 78);
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

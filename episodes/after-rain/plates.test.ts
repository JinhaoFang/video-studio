/**
 * 《雨后》底图烘焙与生成清单测试（工单 #182 测试接缝）：
 * 1. 验证 episodes/after-rain/data/generated.json 与 episodes/pure-code-sample/data/generated.json 的输入/产物 SHA-256 哈希完整一致；
 * 2. 验证新机位相机投影与 layout.md / art.md 的平面布局一致（含第 4 镜水洼 W1、第 10 镜玄关门洞、第 12 镜屋脊高度）；
 * 3. 验证水粉底图绘制函数的固定种子确定性与色域对齐；
 * 4. 验证生成器 CLI 的 --help（退出码 0）和非法参数报错（退出码 2、以“出错：”开头）。
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "node:test";
import { project } from "../../src/kit/engine/camera.ts";
import { toBytes } from "../../src/kit/engine/paint.ts";
import { paintPlate } from "./plates.ts";
import { paintViewPlate } from "./plates-views.ts";
import { house, perchPoint, plates, puddleW1, shotCameras, viewPlates } from "./scene.ts";

const root = resolve(import.meta.dirname, "../..");

const sha256 = (path: string) =>
  createHash("sha256").update(readFileSync(path)).digest("hex");

type Manifest = {
  status: string;
  cacheKey: string;
  plateKey: string;
  inputs: { path: string; sha256: string }[];
  files: { path: string; sha256: string }[];
};

const verifyManifest = (manifestRel: string, expectedFiles: string[]) => {
  const manifestPath = resolve(root, manifestRel);
  assert.ok(existsSync(manifestPath), `缺少生成清单：${manifestRel}`);
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as Manifest;
  assert.equal(manifest.status, "complete");
  assert.match(manifest.cacheKey, /^[a-f0-9]{64}$/);
  assert.match(manifest.plateKey, /^[a-f0-9]{64}$/);
  for (const input of manifest.inputs) {
    const abs = resolve(root, input.path);
    assert.ok(existsSync(abs), `清单输入文件不存在：${input.path}`);
    assert.equal(sha256(abs), input.sha256, `清单输入哈希不匹配：${input.path}`);
  }
  const listed = new Set(manifest.files.map((f) => f.path));
  for (const expected of expectedFiles) {
    assert.ok(listed.has(expected), `清单未登记底图：${expected}`);
  }
  for (const file of manifest.files) {
    assert.match(file.sha256, /^[a-f0-9]{64}$/);
    const abs = resolve(root, "public", file.path);
    if (existsSync(abs)) {
      assert.equal(sha256(abs), file.sha256, `本地已烘焙产物哈希与清单不一致：${file.path}`);
    }
  }
};

test("正片与小样生成清单完整登记全部底图且输入与本地产物哈希一致", () => {
  const afterRainExpected = [
    ...plates.flatMap((p) =>
      (["rain", "dusk"] as const).map((s) => `episodes/after-rain/plate-${p.id}-${s}.png`),
    ),
    ...viewPlates.map((p) => `episodes/after-rain/plate-${p.id}.png`),
  ];
  assert.equal(afterRainExpected.length, 25);
  verifyManifest("episodes/after-rain/data/generated.json", afterRainExpected);

  const sampleExpected = plates.flatMap((p) =>
    (["rain", "dusk"] as const).map((s) => `episodes/pure-code-sample/plate-${p.id}-${s}.png`),
  );
  verifyManifest("episodes/pure-code-sample/data/generated.json", sampleExpected);
});

test("新机位场景几何与 layout.md 及 art.md 画面位置一致", () => {
  const s1HouseLeft = project(shotCameras.s1Start, [house.xMax, house.wallY, 0]);
  const s1Genkan = project(shotCameras.s1Start, [house.genkan.x, house.wallY, 0.9]);
  const s1Perch = project(shotCameras.s1Start, perchPoint);
  assert.ok(s1HouseLeft.x / 1920 > 0.22 && s1HouseLeft.x / 1920 < 0.3);
  assert.ok(s1Genkan.x / 1920 > 0.85 && s1Genkan.x / 1920 < 0.93);
  assert.ok(Math.abs(s1Perch.x / 1920 - 0.6) < 0.02);

  const s4W1 = project(shotCameras.s4, [puddleW1.x, puddleW1.y, 0]);
  assert.ok(Math.abs(s4W1.x / 1920 - 0.58) < 0.015);
  assert.ok(Math.abs(s4W1.y / 1080 - 0.71) < 0.015);

  const s10DoorLeft = project(shotCameras.s10, [house.genkan.x + house.genkan.width * 0.5 + 0.55, house.wallY, 1.2]);
  const s10DoorRight = project(shotCameras.s10, [house.genkan.x - house.genkan.width * 0.5 - 0.65, house.wallY, 1.2]);
  const s10Perch = project(shotCameras.s10, perchPoint);
  assert.ok(s10Perch.x > s10DoorLeft.x && s10Perch.x < s10DoorRight.x);

  const s12Ridge = project(shotCameras.s12End, [0, house.ridgeY, house.ridgeZ]);
  assert.ok(Math.abs(s12Ridge.y / 1080 - 0.58) < 0.02);
});

test("水粉底图绘制按固定种子像素确定且色域贴合色彩剧本", () => {
  const s2Spec = { ...viewPlates.find((p) => p.id === "closeup-s2")!, k: 0.08 };
  const a = toBytes(paintViewPlate(s2Spec));
  const b = toBytes(paintViewPlate(s2Spec));
  assert.deepEqual(a, b);

  const eavesSpec = { ...plates.find((p) => p.id === "eaves")!, k: 0.08 };
  assert.deepEqual(toBytes(paintPlate(eavesSpec, "dusk")), toBytes(paintPlate(eavesSpec, "dusk")));

  const w = Math.round((s2Spec.rect.x1 - s2Spec.rect.x0) * s2Spec.k);
  const h = Math.round((s2Spec.rect.y1 - s2Spec.rect.y0) * s2Spec.k);
  const midIdx = (Math.floor(h * 0.35) * w + Math.floor(w * 0.5)) * 4;
  assert.ok(Math.abs(a[midIdx] - 0x6a) < 22);
  assert.ok(Math.abs(a[midIdx + 1] - 0x75) < 22);
  assert.ok(Math.abs(a[midIdx + 2] - 0x91) < 22);
});

test("正片底图生成器 CLI 遵守 --help 与报错退出码约定", () => {
  const help = spawnSync(process.execPath, ["episodes/after-rain/generate.ts", "--help"], {
    cwd: root,
    encoding: "utf8",
  });
  assert.equal(help.status, 0);
  assert.match(help.stdout, /用法：/);

  const bad = spawnSync(process.execPath, ["episodes/after-rain/generate.ts", "--unknown"], {
    cwd: root,
    encoding: "utf8",
  });
  assert.equal(bad.status, 2);
  assert.match(bad.stderr, /^出错：/);
  assert.doesNotMatch(bad.stderr, /Unknown option/i);
  assert.match(bad.stderr, /不认识的参数 --unknown/);
  assert.match(bad.stderr, /用法：/);
});

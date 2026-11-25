/**
 * Check guardrail CLI behavior with code fixtures in temporary Git repositories.
 * Assert exit codes, diagnostics and allowed syntax rather than AST internals.
 * Run with `node --test tools/check-guardrails.test.ts` or `pnpm verify`.
 */
import assert from "node:assert/strict";
import {
  commandOutput as execFileSync,
  runCommand as spawnSync,
  gitRepository,
} from "./test-support.ts";
import { createHash } from "node:crypto";
import { rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { test } from "node:test";
import type { TestContext } from "node:test";

const script = resolve(import.meta.dirname, "check-guardrails.ts");

const fixture = (
  context: TestContext,
  files: Record<string, string>,
): string => {
  return gitRepository(context, files).root;
};

const run = (root: string, mode: string) =>
  spawnSync(process.execPath, [script, mode, root], { encoding: "utf8" });

test("comments allow separate header blocks, shebangs, no headers and tool directives", (context) => {
  const root = fixture(context, {
    "header.ts":
      "#!/usr/bin/env node\n// Header one\n\n/* Header two */\n/** Header three */\nexport {};\n",
    "empty.js": "// Only a header\n/* More header */\n",
    "bare.mjs": "export {};\n",
    "directives.ts": [
      "export {};",
      "/* eslint-disable no-unused-vars */",
      "/* eslint-enable no-unused-vars */",
      "// eslint-disable-next-line no-unused-vars",
      "const value = 1; // eslint-disable-line no-unused-vars",
      "const inline = 1; /* eslint-disable-line no-unused-vars */",
      "/* eslint-disable-next-line no-unused-vars */",
      "const other = 2;",
      "// @ts-expect-error Reason",
      "const result: string = 3;",
      "/* @ts-expect-error Reason */",
      "const last: string = 4;",
      "// @ts-expect-error: Reason",
      "const colon: string = 5;",
      "/// @ts-expect-error: Reason",
      "const triple: string = 6;",
      "/* @ts-expect-error: Reason */",
      "const block: string = 7;",
      "/** @ts-expect-error: Reason */",
      "const jsdoc: string = 8;",
      "/*\n * @ts-expect-error: Reason */",
      "const multiline: string = 9;",
    ].join("\n"),
    "view.tsx":
      "const view = <div>{/* eslint-disable-next-line rule */}</div>;\n",
  });
  const result = run(root, "comments");
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, "");
});

test("comment-like text in strings, regexps, JSX and template literals is allowed", (context) => {
  const root = fixture(context, {
    "literals.tsx": [
      'const url = "https://example.test/* text */";',
      "const pattern = /https?:\\/\\/[^/]+/;",
      'const template = `/* plain text */ ${"// text"} // tail`; ',
      'const view = <div> // plain JSX text /* plain text */ <span title="/* text */" /></div>;',
    ].join("\n"),
  });
  const result = run(root, "comments");
  assert.equal(result.status, 0, result.stderr);
});

for (const [name, path, code, line] of [
  ["standalone line comment", "sample.ts", "export {};\n// explanation\n", 2],
  ["trailing comment", "sample.js", "const value = 1; // explanation\n", 1],
  ["block comment", "sample.mjs", "export {};\n/* explanation */\n", 2],
  [
    "multiline block",
    "sample.cjs",
    "module.exports = {};\n/* explanation\n continued */\n",
    2,
  ],
  [
    "JSX comment",
    "sample.tsx",
    "const view = <div>\n{/* explanation */}\n</div>;",
    2,
  ],
  [
    "JSX child comment",
    "sample.tsx",
    "const view = <div>{\n// explanation\n1}</div>;",
    2,
  ],
  [
    "template expression comment",
    "sample.ts",
    "const text = `${\n/* explanation */ 1}`;",
    2,
  ],
  [
    "misplaced JSDoc",
    "sample.ts",
    "export {};\n/** explanation */\nconst value = 1;",
    2,
  ],
  ["unsupported directive", "sample.ts", "export {};\n// @ts-ignore\n", 2],
  [
    "line eslint-disable is not an ESLint directive",
    "sample.ts",
    "export {};\n// eslint-disable explanation\n",
    2,
  ],
  [
    "invalid ESLint directive suffix",
    "sample.ts",
    "export {};\n// eslint-disable-next-lines rule\n",
    2,
  ],
  [
    "TypeScript directive before the last block line",
    "sample.ts",
    "export {};\n/* @ts-expect-error: Reason\n */\nconst value: string = 1;",
    2,
  ],
  [
    "multiline eslint-disable-line is not applied by ESLint",
    "sample.ts",
    "export {};\n/* eslint-disable-line rule\n */\n",
    2,
  ],
  [
    "eslint-enable directive",
    "sample.ts",
    "export {};\n// eslint-enable rule\n",
    2,
  ],
  [
    "directive mentioned in prose",
    "sample.ts",
    "export {};\n// explanation about @ts-expect-error\n",
    2,
  ],
] as const) {
  test(`comments reject ${name} with file and line`, (context) => {
    const result = run(fixture(context, { [path]: code }), "comments");
    assert.equal(result.status, 1);
    assert.match(
      result.stderr,
      new RegExp(
        `^出错：${path.replaceAll(".", "\\.")}:${line} comment-position .+\\n$`,
      ),
    );
  });
}

const episode = { "episodes/demo/index.ts": "export const value = 1;" };

for (const [name, code] of [
  ["relative import", 'import { value } from "../episodes/demo/index.ts";'],
  ["relative export", 'export { value } from "../episodes/demo/index.ts";'],
  ["export all", 'export * from "../episodes/demo/index.ts";'],
  ["dynamic import", 'const loaded = import("../episodes/demo/index.ts");'],
  [
    "dynamic template import",
    "const loaded = import(`../episodes/demo/index.ts`);",
  ],
  [
    "dynamic template import with fixed prefix",
    "const loaded = import(`../episodes/${ep}/index.ts`);",
  ],
  [
    "normalized dynamic template prefix",
    "const loaded = import(`../src/../episodes/${ep}/index.ts`);",
  ],
  [
    "triple-slash path reference",
    '/// <reference path="../episodes/demo/index.ts" />\nexport {};',
  ],
  ["require", 'const loaded = require("../episodes/demo/index.ts");'],
  ["import equals", 'import loaded = require("../episodes/demo/index.ts");'],
  ["import type", 'type Loaded = typeof import("../episodes/demo/index.ts");'],
  ["root specifier", 'import "episodes/demo/index.ts";'],
  ["path normalization", 'import "../src/../episodes/demo/index.ts";'],
  ["missing episode file", 'import "../episodes/missing.ts";'],
] as const) {
  test(`dependencies reject ${name} from both method-layer directories`, (context) => {
    const result = run(
      fixture(context, {
        ...episode,
        "src/sample.ts": code,
        "tools/sample.ts": code,
      }),
      "dependencies",
    );
    assert.equal(result.status, 1);
    assert.match(
      result.stderr,
      /^出错：src\/sample\.ts:1 dependency-direction .+$/m,
    );
    assert.match(
      result.stderr,
      /^出错：tools\/sample\.ts:1 dependency-direction .+$/m,
    );
    assert.equal(result.stderr.trim().split("\n").length, 2);
  });
}

test("dependencies resolve absolute paths, baseUrl and tsconfig paths aliases", (context) => {
  const root = fixture(context, {
    ...episode,
    "tsconfig.json": JSON.stringify({
      compilerOptions: {
        baseUrl: ".",
        paths: { "@episode/*": ["episodes/*"] },
      },
    }),
    "src/alias.ts": 'import "@episode/demo/index";',
    "tools/base-url.ts": 'export * from "episodes/demo/index";',
  });
  writeFileSync(
    join(root, "tools/absolute.ts"),
    `import ${JSON.stringify(join(root, "episodes/demo/index.ts"))};`,
  );
  const result = run(root, "dependencies");
  assert.equal(result.status, 1);
  assert.match(
    result.stderr,
    /^出错：src\/alias\.ts:1 dependency-direction .+$/m,
  );
  assert.match(
    result.stderr,
    /^出错：tools\/base-url\.ts:1 dependency-direction .+$/m,
  );
  assert.match(
    result.stderr,
    /^出错：tools\/absolute\.ts:1 dependency-direction .+$/m,
  );
});

test("dependencies resolve the nearest tsconfig including inherited aliases", (context) => {
  const root = fixture(context, {
    ...episode,
    "tsconfig.json": JSON.stringify({
      compilerOptions: { paths: { "@episode/*": ["./episodes/*"] } },
    }),
    "tools/tsconfig.json": JSON.stringify({ extends: "../tsconfig.json" }),
    "tools/sample.ts": 'import "@episode/demo/index.ts";',
  });
  const result = run(root, "dependencies");
  assert.equal(result.status, 1);
  assert.match(
    result.stderr,
    /^出错：tools\/sample\.ts:1 dependency-direction .+$/m,
  );
});

test("src forbids literal episode asset paths, including template segments", (context) => {
  const root = fixture(context, {
    "src/sample.tsx": [
      "export {};",
      'const asset = "episodes/demo/image.png";',
      'const publicAsset = "/root/public/episodes/demo/image.png";',
      "const template = `episodes/${name}/image.png`;",
      "const tail = `${name}/public/episodes/image.png`;",
      'const view = <img src="episodes/demo/image.png" />;',
      'const relative = "../episodes/demo/image.png";',
      'const nested = "other/episodes/demo/image.png";',
      'const url = new URL("../episodes/demo/image.png", import.meta.url);',
      'const resolved = require.resolve("../episodes/demo/index.ts");',
      'const metaResolved = import.meta.resolve("../episodes/demo/index.ts");',
    ].join("\n"),
  });
  const result = run(root, "dependencies");
  assert.equal(result.status, 1);
  assert.equal(result.stderr.trim().split("\n").length, 10);
  for (const line of [2, 3, 4, 5, 6, 7, 8, 9, 10, 11]) {
    assert.match(
      result.stderr,
      new RegExp(`^出错：src/sample\\.tsx:${line} episode-path .+$`, "m"),
    );
  }
});

test("dependencies allow method modules, tool path strings and product-layer imports", (context) => {
  const root = fixture(context, {
    "src/kit/value.ts": "export const value = 1;",
    "src/sample.ts": [
      'import { value } from "./kit/value.ts";',
      'export * from "./kit/value.ts";',
      'const loaded = import("./kit/value.ts");',
      'const required = require("./kit/value.ts");',
      'const ordinary = "my-episodes/demo/file.png";',
      'const nested = "other/my-episodes/demo/file.png";',
      "const loadedAtRuntime = import(moduleName);",
      "const template = import(`../${directory}/index.ts`);",
    ].join("\n"),
    "tools/sample.ts": [
      'import { value } from "../src/kit/value.ts";',
      'const path = "episodes/demo/image.png";',
      'const publicPath = "/public/episodes/demo/image.png";',
      "const template = `episodes/${name}/image.png`;",
      'const resolved = require.resolve("../episodes/demo/index.ts");',
      'const metaResolved = import.meta.resolve("../episodes/demo/index.ts");',
      'const mixedCase = import("../Episodes/demo/index.ts");',
    ].join("\n"),
    "episodes/demo/index.ts":
      'import "../../src/kit/value.ts"; import "../other/index.ts";',
    "root.ts": 'import "./episodes/demo/index.ts";',
  });
  const result = run(root, "dependencies");
  assert.equal(result.status, 0, result.stderr);
});

test("dependencies deduplicate modules while retaining separate asset diagnostics on the same line", (context) => {
  const root = fixture(context, {
    ...episode,
    "src/sample.ts": [
      'import "episodes/demo/index.ts"; const asset = "episodes/demo/image.png";',
      "const loaded = import(`../episodes/${ep}/index.ts`);",
    ].join("\n"),
  });
  const result = run(root, "dependencies");
  assert.equal(result.status, 1);
  const lines = result.stderr.trim().split("\n");
  assert.equal(lines.length, 3);
  assert.match(lines[0], /^出错：src\/sample\.ts:1 dependency-direction .+$/);
  assert.match(lines[1], /^出错：src\/sample\.ts:1 episode-path .+$/);
  assert.match(lines[2], /^出错：src\/sample\.ts:2 dependency-direction .+$/);
});

test("guardrails check tracked ignored paths and skip ignored untracked files", (context) => {
  const root = fixture(context, {
    ".gitignore": "build\nout\n",
    "src/kit/build/tracked.ts":
      'export {};\n// explanation\nimport "../../../episodes/demo/index.ts";',
    "out/ignored.ts": "export {}; // explanation",
    "src/kit/build/ignored.ts": "export {}; // explanation",
    ...episode,
  });
  execFileSync("git", ["add", "--force", "--", "src/kit/build/tracked.ts"], {
    cwd: root,
  });
  const comments = run(root, "comments");
  assert.equal(comments.status, 1);
  assert.match(
    comments.stderr,
    /^出错：src\/kit\/build\/tracked\.ts:2 comment-position .+\n$/,
  );
  const dependencies = run(root, "dependencies");
  assert.equal(dependencies.status, 1);
  assert.match(
    dependencies.stderr,
    /^出错：src\/kit\/build\/tracked\.ts:3 dependency-direction .+\n$/,
  );
});

const pureFixture = (
  context: TestContext,
  source: string,
  extra: Record<string, string> = {},
) => {
  const entry = "episodes/pure-code-sample/PureCodeSample.tsx";
  const generator = "episodes/pure-code-sample/generate.ts";
  const path = "episodes/pure-code-sample/background.png";
  const hash = (text: string) =>
    createHash("sha256").update(text).digest("hex");
  return fixture(context, {
    [entry]: source,
    [generator]: "export {};",
    "episodes/pure-code-sample/data/generated.json": JSON.stringify({
      entry,
      generator,
      inputs: [{ path: generator, sha256: hash("export {};") }],
      files: [{ path, sha256: hash("生成的像素") }],
    }),
    [`public/${path}`]: "生成的像素",
    ...extra,
  });
};

const pureImage =
  'import { staticFile } from "remotion"; const image = new Image(); image.src = staticFile("episodes/pure-code-sample/background.png");';

test("pure-code 接受生成物、别名和无媒体的递归本地绘制模块", (context) => {
  const root = pureFixture(
    context,
    pureImage +
      '\nimport "./draw"; import { staticFile as asset } from "remotion"; asset("episodes/pure-code-sample/background.png");',
    {
      "episodes/pure-code-sample/draw.ts":
        'import "../../shared"; export const draw = () => 1;',
      "shared.ts": "export {};",
    },
  );
  const result = run(root, "pure-code");
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /纯代码护栏通过/);
});

for (const [name, source] of [
  [
    "未登记素材",
    'import { staticFile } from "remotion"; staticFile("episodes/pure-code-sample/photo.jpg");',
  ],
  ["动态素材路径", 'import { staticFile } from "remotion"; staticFile(path);'],
  ["外部媒体", 'const image = <img src="https://example.test/photo.png" />;'],
  ["无扩展名的媒体地址", "const image = new Image(); image.src = address;"],
  ["动态 JSX 媒体", "const image = <img src={address} />;"],
  [
    "未登记的展开属性",
    'const src = "unregistered"; const image = <img {...{ src }} />;',
  ],
  ["嵌套展开属性", "const image = <img {...{ ...{ src: address } }} />;"],
  ["不明展开对象", "const image = <img {...props} />;"],
  [
    "可变展开对象",
    "const props = { src: address }; const image = <img {...props} />;",
  ],
  ["展开计算属性", "const image = <img {...{ [key]: address }} />;"],
  [
    "展开媒体访问器",
    "const image = <img {...{ get src() { return address; } }} />;",
  ],
  ["展开 poster", "const video = <video {...{ poster: address }} />;"],
  ["展开 href", "const image = <image {...{ href: address }} />;"],
  [
    "展开 Audio",
    'import { Audio } from "@remotion/media"; const audio = <Audio {...{ src: address }} />;',
  ],
  [
    "二次别名",
    'import { staticFile } from "remotion"; const asset = staticFile; asset("unregistered");',
  ],
  [
    "多次别名",
    'import { staticFile as original } from "remotion"; const asset = original; const load = asset; load(path);',
  ],
  [
    "可变函数别名",
    'import { staticFile } from "remotion"; let asset = staticFile; asset(path);',
  ],
  [
    "静态函数逃逸",
    'import { staticFile } from "remotion"; const holder = { load: staticFile }; holder.load(path);',
  ],
  [
    "导出的函数别名",
    'import { staticFile } from "remotion"; export const asset = staticFile;',
  ],
  [
    "转导出的函数别名",
    'import { staticFile } from "remotion"; const asset = staticFile; export { asset };',
  ],
  ["直接转导出 staticFile", 'export { staticFile as asset } from "remotion";'],
  ["通配转导出 remotion", 'export * from "remotion";'],
  [
    "命名空间解构别名",
    'import * as Remotion from "remotion"; const { staticFile: asset } = Remotion; asset(path);',
  ],
  [
    "命名空间二次别名",
    'import * as Remotion from "remotion"; const api = Remotion; api.staticFile(path);',
  ],
  [
    "命名空间动态属性",
    'import * as Remotion from "remotion"; Remotion[method](path);',
  ],
  [
    "拼接路径",
    'import { staticFile } from "remotion"; const asset = staticFile; asset("episodes/" + folder + "/photo." + extension);',
  ],
  [
    "模板路径",
    'import { staticFile } from "remotion"; const asset = staticFile; asset(`episodes/${folder}/photo.${extension}`);',
  ],
  [
    "拼接已登记路径",
    'import { staticFile } from "remotion"; staticFile("episodes/pure-code-sample/" + "background.png");',
  ],
  [
    "静态函数参数展开",
    'import { staticFile } from "remotion"; staticFile(...paths);',
  ],
  ["无扩展名的直接地址", 'const image = <img src="unregistered" />;'],
  ["拼接协议的直接地址", 'const image = <img src={"ht" + "tps:" + host} />;'],
  ["模板直接地址", "const image = <img src={`${protocol}:${address}`} />;"],
  [
    "赋值拼接地址",
    'const image = new Image(); image.src = "unregistered" + name;',
  ],
  [
    "索引赋值模板地址",
    'const image = new Image(); image["src"] = `${address}`;',
  ],
  [
    "已登记但未使用 staticFile 的地址",
    'const image = <img src="episodes/pure-code-sample/background.png" />;',
  ],
  [
    "伪造 staticFile",
    'const fake = { staticFile: (path) => path }; const image = <img src={fake.staticFile("episodes/pure-code-sample/background.png")} />;',
  ],
  [
    "同名变量遮蔽",
    'import { staticFile } from "remotion"; function draw(staticFile) { return <img src={staticFile("episodes/pure-code-sample/background.png")} />; }',
  ],
  [
    "循环别名",
    "const first = second; const second = first; const image = <img src={first} />;",
  ],
  [
    "字体包",
    'import { loadFont } from "@remotion/google-fonts/NotoSansSC"; loadFont();',
  ],
  [
    "字体构造器",
    'const font = new FontFace("x", "data:font/woff;base64,abc");',
  ],
  ["系统字体绘制", 'context.fillText("字", 0, 0);'],
  ["CSS 字体", 'const style = { fontFamily: "sans-serif" };'],
  ["DOM 文字", "const text = <div>文字</div>;"],
  ["动态 DOM 文字", "const text = <div>{caption}</div>;"],
  ["动态模块", "const module = import(path);"],
  [
    "动态导入的 Remotion 命名空间",
    'void import("remotion").then((api) => new Audio(api.staticFile("unregistered")));',
  ],
  [
    "动态命名空间独立 staticFile 调用",
    'void import("remotion").then((api) => api.staticFile("unregistered"));',
  ],
  [
    "动态命名空间索引 staticFile 调用",
    'void import("remotion").then((api) => api["staticFile"]("unregistered"));',
  ],
  [
    "动态命名空间图片地址",
    'void import("remotion").then((api) => { const image = new Image(); image.src = api.staticFile("unregistered"); });',
  ],
  ["动态音频构造参数", "const audio = new Audio(address);"],
  ["全局音频构造参数", "const audio = new window.Audio(address);"],
  ["索引音频构造参数", 'const audio = new window["Audio"](address);'],
  ["括号音频构造参数", "const audio = new (Audio)(address);"],
  ["展开音频构造参数", "const audio = new Audio(...paths);"],
  [
    "展开 srcSet",
    'const image = <img {...{ srcSet: "/unregistered.png 1x" }} />;',
  ],
  [
    "具名 srcSet 密度描述符",
    'const image = <img srcSet="/unregistered.png 1x" />;',
  ],
  [
    "展开 srcSet 宽度描述符",
    'const image = <img {...{ srcSet: "/unregistered.png 480w" }} />;',
  ],
  [
    "嵌套展开 srcSet 缩写属性",
    'const srcSet = "/unregistered 1x, /other 2x"; const image = <img {...{ ...{ srcSet } }} />;',
  ],
  [
    "展开 srcSet 访问器",
    'const image = <img {...{ get srcSet() { return "/unregistered 1x"; } }} />;',
  ],
  [
    "srcSet 混合已登记和未登记地址",
    'import { staticFile } from "remotion"; const image = <img srcSet={`${staticFile("episodes/pure-code-sample/background.png")} 1x, /unregistered 2x`} />;',
  ],
  [
    "srcSet 赋值",
    'const image = new Image(); image.srcSet = "/unregistered 480w";',
  ],
  [
    "srcSet 索引赋值",
    'const image = new Image(); image["srcSet"] = "/unregistered 1x";',
  ],
  ["直接导入媒体", 'import "./photo.png";'],
  ["网络加载别名", "const load = fetch; load(address);"],
] as const) {
  test(`pure-code 拒绝${name}`, (context) => {
    const result = run(pureFixture(context, source), "pure-code");
    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.match(
      result.stderr,
      /^出错：episodes\/pure-code-sample\/PureCodeSample\.tsx:\d+ pure-code /m,
    );
  });
}

test("pure-code 拒绝间接依赖加载字体", (context) => {
  const root = pureFixture(context, 'import "./draw";', {
    "episodes/pure-code-sample/draw.ts": 'import "../../shared";',
    "shared.ts": 'import "@remotion/google-fonts/Inter";',
  });
  const result = run(root, "pure-code");
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stderr, /shared.ts:1 pure-code/);
});

test("pure-code 拒绝被替换的媒体和过期的生成输入", (context) => {
  const root = pureFixture(context, pureImage, {
    "episodes/pure-code-sample/generate.ts": "export const changed = true;",
    "public/episodes/pure-code-sample/background.png": "外部照片",
  });
  const result = run(root, "pure-code");
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stderr, /生成输入已变化/);
  assert.match(result.stderr, /媒体与代码生成记录不一致/);
});

test("pure-code 在无本地媒体的干净 checkout 可检查声明，缺失清单则失败", (context) => {
  const root = fixture(context, {
    "episodes/pure-code-sample/PureCodeSample.tsx": pureImage,
  });
  assert.equal(run(root, "pure-code").status, 1);
  const complete = pureFixture(context, pureImage);
  rmSync(join(complete, "public/episodes/pure-code-sample/background.png"));
  const result = run(complete, "pure-code");
  assert.equal(result.status, 0, result.stderr);
});

test("pure-code 接受可追踪的媒体别名、内联展开和 Canvas 绘制", (context) => {
  const result = run(
    pureFixture(
      context,
      [
        'import { staticFile as original } from "remotion";',
        'import * as Remotion from "remotion";',
        "const asset = original; const second = asset;",
        'const src = second("episodes/pure-code-sample/background.png");',
        "const copy = src;",
        "const image = new Image(); image.src = (copy as string);",
        "const view = <img {...{ ...{ src: copy }, width: 1920 }} />;",
        'const video = <video poster={Remotion.staticFile("episodes/pure-code-sample/background.png")} />;',
        'const canvas = document.createElement("canvas");',
        'const context = canvas.getContext("2d");',
        "context.fillRect(0, 0, 1920, 1080); context.drawImage(image, 0, 0);",
        "const geometry = { ...{ x: 0, y: 0 }, width: 1920 };",
        "const surface = <canvas {...{ width: 1920, height: 1080 }} />;",
      ].join("\n"),
    ),
    "pure-code",
  );
  assert.equal(result.status, 0, result.stdout + result.stderr);
});

test("pure-code 接受已登记媒体构造、单地址 srcSet 和 WebGL 纹理绘制", (context) => {
  const result = run(
    pureFixture(
      context,
      [
        'import { staticFile } from "remotion";',
        'const src = staticFile("episodes/pure-code-sample/background.png");',
        "const image = new Image(1920, 1080); image.src = src;",
        "const audio = new Audio(src); const emptyAudio = new Audio();",
        "const globalAudio = new window.Audio(src);",
        "const indexedAudio = new window[\"Audio\"](src);",
        "const wrappedAudio = new (Audio)(src);",
        "const view = <img srcSet={src} />;",
        "const spread = <img {...{ ...{ srcSet: src }, width: 1920 }} />;",
        "image.srcSet = src; image[\"srcSet\"] = src;",
        'const canvas = document.createElement("canvas");',
        'const gl = canvas.getContext("webgl", { alpha: false, antialias: false, preserveDrawingBuffer: true });',
        "const texture = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, texture);",
        "gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);",
        "gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); gl.finish();",
      ].join("\n"),
    ),
    "pure-code",
  );
  assert.equal(result.status, 0, result.stdout + result.stderr);
});

const lazyRegistration = [
  'import { Composition } from "remotion";',
  'const load = () => import("./other").then(({ Other }) => ({ default: Other }));',
  'const Root = () => <Composition id="Other" lazyComponent={load} />;',
].join("\n");

for (const [name, registration, expected] of [
  ["静态加载其他期字体", 'import "./other";', 1],
  ["立即动态加载其他期字体", 'const value = import("./other");', 1],
  ["未登记的延迟加载", 'const load = () => import("./other");', 1],
  ["立即执行的函数", 'void (() => import("./other"))();', 1],
  ["先声明再立即调用", 'const load = () => import("./other"); void load();', 1],
  [
    "先声明函数再立即调用",
    'function load() { return import("./other"); } void load();',
    1,
  ],
  ["登记后立即调用", lazyRegistration + "\nvoid load();", 1],
  [
    "登记元素存入变量后调用 props 加载器",
    lazyRegistration.replace("const Root = () =>", "const view =") +
      "\nvoid view.props.lazyComponent();",
    1,
  ],
  [
    "登记元素存入变量",
    lazyRegistration.replace("const Root = () =>", "const view ="),
    1,
  ],
  [
    "登记元素取出 props",
    lazyRegistration.replace(
      'const Root = () => <Composition id="Other" lazyComponent={load} />;',
      'const Root = () => (<Composition id="Other" lazyComponent={load} />).props.lazyComponent();',
    ),
    1,
  ],
  [
    "登记元素通过祖先 JSX 存入变量",
    lazyRegistration.replace(
      'const Root = () => <Composition id="Other" lazyComponent={load} />;',
      'const view = <><Composition id="Other" lazyComponent={load} /></>;',
    ),
    1,
  ],
  [
    "登记元素作为参数传递",
    lazyRegistration.replace(
      'const Root = () => <Composition id="Other" lazyComponent={load} />;',
      'const Root = () => consume(<Composition id="Other" lazyComponent={load} />);',
    ),
    1,
  ],
  [
    "登记后间接调用",
    lazyRegistration + "\nconst alias = load; void alias();",
    1,
  ],
  [
    "登记后以缩写属性逃逸",
    lazyRegistration + "\nconst escaped = { load }; escaped.load();",
    1,
  ],
  ["登记后具名导出", lazyRegistration + "\nexport { load };", 1],
  [
    "登记时导出",
    lazyRegistration.replace("const load", "export const load"),
    1,
  ],
  ["可变加载器", lazyRegistration.replace("const load", "let load"), 1],
  [
    "不明合成组件",
    lazyRegistration.replace('import { Composition } from "remotion";', ""),
    1,
  ],
  [
    "本期合成的加载器",
    lazyRegistration.replace('id="Other"', 'id="PureCodeSample"'),
    1,
  ],
  [
    "非 lazyComponent 的属性",
    lazyRegistration.replace("lazyComponent=", "component="),
    1,
  ],
  ["动态合成编号", lazyRegistration.replace('id="Other"', "id={name}"), 1],
  [
    "不明模块路径",
    lazyRegistration.replace('import("./other")', "import(path)"),
    1,
  ],
  [
    "直接加载字体包",
    lazyRegistration.replace(
      'import("./other")',
      'import("@remotion/google-fonts/Inter")',
    ),
    1,
  ],
  ["其他合成专用的加载器", lazyRegistration, 0],
  [
    "内联加载器",
    'import { Composition } from "remotion"; const Root = () => <Composition id="Other" lazyComponent={() => import("./other")} />;',
    0,
  ],
  [
    "函数返回的嵌套 JSX 登记",
    lazyRegistration.replace(
      'const Root = () => <Composition id="Other" lazyComponent={load} />;',
      'function Root() { return (<><Composition id="Other" lazyComponent={load}></Composition></>); }',
    ),
    0,
  ],
  [
    "函数表达式加载器",
    lazyRegistration.replace(
      '() => import("./other").then(({ Other }) => ({ default: Other }))',
      'function () { return import("./other"); }',
    ),
    0,
  ],
] as const) {
  test(`pure-code 启动入口${name}`, (context) => {
    const root = pureFixture(context, pureImage, {
      "episodes/index.ts": 'import "./Root";',
      "episodes/Root.tsx": registration,
      "episodes/other.ts": 'import "@remotion/google-fonts/Inter";',
    });
    const result = run(root, "pure-code");
    assert.equal(result.status, expected, result.stdout + result.stderr);
  });
}

test("pure-code 对本期 lazyComponent 仍递归检查", (context) => {
  const root = pureFixture(context, pureImage, {
    "episodes/index.ts": 'import "./Root";',
    "episodes/Root.tsx": lazyRegistration.replace(
      "./other",
      "./pure-code-sample/fonts",
    ),
    "episodes/pure-code-sample/fonts.ts":
      'import "@remotion/google-fonts/Inter";',
  });
  const result = run(root, "pure-code");
  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(
    result.stderr,
    /episodes\/pure-code-sample\/fonts.ts:1 pure-code/,
  );
});

test("pure-code 接受两个独立的 lazyComponent 加载器，按符号区分同名局部变量", (context) => {
  const root = pureFixture(context, pureImage, {
    "episodes/index.ts": 'import "./Root";',
    "episodes/Root.tsx": [
      lazyRegistration,
      'const loadPromo = () => import("./promo").then(({ Promo }) => ({ default: Promo }));',
      'const PromoRoot = () => <Composition id="Promo" lazyComponent={loadPromo} />;',
      "function local() { const load = () => 1; return load(); }",
    ].join("\n"),
    "episodes/other.ts": 'import "@remotion/google-fonts/Inter";',
    "episodes/promo.ts": 'import "@remotion/google-fonts/Roboto";',
  });
  const result = run(root, "pure-code");
  assert.equal(result.status, 0, result.stdout + result.stderr);
});

test("pure-code 当前仓库及 Root 中另外两期的加载器通过", () => {
  const result = run(resolve(import.meta.dirname, ".."), "pure-code");
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /纯代码护栏通过/);
});

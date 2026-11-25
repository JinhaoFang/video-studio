/** 纯代码护栏：递归检查本期合成及启动入口的即时依赖；只允许登记且哈希匹配的仓库生成媒体，拒绝字体、DOM 文字、远程资源和不可静态判断的加载。 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
import ts from "typescript";
import { listCodeFiles } from "./code-files.ts";

type Manifest = {
  entry: string;
  generator: string;
  inputs: { path: string; sha256: string }[];
  files: { path: string; sha256: string }[];
};
const digest = (path: string) =>
  createHash("sha256").update(readFileSync(path)).digest("hex");

export const checkPureCode = (
  root: string,
  entry: string,
  manifestPath: string,
): string[] => {
  const errors: string[] = [];
  const report = (file: string, line: number, text: string) =>
    errors.push(`${file}:${line} pure-code ${text}`);
  const code = new Set(listCodeFiles(root));
  if (!code.has(entry)) return errors;
  if (!existsSync(resolve(root, manifestPath))) {
    report(entry, 1, "缺少生成物清单，请运行本期生成脚本。");
    return errors;
  }
  const manifest = JSON.parse(
    readFileSync(resolve(root, manifestPath), "utf8"),
  ) as Manifest;
  const local = (path: string) => {
    const absolute = resolve(root, path);
    return (
      absolute.startsWith(root + sep) && !path.split(/[\\/]/).includes("..")
    );
  };
  if (
    manifest.entry !== entry ||
    !code.has(manifest.generator) ||
    !manifest.inputs.some((input) => input.path === manifest.generator)
  )
    report(manifestPath, 1, "入口或仓库生成脚本未正确登记。");
  for (const input of manifest.inputs) {
    if (
      !local(input.path) ||
      !code.has(input.path) ||
      digest(resolve(root, input.path)) !== input.sha256
    )
      report(
        manifestPath,
        1,
        `生成输入已变化或不在仓库：${input.path}，请重新生成。`,
      );
  }
  const allowed = new Set<string>();
  const mediaPrefix = `${dirname(entry)}/`;
  for (const file of manifest.files) {
    if (
      !local(file.path) ||
      !file.path.startsWith(mediaPrefix) ||
      !/^[a-f0-9]{64}$/.test(file.sha256) ||
      /\.(?:woff2?|ttf|otf)$/i.test(file.path)
    ) {
      report(manifestPath, 1, `生成媒体登记无效：${file.path}`);
      continue;
    }
    allowed.add(file.path);
    const absolute = resolve(root, "public", file.path);
    if (existsSync(absolute) && digest(absolute) !== file.sha256)
      report(manifestPath, 1, `媒体与代码生成记录不一致：${file.path}`);
  }
  const visited = new Set<string>();
  const options: ts.CompilerOptions = {
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    allowJs: true,
  };
  const trusted = new Set([
    "react",
    "react/jsx-runtime",
    "remotion",
    "@remotion/media",
  ]);
  const inspect = (file: string, followDynamic = true): void => {
    const key = `${file}:${followDynamic}`;
    if (visited.has(key)) return;
    visited.add(key);
    const source = ts.createSourceFile(
      resolve(root, file),
      readFileSync(resolve(root, file), "utf8"),
      ts.ScriptTarget.Latest,
      true,
    );
    const fail = (node: ts.Node, message: string) =>
      report(
        file,
        source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1,
        message,
      );
    const staticNames = new Set(["staticFile"]);
    const dependency = (node: ts.Node | undefined) => {
      if (!node || !ts.isStringLiteralLike(node)) {
        if (node) fail(node, "模块路径必须是静态字面量。");
        return;
      }
      const name = node.text;
      if (trusted.has(name)) return;
      if (!name.startsWith(".")) {
        fail(node, `不允许的包或外部依赖：${name}`);
        return;
      }
      if (
        !followDynamic &&
        name.endsWith(".json") &&
        existsSync(resolve(dirname(source.fileName), name))
      )
        return;
      const resolved = ts.resolveModuleName(
        name,
        source.fileName,
        options,
        ts.sys,
      ).resolvedModule;
      const path =
        resolved &&
        relative(root, resolved.resolvedFileName).split(sep).join("/");
      if (!path || !code.has(path)) fail(node, `依赖必须是仓库源码：${name}`);
      else inspect(path, followDynamic);
    };
    for (const statement of source.statements) {
      if (
        ts.isImportDeclaration(statement) &&
        ts.isStringLiteralLike(statement.moduleSpecifier) &&
        statement.moduleSpecifier.text === "remotion"
      ) {
        const bindings = statement.importClause?.namedBindings;
        if (bindings && ts.isNamedImports(bindings)) {
          for (const binding of bindings.elements) {
            if ((binding.propertyName ?? binding.name).text === "staticFile")
              staticNames.add(binding.name.text);
          }
        }
      }
    }
    const walk = (node: ts.Node): void => {
      if (ts.isJsxText(node) && node.text.trim())
        fail(node, "不允许 DOM 文字，请用代码画笔画。");
      if (
        ts.isJsxExpression(node) &&
        (ts.isJsxElement(node.parent) || ts.isJsxFragment(node.parent)) &&
        node.expression &&
        !ts.isJsxElement(node.expression) &&
        !ts.isJsxFragment(node.expression)
      )
        fail(node, "不能静态确认 JSX 子内容不使用字体，请直接绘制画面。");
      if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
        const typeOnly = ts.isImportDeclaration(node)
          ? node.importClause?.isTypeOnly
          : node.isTypeOnly;
        if (node.moduleSpecifier && !typeOnly) dependency(node.moduleSpecifier);
      } else if (ts.isCallExpression(node)) {
        const name = node.expression.getText(source);
        const dynamic = node.expression.kind === ts.SyntaxKind.ImportKeyword;
        const deferred = ts.findAncestor(node, (parent) =>
          ts.isFunctionLike(parent),
        );
        if (name === "require" || (dynamic && (followDynamic || !deferred)))
          dependency(node.arguments[0]);
        if (staticNames.has(name) || name.endsWith(".staticFile")) {
          const argument = node.arguments[0];
          if (
            !argument ||
            !ts.isStringLiteralLike(argument) ||
            !allowed.has(argument.text)
          )
            fail(node, "staticFile 只能引用生成物清单中的静态路径。");
        }
        if (
          /\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|FontFace|loadFont|fillText|strokeText|measureText|createImageBitmap)\b/.test(
            name,
          )
        )
          fail(node, `不允许外部资源或字体 API：${name}`);
      } else if (
        ts.isNewExpression(node) &&
        /(?:URL|FontFace|XMLHttpRequest|WebSocket|EventSource)$/.test(
          node.expression.getText(source),
        )
      ) {
        fail(node, "不允许通过 URL、网络或字体构造器加载资源。");
      }
      if (
        ts.isIdentifier(node) &&
        /^(?:font|fontFamily|fonts|fillText|strokeText|FontFace|loadFont|fetch|XMLHttpRequest|WebSocket|EventSource)$/.test(
          node.text,
        )
      )
        fail(node, `不允许资源加载或字体绘制 API：${node.text}`);
      if (
        ts.isStringLiteralLike(node) ||
        ts.isNoSubstitutionTemplateLiteral(node) ||
        ts.isTemplateHead(node) ||
        ts.isTemplateMiddle(node) ||
        ts.isTemplateTail(node)
      ) {
        const text = node.text;
        if (
          /(?:https?:\/\/|data:|blob:|@font-face|url\s*\(|\.(?:woff2?|ttf|otf)(?:\W|$))/i.test(
            text,
          )
        )
          fail(node, "不允许远程、内嵌媒体或字体资源。");
        if (
          /\.(?:png|jpe?g|webp|gif|svg|bmp|wav|mp3|aac|ogg|flac|mp4|webm|mov)(?:[?#]|$)/i.test(
            text,
          )
        ) {
          const parent = node.parent;
          if (
            !ts.isCallExpression(parent) ||
            !(
              staticNames.has(parent.expression.getText(source)) ||
              parent.expression.getText(source).endsWith(".staticFile")
            ) ||
            !allowed.has(text)
          )
            fail(node, "媒体路径必须通过 staticFile 引用仓库生成物。");
        }
      }
      const staticMedia = (value: ts.Node) =>
        ts.isCallExpression(value) &&
        (staticNames.has(value.expression.getText(source)) ||
          value.expression.getText(source).endsWith(".staticFile")) &&
        value.arguments.length === 1 &&
        ts.isStringLiteralLike(value.arguments[0]) &&
        allowed.has(value.arguments[0].text);
      if (
        ts.isBinaryExpression(node) &&
        node.operatorToken.kind === ts.SyntaxKind.EqualsToken
      ) {
        const left = node.left;
        const property = ts.isPropertyAccessExpression(left)
          ? left.name.text
          : ts.isElementAccessExpression(left) &&
              ts.isStringLiteralLike(left.argumentExpression)
            ? left.argumentExpression.text
            : "";
        if (
          ["src", "href", "poster"].includes(property) &&
          !staticMedia(node.right)
        )
          fail(node, "媒体地址只能直接使用已登记的 staticFile 路径。");
      }
      if (
        ts.isJsxAttribute(node) &&
        /^(?:src|href|poster)$/.test(node.name.getText(source))
      ) {
        const value = node.initializer;
        if (
          !value ||
          !ts.isJsxExpression(value) ||
          !value.expression ||
          !staticMedia(value.expression)
        )
          fail(node, "媒体属性只能直接使用已登记的 staticFile 路径。");
      }
      ts.forEachChild(node, walk);
    };
    walk(source);
  };
  inspect(entry);
  if (code.has("episodes/index.ts")) inspect("episodes/index.ts", false);
  return errors;
};

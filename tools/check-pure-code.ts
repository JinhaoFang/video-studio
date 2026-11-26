/**
 * 纯代码护栏：递归检查合成与启动依赖；仅豁免直接返回 JSX 中其他合成独占、
 * 且返回函数只用于安全 JSX 返回链或 Remotion registerRoot 的 lazyComponent 加载器。
 * 按声明节点归并跨文件具名引用，避免类型推导产生的临时符号漏检；函数调用、
 * 逃逸及无法证明用途的模块引用均取消豁免。媒体（含 srcSet 和 Audio 构造参数）
 * 只接受已登记的 staticFile 字面量及其 const 别名。
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, relative, resolve, sep } from "node:path";
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
  const program = ts.createProgram(
    [...code].map((file) => resolve(root, file)),
    {
      noResolve: true,
      noLib: true,
      allowJs: true,
      target: ts.ScriptTarget.Latest,
    },
  );
  const checker = program.getTypeChecker();
  const visit = (node: ts.Node, callback: (node: ts.Node) => void): void => {
    callback(node);
    ts.forEachChild(node, (child) => visit(child, callback));
  };
  const symbolAt = (node: ts.Node) => {
    if (ts.isShorthandPropertyAssignment(node.parent))
      return checker.getShorthandAssignmentValueSymbol(node.parent);
    if (ts.isExportSpecifier(node.parent))
      return checker.getExportSpecifierLocalTargetSymbol(node.parent);
    return checker.getSymbolAtLocation(node);
  };
  const targetSymbol = (node: ts.Node) => {
    const symbol = symbolAt(node);
    return symbol && (symbol.flags & ts.SymbolFlags.Alias) !== 0
      ? checker.getAliasedSymbol(symbol)
      : symbol;
  };
  const references = new Map<ts.Declaration, ts.Identifier[]>();
  const opaqueModules = new Set<string>();
  for (const source of program.getSourceFiles()) {
    visit(source, (node) => {
      if (ts.isIdentifier(node)) {
        const declaration = targetSymbol(node)?.valueDeclaration;
        if (declaration) {
          const uses = references.get(declaration) ?? [];
          uses.push(node);
          references.set(declaration, uses);
        }
      }
      let path: ts.Node | undefined;
      if (ts.isImportDeclaration(node)) {
        const clause = node.importClause;
        if (
          clause?.name ||
          (clause?.namedBindings &&
            ts.isNamespaceImport(clause.namedBindings))
        )
          path = node.moduleSpecifier;
      } else if (ts.isExportDeclaration(node)) {
        path = node.moduleSpecifier;
      } else if (
        ts.isImportEqualsDeclaration(node) &&
        ts.isExternalModuleReference(node.moduleReference)
      ) {
        path = node.moduleReference.expression;
      } else if (
        ts.isCallExpression(node) &&
        (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
          (ts.isIdentifier(node.expression) &&
            node.expression.text === "require"))
      ) {
        path = node.arguments[0];
      }
      if (path && ts.isStringLiteralLike(path)) {
        const resolved = ts.resolveModuleName(
          path.text,
          source.fileName,
          options,
          ts.sys,
        ).resolvedModule;
        if (resolved) opaqueModules.add(resolved.resolvedFileName);
      }
    });
  }
  const inspect = (file: string, followDynamic = true): void => {
    const key = `${file}:${followDynamic}`;
    if (visited.has(key)) return;
    visited.add(key);
    const source = program.getSourceFile(resolve(root, file))!;
    const fail = (node: ts.Node, message: string) =>
      report(
        file,
        source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1,
        message,
      );
    const unwrap = (node: ts.Node): ts.Node => {
      while (
        ts.isParenthesizedExpression(node) ||
        ts.isAsExpression(node) ||
        ts.isTypeAssertionExpression(node) ||
        ts.isSatisfiesExpression(node) ||
        ts.isNonNullExpression(node)
      )
        node = node.expression;
      return node;
    };
    const memberName = (node: ts.Node): string => {
      node = unwrap(node);
      return ts.isIdentifier(node)
        ? node.text
        : ts.isPropertyAccessExpression(node)
          ? node.name.text
          : ts.isElementAccessExpression(node) &&
              ts.isStringLiteralLike(node.argumentExpression)
            ? node.argumentExpression.text
            : "";
    };
    const constant = (node: ts.Node): ts.VariableDeclaration | undefined => {
      if (!ts.isIdentifier(node)) return;
      const declaration = symbolAt(node)?.valueDeclaration;
      if (
        declaration &&
        ts.isVariableDeclaration(declaration) &&
        ts.isIdentifier(declaration.name) &&
        ts.isVariableDeclarationList(declaration.parent) &&
        (declaration.parent.flags & ts.NodeFlags.Const) !== 0
      )
        return declaration;
    };
    const exported = (declaration: ts.VariableDeclaration): boolean => {
      const statement = declaration.parent.parent;
      return (
        ts.isVariableStatement(statement) &&
        !!statement.modifiers?.some(
          (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
        )
      );
    };
    const remotionMember = (
      node: ts.Node,
      member: string,
      seen = new Set<ts.Node>(),
    ): boolean => {
      node = unwrap(node);
      if (seen.has(node)) return false;
      seen.add(node);
      if (ts.isIdentifier(node)) {
        const declaration = symbolAt(node)?.declarations?.[0];
        if (declaration && ts.isImportSpecifier(declaration)) {
          const clause = declaration.parent.parent;
          return (
            !declaration.isTypeOnly &&
            !clause.isTypeOnly &&
            (declaration.propertyName ?? declaration.name).text === member &&
            ts.isStringLiteral(clause.parent.moduleSpecifier) &&
            clause.parent.moduleSpecifier.text === "remotion"
          );
        }
        const initializer = constant(node)?.initializer;
        return !!initializer && remotionMember(initializer, member, seen);
      }
      if (ts.isPropertyAccessExpression(node)) {
        const declaration = symbolAt(node.expression)?.declarations?.[0];
        return (
          node.name.text === member &&
          !!declaration &&
          ts.isNamespaceImport(declaration) &&
          !declaration.parent.isTypeOnly &&
          ts.isStringLiteral(declaration.parent.parent.moduleSpecifier) &&
          declaration.parent.parent.moduleSpecifier.text === "remotion"
        );
      }
      return false;
    };
    const staticCall = (node: ts.Node): boolean =>
      ts.isCallExpression(node) &&
      remotionMember(node.expression, "staticFile");
    const staticMedia = (node: ts.Node, seen = new Set<ts.Node>()): boolean => {
      node = unwrap(node);
      if (seen.has(node)) return false;
      seen.add(node);
      const initializer = constant(node)?.initializer;
      if (initializer) return staticMedia(initializer, seen);
      return (
        ts.isCallExpression(node) &&
        staticCall(node) &&
        node.arguments.length === 1 &&
        ts.isStringLiteralLike(node.arguments[0]) &&
        allowed.has(node.arguments[0].text)
      );
    };
    const mediaProperties = new Set(["src", "srcSet", "href", "poster"]);
    const registrationFunction = (
      node: ts.JsxOpeningElement | ts.JsxSelfClosingElement,
    ): ts.Node | undefined => {
      let element: ts.Node = ts.isJsxOpeningElement(node) ? node.parent : node;
      while (element.parent) {
        const parent = element.parent;
        if (
          unwrap(parent) === element ||
          ts.isJsxElement(parent) ||
          ts.isJsxFragment(parent)
        ) {
          element = parent;
          continue;
        }
        if (ts.isArrowFunction(parent) && parent.body === element)
          return parent;
        if (ts.isReturnStatement(parent) && parent.expression === element)
          return ts.findAncestor(parent, ts.isFunctionLike);
        return;
      }
    };
    const componentOnly = (
      fn: ts.Node | undefined,
      seen = new Set<ts.Node>(),
    ): boolean => {
      if (
        !fn ||
        seen.has(fn) ||
        !(
          ts.isArrowFunction(fn) ||
          ts.isFunctionExpression(fn) ||
          ts.isFunctionDeclaration(fn)
        ) ||
        fn.asteriskToken ||
        fn.modifiers?.some(
          (modifier) =>
            modifier.kind === ts.SyntaxKind.AsyncKeyword ||
            modifier.kind === ts.SyntaxKind.DefaultKeyword,
        )
      )
        return false;
      seen = new Set(seen).add(fn);
      let value: ts.Node = fn;
      while (value.parent && unwrap(value.parent) === fn)
        value = value.parent;
      const parent = value.parent;
      const name = ts.isFunctionDeclaration(fn)
        ? fn.name
        : ts.isVariableDeclaration(parent) &&
            parent.initializer === value &&
            ts.isIdentifier(parent.name) &&
            constant(parent.name) === parent
          ? parent.name
          : undefined;
      const declaration = name && targetSymbol(name)?.valueDeclaration;
      if (!declaration) return false;
      const statement = ts.isVariableDeclaration(declaration)
        ? declaration.parent.parent
        : declaration;
      if (
        opaqueModules.has(fn.getSourceFile().fileName) &&
        (ts.isVariableStatement(statement) ||
          ts.isFunctionDeclaration(statement)) &&
        statement.modifiers?.some(
          (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
        )
      )
        return false;
      if (
        ts.isFunctionExpression(fn) &&
        fn.name &&
        (references.get(fn)?.length ?? 0) > 1
      )
        return false;
      return (references.get(declaration) ?? []).every((use) => {
        if (use === name || ts.isImportSpecifier(use.parent)) return true;
        let value: ts.Node = use;
        while (value.parent && unwrap(value.parent) === use)
          value = value.parent;
        const parent = value.parent;
        if (
          ts.isCallExpression(parent) &&
          parent.arguments.length === 1 &&
          parent.arguments[0] === value &&
          remotionMember(parent.expression, "registerRoot")
        )
          return true;
        return (
          (ts.isJsxOpeningElement(parent) ||
            ts.isJsxClosingElement(parent) ||
            ts.isJsxSelfClosingElement(parent)) &&
          parent.tagName === value &&
          componentOnly(
            registrationFunction(
              ts.isJsxClosingElement(parent)
                ? parent.parent.openingElement
                : parent,
            ),
            seen,
          )
        );
      });
    };
    const loaderAttributes = new Set<ts.JsxAttribute>();
    visit(source, (node) => {
      if (
        (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) &&
        remotionMember(node.tagName, "Composition") &&
        componentOnly(registrationFunction(node)) &&
        !node.attributes.properties.some(ts.isJsxSpreadAttribute)
      ) {
        const id = node.attributes.properties.find(
          (attribute) =>
            ts.isJsxAttribute(attribute) &&
            attribute.name.getText(source) === "id",
        );
        if (
          !id ||
          !ts.isJsxAttribute(id) ||
          !id.initializer ||
          !ts.isStringLiteral(id.initializer) ||
          id.initializer.text === basename(entry).replace(/\.[^.]+$/, "")
        )
          return;
        for (const attribute of node.attributes.properties)
          if (
            ts.isJsxAttribute(attribute) &&
            attribute.name.getText(source) === "lazyComponent"
          )
            loaderAttributes.add(attribute);
      }
    });
    const loaders = new Set<ts.Node>();
    for (const attribute of loaderAttributes) {
      const value = attribute.initializer;
      if (!value || !ts.isJsxExpression(value) || !value.expression) continue;
      let loader = unwrap(value.expression);
      if (ts.isIdentifier(loader)) {
        const declaration = constant(loader);
        if (!declaration?.initializer) continue;
        if (exported(declaration)) continue;
        const uses = references.get(declaration) ?? [];
        if (
          uses.some(
            (use) =>
              use !== declaration.name &&
              !(
                ts.isJsxExpression(use.parent) &&
                use.parent.expression === use &&
                ts.isJsxAttribute(use.parent.parent) &&
                loaderAttributes.has(use.parent.parent)
              ),
          )
        )
          continue;
        loader = unwrap(declaration.initializer);
      }
      if (ts.isArrowFunction(loader) || ts.isFunctionExpression(loader)) {
        const name = ts.isFunctionExpression(loader) ? loader.name : undefined;
        if (name && (references.get(loader)?.length ?? 0) > 1)
          continue;
        loaders.add(loader);
      }
    }
    const otherEpisode = (node: ts.Node | undefined): boolean => {
      if (!node || !ts.isStringLiteralLike(node) || !node.text.startsWith("."))
        return false;
      const resolved = ts.resolveModuleName(
        node.text,
        source.fileName,
        options,
        ts.sys,
      ).resolvedModule;
      const path =
        resolved &&
        relative(root, resolved.resolvedFileName).split(sep).join("/");
      return (
        !!path &&
        code.has(path) &&
        path.startsWith("episodes/") &&
        !path.startsWith(mediaPrefix)
      );
    };
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
    const checkSpread = (node: ts.Node): void => {
      node = unwrap(node);
      if (!ts.isObjectLiteralExpression(node)) {
        fail(node, "无法静态确认展开属性的媒体来源，请直接写出属性。");
        return;
      }
      for (const property of node.properties) {
        if (ts.isSpreadAssignment(property)) {
          checkSpread(property.expression);
          continue;
        }
        if (ts.isComputedPropertyName(property.name)) {
          fail(property, "无法静态确认展开属性名，请直接写出属性。");
          continue;
        }
        const name =
          ts.isIdentifier(property.name) ||
          ts.isStringLiteralLike(property.name)
            ? property.name.text
            : "";
        if (mediaProperties.has(name)) {
          const value = ts.isPropertyAssignment(property)
            ? property.initializer
            : ts.isShorthandPropertyAssignment(property)
              ? property.name
              : undefined;
          if (!value || !staticMedia(value))
            fail(property, "展开媒体属性只能使用已登记的 staticFile 路径。");
        }
      }
    };
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
        if (
          ts.isExportDeclaration(node) &&
          node.moduleSpecifier &&
          ts.isStringLiteralLike(node.moduleSpecifier) &&
          node.moduleSpecifier.text === "remotion" &&
          !node.isTypeOnly &&
          (!node.exportClause ||
            !ts.isNamedExports(node.exportClause) ||
            node.exportClause.elements.some(
              (element) =>
                !element.isTypeOnly &&
                (element.propertyName ?? element.name).text === "staticFile",
            ))
        )
          fail(
            node,
            "无法静态确认跨模块的 staticFile 用途，请在使用处直接导入。",
          );
      } else if (ts.isCallExpression(node)) {
        const name = node.expression.getText(source);
        const dynamic = node.expression.kind === ts.SyntaxKind.ImportKeyword;
        const deferred =
          !followDynamic &&
          ts.findAncestor(node, (parent) => loaders.has(parent)) &&
          otherEpisode(node.arguments[0]);
        if (name === "require" || (dynamic && !deferred))
          dependency(node.arguments[0]);
        if (staticCall(node)) {
          if (!staticMedia(node))
            fail(node, "staticFile 只能引用生成物清单中的静态路径。");
        } else if (memberName(node.expression) === "staticFile") {
          fail(node, "无法静态确认 staticFile 来源，请直接从 remotion 导入。");
        }
        if (
          /\b(?:fetch|XMLHttpRequest|WebSocket|EventSource|FontFace|loadFont|fillText|strokeText|measureText|createImageBitmap)\b/.test(
            name,
          )
        )
          fail(node, `不允许外部资源或字体 API：${name}`);
      } else if (ts.isNewExpression(node)) {
        const constructor = node.expression.getText(source);
        if (
          /(?:URL|FontFace|XMLHttpRequest|WebSocket|EventSource)$/.test(
            constructor,
          )
        )
          fail(node, "不允许通过 URL、网络或字体构造器加载资源。");
        if (
          memberName(node.expression) === "Audio" &&
          node.arguments?.length &&
          (node.arguments.length !== 1 || !staticMedia(node.arguments[0]))
        )
          fail(node, "音频构造参数只能使用已登记的 staticFile 路径。");
      }
      if (
        ts.isIdentifier(node) &&
        /^(?:font|fontFamily|fonts|fillText|strokeText|FontFace|loadFont|fetch|XMLHttpRequest|WebSocket|EventSource)$/.test(
          node.text,
        )
      )
        fail(node, `不允许资源加载或字体绘制 API：${node.text}`);
      if (ts.isIdentifier(node)) {
        const declaration = symbolAt(node)?.declarations?.[0];
        if (
          declaration &&
          ts.isNamespaceImport(declaration) &&
          ts.isStringLiteral(declaration.parent.parent.moduleSpecifier) &&
          declaration.parent.parent.moduleSpecifier.text === "remotion" &&
          node !== declaration.name &&
          !(
            ts.isPropertyAccessExpression(node.parent) &&
            node.parent.expression === node
          )
        )
          fail(
            node,
            "无法静态确认 remotion 命名空间的用途，请直接访问具名 API。",
          );
      }
      if (
        (ts.isIdentifier(node) || ts.isPropertyAccessExpression(node)) &&
        remotionMember(node, "staticFile") &&
        !ts.isImportSpecifier(node.parent) &&
        !(ts.isVariableDeclaration(node.parent) && node.parent.name === node)
      ) {
        let value: ts.Node = node;
        while (value.parent && unwrap(value.parent) === node)
          value = value.parent;
        const parent = value.parent;
        if (
          !(ts.isCallExpression(parent) && parent.expression === value) &&
          !(
            ts.isVariableDeclaration(parent) &&
            parent.initializer === value &&
            ts.isIdentifier(parent.name) &&
            constant(parent.name) === parent &&
            !exported(parent)
          )
        )
          fail(node, "staticFile 只能直接调用或绑定为 const 别名。");
      }
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
          if (!staticCall(parent) || !allowed.has(text))
            fail(node, "媒体路径必须通过 staticFile 引用仓库生成物。");
        }
      }
      if (ts.isJsxSpreadAttribute(node)) checkSpread(node.expression);
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
          mediaProperties.has(property) &&
          !staticMedia(node.right)
        )
          fail(node, "媒体地址只能直接使用已登记的 staticFile 路径。");
      }
      if (
        ts.isJsxAttribute(node) &&
        mediaProperties.has(node.name.getText(source))
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

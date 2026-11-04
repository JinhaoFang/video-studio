/**
 * Run `node tools/check-guardrails.ts comments|dependencies [repository-root]`.
 * Check the shared Git file set and print `file:line rule explanation` on failure.
 * TypeScript syntax trees protect literal text from comment scanning and resolve
 * dependencies with the nearest repository tsconfig. Static template prefixes
 * and triple-slash path references are checked. tools/ require.resolve and
 * import.meta.resolve calls, module names assembled at runtime, and paths with
 * different casing are intentionally outside this static check.
 */
import { readFileSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import ts from "typescript";
import { reportError, usageError } from "./cli.ts";
import { listCodeFiles } from "./code-files.ts";

const main = (): void => {
  const usage =
    "node tools/check-guardrails.ts <comments|dependencies> [仓库根目录]";
  const [mode, rootArg, ...extra] = process.argv.slice(2);
  if (mode === "--help") {
    console.log(
      `用法：${usage}\ncomments 检查注释位置；dependencies 检查依赖方向。`,
    );
    return;
  }
  if ((mode !== "comments" && mode !== "dependencies") || extra.length)
    throw usageError(
      "请选择 comments 或 dependencies，最多提供一个仓库根目录。",
      usage,
    );

  const root = resolve(rootArg ?? process.cwd());
  const configCache = new Map<string, ts.CompilerOptions>();
  let failures = 0;

  const report = (
    source: ts.SourceFile,
    position: number,
    rule: string,
    message: string,
  ): void => {
    const line = source.getLineAndCharacterOfPosition(position).line + 1;
    console.error(
      `出错：${relative(root, source.fileName).split(sep).join("/")}:${line} ${rule} ${message}`,
    );
    failures += 1;
  };

  const visit = (node: ts.Node, callback: (node: ts.Node) => void): void => {
    callback(node);
    ts.forEachChild(node, (child) => visit(child, callback));
  };

  const checkComments = (source: ts.SourceFile): void => {
    const spans: { start: number; end: number }[] = [];
    visit(source, (node) => {
      if (
        ts.isStringLiteralLike(node) ||
        ts.isRegularExpressionLiteral(node) ||
        ts.isTemplateHead(node) ||
        ts.isTemplateMiddle(node) ||
        ts.isTemplateTail(node) ||
        ts.isJsxText(node)
      ) {
        spans.push({
          start: ts.isJsxText(node) ? node.pos : node.getStart(source),
          end: node.end,
        });
      }
    });
    spans.sort((a, b) => a.start - b.start);
    const headerEnd = source.statements[0]?.getStart(source) ?? source.end;
    const scanner = ts.createScanner(
      ts.ScriptTarget.Latest,
      false,
      ts.LanguageVariant.Standard,
      source.text,
    );
    let spanIndex = 0;

    for (
      let token = scanner.scan();
      token !== ts.SyntaxKind.EndOfFileToken;
      token = scanner.scan()
    ) {
      const start = scanner.getTokenPos();
      while (spans[spanIndex] && spans[spanIndex].end <= start) {
        spanIndex += 1;
      }
      const span = spans[spanIndex];
      if (span && start >= span.start && start < span.end) {
        scanner.setTextPos(span.end);
        continue;
      }
      if (
        start < headerEnd ||
        (token !== ts.SyntaxKind.SingleLineCommentTrivia &&
          token !== ts.SyntaxKind.MultiLineCommentTrivia)
      ) {
        continue;
      }
      const text = scanner.getTokenText();
      const content = (
        token === ts.SyntaxKind.SingleLineCommentTrivia
          ? text.slice(2)
          : text.slice(2, -2)
      ).trim();
      const singleLine = token === ts.SyntaxKind.SingleLineCommentTrivia;
      const eslintDirectiveSyntax = singleLine
        ? /^eslint-disable-(?:next-)?line(?:\s|$)/.test(content)
        : /^eslint-(?:disable(?:-next-line|-line)?|enable)(?:\s|$)/.test(
            content,
          );
      const eslintDirective =
        eslintDirectiveSyntax &&
        !(
          /^eslint-disable-line(?:\s|$)/.test(content) &&
          /[\r\n\u2028\u2029]/.test(text)
        );
      const tsDirective = singleLine
        ? /^\/\/\/?\s*@ts-expect-error/.test(text)
        : /^(?:\/|\*)*\s*@ts-expect-error/.test(
            text
              .split(/\r\n|[\r\n\u2028\u2029]/)
              .at(-1)!
              .trimStart(),
          );
      if (eslintDirective || tsDirective) {
        continue;
      }
      report(
        source,
        start,
        "comment-position",
        "说明性注释只能放在第一句代码之前。",
      );
    }
  };

  const compilerOptions = (file: string): ts.CompilerOptions => {
    let directory = dirname(resolve(file));
    let config: string | undefined;
    while (directory === root || directory.startsWith(root + sep)) {
      const candidate = resolve(directory, "tsconfig.json");
      if (ts.sys.fileExists(candidate)) {
        config = candidate;
        break;
      }
      if (directory === root) {
        break;
      }
      directory = dirname(directory);
    }
    if (!config) {
      return {
        moduleResolution: ts.ModuleResolutionKind.Bundler,
        allowJs: true,
      };
    }
    const cached = configCache.get(config);
    if (cached) {
      return cached;
    }
    const result = ts.readConfigFile(config, ts.sys.readFile);
    if (result.error) {
      throw new Error(
        ts.flattenDiagnosticMessageText(result.error.messageText, " "),
      );
    }
    const parsed = ts.parseJsonConfigFileContent(
      result.config,
      ts.sys,
      dirname(config),
    );
    configCache.set(config, parsed.options);
    return parsed.options;
  };

  const pointsToEpisodes = (
    name: string,
    source: ts.SourceFile,
    options: ts.CompilerOptions,
  ): boolean => {
    const candidates: string[] = [];
    const resolved = ts.resolveModuleName(
      name,
      source.fileName,
      options,
      ts.sys,
    ).resolvedModule;
    if (resolved) {
      candidates.push(resolved.resolvedFileName);
    }
    if (name.startsWith(".")) {
      candidates.push(resolve(dirname(source.fileName), name));
    } else if (isAbsolute(name)) {
      candidates.push(name);
    } else {
      candidates.push(resolve(root, name));
      if (options.baseUrl) {
        candidates.push(resolve(options.baseUrl, name));
      }
    }
    return candidates.some((candidate) => {
      const path = relative(root, candidate).split(sep).join("/");
      return path === "episodes" || path.startsWith("episodes/");
    });
  };

  const checkDependencies = (source: ts.SourceFile, path: string): void => {
    const inSrc = path.startsWith("src/");
    if (!inSrc && !path.startsWith("tools/")) {
      return;
    }
    const options = compilerOptions(source.fileName);
    const reportedPositions = new Set<number>();
    const checkModule = (node: ts.Node | undefined): void => {
      const literal = node && ts.isTemplateExpression(node) ? node.head : node;
      if (
        literal &&
        (ts.isStringLiteralLike(literal) || ts.isTemplateHead(literal)) &&
        pointsToEpisodes(literal.text, source, options)
      ) {
        const position = literal.getStart(source);
        reportedPositions.add(position);
        report(
          source,
          position,
          "dependency-direction",
          `方法层模块不能引用 episodes/： ${literal.text}`,
        );
      }
    };
    for (const reference of source.referencedFiles) {
      if (pointsToEpisodes(reference.fileName, source, options)) {
        report(
          source,
          reference.pos,
          "dependency-direction",
          `方法层模块不能引用 episodes/： ${reference.fileName}`,
        );
      }
    }
    visit(source, (node) => {
      if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
        checkModule(node.moduleSpecifier);
      } else if (
        ts.isCallExpression(node) &&
        (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
          (ts.isIdentifier(node.expression) &&
            node.expression.text === "require"))
      ) {
        checkModule(node.arguments[0]);
      } else if (
        ts.isImportEqualsDeclaration(node) &&
        ts.isExternalModuleReference(node.moduleReference)
      ) {
        checkModule(node.moduleReference.expression);
      } else if (
        ts.isImportTypeNode(node) &&
        ts.isLiteralTypeNode(node.argument)
      ) {
        checkModule(node.argument.literal);
      }
      if (
        inSrc &&
        (ts.isStringLiteralLike(node) ||
          ts.isTemplateHead(node) ||
          ts.isTemplateMiddle(node) ||
          ts.isTemplateTail(node)) &&
        /(?:^|\/)episodes\//.test(node.text) &&
        !reportedPositions.has(node.getStart(source))
      ) {
        report(
          source,
          node.getStart(source),
          "episode-path",
          "src/ 不能写死各期素材路径。",
        );
      }
    });
  };

  for (const path of listCodeFiles(root)) {
    const absolute = resolve(root, path);
    const source = ts.createSourceFile(
      absolute,
      readFileSync(absolute, "utf8"),
      ts.ScriptTarget.Latest,
      true,
    );
    if (mode === "comments") {
      checkComments(source);
    } else {
      checkDependencies(source, path);
    }
  }

  if (failures > 0) {
    process.exitCode = 1;
  }
};

try {
  main();
} catch (error) {
  reportError(error);
}

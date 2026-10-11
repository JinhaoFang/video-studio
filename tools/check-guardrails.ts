/**
 * Run `node tools/check-guardrails.ts comments|dependencies [repository-root]`.
 * Check the shared Git file set and print `file:line rule explanation` on failure.
 * TypeScript syntax trees protect literal text from comment scanning and resolve
 * dependencies with the nearest repository tsconfig. Computed module names and
 * strings assembled at runtime are intentionally outside this static check.
 */
import { readFileSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import ts from "typescript";
import { listCodeFiles } from "./code-files.ts";

const mode = process.argv[2];
if (mode !== "comments" && mode !== "dependencies") {
  console.error(
    "Usage: node tools/check-guardrails.ts comments|dependencies [repository-root]",
  );
  process.exit(1);
}

const root = resolve(process.argv[3] ?? process.cwd());
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
    `${relative(root, source.fileName).split(sep).join("/")}:${line} ${rule} ${message}`,
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
    if (
      /^(?:eslint-disable(?:-next-line|-line)?|@ts-expect-error)(?:\s|$)/.test(
        content,
      )
    ) {
      continue;
    }
    report(
      source,
      start,
      "comment-position",
      "Explanatory comments are only allowed before the first statement.",
    );
  }
};

const compilerOptions = (file: string): ts.CompilerOptions => {
  let directory = dirname(file);
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
    return { moduleResolution: ts.ModuleResolutionKind.Bundler, allowJs: true };
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
  const checkModule = (node: ts.Node | undefined): void => {
    if (
      node &&
      ts.isStringLiteralLike(node) &&
      pointsToEpisodes(node.text, source, options)
    ) {
      report(
        source,
        node.getStart(source),
        "dependency-direction",
        `Method-layer modules cannot reference episodes/: ${node.text}`,
      );
    }
  };
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
      (node.text.startsWith("episodes/") ||
        node.text.includes("public/episodes/"))
    ) {
      report(
        source,
        node.getStart(source),
        "episode-path",
        "src/ cannot hardcode episode asset paths.",
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

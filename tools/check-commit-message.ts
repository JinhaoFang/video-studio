/**
 * Validate a commit message and branch without reading Git or changing state.
 * Import checkCommitMessage(message, branch) from hooks or CI; an empty list passes.
 * Ignore Git's # comment lines and use the final trailer paragraph as the footer.
 * Merge subjects beginning with "Merge " bypass checks; detached HEAD uses "".
 */
export type CommitViolation = {
  rule: "a" | "b" | "c" | "d" | "e" | "f" | "g";
  message: string;
};

const trailer =
  /^[A-Za-z][A-Za-z0-9-]*(?:[ \t]+[A-Za-z][A-Za-z0-9-]*)*\s*[:：]/;
const signature =
  /\b(?:co-authored-by|signed-off-by|authored-by|committed-by|reviewed-by|tested-by|acked-by|reported-by|suggested-by|helped-by|approved-by|assisted-by|pair-programmed-by|generated\s+(?:with|by))\b/i;

export const checkCommitMessage = (
  message: string,
  branch: string,
): CommitViolation[] => {
  const lines = message
    .replaceAll("\r\n", "\n")
    .split("\n")
    .filter((line) => !line.startsWith("#"))
    .map((line) => line.trimEnd());
  while (lines[0] === "") lines.shift();
  while (lines.at(-1) === "") lines.pop();
  const subject = lines[0] ?? "";
  if (subject.startsWith("Merge ")) return [];

  const violations: CommitViolation[] = [];
  const title = /^([^\s(]+)\(([^)]*)\)([:：])([ \t]*)(.*)$/.exec(subject);
  if (
    !title ||
    !/^(feat|fix|docs|refactor|test|build|chore)$/.test(title[1]) ||
    title[3] !== ":" ||
    title[4] !== " " ||
    !title[5].trim()
  ) {
    violations.push({
      rule: "a",
      message: subject.includes("：")
        ? "标题须为 <类型>(<范围>): <摘要>；请把中文冒号改成英文冒号，后接一个空格。"
        : "标题须为 <类型>(<范围>): <摘要>；类型只能是 feat/fix/docs/refactor/test/build/chore，冒号后接一个空格。",
    });
  }
  if (!title || !/^[a-z0-9-]+$/.test(title[2])) {
    violations.push({
      rule: "b",
      message: "范围必写，只能包含小写字母、数字和连字符；整仓改动用 repo。",
    });
  }
  if (!/\p{Script=Han}/u.test(title?.[5] ?? subject)) {
    violations.push({ rule: "c", message: "摘要至少包含一个中文字符。" });
  }

  const paragraphs = lines
    .slice(1)
    .join("\n")
    .trim()
    .split(/\n\s*\n/);
  const last = paragraphs.at(-1) ?? "";
  const footer = last.split("\n").some((line) => trailer.test(line))
    ? paragraphs.pop()!.split("\n")
    : [];
  if (lines[1] !== "" || !paragraphs.some((paragraph) => paragraph.trim())) {
    violations.push({
      rule: "d",
      message: "正文必写：标题后须有空行，并至少有一段不是尾注的内容。",
    });
  }
  const roles = footer.filter((line) =>
    /^Role: (design|engineering)$/.test(line),
  );
  const refs = footer.filter((line) => /^Refs: #[1-9][0-9]*$/.test(line));
  if (
    roles.length !== 1 ||
    refs.length > 1 ||
    footer.some(
      (line) => !/^Role: (design|engineering)$|^Refs: #[1-9][0-9]*$/.test(line),
    ) ||
    paragraphs.some((paragraph) => /^(?:Role|Refs)\s*[:：]/m.test(paragraph))
  ) {
    violations.push({
      rule: "e",
      message:
        "最后的尾注段只允许 Refs: #<号> 和 Role: design|engineering，各最多一项；Role 必写。",
    });
  }
  if (signature.test(lines.join("\n"))) {
    violations.push({
      rule: "f",
      message:
        "任何位置都不能出现署名，包括 Co-Authored-By、Signed-off-by、Generated with/by 等（不区分大小写）。",
    });
  }
  if (branch.startsWith("spec/") && refs.length === 0) {
    violations.push({
      rule: "g",
      message: "spec/* 分支必须在尾注写 Refs: #<号>。",
    });
  }
  return violations;
};

/**
 * Shared QA CLI options (node:util parseArgs), output directories, deterministic
 * collision suffixes, 2000px scaling, and the sole ffmpeg/ffprobe subprocess.
 * String options keep their --name keys in the returned Map; help bypasses
 * validation. Negative numeric values may be separate arguments. Each invocation
 * creates a fresh outputNamer so reruns overwrite the same deterministic paths.
 */
import { spawnSync } from "node:child_process";
import { basename, extname, join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { usageError } from "./cli.ts";

export const parseOptions = (
  args: string[],
  allowed: string[],
  usage: string,
) => {
  if (args.includes("--help"))
    return { positional: [], options: new Map<string, string>(), help: true };
  const normalized: string[] = [];
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (allowed.includes(arg) && /^-(?:\d|\.\d)/.test(args[index + 1] ?? ""))
      normalized.push(`${arg}=${args[++index]}`);
    else normalized.push(arg);
  }
  try {
    const parsed = parseArgs({
      args: normalized,
      options: Object.fromEntries(
        allowed.map((name) => [name.slice(2), { type: "string" as const }]),
      ),
      allowPositionals: true,
      tokens: true,
    });
    const options = new Map<string, string>();
    for (const token of parsed.tokens) {
      if (token.kind !== "option") continue;
      const key = `--${token.name}`;
      if (options.has(key) || !token.value || token.value.startsWith("--"))
        throw usageError(`${key} 必须且只能提供一次非空值。`, usage);
      options.set(key, token.value);
    }
    return { positional: parsed.positionals, options, help: false };
  } catch (error) {
    if (error instanceof Error && error.message.includes("用法：")) throw error;
    throw usageError(
      "参数错误：请检查选项名称和值；路径以连字符开头时请用 -- 分隔。",
      usage,
    );
  }
};

export const positiveInteger = (value: string, option: string): number => {
  const number = Number(value);
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(number) || number <= 0)
    throw new Error(`${option} 必须是正整数。`);
  return number;
};

export const outputDirectory = (
  command: string,
  input: string,
  out?: string,
): string =>
  resolve(out ?? join("out", "qa", command, basename(input, extname(input))));

export const outputNamer = (directory: string) => {
  const names = new Map<string, number>();
  return (name: string, extension = "jpg"): string => {
    const occurrence = (names.get(name) ?? 0) + 1;
    names.set(name, occurrence);
    return join(
      directory,
      `${name}${occurrence > 1 ? `-${occurrence}` : ""}.${extension}`,
    );
  };
};

export const imageScale =
  "scale=w='min(2000,iw)':h='min(2000,ih)':force_original_aspect_ratio=decrease";

export const runMedia = (
  program: "ffmpeg" | "ffprobe",
  args: string[],
  output: "stdout" | "stderr" = "stdout",
): string => {
  const result = spawnSync(program, args, {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.error) {
    if ((result.error as NodeJS.ErrnoException).code === "ENOENT")
      throw new Error(
        `未安装 ${program} 或未加入 PATH，请安装 ffmpeg（含 ffprobe）后重试。`,
      );
    throw new Error(`${program} 无法启动，请检查运行环境。`);
  }
  if (result.status !== 0)
    throw new Error(
      `${program} 运行失败（退出码 ${result.status ?? "未知"}），请检查输入媒体和参数。`,
    );
  return result[output];
};

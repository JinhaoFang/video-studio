/** Node 生成缓存与清单。传入仓库根、入口、生成脚本、代码和数据文件，以及底图的输入子集。先记录已生成的媒体，再用 complete 状态交付。待定事项：无。 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

export const digest = (value: Uint8Array | string) =>
  createHash("sha256").update(value).digest("hex");
export const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;
type FileHash = { path: string; sha256: string };
type Saved = {
  status: string;
  cacheKey: string;
  plateKey: string;
  files: FileHash[];
};

type GenerationOptions = {
  root: string;
  manifestPath: string;
  entry: string;
  generator: string;
  plateSources: string[];
  sources: string[];
  dataSources: string[];
};
export const generation = ({
  root,
  manifestPath,
  entry,
  generator,
  plateSources,
  sources,
  dataSources,
}: GenerationOptions) => {
  const fingerprint = (path: string, base = root): FileHash => ({
    path,
    sha256: digest(readFileSync(resolve(base, path))),
  });
  const plateInputs = plateSources.map((path) => fingerprint(path));
  const inputs = [
    ...plateInputs,
    ...sources
      .filter((path) => !plateSources.includes(path))
      .map((path) => fingerprint(path)),
  ];
  const dataInputs = dataSources.map((path) => fingerprint(path));
  const runtime = {
    node: process.version,
    ffmpegVersion: execFileSync("ffmpeg", ["-version"], {
      encoding: "utf8",
    }).split("\n")[0],
  };
  const cacheKey = digest(json({ inputs, dataInputs, runtime }));
  const plateKey = digest(json({ plateInputs, runtime }));
  const previous: Saved | null = existsSync(manifestPath)
    ? JSON.parse(readFileSync(manifestPath, "utf8"))
    : null;
  const publicRoot = resolve(root, "public");
  const matches = (paths: string[]) =>
    paths.every((path) => {
      const file = previous?.files.find((item) => item.path === path);
      return (
        file &&
        existsSync(resolve(publicRoot, path)) &&
        fingerprint(path, publicRoot).sha256 === file.sha256
      );
    });
  return {
    cacheKey,
    cached: (paths: string[]) =>
      previous?.status === "complete" &&
      previous.cacheKey === cacheKey &&
      previous.files.length === paths.length &&
      matches(paths),
    platesCached: (paths: string[]) =>
      previous?.plateKey === plateKey && matches(paths),
    save: (
      status: "audio-pending" | "complete",
      paths: string[],
      details: { eventTables: FileHash[]; audio: Record<string, unknown> },
    ) => {
      writeFileSync(
        manifestPath,
        json({
          entry,
          generator,
          command: ["node", generator],
          status,
          cacheKey,
          plateKey,
          inputs,
          dataInputs,
          runtime,
          files: paths.map((path) => fingerprint(path, publicRoot)),
          ...details,
        }),
      );
    },
  };
};

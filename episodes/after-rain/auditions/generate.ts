/** 从仓库根运行 node episodes/after-rain/auditions/generate.ts 重建三段试听与独立生成清单。待定事项：无。 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { generation } from "../../../src/kit/generation/manifest.ts";
import { pcmWav, rate } from "../../../src/kit/sound/dsp.ts";
import { reportError } from "../../../tools/cli.ts";
import { calls } from "./calls.ts";
import { walla } from "./courtyard.ts";
import { hum, type AuditionScore } from "./hum.ts";

const episode = "episodes/after-rain";
const generator = `${episode}/auditions/generate.ts`;
const generate = () => {
  const root = resolve(import.meta.dirname, "../../..");
  const manifestPath = join(root, episode, "data/auditions.json");
  const scorePath = `${episode}/score.json`;
  const cache = generation({
    root,
    manifestPath,
    entry: generator,
    generator,
    plateSources: [],
    sources: [
      generator,
      ...["hum", "courtyard", "calls"].map(
        (name) => `${episode}/auditions/${name}.ts`,
      ),
      ...["voice", "chirp", "dsp", "score"].map(
        (name) => `src/kit/sound/${name}.ts`,
      ),
      "src/kit/shots.ts",
      "src/kit/generation/manifest.ts",
    ],
    dataSources: [scorePath],
  });
  const score: AuditionScore = JSON.parse(
    readFileSync(join(root, scorePath), "utf8"),
  );
  const auditions = { hum: () => hum(score), walla, calls };
  const pathFor = (name: string) => `${episode}/audition-${name}.wav`;
  const files = Object.keys(auditions).map(pathFor);
  if (cache.cached(files)) {
    console.log(`试听缓存命中：${manifestPath}`);
    return;
  }
  mkdirSync(dirname(manifestPath), { recursive: true });
  mkdirSync(join(root, "public", episode), { recursive: true });
  const audio: Record<string, unknown> = {};
  for (const [name, render] of Object.entries(auditions)) {
    const channels = render();
    const path = pathFor(name);
    writeFileSync(join(root, "public", path), pcmWav(channels));
    audio[name] = {
      sampleRate: rate,
      channels: channels.length,
      samplesPerChannel: channels[0].length,
    };
    console.log(
      `已生成 ${path}（${(channels[0].length / rate).toFixed(2)} 秒）。`,
    );
  }
  cache.save("complete", files, { audio, eventTables: [] });
};

try {
  const { values } = parseArgs({ options: { help: { type: "boolean" } } });
  if (values.help)
    console.log(
      `用法：node ${generator} [--help]\n生成哼唱、隔墙交谈与麻雀叫声三段试听，写入 public/${episode}/。`,
    );
  else generate();
} catch (error) {
  reportError(error);
}

/** 小样声音生成实际使用的源码列表，供媒体缓存和独立声音报告共用。 */
export const soundSources = [
  "episodes/pure-code-sample/sound/inputs.ts",
  "episodes/pure-code-sample/sound/render.ts",
  "episodes/pure-code-sample/sound/perspective.ts",
  "src/kit/shots.ts",
  ...["types", "dsp", "score", "sfx", "mix", "measure"].map(
    (name) => `src/kit/sound/${name}.ts`,
  ),
  "tools/cli.ts",
];

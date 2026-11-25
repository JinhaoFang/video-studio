# 生成物来源

本期没有外部图片、视频、音频、字体、模型生成素材或采样。每个像素和 PCM 采样由本仓库代码计算。颜色和占位尺寸沿用 `src/styles/nasa-punk/tokens.ts`，不加载其字体模块。

以下命令从本 worktree 根目录运行；媒体位于 `public/episodes/pure-code-sample/`，成片与验收产物位于 `out/qa/spec-147/149/`，均不进入 Git。

| 生成物 | 生成命令 | 代码与计算方法 |
|---|---|---|
| `public/episodes/pure-code-sample/background.png` | `node episodes/pure-code-sample/generate.ts` | `generate.ts` 用 Node 写出 1920×1080 RGB 纸色、地面和地线，FFmpeg 将原始像素编码为 PNG；没有图像输入 |
| `episodes/pure-code-sample/data/events.json` | `node episodes/pure-code-sample/generate.ts` | `model.ts` 将镜头声明的局部事件帧号加上时间表起点，汇总成全片事件 |
| `public/episodes/pure-code-sample/impact.wav` | `node episodes/pure-code-sample/generate.ts` | `audio.ts` 用种子 149 的线性同余噪声和衰减余弦波合成 4 秒、48 kHz、单声道 PCM16；对齐点为内部第 480 个采样 |
| `public/episodes/pure-code-sample/mix.wav` | `node episodes/pure-code-sample/generate.ts` | `audio.ts` 按事件采样位置排列音效并输出 10 秒双声道；FFmpeg 测量响度，Node 施加固定增益写出 PCM16，保留采样位置 |
| `episodes/pure-code-sample/data/generated.json` | `node episodes/pure-code-sample/generate.ts` | 生成器记录命令、源码哈希、FFmpeg 版本、媒体 SHA-256 和混音参数，供缓存和护栏检查 |
| `out/qa/spec-147/149/PureCodeSample.mp4` | `pnpm exec remotion render PureCodeSample out/qa/spec-147/149/PureCodeSample.mp4 --gl=swangle --concurrency=2` | `PureCodeSample.tsx` 与 `shot.ts` 用 Canvas 2D 绘制，WebGL 着色器加入逐帧确定的颗粒和暗角；Remotion 将生成的 WAV 与画面编码为 H.264/AAC MP4 |
| `out/qa/spec-147/149/swangle-final-*.png` | `node out/qa/spec-147/149/render-evidence.mjs` | 本次验收脚本调用 Remotion `renderStill`，各启动一次无头浏览器渲染第 48 帧，记录 WebGL 渲染器与 GPU 采样；脚本和原始日志随验收产物保留 |
| `out/qa/spec-147/149/frames/*.jpg` | `pnpm qa frames out/qa/spec-147/149/PureCodeSample.mp4 0 1 1.9583333333333333 2 2.0416666666666665 2.3333333333333335 9.958333333333334 --out out/qa/spec-147/149/frames` | 已有抽帧工具从本期成片提取，不进入成片 |
| `out/qa/spec-147/149/loudness/loudness.json` | `pnpm qa loudness out/qa/spec-147/149/PureCodeSample.mp4 --target-lufs -16 --tolerance 1 --max-true-peak -1 --out out/qa/spec-147/149/loudness` | 已有响度工具对成片测量 EBU R128 与真峰值，不修改成片 |

`generate.ts --force` 可强制重建。生成输入或产物变化时的缓存失效规则见本期 `README.md`；提交的是代码与生成记录，媒体必须在渲染前重建。

# 生成物来源

本期没有外部图片、视频、音频、字体、模型生成素材或采样。每个像素和 PCM 采样由本仓库代码计算。颜色和占位尺寸沿用 `src/styles/nasa-punk/tokens.ts`，不加载其字体模块。

以下命令从仓库根目录运行；媒体位于 `public/episodes/pure-code-sample/`，成片位于 `out/pure-code-sample/`，均不进入 Git。

| 生成物 | 生成命令 | 代码与计算方法 |
|---|---|---|
| `public/episodes/pure-code-sample/background.png` | `node episodes/pure-code-sample/generate.ts` | `generate.ts` 用 Node 写出 1920×1080 RGB 纸色、地面和地线，FFmpeg 将原始像素编码为 PNG；没有图像输入 |
| `episodes/pure-code-sample/data/events.json` | `node episodes/pure-code-sample/generate.ts` | `model.ts` 将镜头声明的局部事件帧号加上时间表起点，汇总成全片事件 |
| `public/episodes/pure-code-sample/impact.wav` | `node episodes/pure-code-sample/generate.ts` | `audio.ts` 用种子 149 的线性同余噪声和衰减余弦波合成 4 秒、48 kHz、单声道 PCM16；对齐点为内部第 480 个采样 |
| `public/episodes/pure-code-sample/mix.wav` | `node episodes/pure-code-sample/generate.ts` | `audio.ts` 按事件采样位置排列音效并输出 10 秒双声道；FFmpeg 测量响度，Node 施加固定增益写出 PCM16，保留采样位置 |
| `episodes/pure-code-sample/data/generated.json` | `node episodes/pure-code-sample/generate.ts` | 生成器记录命令、源码哈希、FFmpeg 版本、媒体 SHA-256 和混音参数，供缓存和护栏检查 |
| `out/pure-code-sample/pure-code-sample.mp4` | `pnpm exec remotion render PureCodeSample out/pure-code-sample/pure-code-sample.mp4 --gl=swangle --concurrency=2` | `PureCodeSample.tsx` 与 `shot.ts` 用 Canvas 2D 绘制，WebGL 着色器加入逐帧确定的颗粒和暗角；Remotion 将生成的 WAV 与画面编码为 H.264/AAC MP4 |

`generate.ts --force` 可强制重建。生成输入或产物变化时的缓存失效规则见本期 `README.md`；提交的是代码与生成记录，媒体必须在渲染前重建。

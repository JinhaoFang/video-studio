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

## #158 独立声音与验收产物

以下生成物为原创纯代码声音，无外部采样或音频输入。目录前缀统一为 `out/qa/spec-147/158/`，不进入 Git；独立声音命令不写 `public/`，尚未接进成片，接入归 #159。

表中 **S** 指这条完整命令（从仓库根目录运行）：

```sh
node episodes/pure-code-sample/sound/render.ts --events episodes/pure-code-sample/sound/events.fixture.json --out out/qa/spec-147/158 --seed 158
```

| 生成物（相对上述前缀） | 生成命令 | 代码与计算方法 |
|---|---|---|
| `mix.wav` | S | `sound/render.ts`、`mix.ts`、`dsp.ts`；24 fps 事件换算成 48 kHz 采样、对齐、混响、静默、让位和共同总线增益，PCM16 双声道 |
| `music.wav` | S | `sound/score.ts`、`mix.ts`；按 JSON 乐谱编译四件乐器，配乐小厅混响，截止帧前退完；总线处理后的配乐分轨 |
| `sfx.wav` | S | `sound/sfx.ts`、`mix.ts`；音效按事件及内部对齐点落位，按镜头内序号变化，檐下/院子混响；总线处理后的音效分轨 |
| `ambience.wav` | S | `sound/sfx.ts`、`mix.ts`；合成三个床音，密度、淡入淡出、静默/压低及院子混响；总线处理后的环境分轨 |
| `instruments/piano_felt.wav` | S | `sound/score.ts`；软起音、轻微非谐波的衰减谐波、乐句内延音，未进总线的双声道干轨 |
| `instruments/strings_pad.wav` | S | `sound/score.ts`；每声部四个独立失谐/揉弦的谐波振荡器和 expression，双声道干轨 |
| `instruments/harp.wav` | S | `sound/score.ts`；噪声激励加衰减弦模态、F 大调逐音刮奏，双声道干轨 |
| `instruments/glockenspiel.wav` | S | `sound/score.ts`；软起音，基频及 2.76/5.4 倍衰减模态，双声道干轨 |
| `sfx/rain_tail.wav` | S | `sound/sfx.ts`；固定种子颗粒脉冲和限带噪声，密度与亮度衰减 |
| `sfx/eave_drips.wav` | S | `sound/sfx.ts`；不规则泊松滴水和随机共振频率，密度曲线逐渐下降 |
| `sfx/higurashi.wav` | S | `sound/sfx.ts`；带停顿的下行调频/调幅颤音 |
| `sfx/drip_hit.wav` | S | `sound/sfx.ts`；闷湿共振、短噪声溅开，接触起音峰值为对齐点 |
| `sfx/feather_flinch.wav` | S | `sound/sfx.ts`；0.12 秒限带摩擦噪声，收紧极值为对齐点 |
| `sfx/feather_shake.wav` | S | `sound/sfx.ts`；干湿噪声和短调幅摩擦包络，甩动极值为对齐点 |
| `sfx/water_spray.wav` | S | `sound/sfx.ts`；0.4 秒由密至稀的滴水模态颗粒，第一滴为对齐点 |
| `sfx/feather_puff.wav` | S | `sound/sfx.ts`；低通气声和低频模态，蓬起极值为对齐点 |
| `sfx/pole_creak.wav` | S | `sound/sfx.ts`；受力包络下的调频纤维吱声，压身极值为对齐点 |
| `sfx/takeoff_push.wav` | S | `sound/sfx.ts`；短衰减高频敲击和噪声，蹬离接触为对齐点 |
| `sfx/pole_spring.wav` | S | `sound/sfx.ts`；180/520 Hz 衰减共振，0.19/0.40 秒弱再激励，首次弹回为对齐点 |
| `sfx/wing_flap.wav` | S | `sound/sfx.ts`；低频气流与高频羽毛噪声，扑至最低为对齐点；实际混音按序号减弱、变暗、右移及增加远场混响 |
| `sfx/drip_land.wav` | S | `sound/sfx.ts`；短湿共振和高频溅开，接触峰值为对齐点 |
| `spectra/mix.png`、`spectra/music.png`、`spectra/sfx.png`、`spectra/ambience.png` | S | `sound/measure.ts` 调 FFmpeg `showspectrumpic`，计算四条交付 WAV 的对数频率/强度检查图 |
| `spectra/instruments-piano_felt.png`、`spectra/instruments-strings_pad.png`、`spectra/instruments-harp.png`、`spectra/instruments-glockenspiel.png` | S | 同上，计算四件乐器干轨的检查图 |
| `spectra/sfx-rain_tail.png`、`spectra/sfx-eave_drips.png`、`spectra/sfx-higurashi.png`、`spectra/sfx-drip_hit.png`、`spectra/sfx-feather_flinch.png`、`spectra/sfx-feather_shake.png`、`spectra/sfx-water_spray.png`、`spectra/sfx-feather_puff.png`、`spectra/sfx-pole_creak.png`、`spectra/sfx-takeoff_push.png`、`spectra/sfx-pole_spring.png`、`spectra/sfx-wing_flap.png`、`spectra/sfx-drip_land.png` | S | 同上，逐项计算十三种参考音效的检查图 |
| `pitch.json` | S | `sound/measure.ts`；全部 53 颗实际独立干音的 Hann 窗、65536 点 FFT 全频域峰值及抛物线插值，记录音分误差与窗口 |
| `placements.json` | S | `sound/mix.ts`；19 次事件音效的起点、对齐点、事件采样与变体参数 |
| `measurements.json`、`measurements.md` | S | `sound/render.ts`、`measure.ts`；生成命令、源码/输入/媒体哈希、运行版本、参考电平、音高统计、各轨电平和总线响度报告 |
| `loudness.json` | `pnpm qa loudness out/qa/spec-147/158/mix.wav --target-lufs -16 --tolerance 1 --max-true-peak -1 --out out/qa/spec-147/158` | 仓库响度工具独立读取交付 PCM16 WAV，EBU R128 与过采样真峰值检查 |

十三种参考音效都在合成后归一至设计给定的最响 100 ms 电平，随后在场内施加 `db`；参考库不作为混音的采样输入。波形公式、未给定参数的解释、静默和延音处理见 [声音命令说明](sound/README.md)。频谱图里的检查字体不进入成片。

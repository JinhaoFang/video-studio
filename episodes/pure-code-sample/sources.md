# 生成物来源

本期没有外部图片、视频、音频、字体、模型生成素材或采样。每个像素和 PCM 采样由本仓库代码计算；画面颜色来自本期 `tokens.ts`，不加载字体模块。

以下命令从仓库根目录运行；媒体位于 `public/episodes/pure-code-sample/`，成片和检查图位于 `out/qa/spec-147/159/`，均不进入 Git。`generate.ts` 使用 #158 的种子 158 分别生成 A/B 声音，镜头和乐谱不改。

| 生成物 | 生成命令 | 代码与计算方法 |
|---|---|---|
| `public/episodes/pure-code-sample/plate-{far,field,hedge,yard,eaves}-{rain,dusk}.png`（十张） | `node episodes/pure-code-sample/generate.ts` | `plates.ts` 按 `scene.ts` 的纵深和范围，用 `engine/paint.ts` 固定种子的水粉笔触在 Node 浮点画布绘制，FFmpeg 将 RGBA 编码成 PNG；没有图像输入 |
| `episodes/pure-code-sample/data/events-a.json`、`events-b.json`，及 public 同名副本 | `node episodes/pure-code-sample/generate.ts` | `model.ts` 按 0/168 帧镜头起点汇总 S1 和对应 S2 的 `timing.ts`；A 版 24 条、B 版 27 条全片事件，B 版包含六次竹竿水珠落地 |
| `public/episodes/pure-code-sample/mix-a.wav`、`mix-b.wav` | `node episodes/pure-code-sample/generate.ts` | 串行调用 `sound/render.ts --events episodes/pure-code-sample/data/events-a.json --out out/qa/spec-147/159/sound-a --seed 158`（B 版同理），通过真实事件驱动乐谱、音效、床音、混响、让位和总线测量，再复制对应混音；48 kHz PCM16 双声道，312 帧 |
| `out/qa/spec-147/159/sound-{a,b}/` | 上述生成器自动调用声音命令 | 与下文 #158 相同的分轨、音效库、频谱和测量报告；每版各一套 `placements.json` 与 `measurements.json` |
| `episodes/pure-code-sample/data/generated.json` | `node episodes/pure-code-sample/generate.ts` | 命令、源码和设计数据 SHA-256、Node/FFmpeg 版本、事件表、媒体哈希、总线参数；本次 `status: complete`，登记十张底图、两张事件表和两份混音 |
| `out/qa/spec-147/159/pure-code-sample-a.mp4` | `pnpm exec remotion render PureCodeSampleA out/qa/spec-147/159/pure-code-sample-a.mp4 --gl=swangle --concurrency=4` | S1 + S2 A，`PureCodeSample.tsx` 用相同底图加载、局部帧 draw、各镜头 post 加默认摄影链，再编码 H.264/AAC |
| `out/qa/spec-147/159/pure-code-sample-b.mp4` | `pnpm exec remotion render PureCodeSampleB out/qa/spec-147/159/pure-code-sample-b.mp4 --gl=swangle --concurrency=4` | S1 + S2 B，方法同 A；对应混音通过字面路径 `staticFile` 引用 |

镜头 1 画面定稿后按上面两个成片命令**串行**重新渲染；若只改 `shots/s1/index.ts`、`weather.ts`，不必重做底图/声音。若改事件、底图或声音输入，先重跑生成器。两版响度、联系表和交接逐帧条的命令见 [README 管线](README.md#管线)。

**本次生成**：采用 S1 第 51 帧的 `light_break`，两版真实事件分别生成混音并登记；带声成片、响度、全部事件落位、交接连续帧、确定性和成本记录见 `out/qa/spec-147/159/report.md`（主工作区）。旧的 picture-only 静音入口及静音视频已删除。

引擎样张和单镜头预览（#152）只读上面的底图，验收图写在 `out/qa/spec-147/152/`，不进入 Git：

| 生成物 | 生成命令 | 代码与计算方法 |
|---|---|---|
| `out/qa/spec-147/152/sheet-r4.png` | `pnpm exec remotion still PureCodeModelSheet out/qa/spec-147/152/sheet-r4.png --frame=0 --gl=swangle` | `samples/ModelSheet.tsx` 调 `sparrow.ts`：距离场取样、轮廓、赛璐璐填色、手绘线条，经 `engine/post.ts` 后期 |
| `out/qa/spec-147/152/still-r3.png` | `pnpm exec remotion still PureCodeEngineStill out/qa/spec-147/152/still-r3.png --frame=0 --gl=swangle` | `samples/EngineStill.tsx` 按相机摆五层底图，画竹竿和麻雀，经后期 |
| 镜头预览 | `pnpm exec remotion still PureCodeS2A <输出.png> --frame=<帧> --gl=swangle`（`PureCodeS1`、`PureCodeS2B` 同理） | `samples/ShotPreview.tsx` 调 `shots/index.ts` 登记的镜头的 `draw`，按镜头的 `post` 覆盖值走后期 |

`generate.ts --force` 可强制重建。生成输入或产物变化时的缓存失效规则见本期 `README.md`；提交的是代码与生成记录，媒体必须在渲染前重建。

## #158 独立声音与验收产物

以下生成物为 #158 的原创纯代码声音开发验收，无外部采样或音频输入。目录前缀统一为 `out/qa/spec-147/158/`，不进入 Git；独立声音命令不直接写 `public/`，#159 生成器负责真实事件表调用和成片混音复制。

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

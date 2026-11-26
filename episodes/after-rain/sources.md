# 《雨后》的来源与生成记录

画面和声音全部由本仓库的代码生成（`GLOSSARY.md`「纯代码」）。每张工单在末尾加一节，标题写工单号，写清生成命令、产物、用到的第三方代码和许可；不改别人的节（本期约定第 2 节「登记处」）。

## #184 试听样

从仓库根目录运行 `node episodes/after-rain/auditions/generate.ts`。生成器按源码、乐谱、运行版本和输出的 SHA-256 判断能否复用三个 WAV。媒体放在 `public/episodes/after-rain/`，48 kHz、PCM16、双声道。重建命令和哈希见[试听生成清单](data/auditions.json)。

| 文件 | 内容与定位 |
|---|---|
| `audition-hum.wav` | `score.json` 中 `theme` 的钢琴右手 13 音与 `last` 的解决音移低八度，按 `hum` 的 72 BPM 哼两遍。每遍末尾的 F4 在试听中留一拍，两遍之间留半拍换气。声门激励连续穿过音符接缝。第一遍起音略开口，其余以闭口鼻音为主。|
| `audition-walla.wav` | 第 1 镜的雨中院子。两人的无词短句有各自的语速、重音、停顿和基频。较老的声音慢而带气，回话间轻笑一次。两人共用小房间反射，经两级 890 Hz 低通，声像向右 0.3。空气、瓦面落雨与较密的雨声持续 10 秒。|
| `audition-calls.wav` | 在同一电平下比较三种叫声。0.48 秒是第 1 声弱接触叫（47 ms），1.36 秒是第 2 声警报叫（两次起音相距 80 ms），2.34 秒是第 4 声清楚的接触叫（66 ms）。每声都有檐下短反射，声间保留院子的空气声。|

人声的声门脉冲、气流噪声和鼻音／开口的共振峰滤波，鸟叫的调频与谐波，以及雨声和空间处理，均由本仓库的代码计算。第三方声音实现、外部录音和音色库的使用量均为零。方法和树麻雀的频率、时长依据见[声音知识的纯代码人声合成](../../docs/video/sound.md#纯代码人声合成)和[树麻雀叫声](../../docs/video/sound.md#树麻雀叫声)。

每段试听的电平图 `levels.svg`、语谱图 `spectrum.png` 和测量 `dropouts.json`、`loudness.json` 在 `out/qa/spec-168/184/{hum,walla,calls}/`。听感定稿由设计负责人和用户在预演时完成。

## #182 正片底图

从仓库根目录运行 `node episodes/after-rain/generate.ts`（加 `--force` 跳过缓存）。生成器用 `plates.ts`（院子五层，雨和夕光两种状态，第 3 镜用）和 `plates-views.ts`（正片新机位和近景的虚化背景）里的水粉画法，烘焙全部底图到 `public/episodes/after-rain/plate-*.png`，按源码、运行版本和产物的 SHA-256 判断能否复用。每张底图对应哪个镜头、生成命令和哈希见[底图生成清单](data/generated.json)。笔刷、斑驳、相机投影都来自 `src/kit/engine/`，没有用第三方代码、照片或素材。

## #185 全片装配预演

从仓库根目录运行 `node episodes/after-rain/generate.ts`，一次性烘焙全部 24 张水粉底图、汇总 12 个镜头的全片事件表（`episodes/after-rain/data/events.json` 与 `public/episodes/after-rain/events.json`）并生成 48 kHz 双声道临时混音（`public/episodes/after-rain/mix.wav`），重建命令与输入/产物 SHA-256 哈希登记在[正片生成清单](data/generated.json)。

| 文件 | 内容与来源 |
|---|---|
| `plate-*.png`（24 张） | 由 `plates.ts` 与 `plates-views.ts` 水粉画笔代码烘焙的院子五层（雨/夕光）及 14 张新机位底图。 |
| `events.json` | 由 `model.ts` 与 `shots/timings.ts` 汇总的 12 镜全片画面事件表（24 fps，1620 帧，s11→s12 重叠 24 帧叠化）。 |
| `mix.wav` | 由 `sound/render.ts` 与 `sound/sfx.ts` 基于 `score.json`、kit 乐器/鸟叫/哼唱人声与临时拟音/环境床合成的 48 kHz PCM16 临时混音（−16 LUFS ±1 LU，真峰值不超过 −1 dBTP）。 |

所有画面与声音均由本仓库纯代码算得，无外部录音、音色库、图片或字体依赖。正式声音与混音由 #193 替换。

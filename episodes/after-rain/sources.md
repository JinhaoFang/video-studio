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

## #183 片名「雨后」与署名「遡游」印章

片名「雨后」行楷字骨与署名「遡游」汉印满白文印字骨均在 `episodes/after-rain/title/glyphs.ts` 以手写归一化坐标定义，未使用任何字体文件或外部图片素材。通用毛笔水粉书写引擎与篆刻印章引擎位于 `src/kit/engine/calligraphy.ts`、`src/kit/engine/seal.ts`。笔顺依据 GF 0023—2020《通用规范汉字笔顺规范》，行楷笔法与《说文解字》小篆「遡」「游」字形依据见 [画面风格与素材来源](../../docs/video/visual-style.md)。透明底封面静帧与 4 倍放大印章检查图由 `node episodes/after-rain/title/export-cover.ts` 生成，未引入第三方代码。

## #200 补齐底图与实绘晾衣架、暮色灯层

从仓库根目录运行 `node episodes/after-rain/generate.ts`（加 `--force` 全量重烘，总计 25 张水粉底图）并运行 `node episodes/pure-code-sample/generate.ts` 同步刷新小样院子清单。本次在 `episodes/after-rain/plates-views.ts`、`episodes/after-rain/plates.ts` 与 `episodes/after-rain/pole-stand.ts` 中完成了以下纯代码生成更新：

| 文件 / 模块 | 变更说明 |
|---|---|
| `plate-house-front-twilight.png`、`plate-house-front-twilight-lamp.png` | 将暮色屋底图拆为灭灯底图与透明底独立亮灯层（含障子亮窗、窗格、窗边与门廊/地面/水洼暖光溢出及近窗柱子暖边），由 `stage.ts` 的 `drawTwilightLamp` 按亮度叠加。 |
| `plate-house-front-rain.png`、`plate-house-takeoff.png`、`plate-paddy-wide.png`、`plate-far-dusk.png` | 移除烘死在房屋底图里的晾衣架；重绘第 1、10、12 镜和瓦顶与第 10 镜灰泥墙/木墙板/廊台/方柱；重绘第 11 镜手工弯折田埂、大块稻浪、远景树带与农舍及上抬视角落日天空；清理第 3 镜山前云脚竖柱与三角碎块。 |
| `pole-stand.ts` | 按三维世界坐标实时绘制木质叉口晾衣架（后叉—竹竿—前叉分层，与 `pole.ts` 同款色块与墨线画法）。 |

全部画面与工具均为本仓库纯代码生成，未引入第三方代码、外部图片或素材。重建命令与 SHA-256 哈希见 [正片生成清单](data/generated.json) 与 [小样生成清单](../pure-code-sample/data/generated.json)。

## #202 雨和屋里说话的正式配方

从仓库根目录运行 `node episodes/after-rain/generate.ts`，正片生成器调用 `episodes/after-rain/sound/render.ts` 重建 `mix.wav` 并刷新本清单；单独导出雨的每一层、人声子组和验收片段用 `node episodes/after-rain/sound/render.ts --out <目录> --stems`。本次在 `episodes/after-rain/sound/` 里新增 `rain.ts`、`walla.ts`、`analyze.ts`，改了 `render.ts`、`sfx.ts`、`inputs.ts`。

| 文件 | 内容与来源 |
|---|---|
| `rain.ts` | 雨的八条层：远处雨幕（成形噪声，左右去相关，随阵风成片起伏）、瓦顶、檐廊木板、树篱叶子、竹竿四种表面的近处撞击（泊松过程，每下的大小、音色、声像随机）、落在水洼上的气泡声（Minnaert 共振，频率由气泡半径定）、檐口流水和雨尾声里最后停的大水滴。雨量按场次取自时间表，第 3 镜接小样 S1 的 `rainAmount`。 |
| `walla.ts` | 屋里两个人的无词语流：沿用 #184 试听样的源—滤波配方（kit 的 `synthesizeVoice`），加隔墙的低通、高通和木头小房间的反射。 |
| `analyze.ts` | 分轨测量和语谱图工具（FFmpeg `ebur128`、`showspectrumpic`）。 |
| `mix.wav` | 由以上各层、#185 的临时拟音与配乐混成的 48 kHz PCM16 混音。 |

全部由本仓库的代码算得，没有录音、音色库或第三方声音代码。雨的物理模型和参数出处：

- 雨幕与撞击的叠加：大雨里每平方米每秒有数千次雨滴撞击，远处大片表面的撞击统计叠加成宽带噪声，谱能量集中在约 1–8 kHz；近处的少数撞击能听出单独的瞬态。参数（密度、频带）据 Marshall–Palmer 雨滴谱分布（Marshall & Palmer 1948, *J. Meteorol.* 5(4):165–166）对大雨（约 50 mm/h）的数浓度和 Atlas–Ulbrich 落速公式（Atlas & Ulbrich 1977, *J. Appl. Meteorol.* 16(12):1322–1331）估算量级，再按听感调准。
- 水面气泡声：Minnaert 共振 f = 3.26 / R（R 为气泡半径，米；Minnaert 1933, *Phil. Mag.* 16:235–248），雨滴入水带进的气泡半径约 0.75–4 mm，对应 0.8–4 kHz；上滑的短音按 van den Doel 2005, *Physically based models for liquid sounds*, ACM Transactions on Applied Perception 2(4):534–546 的做法（气泡起振后频率在几毫秒内往上滑）。
- 隔墙人声的高频衰减和距离线索：`docs/video/sound.md`「声音远近与景别」（Kolarik 等 2016 的距离线索综述）。

验收产物（分层试听、合成试听、第 1–2 镜和第 6–7 镜的混音片段、语谱图、分轨电平测量）在 `out/qa/spec-168/202/`，不进 git。

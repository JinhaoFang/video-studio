# 《雨后》的来源与生成记录

画面和声音全部由本仓库的代码生成（`GLOSSARY.md`「纯代码」）。每张工单在末尾加一节，标题写工单号，写清生成命令、产物、用到的第三方代码和许可；不改别人的节（本期约定第 2 节「登记处」）。

## #180 麻雀与远处鸟群的设定

麻雀湿、甩乱、干三种状态和新姿势在 `episodes/after-rain/sparrow.ts`，五套麻雀色指定在 `tokens-sparrow.ts`，远处鸟群在 `flock.ts`，全部用 kit 的绘制接口按帧算出。设定图是 Remotion 合成 `AfterRainSparrowSheet`（`sheets/SparrowSheet.tsx`，96 帧），看图用 `pnpm exec remotion still AfterRainSparrowSheet <输出.png> --frame=<帧号> --gl=swangle`，不另存媒体。没有引入第三方代码、外部图片或素材。（#180 落地时漏登，#168 收尾时由设计负责人补。）

## #181 走过院子的人的设定

人的下半身、走路和停步、竹篮、远处小人影在 `episodes/after-rain/person.ts`，四档光照下的人和道具色指定在 `tokens-person.ts`，全部用 kit 的绘制接口按帧算出。设定图是 Remotion 合成 `AfterRainPersonSheet`（`sheets/PersonSheet.tsx`，96 帧），看图命令同上，不另存媒体。没有引入第三方代码、外部图片或素材。（#181 落地时漏登，#168 收尾时由设计负责人补。）

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

## #188 第 4–6 镜正式镜头

从仓库根目录运行 `node episodes/after-rain/generate.ts`：第 4–6 镜按 #186 之后的时间表改成 72、108、96 帧（全片 1560 帧），事件表 `data/events.json` 和临时混音 `public/episodes/after-rain/mix.wav` 随之重新汇总、生成，底图命中缓存没有重烘。三个镜头里新画的东西（踩水的溅水、活的水洼、人的影子、风吹的草、竹竿上的影子与挂珠、光尘、飞虫）全部由 `episodes/after-rain/shots/s04-06/` 里的代码按帧算出来，颜色只取自本期令牌，没有引入第三方代码、外部图片或素材。

## #190 第 10–11 镜正式镜头与稻田底图的光

从仓库根目录运行 `node episodes/after-rain/generate.ts` 刷新事件表、混音与生成清单（底图缓存按源码哈希命中）。本次只改了 `episodes/after-rain/plates-views.ts` 的 `paintPaddyWide`：

| 文件 / 模块 | 变更说明 |
|---|---|
| `plate-paddy-wide.png` | 第 11 镜大远景的天空分暖冷两侧（画左上靠太阳最亮最暖，画右上偏冷紫），太阳方位正下方远处一条逆光发亮的反光带，近处稻田更深更饱和并在右下压一片云影，每道稻行加影子线，风吹稻浪的暗槽加深；仍是纯水粉笔触代码烘焙。 |
| `shots/s10-11/wing-pass.ts`、`ambient.ts` | 遮挡转场的翅膀（羽片、羽轴、羽缘、羽枝线）和尘、草、稻浪、雾、云都由镜头代码逐帧绘制，不读任何图片；颜色只取 `tokens.ts`、`tokens-sparrow.ts`。 |

全部画面由本仓库纯代码生成，未引入第三方代码、外部图片或素材。

## #193 正片混音

运行 `node episodes/after-rain/generate.ts`。生成器从时间表、画面事件和 `score.json` 重建 48 kHz 双声道 PCM16 母带 `public/episodes/after-rain/mix.wav`。输入、命令、母带哈希及测量记录见[正片生成清单](data/generated.json)。所有声音来自本仓库的数学合成，第三方声音代码、录音、音色库和新增依赖均为零。

单独运行 `node episodes/after-rain/sound/render.ts --stems --out out/qa/spec-168/193` 可生成以下试听和核对文件。

| 产物 | 内容 |
|---|---|
| `mix.wav`、`music.wav`、`sfx.wav`、`ambience.wav` | 成片与可相加的配乐、音效、环境三轨，共用母带包络 |
| `voice.wav`、`walla.wav`、`hum.wav` | 音效轨的人声子组、屋里两人的短句、从第 6 镜走向第 7 镜的哼唱 |
| `rain-{curtain,tile,wood,leaves,bamboo,puddles,gutters,lastDrops}.wav`、`rain-sum.wav` | 雨的八个干声层及其和 |
| `mix-s01.wav`、`mix-s01-02.wav`、`mix-s06-07.wav`、`mix-s08.wav`、`mix-s11.wav` | 从成片按时间表截出的试听 |
| `measurements.json`、`placements.json`、`stem-levels.svg` | 母带测量、逐音效落位核对、逐帧分层电平 |

从仓库根目录运行 `pnpm qa loudness out/qa/spec-168/193/mix.wav --target-lufs -16 --tolerance 1 --max-true-peak -1 --out out/qa/spec-168/193` 生成 `loudness.json`。运行 `pnpm qa dropouts out/qa/spec-168/193/mix.wav --floor -60 --fps 24 --out out/qa/spec-168/193` 生成 `dropouts.json` 和逐帧电平图 `levels.svg`。

## #187 第 1–2 镜正式镜头与屋瓦

第 1 镜的分层雨带、檐口流水、水洼涟漪和推近的相机，第 2 镜湿麻雀的张望、挪脚、寒战，都由 `episodes/after-rain/shots/s01-02/`（`index.ts`、`weather.ts`、`acting.ts`、`timing.ts`）按帧算出。雨色、低夕光、暮色三张屋瓦底图的画法改在 `episodes/after-rain/plates-views.ts`，由 `node episodes/after-rain/generate.ts` 重新烘焙并刷新生成清单。颜色只取本期令牌，没有引入第三方代码、外部图片或素材。

## #189 第 7–9 镜正式镜头

甩水、晒羽、抬头看光三个长焦镜头的表演、虚化光斑和空气里的光尘，由 `episodes/after-rain/shots/s07-09/`（`index.ts`、`performance.ts`、`atmosphere.ts`）按帧算出；近景麻雀的细节画法加在 `episodes/after-rain/sparrow.ts`。没有新底图，生成清单只刷新输入哈希。没有引入第三方代码、外部图片或素材。

## #191 第 12 镜正式镜头

暮色空竿的余震、树梢分簇受风、屋里亮灯和片尾题字盖印的排布，由 `episodes/after-rain/shots/s12/`（`index.ts`、`canopy.ts`、`title.ts`、`timing.ts`）按帧算出；片名字骨和印面沿用 #183 的 `title/`。没有新底图，生成清单只刷新输入哈希。没有引入第三方代码、外部图片或素材。

## #203 画面锁定前返修

水洼倒影和踩水碎光（`shots/s04-06/puddle.ts`）、人影（`shots/s04-06/walk.ts`）、第 5 镜虚化天的云光（`shots/s04-06/s05.ts`）、迎面飞的麻雀（`sparrow.ts`）、遮挡翅膀（`shots/s10-11/wing-pass.ts`）、远处戴斗笠的人（`person.ts`）、檐口流水（`shots/s01-02/weather.ts`）都由代码按帧算出；第 4、6 镜院子底图的小水洼改在 `plates-views.ts`，`node episodes/after-rain/generate.ts` 只重烘了 `low-s4`、`low-s6` 两张。没有引入第三方代码、外部图片或素材。

## #194 锁定版正片与发布封面

交付基线为 `1214bc6`。运行 `node episodes/after-rain/generate.ts` 重建 25 张底图、全片事件表及副本、#193 的最终混音。27 个 public 文件逐项对应生成清单的 `files`，期目录里的事件表对应 `eventTables`。清单记录每个文件的 SHA-256、输入和生成命令。[正片生成清单](data/generated.json)

| 交付物 | 来源与生成方法 |
|---|---|
| `after-rain.mp4` | `AfterRain` 按时间表逐帧绘制 12 镜，挂 `mix.wav`，由 Remotion 编码为 H.264/AAC。 |
| `cover-base.png`、`title.png` | 对正片第 995 帧运行 `remotion still --scale=2`。第二张由 `node episodes/after-rain/title/export-cover.ts --out <输出.png>` 导出，字骨和印面来自 #183。 |
| `cover-youtube.jpg`、`cover-bilibili.jpg` | FFmpeg 把透明字印叠到第 8 镜麻雀左侧的留白。B 站版从同一张 4K 底图取 4:3 画幅，独立放置字印。两张封面的完整命令见[本期交付清单](README.md#成片与封面复现)。 |
| `description.md` | 根据本期节拍表撰写的中文简介草稿，署名「溯游」。 |

B 站规格核于 **2026-11-27**。官方《web 投稿封面使用 Q&A》Q1、Q5 说明首页推荐和投稿页用 4:3，推荐列表、个人空间等用 16:9，两个比例可分别设图。创作中心上传面板提示「建议上传尺寸≥1200x900的高清图片」。本次首页封面取 1200×900，宽版可供 16:9 入口使用。[官方封面 Q&A](https://www.bilibili.com/blackboard/era/xXjSYgChj7DWlPzK.html) · [创作中心投稿页](https://member.bilibili.com/york/videoup) · [投稿页公开界面文案 `recommendedCoverResolution`](https://s1.hdslb.com/bfs/static/creator-monorepo/videoup/static/js/index.8804633e.js)

YouTube 版用 3840×2160 横幅 JPG，依据[仓库交付规范](../../docs/video/delivery.md#按展示位置区分的封面)和 [YouTube 官方缩略图说明](https://support.google.com/youtube/answer/72431?hl=zh-Hans)。正片、封面均只用本仓库画面、声音和自绘字印，本工单引入的第三方素材、移植代码与新依赖均为零。

## GitHub 展示用文件

`after-rain-web.mp4`（540p 小文件版）、`shots-12.jpg`（十二镜缩略条）和 `social-preview.jpg`（仓库社交预览图）都由 FFmpeg 从 `after-rain.mp4`、`cover-youtube.jpg` 派生，只缩放、裁切、拼格和重新编码，不加任何新画面或声音。完整命令见[本期 README「GitHub 展示」](README.md#github-展示)。没有引入第三方素材、移植代码或新依赖。

小文件版和缩略条连同成片、两张封面发在 GitHub Release `after-rain-v1`；社交预览图上传在仓库 Settings 的「Social preview」，不在 Release 里。这些媒体都按 CC BY-NC-SA 4.0 授权，署名「溯游」；仓库代码按根目录 `LICENSE` 的 MIT。

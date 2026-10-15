# NASA 朋克开场

父 spec #60，骨架工单 #61，正式配音切换 #69。范围为参考视频开场前 22 句，1920×1080、30fps；合成 `NasaPunkOpening` 是近黑底上按句接入的镜头、颗粒暗角、字幕条和逐句配音；已接入的镜头见下文「小样定稿」。正式镜头按 [storyboard.md](storyboard.md) 接入，台本见 [script.md](script.md)，来源见 [sources.md](sources.md)。

## 正式配音（#69）

当前默认 `data/timeline.json` 使用 **Alice × eleven_v4 原始配音的 rubberband 变速版**。第三轮按最新验收统一用 `tempo=1.257143`、`pitch=1` 保持音高，未再调用 ElevenLabs。倍率取原始旁白 48.40 / 目标 38.5 = 1.257142857…，保留六位小数；实际解码旁白 **38.500272 秒**，比参考旁白 37.06 秒长 **1.440272 秒**。保留台本全部停顿和 0.37 秒开头留白后，总长 **1434 帧 / 47.80 秒**，比参考 1391 帧长 **43 帧 / 1.433333 秒**。时间轴来源仍为正式配音，`source.description` 标明倍率与原始、处理目录。

原始 22 句 MP3 和同名合成 JSON 保留在 `public/episodes/nasa-punk-opening/voiceover/`，本轮逐文件哈希确认未变；相邻 `voiceover-rubberband/` 保存变速后的 22 个 44.1kHz/128kbps MP3 及 JSON。处理记录保留合成请求、原始哈希、处理后哈希和 ffmpeg 参数数组；原请求中的 `voice_settings.speed=1.2` 是第二轮历史设置，`eleven_v4` 不支持该设置，本轮实际变速只由 rubberband 完成。媒体与请求记录均不进 git。

`data/voiceover-overrides.json` 只改合成文本和上下文：L005、L010、L014 的 NASA 写成「纳萨」，L006 使用「后来，」并省略前后文；其余句子带前后各一句改写后的文本，L022 后句为完整转写中的 L023。台本、字幕、镜头与入口代码本轮均未修改。

```console
node tools/stretch-voice.ts --help
node tools/stretch-voice.ts public/episodes/nasa-punk-opening/voiceover --tempo 1.257143 --out public/episodes/nasa-punk-opening/voiceover-rubberband
pnpm qa voice public/episodes/nasa-punk-opening/voiceover-rubberband --transcript docs/research/nasa-ep04/transcript.md --ledger out/qa/spec-60/69/credits.json --out out/qa/spec-60/69/round3/voice-final --from L001 --to L022 --python /home/jh1/.cache/whisper-models/venv/bin/python --whisper-model /home/jh1/.cache/whisper-models/faster-whisper-large-v3 --overrides episodes/nasa-punk-opening/data/voiceover-overrides.json
node tools/build-timeline.ts episodes/nasa-punk-opening/script.md --durations episodes/nasa-punk-opening/data/voiceover-durations.json --source elevenlabs --label "正式配音：Alice × eleven_v4；22 句统一 rubberband tempo=1.257143、pitch=1；原始保留在 voiceover/，处理文件在 voiceover-rubberband/" --leading-silence 0.37 --out episodes/nasa-punk-opening/data/timeline.json
```

变速工具要求新输出目录不存在，拒绝覆盖原始或已有结果；换倍率时继续输入原始 `voiceover/`，另选输出目录，不累计变速。原始合成与处理后 JSON 均兼容现有 `pnpm qa voice`。`data/voiceover-durations.json` 用 ffprobe 解码帧的 `nb_samples / sample_rate` 实测，排除 MP3 编码填充；验收脚本独立复算时间轴，最大偏差 0 帧。完整参数数组、CUDA 环境和日志在验收目录；Whisper 模型和 venv 只使用仓库外缓存。

本轮 **0 credits**，累计仍为 **429 / 1500**，沿用上轮账本的保守账户剩余 **9444**，未重新查询账户；账本哈希未变。原版 CER **0.50%（1/202）**，变速后同一套评分为 **2.48%（5/202）**。L007 为 11.11%（「它→他」同音识别差异），L008 从 0% 升至 **40%**（「时间→直接」），L022 从 0% 升至 **25%**（「它蠕虫→他如虫」），其余 19 句为 0%。年月数字及 NASA／纳萨／娜萨／娜莎沿用等价规则，没有新增识别豁免。

`pnpm qa voice` 退出 **1**：12 句首尾留白不足 20ms（L001、L002、L007、L008、L009、L010、L011、L016、L017、L018、L020、L022），L007/L008 另有 ASR 首字不符；其中新增边缘风险为 L007 尾部、L017 头部。最高真峰值 **-5.5 dBTP**，未检出爆音或句中超过 0.4 秒静音。边缘标记不能证明截断，CER 也不能独立确定变速是否造成错读；本轮按要求报告，未重新合成。

TODO(design)：复核 L008、L022 变速后的 CER 退化和边缘筛查标记，决定质量是否接受。现有 S02 的角框、标签、顶部信息栏和年份时间线均能完成；其余镜头尚未接入，动画完成情况交对应工单复核。

本轮验收目录：`/root/project/video-studio.worktrees/69/out/qa/spec-60/69/round3/`。`opening.mp4` 为整段渲染，`comparison.html` 汇集 22 张同句中点对比图，`comparison-sheet.jpg` 为对比联系表；`voice-final/` 含 Whisper 原始转写、CER、真峰值、截断及静音筛查，`sentence-review.md` 和 `timeline-comparison.json` 给出参考／原版／变速后时长与逐句 CER。`acceptance.json` 保存时间轴复算、原始文件与账本哈希不变、镜头代码不变及 S02 动画边界证据。前两轮产物保留在上级目录。

## 生成与渲染

临时配音只在本机使用。将参考视频路径作为一个参数传给工具（含空格时按终端规则引用），工具按转写时间切出 22 个 48kHz PCM WAV，并用 ffprobe 实测时长。参数须用数组传给外部程序。

```console
node tools/prepare-reference.ts --help
node tools/prepare-reference.ts <参考视频> --transcript docs/research/nasa-ep04/transcript.md --script episodes/nasa-punk-opening/script.md --out episodes/nasa-punk-opening/data --audio-out public/episodes/nasa-punk-opening/temporary
pnpm exec remotion compositions
pnpm exec remotion render NasaPunkOpening out/qa/spec-60/61/opening.mp4
```

Remotion 默认 AAC 输出的尾包可能让 MP4 容器时长比视频流多不足一帧。本次验收保留原始导出为 `opening-remotion.mp4`，用 ffmpeg 复制视频码流，仅把音轨重编码裁到 `durationInFrames / fps`（本次 2225600 个 48kHz 样本），得到 `opening.mp4`；完整参数数组保存在验收目录的 `normalize-command.json`。裁整后的容器时长 46.367 秒，视频流 46.366667 秒。

以下为 #61 临时配音流程，重新运行会覆盖当前正式时间轴。`data/reference-timeline.json` 保留同格式的参考时间轴，音频路径为 `null`。`audio-durations.json` 保存临时音轨实测清单，`timeline-check.json` 仅记录 #61 的临时音轨复算与参考边界对照，最大偏差 **0 帧**，不表示正式配音与参考等长。

换音后，每句音频用 ffprobe 实测时长，清单格式为 `[{"id":"L001","durationSeconds":1.22,"src":"episodes/nasa-punk-opening/voiceover/L001.wav"}, …]`，路径相对于 `public/`。使用下列命令重新生成，合成和所有按句锚点会跟着移动。正式合成音频由 #63 及后续工单提供。

```console
node tools/build-timeline.ts --help
node tools/build-timeline.ts episodes/nasa-punk-opening/script.md --durations <时长清单.json> --source elevenlabs --label <音色和模型> --leading-silence 0.37 --out episodes/nasa-punk-opening/data/timeline.json
```

## 时间轴约定

格式版本 `version: 1`，`fps: 30`，`source.kind` 为 `temporary` 或 `elevenlabs`，`source.description` 记录参考文件或音色与模型。`leadingSilenceSeconds` 是第一句起点的秒数；`durationInFrames` 是含末句停顿的总帧数。`lines` 按 L001 起连续编号。

每句字段：`id`、`text`、`startFrame`（含）、`endFrame`（不含）、`pauseAfterSeconds`、`audioDurationSeconds`、`audioSrc`（相对 public 的路径，参考轴为 null）。秒数先转整数纳秒累计，只在绝对边界四舍五入到帧；不得把每段音频和每个停顿分别取整再相加。

开头留白 0.37 秒；参考轴末句结束 45.01 秒，句后停顿为下一句在 46.35 秒开始前的 1.34 秒。参考轴总长取整为 **1391 帧，即 46.366667 秒**，相对原始秒数差半帧，末句的取整终点为 1350 帧、尾部为 41 帧。正式轴时长见上文，停顿不变。

镜头只使用句子锚点。`sentenceFrame` 接受整数帧偏移（可以为负），`sentence` 可读取末帧；不把参考视频秒数写进镜头：

```tsx
import { Sequence } from "remotion";
import { sentence, sentenceFrame } from "./sentence-timing";

<Sequence
  from={sentenceFrame(timeline, "L003", 12)}
  durationInFrames={
    sentence(timeline, "L005").endFrame - sentenceFrame(timeline, "L003", 12)
  }
>
  <Scene />
</Sequence>;
```

`timeline` 可作为合成 props 传入；`calculateMetadata` 同步时长和帧率。字幕与音频都使用同一份起止帧；字幕条句末多留 9 帧再收回彩条（见「小样定稿」的字幕动效）。每句量化导致的音频起点偏移不超过半帧，音频最多裁掉不足一帧的尾部。

## 按句验收

```console
pnpm qa sentence episodes/nasa-punk-opening/data/timeline.json L001 --offset-seconds 0.5
pnpm qa sentence episodes/nasa-punk-opening/data/reference-timeline.json L001 --offset-frames 15 --format json
pnpm qa compare <渲染视频> <参考视频> <渲染秒数> --offset <参考秒数减渲染秒数> --out out/qa/spec-60/61/compare/L001
pnpm qa sheet out/qa/spec-60/61/opening.mp4 --from 0 --to 46 --every 2 --out out/qa/spec-60/61/sheet
```

`sentence` 默认只向标准输出写秒数；脚本调用时用 `node tools/qa.ts sentence …` 或 `pnpm --silent qa sentence …`，取得两边独立时间轴上的值再用参数数组调用 compare。也可用 `--format frames` 或 `json`。秒偏移按最近帧取整；偏移必须留在句内，秒与帧选项互斥。输出秒数向上保留至纳秒，避免循环小数在 compare 中落到上一帧。

本次验收目录是 `/root/project/video-studio.worktrees/61/out/qa/spec-60/61/`，含整片、每 2 秒联系表、三张按句对比图和时间轴摘录。

## 小样定稿（#64）

S02（L003～L005，参考 0:04～0:09）由设计负责人亲手做，是其余镜头工单的定稿。代码在 `ShotWormHud.tsx`，组件在 `PhotoCamera.tsx`、`Hud.tsx`、`Subtitles.tsx`、`FilmFinish.tsx`；所有数值从风格令牌 `src/styles/nasa-punk/tokens.ts` 取，字体从同目录 `fonts.ts` 取。镜头工单照下面的参数和写法做，验收逐项对照。

**通用规则**

- 颜色、字体、屏幕上的字号、时长只从令牌取，镜头代码里不写色值和字体名。新镜头需要令牌里没有的值，先在令牌里加一项，汇报里写明。画在照片坐标里、跟着某张照片缩放的标注尺寸（如 `wormHudStyle` 的字号和间距）属于这张照片的构图，写在镜头里。
- 时间只用句子锚点加帧偏移：`sentenceFrame(timeline, "L004", 9)`。镜头放进一个 `Sequence`，跨度也由锚点算（见 `shotWormHudSpan`）。
- 每个镜头都在颗粒暗角和字幕条下面：`Opening.tsx` 里镜头先画，`FilmFinish`、`Subtitles` 最后画，镜头自己不画字幕和颗粒。

**小样定下的参数**

| 项目         | 定稿值                                                                                                                           | 令牌                                          |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| HUD 角框线宽 | 屏幕上 3.2px，不随镜头缩放（照片坐标里用 `bracketStroke / 镜头缩放`）                                                            | `hud.bracketStroke`                           |
| 角框臂长     | 框宽的 11%                                                                                                                       | `hud.bracketArmRatio`                         |
| 角框画线     | 8 帧（0.27 秒），四角同时从角点向外画，ease-out                                                                                  | `motion.lineDrawFrames`                       |
| 顶部信息栏   | 细线 1px 从左往右画 12 帧；三段等宽小字 15px、字距 0.18em，依次打出                                                              | `motion.barDrawFrames`、`typeScale.hudBar`    |
| 等宽标签打字 | 每帧 1.5 个字符（45 字/秒），先打黑色主标签，接着打灰色副标签                                                                    | `motion.typeCharsPerFrame`                    |
| 标签样式     | Space Mono，主标签 700 近黑、副标签 400 灰，字距 0.22em；时间线 700、字距 0.3em，破折号用 Inter 字形                             | `typeScale.hudLabel`、`typeScale.hudTimeline` |
| 照片缓推     | 每秒放大 1%，线性；切到新景别时从新景别的缩放重新开始                                                                            | `motion.pushPerSecond`                        |
| 软转场       | 镜头内切景别、镜头进场都用 8 帧（0.27 秒）溶解                                                                                   | `motion.dissolveFrames`                       |
| 照片调色     | `sepia(0.2) saturate(0.82) contrast(1.04) brightness(0.96)`                                                                      | `finish.photoFilter`                          |
| 颗粒         | 灰度分形噪声，频率 0.85，overlay 叠加，不透明度 0.11，每帧换种子（24 帧一循环）                                                  | `finish.grain*`                               |
| 暗角         | 中心 50% 以内不压，边缘到近黑，强度 0.55                                                                                         | `finish.vignette*`                            |
| 字幕条       | 底边距 48px、高 58px、左右内边距 28px；左端四道竖色条各 5.5px（彩条取样色）；思源黑体代用字 36px/500；底色 `rgba(58,53,49,0.86)` | `subtitle`、`typeScale.subtitle`              |
| 字幕动效     | 每句从彩条往右展开 6 帧，句末多留 9 帧再收回彩条 6 帧；两句间隔 ≤5 帧（连读）直接换字不收；间隔 >30 帧时彩条也淡出（6 帧）       | `subtitle.*Frames`                            |
| 字幕显示文字 | 中文与英文、数字之间自动加空格（`2020年5月` 显示为 `2020 年 5 月`），台本原文不变                                                | `text-spacing.ts`                             |

**S02 的节奏**（相对句子起点的帧数）

| 事件                                 | 锚点      |
| ------------------------------------ | --------- |
| 镜头溶入（远景）                     | L003 −4   |
| 顶部信息栏画线、打字；右下出处行淡入 | L003 +6   |
| 角框画出                             | L003 +24  |
| 标签开始打字                         | L003 +36  |
| 溶解切到近景，时间线开始打字         | L004 +9   |
| 镜头结束（S03 接着用近景，见下）     | L005 结束 |

照片坐标（NHQ202005210001，6283×3844）：字标中心 (3558, 2201)，角框 (3321, 2110) 起 475×182。远景把字标中心放在屏幕 (931, 540)、缩放 0.58；近景放在 (950, 459)、缩放 1.19。S03（`VOID · 1992`）和 S04 发生在同一张近景上：复用导出的 `rolloutPhoto`、`closeFraming`、`wormHudStyle`，HUD 画在照片坐标里，贴条、彩条跟着镜头一起推。

验收产物在 `out/qa/spec-60/64/`：`s02.mp4` 是第 90～300 帧（0:03～0:10）的片段，`sheet/` 是它每 0.5 秒一格的联系表（格子上的时间从片段开头算），`compare/L003～L005/` 是按句对比图。

和参考视频不一样的地方：参考把连读的 L004、L005 合成一条字幕显示，这里一句一条；参考的字幕在 L003 句中有全角空格（`箭体上　印着…`），台本照 `transcript.md` 没有。

## 第一章补充镜头（#66）

`ShotFirstChapter.tsx` 在总合成里只登记一个 `Sequence`，补上 S01、S03、S04。字幕条、颗粒暗角继续由总合成统一绘制。时间都由传入时间轴的句子锚点计算，换正式配音无需改镜头代码。

| 事件               | 锚点与实现                                                                                                                                           |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| S01 字标特写       | 从 L001 前的开头留白开始，使用 NHQ202005210001，字标中心放在屏幕 (1025, 540)、缩放 1.43                                                              |
| S01 中景软切       | L002 +18 帧，字标中心 (980, 540)、缩放 0.94，8 帧溶解                                                                                                |
| 接入 S02 远景      | 在 S02 开始前 8 帧软切到 `wideFraming`；覆盖 S02 的初始溶入，到其开始后 8 帧卸载。两边相机在交接帧的位置、缩放及每秒 1% 的缓推一致，HUD 尚未开始绘制 |
| S03 贴条拍下       | L005 +30 帧，8 帧 ease-out；从 1.11 倍落到原大，竖向落下距离复用 `labelGap`，终点旋转 −3°，带投影                                                    |
| S04 撕走贴条       | L006 +24 帧，8 帧 ease-in，上提一个贴条高度并淡出                                                                                                    |
| S04 滑出彩条和标签 | L007 +24 帧，8 帧 ease-out，从左向右展开；四色按参考自上而下为红、黄、绿、蓝，下方 `→ NASA-PUNK · 2023`                                              |
| 章末溶到近黑       | L007 结束后 8 帧；S02 的近景只延长保持并参与章末溶解，L003～L005 的切景、HUD 与缓推速率不变                                                          |

新增令牌集中在 `firstChapter`，已有令牌值未修改。取景、贴条尺寸、旋转、标签和彩条间距以参考 1、3、9.6、12.5 秒帧测量为依据；标签复用 Space Mono、HUD 字重和字距，缓推、溶解、ease-out 复用小样。贴条使用 #62 的 `textures/torn-paper-generated.png`，以 SVG 视窗裁掉透明留白，保留真实 alpha 撕边，文字和投影另外叠加。S03/S04 只画叠层，使用 `rolloutPhoto`、`closeFraming`、`wormHudStyle` 和 S02 同一个近景起点计算相机，不重新画照片或 HUD。

`TODO(design)`：复核参考取样的新令牌，以及未单独定稿的拍下、撕走、滑入动效（保守采用小样 8 帧和既有三次缓动）。#62 的纹理上下边有细碎撕口，满足纹理撕边要求；左右两端为平直裁断，与参考两端明显锯齿状的撕边仍有差异，是否补侧边形态由设计负责人确认。

本工单验收产物目录：`/root/project/video-studio.worktrees/66/out/qa/spec-60/66/`。包含 `chapter-01.mp4`、0:00～0:14 每 0.5 秒联系表 `sheet/`、L001/L002/L005～L007 各一张的 `compare/`、两边独立句子取点记录 `sentence-points.json`、动态自检 `motion/motion.json`，以及本次使用的时间轴快照和命令记录。片段末尾属于未接入的第二章，只作第一章衔接定位；正式配音切换由 #69 处理。

补充实测在 `checks/results.json`：小样改动前后第 150、245、270 帧的 PNG 哈希完全一致；仅把 L002 延长 48 帧后，贴条和风格彩条对应画面也完全一致地后移 48 帧。`handoff/`、`peel/` 另附每 0.1 秒的局部联系表。L006 对比取句内贴条保持时刻，撕离过程见 `peel/`，L007 对比取彩条展开完成时刻。参考也将 L006、L007 合成一条字幕，本工单继续按现有字幕组件逐句显示；照片调色、彩条色值、HUD 线宽和字体都继续以小样为准。

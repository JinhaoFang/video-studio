# NASA 朋克开场

父 spec #60，骨架工单 #61，正式配音切换 #69。范围为参考视频开场前 22 句，1920×1080、30fps；合成 `NasaPunkOpening` 是近黑底上按句接入的镜头、颗粒暗角、字幕条和逐句配音；已接入的镜头见下文「小样定稿」。正式镜头按 [storyboard.md](storyboard.md) 接入，台本见 [script.md](script.md)，来源见 [sources.md](sources.md)。

## 正式配音（#69）

当前默认 `data/timeline.json` 使用 **Alice × eleven_v4 原始配音的 rubberband 变速版**。第四轮按最新验收保留默认 `tempo=1.257143`，仅 L008 例外改为 **1.15 倍**，全部 `pitch=1` 保持音高。未调用 ElevenLabs。实测旁白 **38.612925 秒**，比参考旁白 37.06 秒长 **1.552925 秒**；保留台本停顿和 0.37 秒开头留白后，总长 **1437 帧 / 47.90 秒**，比第三轮增加 **3 帧 / 0.10 秒**，比参考 1391 帧长 **46 帧 / 1.533333 秒**。来源仍为正式配音，`source.description` 写明默认倍率、L008 例外及目录。

原始 22 句 MP3 和同名合成 JSON 保留在 `public/episodes/nasa-punk-opening/voiceover/`；第三轮 `voiceover-rubberband/` 原样保留。本轮从原始文件生成到此前不存在的新目录 **`voiceover-rubberband-v2/`**，含 22 个 44.1kHz/128kbps MP3 和同名 JSON，时间轴全部指向新目录。新旧变速音频逐文件 SHA256 对比，仅 L008 字节变化，其余 21 句完全一致。原始文件、旧目录和账本哈希均未变。JSON 保留合成请求及输入/输出哈希，`postProcessing.tempo` 记录每句实际倍率，另记音高和 ffmpeg 参数数组；媒体及本机处理记录不进 git。

`data/voiceover-overrides.json` 沿用批准的合成文本和上下文：L005、L010、L014 的 NASA 写成「纳萨」，L006 使用「后来，」并省略前后文。原始请求中的 `voice_settings.speed=1.2` 是第二轮历史设置，`eleven_v4` 不支持该设置；实际变速由 rubberband 完成。台本、字幕、镜头与入口代码本轮均未修改。

```console
node tools/stretch-voice.ts --help
node tools/stretch-voice.ts public/episodes/nasa-punk-opening/voiceover --tempo 1.257143 --tempo-override L008=1.15 --out public/episodes/nasa-punk-opening/voiceover-rubberband-v2
pnpm qa voice public/episodes/nasa-punk-opening/voiceover-rubberband-v2 --transcript docs/research/nasa-ep04/transcript.md --ledger out/qa/spec-60/69/credits.json --out out/qa/spec-60/69/round4/voice-L008 --from L008 --to L008 --python /home/jh1/.cache/whisper-models/venv/bin/python --whisper-model /home/jh1/.cache/whisper-models/faster-whisper-large-v3 --overrides episodes/nasa-punk-opening/data/voiceover-overrides.json
node tools/build-timeline.ts episodes/nasa-punk-opening/script.md --durations episodes/nasa-punk-opening/data/voiceover-durations.json --source elevenlabs --label "正式配音：Alice × eleven_v4 原始合成；默认 ffmpeg rubberband tempo=1.257143，L008 例外 tempo=1.15；全部 pitch=1 保持音高；NASA 读纳萨，L006 后来，去上下文；原始文件保留在 voiceover/，处理文件在 voiceover-rubberband-v2/" --leading-silence 0.37 --out episodes/nasa-punk-opening/data/timeline.json
```

变速工具要求新输出目录不存在，拒绝覆盖原始或已有结果；换倍率时仍输入原始 `voiceover/`，另选输出目录，不累计变速。`--tempo-override L008=1.15` 可多次传入以覆盖不同句子；重复或不存在的编号、无效倍率会报错。JSON 可直接交给现有 `pnpm qa voice`。`data/voiceover-durations.json` 用 ffprobe 解码帧的 `nb_samples / sample_rate` 实测，排除 MP3 编码填充；独立复算时间轴最大偏差 **0 帧**。完整参数数组、CUDA 环境和日志在验收目录；Whisper 沿用仓库外缓存，ffmpeg 解码为数组以避开 PyAV 不兼容。

本轮 **0 credits**，累计仍为 **429 / 1500**，沿用账本的保守账户剩余 **9444**，未重新查询账户。L008 用同一套 large-v3、CUDA/float16、beam=5、无台本提示词评分，转写 **「时间往回倒」**，CER 从第三轮 **40%（2/5）降为 0%（0/5）**；解码时长从 1.209093 秒变为 **1.321746 秒**，真峰值 **-6.6 dBTP**，无爆音、句中长静音和 ASR 首尾不符。QA 退出 **1**，仅余原有的头部留白不足 20ms 筛查标记；这是最新验收已接受的边缘标记，未据此加静音或重配。

其余 21 句音频字节一致，按最新验收范围沿用第三轮评分：L007 为 11.11%、L022 为 25%，均为已接受的同音识别差异，其余为 0%；合并本轮 L008 后 CER 为 **1.49%（3/202）**，这是复用结果的汇总，并非本轮重跑 22 句。原有 12 句边缘留白标记仍保留。S02 在 L008 之前，时间边界未变，原有动画完成结论沿用；其余镜头交对应工单。

本轮验收目录：`/root/project/video-studio.worktrees/69/out/qa/spec-60/69/round4/`。`voice-L008/` 保存原始识别、CER 及音频诊断，`cli-check.json` 保存 10 项命令行实测，`acceptance.json` 保存倍率、哈希和时间轴复算证据，`sentence-review.md` 与 `timeline-comparison.json` 给出逐句时长及评分来源。本轮按最新验收只复核 L008；第三轮整段渲染、22 张逐句对比图及联系表保留在 `/root/project/video-studio.worktrees/69/out/qa/spec-60/69/round3/`，对应第三轮时间轴，未冒充本轮渲染。

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

## 配乐、嘀嗒与混音（#70）

`node tools/mix-opening.ts` 从正式 `data/timeline.json` 读取每句音频，按合成相同的起点、末帧裁切规则拼接旁白；程序生成贯穿全长的 80 Hz 正弦铺底与 2300 Hz 翻牌嘀嗒，再以 ffmpeg 两遍 `loudnorm` 输出 48kHz/24bit 双声道 `mix.wav`。不调用外部生成服务，不新增依赖。配乐全长 RMS 比旁白低 **20 dB**；当前原始旁白为 **-25.81 dBFS RMS**、配乐为 **-45.81 dBFS RMS**，这是共同响度归一化前的单声道分轨测量。嘀嗒用每次翻牌间隔长度的 Hann 包络，幅度随仍在乱跳的数字位数减少。音色、包络与电平差采用保守实现，待设计负责人确认（`TODO(design)`），不做审美细调。

翻牌钟时间直接读取 `--tokens` 所指文件的 `motion`、`proposal.clock`，不复制令牌数值。与 #67 `Shot1974Proposal.tsx` / `FlipYearClock.tsx` 对齐：从 `L008 + motion.chapterDissolveFrames + motion.dissolveFrames` 开始，到该帧加 `proposal.clock.scrambleFrames` 结束，每隔 `stepFrames` 一次；每位的停止时间同样取 `stopStaggerFrames`。当前正式轴 L008 / L009 / L010 起点为 **413 / 459 / 492 帧**，嘀嗒为 **429～474 帧（14.30～15.80 秒，末帧不含）**，15 次，逐位停在 465 / 468 / 471 / 474 帧。改时间轴后重跑即可；区间不再覆盖 L008～L009 或越过 L010 时会报错，要求核对镜头。

#67 尚未合并时，只读它的令牌文件；合并后将 `--tokens` 换成本 worktree 的 `src/styles/nasa-punk/tokens.ts`。当前分支尚未包含 `proposal.clock`，直接使用本地令牌会明确报错，不回退到另一份硬编码数字。

```console
node tools/mix-opening.ts --help
node tools/mix-opening.ts episodes/nasa-punk-opening/data/timeline.json --tokens /root/project/video-studio.worktrees/67/src/styles/nasa-punk/tokens.ts --out out/qa/spec-60/70/mix
pnpm exec remotion render NasaPunkOpening out/qa/spec-60/70/opening-remotion.mp4 --concurrency 4
node tools/mix-opening.ts episodes/nasa-punk-opening/data/timeline.json --tokens /root/project/video-studio.worktrees/67/src/styles/nasa-punk/tokens.ts --out out/qa/spec-60/70/mix --video out/qa/spec-60/70/opening-remotion.mp4
pnpm qa loudness out/qa/spec-60/70/mix/opening-mixed.mp4 --target-lufs -16 --tolerance 1 --max-true-peak -1 --out out/qa/spec-60/70/final
```

采用**渲染后替换音轨**：`--video` 校验输入视频的帧率和帧数，复制视频码流，仅映射一条混音 AAC（320kbps）到 `opening-mixed.mp4`。这样归一化后的音轨不会与原来的逐句配音重复叠加，并能在 AAC 编码之后验收；`Opening.tsx` 无需修改，Studio 仍播放逐句旁白。输出的分轨、混音与 MP4 均在忽略目录 `out/`，不进 git。ffmpeg 参数数组、素材与令牌哈希、句子锚点和电平测量写入 `mix-report.json`；逐命令日志与参数另存，便于复现和排错。

归一化以 -16 LUFS 为目标，内部留 -2 dBTP 的编码余量；`linear=true` 在本次峰均比下自动采用动态归一化。`LRA=20` 是 ffmpeg 支持的宽松归一化参数，不设 LRA 验收阈值。本次最终 MP4 实测 **-16.0 LUFS、-2.0 dBTP、LRA 2.7 LU**，低于 -45 dB 且超过 0.4 秒的静音段 **0**。参考前 **46.000 秒**用同样设置测得 **-15.9 LUFS、-2.6 dBTP、LRA 2.8 LU**。验收根目录为 `/root/project/video-studio.worktrees/70/out/qa/spec-60/70/`，`final/` 与 `reference/` 保存同规格的全段频谱图、响度和静音报告；`clock-alignment.json` 保存 #67 对齐证据。当前 MP4 的画面只含本分支已经接入的镜头，用于本工单音轨验收；最终镜头集成后按同一命令替换音轨。

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

## 第二章上半 S05～S07（#67）

`Shot1974Proposal.tsx` 接入 L008～L014；总合成只新增一个 `Sequence`，起点为 L008 −8，终点为 L015 开始。镜头自己不画字幕和颗粒暗角。`proposal` 是本工单新增的令牌组，已有令牌数值不变；几何按参考 15.5、19.5、25.5 秒的 852×480 帧折算到 1920×1080，纸张、胶带和桌面使用 #62 的纹理，徽章使用 `logos/nasa-meatball.svg`。

| 事件                             | 句子锚点 / 参数                                          |
| -------------------------------- | -------------------------------------------------------- |
| 章节近黑覆盖层溶入               | L008 −8 至 L008，沿用 `chapterDissolveFrames`            |
| 翻牌钟溶入 / 初始 2020           | L008 +8 起，8 帧软转场                                   |
| 各位乱跳                         | L008 +16 起，共 45 帧；每 3 帧换一次，逐位相隔 3 帧停稳  |
| 肉丸纸片溶入                     | L010 +8 起，8 帧软转场                                   |
| 红圈画出                         | L011 起，8 帧，沿用小样 cubic ease-out 和 3.2px 纸面线宽 |
| 红字 `"肉丸"` 打出               | L011 +12 起，沿用每帧 1.5 字符                           |
| 同一张纸拉回、镜头下移、网格溶入 | L013 −8 起，12 帧，沿用小样 cubic ease-out               |
| 网格区 Inter Bold `NASA` 溶入    | L013 +8 起，8 帧                                         |
| 网格纸停留                       | 至 L015 开始；沿用每秒放大 1% 的线性缓推                 |

`FlipYearClock` 接受 `fromYear`、`targetYear`、`start`、`scrambleFrames`；年份是 0～9999 整数，保留四位前导零。随机序列固定种子，每次跳数增量为 1～9，保证各位连续 tick 不会重复；各位停稳后只画静态字面。翻页是沿中缝旋转的上半字面，声音由声音工单接入。

`RedAnnotation.tsx` 是本期内可复用的批注组件，#68 可直接导入：`shape` 支持 `circle`、`underline`、`strike`、`arrow`；必填纸面坐标 `left/top/width/height` 和当前 Sequence 内的 `start`，可选 `durationInFrames`、`stroke`、`color`、`rotation`。默认用现有红色、3.2px 线宽、8 帧画线。路径使用 dash offset 逐段露出，无淡入。调用示例：

```tsx
<RedAnnotation
  shape="underline"
  left={approvedBox.left}
  top={approvedBox.top}
  width={approvedBox.width}
  height={approvedBox.height}
  start={sentenceFrame(timeline, "L019") - sequenceStart}
/>
```

`ProposalPaper` 导出同一张纸的徽章、网格和标题栏，接收 `circleStart`、`nicknameStart`、`gridStart`、`logotypeStart` 四个局部帧锚点；#68 接续网格纸时可复用，几何和收束景别见 `proposal.paper`。本镜头在 L015 前结束，不覆盖后续字形动画。

验收产物：`/root/project/video-studio.worktrees/67/out/qa/spec-60/67/`。其中 `s05-s07.mp4` 是 0:13～0:28 的片段（播放器 0 秒对应合成 13 秒）；`compare/L008`～`L014` 是两边分别按句取点的对比，`sheet/contact-sheet.jpg` 是每 0.5 秒一格的合并联系表，`motion/motion.json` 是动态报告，`review.md` 记录偏移、复核结论和并行依赖。

TODO(design)：确认参考取样的纸片/镜头几何、SVG 手绘曲线和保守句内偏移；#62 纹理在 1080p 已能看见纸纤维和胶带颗粒，是否再减弱由设计验收决定。当前分支未接入 #66 第一章和 #68 后续字形；真实章节衔接须合并 #66 后复核，本工单只提供近黑入场。参考字幕会合并连读句，本镜头继续使用既有逐句字幕；纸面比参考更暖、纹理更明显，沿用现有色板和生成素材，不改小样参数。

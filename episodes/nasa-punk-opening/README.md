# NASA 朋克开场

父 spec #60，骨架工单 #61。范围为参考视频开场前 22 句，1920×1080、30fps；当前合成 `NasaPunkOpening` 只显示近黑底、居中文字和逐句临时音轨。正式镜头按 [storyboard.md](storyboard.md) 接入，台本见 [script.md](script.md)，来源见 [sources.md](sources.md)。

## 生成与渲染

临时配音只在本机使用。将参考视频路径作为一个参数传给工具（含空格时按终端规则引用），工具按转写时间切出 22 个 48kHz PCM WAV，并用 ffprobe 实测时长。参数须用数组传给外部程序。

```console
node tools/prepare-reference.ts --help
node tools/prepare-reference.ts <参考视频> --transcript docs/research/nasa-ep04/transcript.md --script episodes/nasa-punk-opening/script.md --out episodes/nasa-punk-opening/data --audio-out public/episodes/nasa-punk-opening/temporary
pnpm exec remotion compositions
pnpm exec remotion render NasaPunkOpening out/qa/spec-60/61/opening.mp4
```

Remotion 默认 AAC 输出的尾包可能让 MP4 容器时长比视频流多不足一帧。本次验收保留原始导出为 `opening-remotion.mp4`，用 ffmpeg 复制视频码流，仅把音轨重编码裁到 `durationInFrames / fps`（本次 2225600 个 48kHz 样本），得到 `opening.mp4`；完整参数数组保存在验收目录的 `normalize-command.json`。裁整后的容器时长 46.367 秒，视频流 46.366667 秒。

`data/timeline.json` 的起止帧直接来自转写时间；`data/reference-timeline.json` 是同格式的参考时间轴，音频路径为 `null`。`audio-durations.json` 保存实测清单，`timeline-check.json` 比较「音频时长 + 句后停顿」复算和直接时间轴的全部边界。当前最大偏差 **0 帧**。

换音后，每句音频用 ffprobe 实测时长，清单格式为 `[{"id":"L001","durationSeconds":1.22,"src":"episodes/nasa-punk-opening/voiceover/L001.wav"}, …]`，路径相对于 `public/`。使用下列命令重新生成，合成和所有按句锚点会跟着移动。正式合成音频由 #63 及后续工单提供。

```console
node tools/build-timeline.ts --help
node tools/build-timeline.ts episodes/nasa-punk-opening/script.md --durations <时长清单.json> --source elevenlabs --label <音色和模型> --leading-silence 0.37 --out episodes/nasa-punk-opening/data/timeline.json
```

## 时间轴约定

格式版本 `version: 1`，`fps: 30`，`source.kind` 为 `temporary` 或 `elevenlabs`，`source.description` 记录参考文件或音色与模型。`leadingSilenceSeconds` 是第一句起点的秒数；`durationInFrames` 是含末句停顿的总帧数。`lines` 按 L001 起连续编号。

每句字段：`id`、`text`、`startFrame`（含）、`endFrame`（不含）、`pauseAfterSeconds`、`audioDurationSeconds`、`audioSrc`（相对 public 的路径，参考轴为 null）。秒数先转整数纳秒累计，只在绝对边界四舍五入到帧；不得把每段音频和每个停顿分别取整再相加。

开头留白 0.37 秒；末句结束 45.01 秒，句后停顿为下一句在 46.35 秒开始前的 1.34 秒。总长取整为 **1391 帧，即 46.366667 秒**，相对原始秒数差半帧，末句的取整终点为 1350 帧、尾部为 41 帧。

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

`timeline` 可作为合成 props 传入；`calculateMetadata` 同步时长和帧率。字幕与音频都使用同一份起止帧，停顿时字幕清空。每句量化导致的音频起点偏移不超过半帧，音频最多裁掉不足一帧的尾部。

## 按句验收

```console
pnpm qa sentence episodes/nasa-punk-opening/data/timeline.json L001 --offset-seconds 0.5
pnpm qa sentence episodes/nasa-punk-opening/data/reference-timeline.json L001 --offset-frames 15 --format json
pnpm qa compare <渲染视频> <参考视频> <渲染秒数> --offset <参考秒数减渲染秒数> --out out/qa/spec-60/61/compare/L001
pnpm qa sheet out/qa/spec-60/61/opening.mp4 --from 0 --to 46 --every 2 --out out/qa/spec-60/61/sheet
```

`sentence` 默认只向标准输出写秒数；脚本调用时用 `node tools/qa.ts sentence …` 或 `pnpm --silent qa sentence …`，取得两边独立时间轴上的值再用参数数组调用 compare。也可用 `--format frames` 或 `json`。秒偏移按最近帧取整；偏移必须留在句内，秒与帧选项互斥。输出秒数向上保留至纳秒，避免循环小数在 compare 中落到上一帧。

本次验收目录是 `/root/project/video-studio.worktrees/61/out/qa/spec-60/61/`，含整片、每 2 秒联系表、三张按句对比图和时间轴摘录。

TODO(design)：素字幕字号暂按现有验收文字 24px/540p 放大为 48px/1080p；正式字号、字幕条与镜头由后续设计定稿覆盖。

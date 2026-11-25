# 独立声音合成（#158）

从仓库根目录运行，输出 48 kHz、PCM16 WAV；无需新增依赖。Node 计算全部声音，FFmpeg 只测量电平和制作检查频谱图，不读取外部音频或采样。

```sh
node episodes/pure-code-sample/sound/render.ts --help
node episodes/pure-code-sample/sound/render.ts --events episodes/pure-code-sample/sound/events.fixture.json --out out/qa/spec-147/158 --seed 158
pnpm qa loudness out/qa/spec-147/158/mix.wav --target-lufs -16 --tolerance 1 --max-true-peak -1 --out out/qa/spec-147/158
node --test episodes/pure-code-sample/sound/sound.test.ts episodes/pure-code-sample/pipeline.test.ts
pnpm verify --static
```

参数：`--events` 默认本期 `data/events-a.json`，`--out` 默认 `out/qa/spec-147/158`，`--seed` 默认 158，接受 0–4294967295 的整数。事件表必须保持现有格式：24 fps、48000 Hz，`shotTable` 的 `id/startFrame/durationInFrames`，以及 `events` 的 `frame/kind/description/shotId/localFrame`。本期命令限一分钟以内，防止误输入长时间表超出资源预算。

`generate.ts` 已按 A/B 真实事件表分别调用本命令，并将混音复制到 `public/episodes/pure-code-sample/mix-{a,b}.wav`。开发夹具 `events.fixture.json` 仅按派发的镜头剧本约数建表，不能替代真实事件验收。当前真实 `light_break` 在第 62 帧，`light` 乐句最晚到第 152 帧，越过 `drip_fall` 第 145 帧的截止约束；生成器会保留 `audio-pending` 状态并报错，待设计负责人调整乐谱后重跑。锚点按事件种类的最早全片帧解析，附加 `offsetFrames`；镜头锚点由传入 `shotTable` 换算，允许用镜头末帧边界标记截止点。乐句按 `tempo` 和音符 `beat/beats` 先验算结束帧；越过 `mustEndBefore`（可限定乐器）立即报错。退出码：成功/帮助 0，量化检查失败 1，参数、数据或运行错误 2；错误以“出错：”开头。

## 产物

同目录重跑覆盖同名产物，不累积轮次。完整一轮 21 个 WAV、21 张频谱图，以及测量与落位 JSON/Markdown；响度命令另写 `loudness.json`。

- `mix.wav`：13 秒双声道混音。
- `music.wav`、`sfx.wav`、`ambience.wav`：总线处理后的双声道分轨，共享同一总线增益，三轨相加可还原混音，PCM16 独立量化会有数个量化单位的差异。
- `instruments/{piano_felt,strings_pad,harp,glockenspiel}.wav`：总线处理前的双声道乐器干轨，便于检查，不作为混音分轨相加。
- `sfx/<sound.json 中的音效名>.wav`：十三种参考库单声道 WAV。混音按事件序号重新合成变体；参考库文件不是混音采样输入。
- `spectra/*.png`：以上每个 WAV 的频谱图，时间横轴、对数频率纵轴、对数颜色强度；图中文字仅在检查图内，不进入成片。
- `measurements.json`、`measurements.md`：输入/源码 SHA-256、执行参数、总线电平、各轨峰值/RMS/响度、参考音效电平、各乐器音高统计。
- `pitch.json`：每颗实际编译的干音的音高测量窗口、期望/估计频率、带符号音分误差。报告统计绝对误差的中位数和线性插值 90 分位。
- `placements.json`：每次音效的事件全片帧、内部对齐点、混音起点、变体电平/声像/混响比例，满足 `startSample + alignmentSample = round(eventFrame × 48000 / 24)`。

每个音效先以 48 kHz BS.1770 K 加权计算逐采样滑动的最响 100 ms 窗，归一至 −18，采样峰值不超过 −1.5 dBFS。该 100 ms 参考值沿用声音设计的“LUFS”称呼，不是 EBU R128 的 400 ms momentary。必要时使用不改变时间的静态软限幅后重新归一。场内按 `db` 施加增益；振翅逐次 −3 dB 是设计明确要求的变体，会低于基本 `foley` 档位下限。

总线用 FFmpeg EBU R128 测量并施加共同增益；需要时离线预读 5 ms、释放 80 ms 的左右联动限幅，所有分轨共用包络，不移动采样。循环测量直至达到数据给定目标。最终交付 WAV 的响度和真峰值由上面的 `pnpm qa loudness` 独立验收。

## 合成解释与待试听

毡锤钢琴是软起音、弱非谐波模态和衰减谐波，按乐句踩踏板，末尾 40 ms 抬起；竖琴是带短噪声激励的衰减弦模态；钟琴使用基频和 2.76/5.4 倍的衰减模态；弦乐每个声部四个独立失谐/揉弦振荡器，窄初相分布防止基频相消，音量跟随 `expression`。这些是纯代码音色近似，音高准确不等于声学乐器真实感。

数据没有给出波形、模态权重、动作对齐点的内部毫秒数、混响湿度、场景转换曲线和每种材质的完整参数。实现按设计文字给出保守参数，源码集中在 `score.ts`、`sfx.ts` 和 `mix.ts`；参考库和落位报告可检查结果，最终音色由设计负责人/用户试听定夺。

具体解释：

- `B-` 视为降 B，F 大调刮奏含起止音、均匀分布在给定拍长内。`velocity` 作用于整个刮奏手势，各音按 `1/√音符数` 分配能量，避免密集上行叠加压倒动机；各音自然衰减保留至乐句末。
- 普通音符的末尾释放包含在 `beats` 内。有截止约束的乐器，干音和混响都在截止帧前退完；正常混响可在干音之后延续。
- `look` 乐句实际按 JSON 的 72 BPM 执行；说明文字概括“S2 抖水之后 80 拍”未覆盖这个例外，不修改数据。
- `puff` 的时值允许到 `hush + 6`，但 `silences` 明确要求从 `hush` 静音配乐，因此按静默数据切断尾声；未另改时值或放宽静默。静默区间内严格静音，边界外用 5 ms 斜坡避免数字点击声。
- 静默仅对 `mute/duck` 中列出的声音生效，未额外截断 `water_spray` 等其他音效尾声。床音静默作用于其含混响的总线。
- 竹竿按 180/520 Hz 主共振，首次后在 0.19/0.40 秒弱再激励；振翅每次变暗、向右移、减弱，并逐渐从檐下混响转向院子混响。

`TODO(design)`：试听确认四件乐器的真实感、音效材质和默认湿度；解除真实 `light` 乐句截止冲突后生成两版并核对听点。独立命令负责输出本地声音与测量，`generate.ts` 负责调用、复制混音到 `public/` 和更新生成物清单。

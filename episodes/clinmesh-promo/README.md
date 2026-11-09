# ClinMesh 宣传片（`clinmesh-promo`）

**实验旁支**（用户 11-09）：协作者在本机做的一条医疗智能体产品宣传片，经 PR #121 入库，spec #122 清理成只剩最终版。它不算路线图的第二阶段。旧的深色版、浅色版和预览合成可以在合并提交 `2746dcd` 里找到。

合成 `ClinMeshPromo`：3114 帧（103.80 秒），1920×1080，30fps，14 句旁白，8 个镜头加 3 张章节呼吸字卡。台本见 [script.md](script.md)，镜头剧本见 [storyboard.md](storyboard.md)，素材来源见 [sources.md](sources.md)，动效与声音约定见 [motion-sound-tokens.md](motion-sound-tokens.md)。

## 章节

| 段落 | 镜头 | 句子 | 帧（时长） |
|---|---|---|---|
| 序章：痛点与底座 | S01、S02、B01 | L001–L005 | 0–1031（34.37 秒） |
| 第一章：无感伴随智能 | S03、S04、B02 | L006–L008 | 1031–1698（22.23 秒） |
| 第二章：溯源质控与人工把关 | S05、S06、B03 | L009–L010 | 1698–2240（18.07 秒） |
| 第三章：多病种智能体与终章 | S07、S08 | L011–L014 | 2240–3114（29.13 秒） |

帧号是当前时间轴下的结果；镜头起点由 `ClinMeshPromo.tsx` 按句子算出。

## 目录

- `ClinMeshPromo.tsx`：总合成，按句子安排各镜头、呼吸字卡、字幕（`PromoSubtitles.tsx`）、颗粒暗角（`PromoFinish.tsx`）和音频（`PromoAudio.tsx`）。属性 `bgm` 控制有没有配乐。
- `ShotS01Opening.tsx`～`ShotS08SynergyFinale.tsx`：八个镜头。S03–S06 共用 `light-stage.tsx` 的浅色工作台。
- `primitives.tsx`、`motion-utils.ts`、`tokens.ts`、`fonts.ts`：相机（`PageCam`）、呼吸字卡等基础组件、缓动、令牌和字体。
- `sfx-schedule.ts`：音效钉帧清单、峰值补偿和呼吸字卡区间；`sfx-schedule.test.ts` 是对应的契约测试，依赖本机媒体的断言在没有媒体时跳过。
- `data/voiceover-durations.json`：14 句配音的实测时长。`data/timeline.json`：由台本和时长生成的时间轴。`data/props-nobgm.json`：渲染无配乐版本用的属性。`data/synthesis-overrides.json`：用 `pnpm tts` 合成这份台本时的文本改写；最终配音不经过 `pnpm tts`，没有用到它。

本期代码复用 `src/kit/` 的按句定时和字幕调度。

## 制作步骤

1. **台本与约束**：写 14 句台本，在 `L005`、`L008`、`L010` 后留出呼吸字卡的停顿；定下合规约束（见 `sources.md`）。
2. **配音**：用 MiniMax Audio 录整段旁白，在句间 -60 dB 的静音处切成 `L001.wav`～`L014.wav`，原速不变速。时长写进 `data/voiceover-durations.json`，再生成时间轴。
3. **截图**：在隔离数据库和合成数据下启动 ClinMesh 本地服务，用 Playwright 按 2 倍像素采集界面状态。
4. **镜头**：按镜头剧本写镜头代码，相机推拉用 CSS `zoom`。
5. **声音**：用 `video-shotcraft` 的 `sfx-source.py` 从 Freesound 拉取 CC0 音效，在 `sfx-schedule.ts` 里钉帧；配乐在合成里直接混。
6. **交付**：渲染有配乐和无配乐两版，校准响度，写入封面。

## 复现

在仓库里能复现的部分：

```sh
node tools/build-timeline.ts episodes/clinmesh-promo/script.md --durations episodes/clinmesh-promo/data/voiceover-durations.json --source elevenlabs --label "MiniMax Audio 沉稳高管 (48kHz PCM WAV, 1.00x 原速精剪)" --leading-silence 0.9 --out episodes/clinmesh-promo/data/timeline.json
pnpm exec remotion render ClinMeshPromo out/clinmesh-promo/clinmesh-promo-raw.mp4
pnpm exec remotion render ClinMeshPromo out/clinmesh-promo/clinmesh-promo-nobgm-raw.mp4 --props=episodes/clinmesh-promo/data/props-nobgm.json
pnpm qa sheet out/clinmesh-promo/clinmesh-promo-raw.mp4 --every 2 --out out/qa/clinmesh-promo/sheets
pnpm qa motion out/clinmesh-promo/clinmesh-promo-raw.mp4 --out out/qa/clinmesh-promo/motion
pnpm qa loudness out/clinmesh-promo/clinmesh-promo-raw.mp4 --target-lufs -16 --tolerance 1 --max-true-peak -1 --out out/qa/clinmesh-promo/loudness
```

第一条用现有数据生成的时间轴与仓库里的 `data/timeline.json` 逐字节相同（spec #122 实测）。渲染需要 `public/episodes/clinmesh-promo/` 下的全部媒体，这些媒体只在协作者本机。

**不在仓库里的本机步骤**（没有命令或工具入库，只能照上面的「制作步骤」手工重做）：

- MiniMax 配音的生成，以及按静音切句；
- 产品截图的采集脚本（在 ClinMesh 产品仓库那边）；
- 配乐的母带处理（高通、衰减、响度归一）；
- 成片的响度校准，以及封面写入（视频首帧和 MP4 `attached_pic`）。

## 已知偏离

- **时间机制**：S03–S06 镜头内的动作按镜头起点加偏移定时，不按句子定时；S03 和 S05 的起点是呼吸字卡结束的那一刻，不是句子的开始。S03 横跨 `L006`–`L007`，改了 `L006` 的时长后，S03 里配合 `L007` 的动作不会跟着移动，要手工调整偏移。仓库规则见 `docs/workflow/README.md`「一期视频」。
- **时间轴来源类型**：`data/timeline.json` 的 `source.kind` 记为 `elevenlabs`，因为 `tools/build-timeline.ts` 只接受 `temporary` 和 `elevenlabs`；实际是 MiniMax 配音，写在 `source.description` 里。
- **S07 内部起点**：S07 按"句尾 +3 帧"推算自己的起点，实际起点是"句尾 +12 帧"（B03 的位置），镜头内动画因此比本意晚 9 帧。spec #122 为保持画面不变没有修，要看过渲染再决定。
- **配音质检**：`pnpm qa voice` 读的是 `pnpm tts` 生成的 MP3 和配套 JSON，MiniMax 的 WAV 没有这些，最终配音没有经过它的错字率评分。

## 与首期的差异

| 方面 | `nasa-punk-opening` | `clinmesh-promo` |
|---|---|---|
| 性质 | 复刻参考视频开场，只在本机学习，不公开发布 | 原创产品宣传片，实验旁支；`sources.md` 的未登记项补齐前不对外发布 |
| 镜头依据 | 逐句对照参考视频，用 `pnpm qa compare` 并排验收 | 没有参考片；用下面的参考站定方向，套用 `video-shotcraft` 的镜头卡 |
| 画面素材 | NASA 公有领域照片，加上生成的桌面和纸张纹理 | 产品界面截图、生成的意象图和示意图、TCGA 病理图 |
| 声音 | 程序合成的 80 Hz 铺底和 2300 Hz 嘀嗒，是待定的占位（`tools/mix-opening.ts` 文件头的 `TODO(design)`）；渲染后用 `tools/mix-opening.ts` 替换音轨 | Freesound 音效和 Mixkit 配乐，在合成里直接混音，Studio 预览就能听到 |
| 配音 | ElevenLabs Alice × `eleven_v4`，rubberband 变速（默认 1.257143 倍，L008 为 1.15 倍），使时长接近参考片 | MiniMax「沉稳高管」声线，原速 |
| 流程 | spec #60 拆成工单，用 `run-spec` 执行 | 协作者在本机制作后，经 #120、#121 入库 |

## 参考与外部技能

做这类产品片时协作者用过的参考站：

- [ShipScenes](https://shipscenes.com/)：科技和 SaaS 产品发布片的拆解，用来看整片节奏、界面局部特写和鼠标交互。
- [Motion Reference](https://motionreference.com/)：按转场、字效、版式、缓动分类的营销视频和界面动效。
- [Inspo.zone](https://www.inspo.zone/)：视觉与动态设计的灵感画廊。

两个外部技能登记在 `skills-lock.json`，装在不进 git 的 `.agents/`、`.claude/` 下：

```console
npx skills add vibe-motion/sound Vincentwei1021/video-shotcraft
```

- [`video-shotcraft`](https://github.com/Vincentwei1021/video-shotcraft)（Apache-2.0）：Remotion 镜头卡、`PageCam` 相机、产品片审美准则和 Freesound 音效拉取脚本 `sfx-source.py`。
- [`sound`](https://github.com/vibe-motion/sound)：按下载量、评分、录音设备和 CC0 许可筛选真实拟音的方法。仓库里没有许可证文件，作者明确表示免费版可以使用；我们只用免费版，不用付费版（用户 11-09）。

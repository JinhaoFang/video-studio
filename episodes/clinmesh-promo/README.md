# ClinMesh 宣传片（`clinmesh-promo`）

本期宣传片以 **1 分 35.93 秒（`2878` 帧，`1920×1080 @ 30fps`）** 的紧凑篇幅，呈现 **ClinMesh 已落地的临床智能体核心能力**、**已完成研发的自研数字病理切片识别模型**、**持续接入临床的多病种智能体矩阵**，以及 **生长于医院知识基底之上、可独立解耦接入既有系统的全院六岗协同架构**。

## 核心设计约束

- **视觉母体与产品原生语义统一**：外层舞台采用深色编辑室克制美学——暖炭黑画布（`#121210` / `#151517`）、细边暗色面板、衬线与无衬线混排及克制靛蓝/信息蓝强调色（舞台 `#7C86FF` ↔ 产品深色 `--info: #8DBBFF`）。内部产品卡片严格复用 ClinMesh 原生 UI Token（`6px–8px` 圆角、等宽数字 `tabular-nums`、`.clinmesh-glow` 蓝色环绕柔光与虚线溯源标记；人工审阅确认栏保持完全静态无发光）。
- **聚焦阅读减负与局部高分裁剪**：正片镜头（`S02`–`S07`）与章节呼吸字卡（`B01`–`B03`）统一去除左上角英文眉标及章节英文副标题，减少密集画面下的视线抢占，仅在终章收尾定格保留双语副标题。实机部分采用 **`2x` 整页纹理 + 核心业务卡片高清切片**，配合 `PageCam` 布局级 CSS `zoom` 聚焦「触发动作 → 结构化结果」，确保 1080p 下主字幕与核心字卡清晰易读。
- **自研病理切片识别与多病种智能体矩阵（视重均衡）**：第三章（`B03` `03 多病种智能体 · 即插即用` → `S07`）将 `SLOT 01` **自研数字病理切片识别模型**（`images/病理.png`，右上角绿色 `自研多模态模型` 状态签，保留 TCGA-BRCA 公开去标识切片集 CC BY 3.0 署名，扫描线触发双病灶 ROI 准星咬合）与 `SLOT 02` **胸痛冠脉介入智能体**、`SLOT 03` **肝病专病诊疗智能体**、`SLOT 04` **肿瘤多学科会诊 (MDT) 智能体** 排布为 `2×2` 等重矩阵；`SLOT 02`–`04` 均配备统一暗场三维医学示意视窗、等宽遥测角标与双列要点条，平衡四象限视觉重心。
- **动效与声音定调（`video-shotcraft` × `sound`）**：
  - 一镜一主运动语法，开场与终章品牌字标落定 **真静止 `>= 1.0s`（开场 `2.53s`，片尾纯净定格 `1.83s`）**，批量元素落定静止 `>= 0.5s`，严禁手持随机抖动与群发廉价扫光。
  - 旁白采用浑厚沉稳普通话男中低音（ElevenLabs `Brian` × `eleven_v4`，`language_code: "zh"`，`rubberband` 等高 `1.10x` 变速）；音效全部采用 Freesound 实测筛选的 CC0 真实物理拟音与电影重音，启用音源峰值滞后与编码器输出偏移双补偿；配乐执行稳态无闪避（No Ducking）混音。
- **命名与隐私合规**：全片严禁出现任何内部工程代号，医院业务链路统一表述为 **医院业务与临床知识基底**；100% 采用脱敏代号与合成临床数据，不出现任何患者真实身份；Agent 开发与自动化帧检阶段绝不读取真实医学影像或病理切片像素。

## 章节结构（14 句 · 8 镜 + 3 处视觉呼吸字卡）

| 段落                               | 镜头                | 句子          | 实测时长 | 核心内容                                                                                                                                                                                                                                                                                                                                                    |
| ---------------------------------- | ------------------- | ------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **序章：意象破局与可解耦底座**     | `S01`–`S02` + `B01` | `L001`–`L005` | `32.13s` | 炭黑桌面听诊器与屏幕端通用问答开篇，在同一暮色医院工作站实景底图上从容递进「旧系统只记录过去 / 孤立对话框走不进诊疗现场」两重痛点，随即溶入暮色诊室，立起满铺圆角标识 + `ClinMesh` 主标与「深度融入诊疗每一步的医疗智能体体系」副标题；`S02` 采用无英文两段式插槽架构——先居中点亮「门诊 → 医技 → 住院 → 手术介入 → 病案结算」五域贯通横轴，再下沉为四插槽标准母板，上方四枚独立竖卡（无感伴随、循证质控、医保精算、专科模型）依次垂直插入点亮，接 `1.70s` 呼吸字卡 `01 无感伴随智能 · 静默运转` |
| **第一章：无感伴随智能**           | `S03`–`S04` + `B02` | `L006`–`L008` | `22.30s` | 局部高分裁剪呈现：门诊问诊后台静默成文 + 穿窗切入权威指南循证候选逐行嵌入；住院冠脉介入支架耗材预留、`FM59 → FM39` 病组支付空间滚动精算与三岗核查定格标注，接 `1.70s` 呼吸字卡 `02 溯源质控 · 人工把关`                                                                                                                                                     |
| **第二章：溯源质控与人工把关**     | `S05`–`S06` + `B03` | `L009`–`L010` | `15.70s` | 每一笔病历成文与医嘱候选逐句强绑定问诊原话与指南依据，实时拦截前后病史矛盾与青霉素过敏用药红线；对比越权直写请求自动阻断，正式医嘱与文书签署必须经医生人工终审拍板留痕，接 `1.70s` 呼吸字卡 `03 多病种智能体 · 即插即用`                                                                                                                                    |
| **第三章：多病种智能体与全院终章** | `S07`–`S08`         | `L011`–`L014` | `26.90s` | 自研病理切片识别模型扫描准星精准咬合两处病灶 ROI 并输出组织学辅助判读（绿色 `自研多模态模型` 标签），后拉揭示胸痛冠脉介入、肝病专病诊疗、肿瘤多学科会诊四格视重均衡的多病种智能体矩阵；`S08` 六岗智能体沿贝塞尔曲线汇入同一患者病例中枢，6 张代表卡四方飞入围合引出 `ClinMesh` 压印后错峰向外虚化消散，深色聚光舞台仅留 `ClinMesh` 与双语副标题纯净定格收束 |

## 目录说明

- `ClinMeshPromo.tsx` 及 `ShotS01Opening.tsx`–`ShotS08SynergyFinale.tsx`：基于 `data/timeline.json` 句锚点驱动的 Remotion 主合成与八镜源码。
- `script.md`：14 句旁白台本（严格遵循 `tools/timeline-input.ts` 三列契约）。
- `storyboard.md`：逐镜裁剪构图、`video-shotcraft` 镜头卡映射、运镜与音效钉点剧本。
- `sources.md`：局部实机裁剪切片、病理模型与多病种智能体视窗素材、Freesound 实测音效、定制配乐及合规清单。
- `motion-sound-tokens.md`：基于 ClinMesh 视觉合同、`video-shotcraft` 与 `sound` 提炼的动效及稳态无闪避混音规范。
- `production-workflow-and-comparison.md`：Remotion 逐帧渲染机制、六步制作全流程及与首期 `nasa-punk-opening` 的六大制作差异对比复盘。
- `data/transcript.md`、`data/synthesis-overrides.json`、`data/voiceover-durations.json` 与 `data/timeline.json`：14 句配音转写、防吞音覆写与实测帧级时间轴（`2911f / 97.03s`）。

## 复现与验收命令

```sh
pnpm verify
pnpm qa voice public/episodes/clinmesh-promo/voiceover-brian-a1-110 --transcript episodes/clinmesh-promo/data/transcript.md --overrides episodes/clinmesh-promo/data/synthesis-overrides.json --ledger out/qa/clinmesh-promo/voiceover-credits.json --out out/qa/clinmesh-promo/voice-brian-a1-stretched --from L001 --to L014
pnpm exec remotion render ClinMeshPromo out/clinmesh-promo/clinmesh-promo-raw.mp4
pnpm exec remotion render ClinMeshPromo out/clinmesh-promo/clinmesh-promo-nobgm-audio.wav --codec=wav --props=episodes/clinmesh-promo/data/props-nobgm.json
pnpm qa sheet out/clinmesh-promo/clinmesh-promo.mp4 --every 2 --out out/qa/clinmesh-promo/sheets
pnpm qa motion out/clinmesh-promo/clinmesh-promo.mp4 --out out/qa/clinmesh-promo/motion
pnpm qa loudness out/clinmesh-promo/clinmesh-promo.mp4 --target-lufs -16 --tolerance 1 --max-true-peak -1 --out out/qa/clinmesh-promo/loudness
pnpm qa loudness out/clinmesh-promo/clinmesh-promo-nobgm.mp4 --target-lufs -16 --tolerance 1 --max-true-peak -1 --out out/qa/clinmesh-promo/loudness-nobgm
```

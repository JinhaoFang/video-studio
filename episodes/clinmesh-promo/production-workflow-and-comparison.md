# ClinMesh 宣传片制作全流程总结与跨期对比复盘

本文档用通俗语言完整梳理 `clinmesh-promo` 的 **Remotion 网页渲染机制**、**六步制作全流程**，以及它与本仓库首期复刻片 `nasa-punk-opening` 在制作方法上的 **六大核心区别**，供后续制作新产品宣传片时快速查阅复用。

---

## 一、Remotion 的网页（HTML）在哪里？它是怎么生成视频的？

Remotion **不是“先手写一个静态 `.html` 网页，再用录屏软件录成视频”**，而是像**拍定格动画**一样逐帧渲染 React 组件：

1. **画面全部写在 React 组件（`.tsx`）中**：
   8 个主镜头的画面、排版、CSS 动效与 SVG 曲线均位于本目录（如 `ShotS01Opening.tsx`～`ShotS08SynergyFinale.tsx`，由 `ClinMeshPromoLightPro.tsx` 总装串联），工程里并不存在手写的 `clinmesh-promo.html`。
2. **渲染 MP4 时临时打包网页，拍完自动销毁**：
   运行 `pnpm exec remotion render` 时，Remotion 通过 Rspack 在操作系统临时目录（如 `%TEMP%\remotion-webpack-bundle-*`）动态生成临时 `index.html` 与脚本包，在后台启动无头浏览器（Headless Chrome）：
   - 将时间拨到第 1 帧截一张图，拨到第 2 帧再截一张图……
   - 按 `30fps`（1 秒 30 张，`103.80s` 共 **3114 张图**）截取完成后，交由 FFmpeg 与音轨编码合成为 `.mp4`，随后**自动删除临时网页目录**。
3. **如何在浏览器中查看或导出 HTML？**
   - **交互式实时预览（推荐，类似“网页版剪映”）**：在仓库根目录运行 `pnpm dev` 打开 `http://localhost:3000`，展开左侧 `clinmesh-promo` 文件夹选择 `ClinMeshPromoLightPro`，即可按空格播放、拖动底部多轨时间轴逐帧查看镜头轨、配音轨与音效轨，或在右侧 `Props` 面板实时开关 `bgm`。
   - **导出独立静态 HTML 包**：在仓库根目录运行 `pnpm build`（即 `remotion bundle`），即可打包输出至 `build/index.html`（`build/` 目录默认被 `.gitignore` 忽略）。

---

## 二、ClinMesh 宣传片是怎么一步步做出来的？（六步全流程）

### 第 1 步：定红线、写台词、排分镜（写剧本）
- **合规与视觉打底**（见 `sources.md` 与 `motion-sound-tokens.md`）：确立禁用内部工程代号、100% 使用合成演示病例、病理切片保留 TCGA-BRCA `CC BY 3.0` 署名且开发质检不读取切片像素等红线；从 ClinMesh 原生样式系统提取配色、圆角（`6px`/`8px`）、等宽数字（`tabular-nums`）与 `.clinmesh-glow` 环绕柔光规则（仅限 `S05` 溯源草稿卡，`S06` 人工终审保持完全静态无发光）。
- **14 句结构化台本**（`script.md`、`script-light-pro.md`）：按 `句子编号 | 旁白原文 | 句后停顿（秒）` 编写 `L001`–`L014`，在 `L005`、`L008`、`L010` 预留 `1.90s`～`2.20s` 停顿安放 `1.70s`（`52f`）无配音章节呼吸字卡（`B01`–`B03`）。
- **八镜分镜设计**（`storyboard.md`）：遵循“一镜一主运动语法”与关键信息落定真静止帧预算（品牌字标落定静止 `>= 1.0s`，批量元素落定静止 `>= 0.5s`），串联开场痛点立题（`S01`）→ 全院五域与四插槽底座（`S02`）→ 门诊静默成文与指南候选（`S03`）→ 冠脉耗材与 DRG 精算（`S04`）→ 原话溯源与过敏红线拦截（`S05`）→ 执业医师人工终审签署（`S06`）→ 自研数字病理与多病种矩阵（`S07`）→ 六岗汇聚与品牌定格收尾（`S08`）。

### 第 2 步：先录配音，拿实测声音长度生成时间表（先有声、后有画）
- **两套配音迭代**：前两版采用 ElevenLabs `Brian × eleven_v4`（`zh`）配合 `rubberband` 等高 `1.10x` 变速；最终旗舰版（`ClinMeshPromoLightPro`）升级为 **MiniMax Audio「沉稳高管」声线**，在句间 `-60 dB` 静音谷值无损切分为 `L001.wav`～`L014.wav`（`48kHz 2ch PCM WAV`，`1.00x` 原速零变速失真）。
- **Whisper 质检与帧级时间轴**：经 `pnpm qa voice` 转写核对无吞字截断后，运行 `node tools/build-timeline.ts` 累加每句实测时长与句后停顿，生成 `data/timeline-light-pro.json`（`3114f / 103.80s`）。所有镜头与音效均通过 `sentenceFrame(timeline, "L00X", offset)` 相对句子起点定位，改词重录后动画自动顺延对齐。

### 第 3 步：去真实系统里截 `@2x` 超清切片（备素材）
- 在隔离临时数据库下启动 ClinMesh 本地服务，使用 Playwright 无头浏览器（`deviceScaleFactor: 2`）截取核心业务卡片、浅色工作台连续交互状态图及元素坐标清单（`captures/layout*.json`），摒弃整张浏览器外壳与拥挤侧栏。
- 准备序章无文字医院氛围图、品牌 Logo、`S07` 自研数字病理识别画面及胸痛介入、肝病专病、肿瘤 MDT 三幅纯合成暗场三维示意图像（`images/`）。

### 第 4 步：用代码驱动交互动画，连续演进三代成片（做动画）
- 推近特写统一使用**布局级 CSS `zoom`** 配合 `@2x` 切片向下采样，避免 `transform: scale(>1)` 导致文字边缘发糊。
- 在同一目录内保留互不覆盖的三代演进合成：
  1. `ClinMeshPromo`：全深色编辑室风格初版（`2911f`）；
  2. `ClinMeshPromoLight`：保留首尾深色电影叙事段，将 `S03`–`S06` 临床工作流升级为纯白 `@2x` 真实浅色医院工作台（`light-stage.tsx`），并在浅色段自动关闭暗角颗粒层 `PromoFinish`；
  3. `ClinMeshPromoLightPro`：最终旗舰母带版（`3114f`），换装书面旗舰台本与高管原速配音，并按 Whisper 实测词级音节帧位精确锁定五域点亮、六岗汇聚与点击签署动作。

### 第 5 步：配真实物理音效与稳态无闪避背景音乐（加声音）
- **CC0 真实拟音与双偏移对齐**：使用 `sfx-source.py` 从 Freesound 拉取 12 个 CC0 真实物理音效（柔和气流、纸卡滑动、机械键盘、胶片机械快门、精密机械锁扣、低频沉降、Riser、Cinematic Impact、晶体微鸣），在 `sfx-schedule-light-pro.ts` 中扣除样本起音至能量峰滞后帧与编码器偏移（`OUTPUT_AUDIO_OFFSET_F = 0.21`），精准咬合画面动作瞬间。
- **无闪避（No-Ducking）配乐总线**（`PromoAudioLight.tsx`）：采用经 `32Hz` 高通与 `2.45kHz` 人声频段微降让位处理的现代医疗中性配乐 `clinical-neutral-underscore.wav`，禁用句间音量抽吸闪避，仅按四段乐章做余弦长跨度配平，首尾平滑余弦渐入/渐隐。

### 第 6 步：导出双母带、响度校准与微信封面封装（交成片）
- 通过 `--props`（`bgm: true / false`）同源渲染**带背景音乐正式版**（`ClinMesh医疗智能体宣传片.mp4`）与**无背景音乐纯享版**（`ClinMesh医疗智能体宣传片-无背景音乐.mp4`，完整保留旁白与物理音效）。
- 整片线性响度校准至 **`-16 ± 1 LUFS`、真峰值 `<= -1.0 dBTP`**，通过 `pnpm verify` 及 `pnpm qa sheet / motion / loudness` 全套验收。
- 提取 `S01` 第 `17s` 无字幕品牌主副标题静帧，同时写入主视频流首帧（`PTS = 0.000s` 关键帧，确保微信聊天与转发预览显示封面）及 MP4 `attached_pic` 封面流（确保桌面文件管理器与播放器显示封面）。

---

## 三、与首期 `nasa-punk-opening` 的六大制作区别

两期虽然共用“按句实测时长驱动时间轴”的底层基础设施，但在制作模式上是从**“练手临摹作业”**到**“正式原创商业成片”**的跨越：

| 对比维度 | `nasa-punk-opening`（第一期） | `clinmesh-promo`（本期宣传片） |
| --- | --- | --- |
| **1. 创作性质与版权** | **1:1 临摹复刻他人视频**（仅限本机学习，不可公开发布） | **从零原创商业产品宣传片**（全套合规授权，可直接对外发布） |
| **2. 分镜与动效来源** | 对照 B 站原片逐帧测量位置与时长，靠 `qa compare` 并排比对还原度 | 结合三大参考站定方向 + 选用 `video-shotcraft` 124 张镜头配方卡原创编排 |
| **3. 画面核心素材** | NASA 6K–8K 历史照片 + AI 生成的牛皮纸/胶带/桌面纹理拼贴 | **自家 ClinMesh 真系统 `@2x` 超清交互切片** + 病理视窗 + 专科三维示意 |
| **4. 音效与配乐制作** | **纯代码数学合成正弦波**（`80Hz` 低频 + `2300Hz` 嘀嗒声），渲染后外挂换音轨 | **Freesound 12 枚真实物理录音** + 真乐器编曲配乐，内置音频总线预览直出双母带 |
| **5. 配音打磨策略** | ElevenLabs 女声强行 `1.257x` 算法加速以追赶原片 46 秒时长 | 旗舰版采用 **MiniMax 高管男声 `1.00x` 原速无损 WAV** + Whisper 音节级卡点 |
| **6. 工作流与交付细节** | GitHub 拆 10 余张工单、双 AI 跨 worktree 派发合并的重型流程 | 借力外部专业 Skills 敏捷迭代三代版本，新增医疗隐私红线与微信首帧封面封装 |

### 关键差异补充说明

1. **从“外挂换音轨”升级为“内置音频总线直出”**：
   `nasa-punk-opening` 的 `Opening.tsx` 只挂载了逐句人声，在 Remotion Studio 预览时听不到配乐和音效，必须渲染完视频再跑 `tools/mix-opening.ts` 替换音轨；而 `clinmesh-promo` 通过 `PromoAudioLight.tsx` 把配乐、人声、双偏移补偿后的物理拟音全部接入 Remotion 时间线，预览所听即所得，且支持 `bgm` 参数一键切换有无配乐母带。
2. **从“单一暗色照片推拉”升级为“深浅色舞台无痕切换 + 真 UI 交互”**：
   `nasa-punk-opening` 全片维持暖暗胶片滤镜与颗粒叠层；`clinmesh-promo` 在 `S01`/`S02`/`S07`/`S08` 采用深色电影聚光舞台建立叙事张力，而在 `S03`–`S06` 展示核心临床工作流时切换为纯白 `@2x` 真实系统界面并自动关闭胶片暗角层，兼顾品牌大片质感与医疗软件真实性。
3. **新增商业交付与医疗行业专属约束**：
   `clinmesh-promo` 完整落实了医疗数据脱敏、公开病理切片署名、AI 验收零影像像素读取以及微信 `PTS=0` 首帧封面兼容，补齐了从技术 Demo 走向正式产品宣发的最后一公里。

---

## 四、产品宣传片参考站与扩展技能速查

后续制作新产品视频时，可直接沿用本期的外部输入组合（安装命令与说明亦见仓库根 `README.md`）：

- **灵感与分镜参考站**：
  - [ShipScenes](https://shipscenes.com/)：看整片 60–90 秒叙事结构、局部高清裁剪特写与鼠标交互节奏。
  - [Motion Reference](https://motionreference.com/)：按转场、字效、双焦点版式与缓动曲线检索具体 UI 动效写法。
  - [Inspo.zone](https://www.inspo.zone/)：寻找开场意象、暗场三维与多模态画面的高审美视觉记忆点。
- **核心制作与拟音技能**：
  - [`video-shotcraft`](https://github.com/Vincentwei1021/video-shotcraft)（[在线样片画廊](https://vincentwei1021.github.io/video-shotcraft/library.html)）：124 张调校参数的 Remotion 镜头配方卡、`PageCam` 相机原语、审美铁律与 `sfx-source.py` 音效拉取测峰脚本。
  - [`sound`](https://github.com/vibe-motion/sound)：基于 Freesound 下载量、评分人数、录音设备描述与 CC0 许可筛选真实物理拟音的方法论。

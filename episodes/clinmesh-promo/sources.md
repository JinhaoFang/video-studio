# ClinMesh 宣传片素材来源、音效选型与合规清单

本文件登记 `clinmesh-promo` 所使用的局部实机裁剪切片、自研病理切片识别模型视窗、多病种智能体三维示意素材、序章实景意象静帧、旁白配音、定制配乐与 Freesound 实测音效的规格及合规边界。所有二进制媒体文件存放于被 Git 忽略的 `public/episodes/clinmesh-promo/` 与 `out/`，不纳入版本库。

---

## 1. 合规、命名与隐私红线

1. **命名统一**：全片文案、配音、字幕与画面严禁出现任何内部工程代号；医院业务链路统一表述为 **医院业务与临床知识基底**。
2. **合成数据与受控环境**：所有 ClinMesh 产品界面采集均在隔离临时 SQLite 数据库与受控合成 Provider 下完成，100% 采用合成演示患者数据，不含任何真实患者身份、医保凭证、支付凭证或平台密钥。
3. **医学影像与病理切片读取边界**：
   - 在开发调试、Remotion 代码编写与自动化抽帧质检（`pnpm exec remotion still`、`pnpm qa sheet`、`pnpm qa motion`）期间，**Agent 严禁读取任何真实放射影像像素或含病理切片（`images/病理.png`）的画面区域**；若需核对 `S07` 其余象限排版，仅允许裁剪完全不含 `SLOT 01` 切片像素的非重叠安全区，或使用纯几何占位卡验证。
   - `S07` 与 `S08` 合入的公开去标识病理切片识别画面（`images/病理.png`）在画面右上保留完整的 TCGA-BRCA 数据集 CC BY 3.0 许可署名：`Clunie, D., et al. (2024). DICOM converted Slide Microscopy images for the TCGA-BRCA collection [Data set]. Zenodo. https://doi.org/10.5281/zenodo.12689962`。
4. **产品视觉真实性**：裁剪卡片与局部组件严格遵循 ClinMesh `packages/ui/src/styles.css` 语义 Token；`S05` 逐句溯源草稿卡使用 `.clinmesh-glow` 蓝色环绕柔光与虚线溯源签，`S06` 人工审阅与确认签署阶段保持完全静态，不添加虚假发光特效。

---

## 2. 局部高分实机裁剪切片（`public/episodes/clinmesh-promo/captures/`）

实机镜头摒弃塞入完整桌面外壳与微小侧栏的做法，基于隔离临时数据库采集高分深色原生卡片切片与 `layout.json` 坐标表：

| 编号  | 目标文件（`captures/`）                                                      | 对应镜头与句子                  | 裁剪范围与重点状态                                                                       | 采集方式                                              |
| ----- | ---------------------------------------------------------------------------- | ------------------------------- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `C01` | `C01-outpatient-emr-card.png` + `layout.json`                                | `S03`（`L006`）、`S08`（`fc1`） | 裁去侧栏与患者队列，聚焦「患者头部『助手已准备』摘要条 + 病历记录核心字段卡」            | Playwright 无头浏览器 `deviceScaleFactor: 2` 高清采集 |
| `C02` | `C02-guideline-candidates-card.png`、`C02-guideline-evidence-dialog.png`     | `S03`（`L007`）、`S08`（`fc2`） | 检验检查/处方开具工作区「权威指南循证推荐与待开具候选面板」                              | Playwright 高分面板切片（配合 `row-embed` 逐行嵌入）  |
| `C03` | `C03-pci-drg-workspace.png`、`C03-pci-surgery-reservations.png`              | `S04`（`L008`）、`S08`（`fc3`） | 住院冠脉介入「支架耗材预留 + `FM59 → FM39` 病组支付空间精算 + 三岗核查一致」工作区       | Playwright 高分切片（数字区由 `DigitRoll` 等宽驱动）  |
| `C04` | `C04-assistant-draft-glow.png`                                               | `S05`（`L009`）                 | 带 `.clinmesh-glow` 环绕柔光底纹的门诊草稿卡（承载逐句原话与指南锚定及右侧质控拦截联动） | Playwright 高分局部切片                               |
| `C05` | `C05-review-gate-signed-card.png`（同源留档 `C05-static-review-gate-*.png`） | `S06`（`L010`）、`S08`（`fc4`） | 沉浸式「医师终审工作台」人工点击拍板后原位生成的双栏病历/医嘱与三栏审计留痕生效卡切片    | Remotion 原生高分静态确认态切片                       |
| `C06` | `C06-multirole-status-strip.png`                                             | `S08`（`L013`、`fc6`）          | 围绕同一合成患者的跨岗位纵向交接状态链条（配合六岗智能体汇聚曲线展示）                   | Playwright 高分状态条切片                             |

---

## 3. 自研病理切片识别模型与多病种智能体视窗素材（`public/episodes/clinmesh-promo/images/`）

| 槽位编号  | 目标文件（`images/`）           | 对应镜头与句子                         | 画面口径与合规说明                                                                                                                                                                                            |
| --------- | ------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SLOT 01` | `images/病理.png`               | `S07`（`L011`–`L012`）、`S08`（`fc5`） | **自研数字病理切片识别模型实机画面**（`1920×945`）：右上角绿色状态签标注 `自研多模态模型`，双准星严格对齐高亮病灶区域，顶部保留 TCGA-BRCA 公开去标识切片数据集 CC BY 3.0 署名；Agent 验证全程禁止读取切片像素 |
| `SLOT 02` | `images/slot-chest-pain.jpg`    | `S07`（`L012`）                        | **胸痛冠脉介入智能体深色三维示意视窗**（`16:9`）：暗炭黑舞台上半透明冠脉分叉、翠绿支架微网与蓝色层流流线三维几何渲染（纯合成非患者影像、画面内零文字），配 `PCI-AGENT` 遥测签与双列能力条平衡矩阵视重         |
| `SLOT 03` | `images/slot-liver-disease.jpg` | `S07`（`L012`）                        | **肝病专病诊疗智能体深色三维示意视窗**（`16:9`）：暗炭黑舞台上半透明肝脏轮廓与琥珀金/信息蓝/翠绿门脉光学分支三维几何渲染（纯合成非患者影像、画面内零文字），配 `HEPA-AGENT` 遥测签与双列能力条                |
| `SLOT 04` | `images/slot-oncology-mdt.jpg`  | `S07`（`L012`）                        | **肿瘤多学科会诊 (MDT) 智能体深色三维示意视窗**（`16:9`）：暗炭黑舞台上半透明分子双螺旋与靛蓝/冰蓝/翠绿三束光路棱镜汇聚三维几何渲染（纯合成非患者影像、画面内零文字），配 `MDT-AGENT` 遥测签与双列能力条      |

---

## 4. 品牌标识、序章意象静帧与定制配乐（`public/episodes/clinmesh-promo/`）

### 品牌标志与意象序章图像（`images/`）

- `images/clinmesh-logo.webp`：ClinMesh 品牌标识，以满铺圆角白底容器呈现于 `S01`（`L003`）与 `S08`（`L014`）。
- `images/begin1.jpg`（同源留档 `begin1.jfif`）：`S01`（`L001`）定制无文字 `16:9` 深炭黑听诊器与暗屏静物意象帧（`2752×1536`）。
- `images/pain-legacy.jpg`：`S01`（`L002`）定制无文字暮色医院暗调工作站实景静帧（`1792×1024`），统一承载「旧系统 · 只记录过去」与「孤立对话框 · 走不进诊疗现场」两段原位递进痛点文案。
- `images/begin3.jpg`（同源留档 `begin3.jfif`）：`S01`（`L003`）定制无文字暮色医院诊室全景静帧（`2752×1536`），承载 `ClinMesh` 主标立题。
- 外层舞台聚光、体积暗角与胶片颗粒均由原生 SVG / CSS 程序化实时渲染（`PromoFinish.tsx`）。

### 定制背景配乐（`music/`，`48kHz 2ch WAV`）

- `music/Clinical AI Underscore.wav`（`ClinMeshPromo` 深色旧版使用）：临床智能体主题配乐（`48kHz 2ch PCM`，总长 `106.63s`，涵盖开场独奏大提琴、原声吉他/钢琴律动、中段弦乐群与终章钢琴收束和弦）。
- `music/clinical-neutral-underscore.wav`（`ClinMeshPromoLightPro` 浅色实机旗舰中文母带 `ClinMesh医疗智能体宣传片.mp4` 使用）：基于 Andrew Ev《Vastness》（Mixkit `#184`，https://assets.mixkit.co/music/184/184.mp3，Mixkit Stock Music Free License 免署名可商用）母带化处理的现代医疗科技中性背景配乐（沉稳客观的 **Fmaj7 – C – G** 温暖模拟合成铺底与克制刷击电子脉动：`0–19.2s` 柔和铺底承托序章与 `17s` 主副标题立题，`19.2–48.0s` 稳健低感电子脉动托举全院五域底座与门诊无感成稿，`48.0–80.0s` 温润原声钢琴加入托举介入病组精算、逐句原话锚定与执业医师核准，`80.0–103.8s` 经清澈悬停自然过渡至 `96.0s` 温暖弦乐群与钢琴合奏收束全院六岗协同终章；经 `32 Hz` 高通、`2.45 kHz` 人声清晰度频段微降让位与 `-18.5 LUFS` 两遍线性响度归一，输出为 `48kHz 2ch PCM WAV`，总长 `108.00s`）。
- **微信与桌面端双兼容封面**：中文母带 `ClinMesh医疗智能体宣传片.mp4` 与 `ClinMesh医疗智能体宣传片-无背景音乐.mp4` 统一提取 `S01` 第 `17s` 定格的 `ClinMesh` 主副标题无字幕纯净静帧（`1920×1080`），同步写入主视频流首帧（`PTS = 0.000s` 关键帧，确保微信聊天与转发预览正常显示封面）及 MP4 `attached_pic` 封面流（确保桌面文件管理器与播放器正常读取封面）。
- 混音策略严格执行 **无旁白自动闪避（No Ducking）** 与 **乐段长跨度均衡**：不在句间停顿或 `B01`–`B03` 呼吸字卡处做包络抬升/压低，仅按配乐四段编曲强弱差做平滑平衡，并在开场前 `1.20s`（`36f`）余弦渐入、片尾 `S08` 最后 `2.00s`（`60f`）余弦渐隐至静音；同步通过 `--props`（`bgm: false`）输出保留完整人声与 SFX 的无 BGM 纯享版。

---

## 5. Freesound 实测音效清单（`sound` × `video-shotcraft`）

全部音效均通过 `sfx-source.py` 在 Freesound 实测检索，限定 **CC0（无署名负担，可免费商用）**，杜绝手机游戏式合成提示音：

| 拟音类别                 | 主选 ID 与标题                                                             |             时长 | 实测下载与评分                | 许可 | 声源描述与用途                                                                                                                 | HQ 试听预览                                                   |
| ------------------------ | -------------------------------------------------------------------------- | ---------------: | ----------------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------- |
| **章节字卡 / 轻转场**    | `fs:71852` `digital_whoosh_soft.wav`                                       |           `1.0s` | `↓7,705 ★4.5(61)`             | CC0  | 干净柔和的短促过渡气流，用于 `S01` 诊室叠化、`B01`–`B03` 呼吸字卡与 `S03` `portal-wipe` 穿窗                                   | https://cdn.freesound.org/previews/71/71852_1062668-hq.mp3    |
| **裁剪卡片滑移**         | `fs:464302` `PaperSlide.wav`（备选 `fs:444431`）                           |           `1.6s` | `↓4,571 ★4.9(37)`             | CC0  | 真实纸卡桌面滑动声，用于 `S02` 爆炸图展开与 `S05` 双焦点横移                                                                   | https://cdn.freesound.org/previews/464/464302_775844-hq.mp3   |
| **病历自动成文**         | `fs:331656` `Keyboard Typing`                                              |          `15.5s` | `↓83,423 ★4.5(471)`           | CC0  | 机械键盘实录，在 `S03` 中以 `durationInFrames: 72` 裁取书写段并做尾端 `8f` 淡出作质感底衬                                      | https://cdn.freesound.org/previews/331/331656_5825863-hq.mp3  |
| **定格标注 / 准星咬合**  | `fs:520684` `Contarex camera shutter.wav` + `fs:629979` `Camera Click.wav` | `2.3s` / `0.34s` | `↓7,942 ★4.8` / `↓1,369 ★4.6` | CC0  | 胶片相机机械快门与微动快门，用于 `S04` DRG 定格瞬间及 `S07` 双病灶 ROI 准星咬合（双样本交替、音量 `0.36 → 0.25` 递减防机枪感） | https://cdn.freesound.org/previews/520/520684_10067806-hq.mp3 |
| **静态门禁人工落锁**     | `fs:815493` `Mechanical switch (latch) 02`（备选 `fs:278205`）             |           `1.8s` | `↓1,203 ★4.8(31)`             | CC0  | 精密机械锁扣实录，钉在 `S06` 医生人工点击「确认签发」落锁帧                                                                    | https://cdn.freesound.org/previews/815/815493_13504080-hq.mp3 |
| **品牌沉降 / 合体落座**  | `fs:671375` `Sub Impact`                                                   |           `3.4s` | `↓1,562 ★4.7(32)`             | CC0  | 克制低频沉降，用于 `S01` 开场品牌立题与 `S02` 四层解耦能力合体落座                                                             | https://cdn.freesound.org/previews/671/671375_14157548-hq.mp3 |
| **终章蓄力 Riser**       | `fs:685256` `Riser sound effect short.wav`                                 |           `3.0s` | `↓7,999 ★4.7(118)`            | CC0  | `S08` 六张核心代表卡四方飞入围合时的渐强铺垫                                                                                   | https://cdn.freesound.org/previews/685/685256_12265588-hq.mp3 |
| **终章字标压印 Impact**  | `fs:177242` `Cinematic Impact`                                             |           `7.9s` | `↓40,786 ★4.7(280)`           | CC0  | 终章峰值重音，钉在 `S08` `ClinMesh` 主标志压印落定帧，经 `183f` 包络与 `48f` 尾端平滑淡出收束                                  | https://cdn.freesound.org/previews/177/177242_3277771-hq.mp3  |
| **终章底线展开 Sparkle** | `fs:562196` `snd_fragment_retrieve.wav`                                    |           `1.7s` | `↓2,395 ★4.9(42)`             | CC0  | 清透单次晶体微鸣，钉在 `S08` 标语渐变底线展开帧                                                                                | https://cdn.freesound.org/previews/562/562196_12618935-hq.mp3 |

### 一键拉取与音频测量命令

```sh
py .agents/skills/video-shotcraft/assets/scripts/sfx-source.py get fs:71852 fs:464302 fs:444431 fs:331656 fs:520684 fs:629979 fs:815493 fs:278205 fs:685256 fs:177242 fs:671375 fs:562196 --out-dir public/episodes/clinmesh-promo/sfx
```

_注：Freesound 脚本拉取的 `fs-<id>.mp3` 为高质量有损 MP3 预览流，按规范如实标记为预览源，不伪标为原始无损 WAV。_

---

## 6. 旁白配音与混音响度规范

- **音色与模型**：
  - `ClinMeshPromo` 与 `ClinMeshPromoLight`：ElevenLabs `Brian`（`nPczCjzI2devNBz1zQrb`）× `eleven_v4`，`language_code: "zh"`，经 `node tools/stretch-voice.ts --tempo 1.1` 等高变速至 `public/episodes/clinmesh-promo/voiceover-brian-a1-110/`。
  - `ClinMeshPromoLightPro`（独立宣传片对比版）：MiniMax Audio「沉稳高管」声线（源文件 `public/episodes/clinmesh-promo/music/voiceman.wav`），于句间 `-60 dB` 静音谷值无损切分为 `public/episodes/clinmesh-promo/voiceover-minimax-exec/L001.wav`～`L014.wav`（`48kHz 2ch PCM WAV`，`1.00x` 原速保持，零变速相位失真）。
- **双偏移同步与响度归一**：SFX 统一按 `sfxFrom(targetPeakF, src)` 补偿 `sfx/audio-manifest.json` 实测 10ms RMS 能量峰位置与输出编码器偏移（`OUTPUT_AUDIO_OFFSET_F = 0.21`）；成片整片响度线性校准至 **`-16 LUFS`（`±1 LU`）**，真峰值 **`<= -1.0 dBTP`**。

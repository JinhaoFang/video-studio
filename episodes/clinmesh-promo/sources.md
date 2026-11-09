# ClinMesh 宣传片素材来源

登记合成 `ClinMeshPromo` 用到的素材。媒体都在被 git 忽略的 `public/episodes/clinmesh-promo/`，不进版本库；下文路径都相对这个目录。素材由协作者在本机制作，下面的来源和条款照协作者的记录登记。

**能否对外发布还没有定论。** 下面「未登记」一节的条目补齐前，不要对外发布。

## 未登记，对外发布前补齐

| 素材 | 缺什么 |
|---|---|
| `images/begin1.jpg`、`images/pain-legacy.jpg`、`images/begin3.jpg` | 记录为"定制无文字静帧"，缺生成工具、模型、提示词和服务条款 |
| `images/slot-chest-pain.jpg`、`images/slot-liver-disease.jpg`、`images/slot-oncology-mdt.jpg` | 记录为"纯合成三维示意图"，缺生成工具、模型和服务条款 |
| `images/clinmesh-logo.webp` | ClinMesh 品牌标识；缺来源和使用授权的记录 |
| 旁白 `voiceover-minimax-exec/L001.wav`～`L014.wav` | MiniMax Audio「沉稳高管」声线，缺账户、模型版本和商用条款 |
| `sfx/fs-278205.mp3` | 钉帧清单里用了 6 次，但只在旧表里作为备选出现过，缺标题、作者和许可 |
| 产品截图 `captures/` | 采集自 ClinMesh 本地服务；缺产品方同意对外展示界面的确认 |

## 合规约束

- 画面、旁白和字幕不出现内部工程代号。医院业务链路统一写作「医院业务与临床知识基底」。
- 产品截图在隔离的临时数据库和合成数据下采集，患者都是合成演示数据，不含真实身份、医保或支付凭证、平台密钥。
- 病理图像 `images/病理.png` 用的是 TCGA-BRCA 公开去标识切片，画面上保留 CC BY 3.0 署名：Clunie, D., et al. (2024). DICOM converted Slide Microscopy images for the TCGA-BRCA collection [Data set]. Zenodo. https://doi.org/10.5281/zenodo.[redact:phone]。
- 协作者约定：开发和自动抽帧质检时，agent 不读取病理切片像素；核对 S07 其余象限只看不含 `SLOT 01` 的区域，或者用几何占位。

## 产品截图（`captures/`）

Playwright 无头浏览器以 `deviceScaleFactor: 2` 采集 ClinMesh 本地服务的浅色界面状态。

| 目录或文件 | 镜头 | 内容 |
|---|---|---|
| `light-s03-s05/s03-01`～`s03-06` | S03 | 问诊对话 → 病历自动记录 → 病历成稿 → 检验候选 → 处方候选 → 指南依据抽屉 |
| `light-s03-s05/s04-01`、`s04-02`、`s04-04`、`s04-05` | S04 | 介入耗材已预留 → DRG 预分组 → 手术完成 → FM39 最终分组 |
| `light-s03-s05/s05-01`～`s05-04` | S05 | 问诊中的过敏原话 → 病历质控摘要 → 质控抽屉 → 问题已处理 |
| `light-s06/01`～`10` | S06 | 诊断确认、处方调整与开具、病历签署的十个状态 |
| `C01-outpatient-emr-card.png`、`C02-guideline-candidates-card.png`、`C03-pci-drg-workspace.png`、`C05-review-gate-signed-card.png`、`C06-multirole-status-strip.png` | S08 | 深色界面卡片，用作终章围合的代表卡；`C06` 也用于 L013 的跨岗状态条。`C05` 记录为 Remotion 渲染的静态确认态 |

## 图像（`images/`）

| 文件 | 镜头 | 说明 |
|---|---|---|
| `begin1.jpg` | S01 L001 | 深色桌面上的听诊器与屏幕，2752×1536，无文字 |
| `pain-legacy.jpg` | S01 L002 | 暮色医院工作站，1792×1024，无文字 |
| `begin3.jpg` | S01 L003 | 暮色诊室全景，2752×1536，无文字 |
| `clinmesh-logo.webp` | S01、S08 | 品牌标识 |
| `病理.png` | S07、S08 | 数字病理识别画面，1920×945；署名见「合规约束」 |
| `slot-chest-pain.jpg`、`slot-liver-disease.jpg`、`slot-oncology-mdt.jpg` | S07 L012 | 三个专病智能体的深色三维示意图，16:9，无文字、非患者影像 |

## 配乐（`music/`）

- `clinical-neutral-underscore.wav`：基于 Andrew Ev《Vastness》（Mixkit #184，https://assets.mixkit.co/music/184/184.mp3，Mixkit Stock Music Free License），协作者在本机做了 32 Hz 高通、2.45 kHz 附近的轻微衰减，以及 -18.5 LUFS 线性归一。48kHz 双声道 PCM WAV，108.00 秒。这些处理没有命令留在仓库里。
- 混音不做旁白闪避（ducking），按乐曲段落做长跨度音量平衡，开头 36 帧渐入、结尾 60 帧渐出，实现见 `PromoAudio.tsx`。`data/props-nobgm.json`（`bgm: false`）渲染出只有旁白和音效的版本。

## 音效（`sfx/`）

均为 Freesound 的 CC0 素材，用 `video-shotcraft` 的 `sfx-source.py` 拉取。拉到的是 Freesound 的高质量 MP3 预览流，不是原始 WAV。峰值补偿用 `sfx/audio-manifest.json` 的实测数据，钉帧清单见 `sfx-schedule.ts`。

| ID 与标题 | 时长 | 下载 / 评分（登记时） | 用途 |
|---|---:|---|---|
| `fs:71852` `digital_whoosh_soft.wav` | 1.0s | ↓7,705 ★4.5 | S01 溶解、B01–B03 字卡 |
| `fs:464302` `PaperSlide.wav` | 1.6s | ↓4,571 ★4.9 | S02 底座展开 |
| `fs:444431`（`fs:464302` 的备选） | — | — | 只在峰值表里有登记，钉帧清单没有用到 |
| `fs:331656` `Keyboard Typing` | 15.5s | ↓83,423 ★4.5 | S03 病历成稿，裁取 36 帧并在末尾 8 帧淡出 |
| `fs:520684` `Contarex camera shutter.wav` | 2.3s | ↓7,942 ★4.8 | S04 精算定格、S07 第一处 ROI |
| `fs:629979` `Camera Click.wav` | 0.34s | ↓1,369 ★4.6 | S03–S06 抽屉和点击、S07 第二处 ROI |
| `fs:278205` | — | 未登记 | S03–S06 页签切换 |
| `fs:815493` `Mechanical switch (latch) 02` | 1.8s | ↓1,203 ★4.8 | S06 确认签署 |
| `fs:671375` `Sub Impact` | 3.4s | ↓1,562 ★4.7 | S01 品牌落定、S02 落槽、S05 问题处理完、S06 剂量调整 |
| `fs:685256` `Riser sound effect short.wav` | 3.0s | ↓7,999 ★4.7 | S08 卡片飞入 |
| `fs:177242` `Cinematic Impact` | 7.9s | ↓40,786 ★4.7 | S08 主标落定 |
| `fs:562196` `snd_fragment_retrieve.wav` | 1.7s | ↓2,395 ★4.9 | S08 底线展开 |

## 交付封装

协作者的交付文件（`ClinMesh医疗智能体宣传片.mp4` 及其无配乐版）在视频首帧和 MP4 `attached_pic` 里都写入了 S01 第 17 秒的主标静帧作为封面，前者用于微信预览，后者用于桌面播放器。成片响度目标为 -16 LUFS ±1 LU、真峰值 ≤ -1 dBTP。封面写入和响度校准的命令都没有留在仓库里。

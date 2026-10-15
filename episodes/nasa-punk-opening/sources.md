# NASA 朋克开场：素材来源与使用记录

对应 spec #60、工单 #62；仅用于本机学习复刻，不公开发布。登记日期：2026-10-15。

素材根目录为 `public/episodes/nasa-punk-opening/`，下表的文件名均相对于该目录。共 10 个文件（4 张照片、2 个 SVG、4 类纹理），全部被 git 忽略；git 只保存本记录。验收后须将当前 worktree 中的整个素材目录另行复制到主工作区，`land` 不会复制素材。

## 逐文件清单

| 文件                                       | 用途（句子 / 镜头）                                                                                                                            | 来源 URL / 生成记录                                                                                                                                                                                                                                                                                                    | 作者 / 机构                                                                 | 授权与限制                                                                                 |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `photos/demo2-rollout-NHQ202005210001.jpg` | L001～L002「2020年5月 / 一枚火箭在夜里推出厂房」：厂房门口夜景；箭体蠕虫可见，作为开场照片和 HUD 备选                                          | [NASA HQ 官方 Flickr](https://www.flickr.com/photos/nasahqphoto/49919087323/)；[最高分辨率原图](https://live.staticflickr.com/65535/49919087323_1ce594a7e6_o.jpg)；[Commons 授权记录](<https://commons.wikimedia.org/wiki/File:SpaceX_Demo-2_Rollout_(NHQ202005210001).jpg>)                                           | NASA / Bill Ingalls；2020-05-21，Kennedy Space Center，Demo-2               | 美国联邦政府作品，公有领域（PD-NASA）；保留 NASA / Bill Ingalls 来源署名，不暗示 NASA 背书 |
| `photos/demo2-rollout-NHQ202005210002.jpg` | L002～L005「一枚火箭在夜里推出厂房 / 箭体上印着一个红色的标志 / 这个标志 / NASA自己废过一次」：火箭横向全景；0:04～0:09 HUD 框选字标的首选原图 | [NASA HQ 官方 Flickr](https://www.flickr.com/photos/nasahqphoto/49919899127/)；[最高分辨率原图](https://live.staticflickr.com/65535/49919899127_bb1fdb436f_o.jpg)；[NASA 编号页](https://images.nasa.gov/details-NHQ202005210002)；[Commons 授权记录](https://commons.wikimedia.org/wiki/File:DM-2_Falcon_Rollout.jpg) | NASA / Bill Ingalls；2020-05-21，Kennedy Space Center，Demo-2               | 美国联邦政府作品，公有领域（PD-NASA）；保留 NASA / Bill Ingalls 来源署名，不暗示 NASA 背书 |
| `photos/demo2-rollout-NHQ202005210003.jpg` | L001～L002 开场照片切换备选：同次夜间推出的 Crew Dragon 与搬运结构近景；蠕虫在画外，本图不用于 L003～L005 的字标框选                           | [NASA HQ 官方 Flickr](https://www.flickr.com/photos/nasahqphoto/49919899492/)；[最高分辨率原图](https://live.staticflickr.com/65535/49919899492_dbe5841b03_o.jpg)；[Commons 授权记录](<https://commons.wikimedia.org/wiki/File:SpaceX_Demo-2_Rollout_(NHQ202005210003).jpg>)                                           | NASA / Bill Ingalls；2020-05-21，Kennedy Space Center，Demo-2               | 美国联邦政府作品，公有领域（PD-NASA）；保留 NASA / Bill Ingalls 来源署名，不暗示 NASA 背书 |
| `photos/demo2-rollout-NHQ202005210004.jpg` | L001 开场夜景备选：同次推出到 LC-39A 的远景，交代夜间环境；不用于字标特写                                                                      | [NASA HQ 官方 Flickr](https://www.flickr.com/photos/nasahqphoto/49919899847/)；[最高分辨率原图](https://live.staticflickr.com/65535/49919899847_3253328ae6_o.jpg)；[Commons 授权记录](<https://commons.wikimedia.org/wiki/File:SpaceX_Demo-2_Rollout_(NHQ202005210004).jpg>)                                           | NASA / Bill Ingalls；2020-05-21，Kennedy Space Center，Demo-2               | 美国联邦政府作品，公有领域（PD-NASA）；保留 NASA / Bill Ingalls 来源署名，不暗示 NASA 背书 |
| `logos/nasa-meatball.svg`                  | L010～L013「NASA用的还是一个蓝色的圆形徽章 / 大家管它叫肉丸 / 那一年 / 美国政府推动各个机构换新形象」：桌面徽章纸片                            | [Wikimedia Commons 原稿及授权](https://commons.wikimedia.org/wiki/File:NASA_logo.svg)；[SVG 原文件](https://upload.wikimedia.org/wikipedia/commons/e/e5/NASA_logo.svg)                                                                                                                                                 | NASA；肉丸徽章原设计 James Modarelli（1959）；Commons 文件机构署名为 NASA   | 公有领域（PD-NASA）；徽记与商标使用另受限制，不暗示官方合作或背书                          |
| `logos/nasa-worm.svg`                      | L015～L017、L020～L022：字标阶段图的矢量依据与最终蠕虫；本工单只交原稿，不制作变形阶段                                                         | [Wikimedia Commons 原稿及授权](https://commons.wikimedia.org/wiki/File:NASA_Worm_logo.svg)；[SVG 原文件](https://upload.wikimedia.org/wikipedia/commons/a/a3/NASA_Worm_logo.svg)                                                                                                                                       | Danne & Blackburn，1975 年 NASA Graphics Standards Manual；Commons 矢量转录 | 公有领域（Commons PD-NASA）；徽记与商标使用另受限制，不暗示官方合作或背书                  |
| `textures/desktop-warm-generated.png`      | L010～L022 桌面纸片场景：深棕桌面底材                                                                                                          | **生成**：用户指定的 OpenAI 兼容服务（端点由本机 `.env` 的 `openai_url` 指定，无公开素材 URL）；模型 `gpt-image-2.5-sunburst`；[完整提示词](#prompt-desktop)                                                                                                                                                           | 用户自建生图服务生成；本工单做色板校正与原生像素镜像扩展                    | 服务授权条款未提供；记录为生成素材，仅用于本 spec 的本机学习，不标为公有领域或 CC0         |
| `textures/paper-ivory-generated.png`       | L010～L022 徽章纸片、字标研究纸和 L018～L019 手册引文纸片：米白纸面颗粒                                                                        | **生成**：用户指定的 OpenAI 兼容服务（`openai_url`，无公开素材 URL）；模型 `gpt-image-2.5-sunburst`；[完整提示词](#prompt-paper)                                                                                                                                                                                       | 用户自建生图服务生成；本工单做色板校正与无缝镜像拼接                        | 服务授权条款未提供；仅用于本 spec 的本机学习，不标为公有领域或 CC0                         |
| `textures/tape-warm-generated.png`         | L010～L013 徽章纸片及 L018～L019 引文纸片：胶带材质；后续镜头按设计裁成短胶带形状                                                              | **生成**：用户指定的 OpenAI 兼容服务（`openai_url`，无公开素材 URL）；模型 `gpt-image-2.5-sunburst`；[完整提示词](#prompt-tape)                                                                                                                                                                                        | 用户自建生图服务生成；本工单做色板校正与无缝镜像拼接                        | 服务授权条款未提供；仅用于本 spec 的本机学习，不标为公有领域或 CC0                         |
| `textures/torn-paper-generated.png`        | L005～L007「NASA自己废过一次 / 后来 / 它还长成了一种风格」：`VOID · 1992` 撕纸贴条的空白纸边，文字由后续镜头叠加                               | **生成**：用户指定的 OpenAI 兼容服务（`openai_url`，无公开素材 URL）；模型 `gpt-image-2.5-sunburst`；[完整提示词](#prompt-torn)                                                                                                                                                                                        | 用户自建生图服务生成；保留返回的透明通道，做色板校正与横向镜像拼接          | 服务授权条款未提供；仅用于本 spec 的本机学习，不标为公有领域或 CC0                         |

NASA 照片的拍摄日期、事件、作者和公有领域状态由 NASA HQ 的官方照片说明与 Commons 的逐文件元数据交叉核对。NASA 主站和 images-api 在本次环境中发生 TLS 连接失败，故照片直接取 NASA HQ 官方 Flickr 的 `Original`，并对照原图尺寸页；不是下载 Commons 的缩略图。照片和两个 SVG 均保持下载字节，不做调色、裁剪或重编码。两个 SVG 都是真矢量，无内嵌位图、无外部素材依赖，Chrome 实测正常显示。

## 原图分辨率与取景证据

| 照片编号        | 原图分辨率 | 原图文件字节数 | 取景说明                               |
| --------------- | ---------- | -------------- | -------------------------------------- |
| NHQ202005210001 | 6283×3844  | 6,620,887      | 厂房门口、箭体红色蠕虫可见             |
| NHQ202005210002 | 7661×4519  | 12,219,244     | HUD 首选；可在 1080p 中清晰框出蠕虫    |
| NHQ202005210003 | 5541×2577  | 4,239,619      | 同次推出，飞船与搬运结构近景；不含蠕虫 |
| NHQ202005210004 | 8045×4384  | 10,559,455     | 同次推出的夜间发射场远景               |

字标可读性实测：从 NHQ202005210002 原图取 `(1340,1640)` 到 `(5180,3800)` 的 3840×2160 区域，下采样 50% 得到 1920×1080；字标框约为 `(565,425)` 到 `(745,510)`，约 180×85 像素，字形清晰且无需放大。此裁切仅用于可用性证据，不规定后续镜头构图；原素材保留全图。

本 worktree 的验收产物在 `out/qa/spec-60/62/`：`asset-overview.jpg` 为全部 10 个素材的缩略图和文件名；`photo-resolutions.csv` 为原图分辨率列表；`worm-1080p.jpg` 与 `worm-1080p-boxed.jpg` 为字标证据；`logos-browser.png` 与 `logos-browser-dom.html` 为浏览器显示证据；`asset-inventory.json` 逐文件记尺寸、大小和 SHA-256。

## 纹理交付与服务实测

只生成了工单指定的四类纹理，没有生成 NASA 场景或重画徽记；公开 NASA 照片已经足够。生成纹理是工单要求，用于匹配既定暖色色板和空白可叠加底材，并非公开图库照片不足。

调用方式为 imagegen 技能附带 CLI（`generate`、`generate-batch`），模型名和凭证从用户指定的只读 `.env` 载入进程环境；素材、提示词与日志均不保存凭证。

本次 4/4 个生成任务成功，日志未见重试；CLI 逐任务报告耗时约 22.3～34.5 秒，后三张并发。桌面和撕纸请求 `size=auto`，返回 1672×941；纸面与胶带请求 `1024x1024`，实际返回 1254×1254。提示词要求的 1920×1080 也没有得到原生 1080p。**本次观测到的原生输出均约 1.57 MP，尺寸参数未按请求值返回；未测出服务的硬分辨率上限，不能据此承诺原生 1080p / 4K。** 成功率与耗时只代表本次 4 个任务。

| 交付纹理 | 服务原生尺寸 | 交付尺寸 / 模式             | 后处理与使用约束                                                                                                                                                                                                           |
| -------- | ------------ | --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 深色桌面 | 1672×941     | 1920×1080，RGB              | 取 960×540 原生颗粒，拟合去除模型的大尺度照明，镜像扩展后映射到指定 `#251E17` → `#1B1611` 暖棕渐晕；没有栅格放大。100×100 取样中心约 `#272019`，四角约 `#1C1711`，与参照目标每通道差不超过 3。桌面自带暗角，不用于无缝重复 |
| 米白纸面 | 1254×1254    | 1920×1080，RGB；可双向平铺  | 裁取原生 960×540 材质并镜像拼接，通道中位数校到 `#EDE4D9`；相对两边像素完全相同，没有栅格放大                                                                                                                              |
| 胶带材质 | 1254×1254    | 1920×1080，RGB；可双向平铺  | 裁取原生 960×540 材质并镜像拼接，通道中位数校到 `#DED8CE`；交付的是可裁切的胶带表面，不含预设短条轮廓或阴影；没有栅格放大                                                                                                  |
| 撕纸边缘 | 1672×941     | 3344×1080，RGBA；可横向平铺 | 服务实际返回透明背景而非提示词中的绿幕，故直接保留原始 alpha，无需抠图；不透明纸面中位数校到 `#EDE4D9`，横向镜像形成匹配边缘的重复周期，透明画布补足高度；没有栅格放大，不烘焙文字和投影                                   |

原始生成结果留在验收目录的 `generated-originals/`，不属于本期可用素材目录，也不进 git；后处理参数与取色数据见 `texture-processing.json`，生成日志见 `desktop-generation.log` 和 `texture-batch-generation.log`。纹理的颗粒粗细与撕边形态由模型给出，最终在小样镜头中确认（`TODO(design)`）。

## 完整生成提示词

以下为实际送出的原文，均使用模型 `gpt-image-2.5-sunburst`、`quality=high`，不附加 CLI 自动润色。

<a id="prompt-desktop"></a>

### 深色桌面

```text
Use case: photorealistic-natural
Asset type: reusable background texture for a 1920x1080 NASA design history video, not a finished scene.
Primary request: one uninterrupted empty dark warm brown desktop surface viewed perfectly from above, completely filling the frame edge to edge. Very fine subtle matte grain, no large wood planks, no scratches or distinct marks. Center approximately #251E17, gradually and subtly darker at the four corners approximately #1B1611. Keep the center dark, low contrast and quiet for later paper-card compositing.
Composition/framing: exact 16:9 landscape, output resolution at least 1920x1080 pixels.
Color palette: warm brown only, strictly no blue or cyan cast.
Constraints: texture only; no objects, no paper, no tape, no text, no letters, no logos, no borders, no watermark. Orthographic top-down and flat, no perspective.
```

<a id="prompt-paper"></a>

### 米白纸面

```text
Use case: photorealistic-natural
Asset type: seamless repeating material texture for compositing blank archival paper cards in a NASA design-history video.
Primary request: a perfectly flat, evenly lit, seamless tile of warm uncoated ivory paper. Extremely subtle fine paper fibers and grain, completely blank and uninterrupted edge to edge. Surface color #EDE4D9, slight variation within #F2EDE8 and #DED8CE. Orthographic top-down macro material scan, not a sheet photographed on another surface.
Composition/framing: square, all four edges seamlessly tileable, uniform lighting without vignette.
Constraints: no objects, no border, no creases, no stains, no writing, no grid, no logos, no symbols, no watermark; warm neutral ivory, no blue cast. Fine unobtrusive grain, no large-scale pattern.
```

<a id="prompt-tape"></a>

### 胶带材质

```text
Use case: photorealistic-natural
Asset type: seamless repeating masking-tape material texture, to be clipped into tape strips over paper cards in a NASA design-history video.
Primary request: perfectly flat top-down macro scan of warm pale-beige archival masking tape material filling the entire image edge to edge. Fine pressed paper fibers and subtle adhesive mottling only. Warm muted beige, approximately #DED8CE to #E4DFD4. No separate tape roll or tape pieces; show only uninterrupted material.
Composition/framing: square seamless texture tile, evenly lit, all four edges seamlessly repeatable without borders or shadows.
Constraints: no text, no pattern, no writing, no objects, no borders, no watermark, no blue cast; retain subtle fibrous tape texture.
```

<a id="prompt-torn"></a>

### 撕纸边缘

```text
Use case: photorealistic-natural
Asset type: horizontally repeating torn-paper edge asset for a VOID archival paper strip in a NASA design-history video.
Primary request: one long blank warm ivory paper band across the middle of the entire image, continuing out of both left and right image edges. Horizontal upper and lower edges are naturally torn with very fine irregular paper fibers. Both paper edges stay almost straight with small organic variations, not dramatic jagged peaks. Paper color #EDE4D9 to #F2EDE8; subtle fine fibers. Place paper on perfectly uniform pure green #00FF00 background for clean local alpha extraction. Flat orthographic top-down scan, diffuse shadowless lighting.
Composition/framing: 16:9 landscape. Band occupies the central half of image height, spanning full width. Left and right edge profiles should match for seamless horizontal tiling. No visible vertical paper ends.
Constraints: no text, no markings, no letters, no other objects, no tape, no cast shadows, no vignette, no watermark; warm paper with no green spill and no blue cast.
```

## 临时配音、台本与渲染（#61）

| 资产                   | 来源与生成方式                                                                                                                                                                                                                                                                             | 授权与使用范围                                                                         | 本机位置                                                             |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| 临时逐句配音 L001–L022 | B 站《设计风格小课 04：NASA 朋克》，av117409155384891；本机参考文件及 description.md 位于 `references/震惊瘫坐！Opus 5.5 做的设计科普04：被 NASA 废掉的标志，怎么成了游戏里的未来感/`。用 ffmpeg 按 `docs/research/nasa-ep04/transcript.md` 切出 48kHz PCM WAV；音轨包含原片已有配乐与效果 | 原片未见允许再发布的授权，只按 spec #60 在本机学习、开发和验收，不公开、不进 Git       | `public/episodes/nasa-punk-opening/temporary/L001.wav` 至 `L022.wav` |
| 台本文字和参考时间     | 同一视频的校正转写，前 22 句原文；末句停顿使用第 23 句起点                                                                                                                                                                                                                                 | 原片文字，只作本机复刻研究；研究转写已有仓库记录                                       | `script.md`、`data/reference-timeline.json`                          |
| Noto Sans SC 常规字重  | Google Fonts，经 `@remotion/google-fonts/NotoSansSC` 加载                                                                                                                                                                                                                                  | SIL Open Font License 1.1；https://fonts.google.com/noto/specimen/Noto+Sans+SC/license | 渲染时加载，不提交字体媒体                                           |
| 素字幕样片及验收图片   | 本期 Remotion 合成；近黑色来自 `docs/research/nasa-ep04/style.md`，居中文字按句切换                                                                                                                                                                                                        | 包含参考音轨，只在本机验收，不公开、不进 Git                                           | `out/qa/spec-60/61/`                                                 |

## 配音试听（#63）

- 原文：`docs/research/nasa-ep04/transcript.md` 的 L001～L003；来自参考视频的学习用转写。逐句带前后一句原文，L001 无前句，L003 的后句是 L004“这个标志”。未改写原文。
- 生成服务：[ElevenLabs Text to Speech](https://elevenlabs.io/docs/api-reference/text-to-speech/convert.md)，2026-10-15；官方预设 Daniel（`onwK4e9ZLuTAKqWW03F9`）、Alice（`Xb7hH8MSUJpSbSDYk0k2`），各配 `eleven_v4`、`eleven_multilingual_v2`。MP3 44.1kHz/128kbps，seed=0，其他语音设置使用服务默认值。
- 授权用途：使用账户免费额度生成，仅限本机非商业学习，不公开发布；[ElevenLabs 条款](https://elevenlabs.io/terms-of-use)与[免费计划使用说明](https://help.elevenlabs.io/hc/en-us/articles/13313564601361-Can-I-publish-the-content-I-generate-on-the-platform)适用。该记录不宣称取得了原文或参考视频的公开传播授权。
- 本机素材目录：`public/episodes/nasa-punk-opening/voice-audition/<Daniel|Alice>/<模型>/L001.mp3`～`L003.mp3`；相邻 JSON 保存请求原文、上下文、SHA256、request/history ID 与实际 credits。媒体和这些本机记录均不进 git。
- 复现命令与计费证据：本 worktree 的 `out/qa/spec-60/63/`；官方 API 核对见 `docs/research/nasa-ep04/elevenlabs-api.md`。

## 正式配音（#69）

- 生成服务与授权沿用上节 ElevenLabs 条款及免费计划限制，仅本机非商业学习，不公开发布。选定官方预设 Alice（`Xb7hH8MSUJpSbSDYk0k2`）× `eleven_v4`。
- 原文：`script.md` 的 L001～L022，与参考转写一致。第二轮按 #69 验收改合成文本：NASA 读「纳萨」、L006「后来，」不带前后文，配置见 `data/voiceover-overrides.json`。其余请求带改写后的相邻文本，L022 后句为 L023；台本与字幕不变。
- 原始合成：2026-10-15 的第二轮共 22 句，seed=0、MP3 44.1kHz/128kbps；请求均发送 `voice_settings.speed=1.2`，但 `eleven_v4` 不支持 Speed（见 [API 研究](../../docs/research/nasa-ep04/elevenlabs-api.md)），原始解码旁白仍为 48.40 秒。L003 重配两次、L014 一次，L006 去上下文首次正确。第三、四轮不再调用服务或查询账户。
- 原始媒体及合成请求保留在本 worktree 的 `public/episodes/nasa-punk-opening/voiceover/L001.mp3`～`L022.mp3` 与同名 JSON，第三轮逐文件 SHA256 确认未改。第一轮旧版仍在 `/root/project/video-studio.worktrees/69/out/qa/spec-60/69/previous-64215d2/voiceover/`；语速探针与重配中间文件不属于正式配音。
- 第三轮后期处理：`node tools/stretch-voice.ts` 输入原始目录，统一 ffmpeg `rubberband=tempo=1.257143:pitch=1` 保持音高，输出到相邻 `voiceover-rubberband/`；44.1kHz/128kbps MP3 重新编码，未裁剪、未改台本停顿、未使用 atempo。倍率按 48.40 / 38.5 计算，保留六位小数；更换倍率仍从原始目录开始。处理后 JSON 保留原始合成来源，并补充输入/输出哈希、倍率、音高和 ffmpeg 参数数组；完整命令见该期 README 和验收目录。
- 本轮 **0 credits**；累计 **429 / 1500**（第一轮 178、第二轮 251），加上 #63 的 127，账户累计 556 / 10000。账本哈希未变，沿用此前保守剩余 **9444**，不是本轮新查余额。第二轮 251 包含 22 句 199、L002 speed 探针 11、L003 两次重配 24、L014 重配 17。
- 第四轮只按最新验收将 L008 覆盖为 `tempo=1.15`，其他句子保持 `1.257143`，全部保持音高；用 `--tempo-override L008=1.15` 从原始目录生成到此前不存在的 `voiceover-rubberband-v2/`，原始及第三轮目录保留。JSON 的 `postProcessing.tempo` 逐句记录实际倍率，保留同一套来源与授权。SHA256 对比确认只有 L008 音频字节变化，其余 21 句、原始文件、旧变速目录及账本均不变。
- ffprobe 解码样本实测当前旁白 **38.612925 秒**；`data/voiceover-durations.json` 和 `data/timeline.json` 全部指向新目录，来源仍为正式配音并记下默认倍率与 L008 例外，总长 **1437 帧 / 47.90 秒**，比第三轮增加 3 帧。Whisper 只用仓库外缓存模型和 venv，经 ffmpeg 解码数组，不使用不兼容的 PyAV 解码；评分仍采用原台本和已批准的等价规则。
- 本轮只复核 L008：转写「时间往回倒」，CER **0%（0/5）**，第三轮为 40%；真峰值 **-6.6 dBTP**，无爆音、句中长静音、ASR 首尾不符。QA 仍退出 1，仅有原先的头部留白不足 20ms 标记，已在最新验收接受，未重新合成。其余 21 句复用第三轮评分，L007/L022 的同音差异与原有 12 句边缘标记均已接受；合并结果 CER 为 **1.49%（3/202）**，不是本轮全量复测。
- 本轮原始识别、时长及哈希证据在 `/root/project/video-studio.worktrees/69/out/qa/spec-60/69/round4/`；第三轮整段渲染和 22 张逐句对比图仍保留在相邻 `round3/`，仅作当轮验收。合并前须由设计负责人把本 worktree 的 `voiceover/`、`voiceover-rubberband/`、`voiceover-rubberband-v2/` 三目录（含 MP3 和 JSON）另行拷回主工作区；当前合成使用 `voiceover-rubberband-v2/`，媒体不进 git。

## 程序配乐、翻牌嘀嗒与混音（#70）

- 生成入口：`node tools/mix-opening.ts --help`；2026-10-15 在本 worktree 用 Node 22、ffmpeg 4.4.2 执行，复现参数见本期 README。配乐和音效全部由数学函数合成，不使用第三方音乐、采样、素材或生成服务，不涉及第三方音效授权。
- 配乐 `music.wav`：48kHz 浮点单声道，80 Hz 正弦，持续时间取正式时间轴总帧数 / fps；全长 RMS 比旁白低 20 dB。没有段落拼接、循环接缝和句间静音。
- 音效 `ticks.wav`：2300 Hz 正弦，每次翻牌用 Hann 包络；发声区间、周期和逐位停稳直接读取 #67 的 `motion` 与 `proposal.clock` 令牌，锚点是 L008 起点加章节溶解与普通溶解时长。各次幅度随仍乱跳的位数减少，最后一位停稳即结束。当前为 429～474 帧 / 14.30～15.80 秒；不复制另一份时长数字。
- 正式旁白：读取 `data/timeline.json` 的 22 句 `voiceover-rubberband-v2/` MP3，沿用上一节来源与授权，输入从主工作区只读复制到本 worktree；逐句音频、台本、时间轴和主工作区媒体均未修改。混音不使用含参考配乐的 `temporary/` 音轨。
- 混音：旁白、低频与嘀嗒相加后转成同相双声道，用 ffmpeg 两遍 `loudnorm`，目标 -16 LUFS、内部真峰值上限 -2 dBTP，LRA 只作报告。`mix.wav` 为 48kHz/24bit PCM；可选 `--video` 复制已有渲染的视频码流，替换成唯一一条 320kbps AAC 音轨。旁白授权限制继续适用于混音成片。
- 本机输出：`/root/project/video-studio.worktrees/70/out/qa/spec-60/70/mix/`；`voice.wav`、`music.wav`、`ticks.wav`、`mix-raw.wav`、`mix.wav`、`opening-mixed.mp4` 均为不进 git 的生成或渲染产物。`mix-report.json` 记录源文件 SHA256、令牌文件 SHA256、句子锚点、实际电平与 ffmpeg 参数数组。最终集成后重跑即可，不需要把这些输出复制进主工作区。
- 对照：原参考视频仅裁取 0:00～0:46 音轨作本机响度与频谱验收，保存于同一验收根目录的 `reference-0-46.wav`，不进入正式混音。参考音轨及频谱的使用范围沿用 #61 的本机学习限制。

# NASA 朋克开场：素材来源与使用记录

对应 spec #60、工单 #62；仅用于本机学习复刻，不公开发布。登记日期：2026-10-15。

素材根目录为 `public/episodes/nasa-punk-opening/`，下表的文件名均相对于该目录。共 10 个文件（4 张照片、2 个 SVG、4 类纹理），全部被 git 忽略；git 只保存本记录。验收后须将当前 worktree 中的整个素材目录另行复制到主工作区，`land` 不会复制素材。

## 逐文件清单

| 文件 | 用途（句子 / 镜头） | 来源 URL / 生成记录 | 作者 / 机构 | 授权与限制 |
|---|---|---|---|---|
| `photos/demo2-rollout-NHQ202005210001.jpg` | L001～L002「2020年5月 / 一枚火箭在夜里推出厂房」：厂房门口夜景；箭体蠕虫可见，作为开场照片和 HUD 备选 | [NASA HQ 官方 Flickr](https://www.flickr.com/photos/nasahqphoto/49919087323/)；[最高分辨率原图](https://live.staticflickr.com/65535/49919087323_1ce594a7e6_o.jpg)；[Commons 授权记录](https://commons.wikimedia.org/wiki/File:SpaceX_Demo-2_Rollout_(NHQ202005210001).jpg) | NASA / Bill Ingalls；2020-05-21，Kennedy Space Center，Demo-2 | 美国联邦政府作品，公有领域（PD-NASA）；保留 NASA / Bill Ingalls 来源署名，不暗示 NASA 背书 |
| `photos/demo2-rollout-NHQ202005210002.jpg` | L002～L005「一枚火箭在夜里推出厂房 / 箭体上印着一个红色的标志 / 这个标志 / NASA自己废过一次」：火箭横向全景；0:04～0:09 HUD 框选字标的首选原图 | [NASA HQ 官方 Flickr](https://www.flickr.com/photos/nasahqphoto/49919899127/)；[最高分辨率原图](https://live.staticflickr.com/65535/49919899127_bb1fdb436f_o.jpg)；[NASA 编号页](https://images.nasa.gov/details-NHQ202005210002)；[Commons 授权记录](https://commons.wikimedia.org/wiki/File:DM-2_Falcon_Rollout.jpg) | NASA / Bill Ingalls；2020-05-21，Kennedy Space Center，Demo-2 | 美国联邦政府作品，公有领域（PD-NASA）；保留 NASA / Bill Ingalls 来源署名，不暗示 NASA 背书 |
| `photos/demo2-rollout-NHQ202005210003.jpg` | L001～L002 开场照片切换备选：同次夜间推出的 Crew Dragon 与搬运结构近景；蠕虫在画外，本图不用于 L003～L005 的字标框选 | [NASA HQ 官方 Flickr](https://www.flickr.com/photos/nasahqphoto/49919899492/)；[最高分辨率原图](https://live.staticflickr.com/65535/49919899492_dbe5841b03_o.jpg)；[Commons 授权记录](https://commons.wikimedia.org/wiki/File:SpaceX_Demo-2_Rollout_(NHQ202005210003).jpg) | NASA / Bill Ingalls；2020-05-21，Kennedy Space Center，Demo-2 | 美国联邦政府作品，公有领域（PD-NASA）；保留 NASA / Bill Ingalls 来源署名，不暗示 NASA 背书 |
| `photos/demo2-rollout-NHQ202005210004.jpg` | L001 开场夜景备选：同次推出到 LC-39A 的远景，交代夜间环境；不用于字标特写 | [NASA HQ 官方 Flickr](https://www.flickr.com/photos/nasahqphoto/49919899847/)；[最高分辨率原图](https://live.staticflickr.com/65535/49919899847_3253328ae6_o.jpg)；[Commons 授权记录](https://commons.wikimedia.org/wiki/File:SpaceX_Demo-2_Rollout_(NHQ202005210004).jpg) | NASA / Bill Ingalls；2020-05-21，Kennedy Space Center，Demo-2 | 美国联邦政府作品，公有领域（PD-NASA）；保留 NASA / Bill Ingalls 来源署名，不暗示 NASA 背书 |
| `logos/nasa-meatball.svg` | L010～L013「NASA用的还是一个蓝色的圆形徽章 / 大家管它叫肉丸 / 那一年 / 美国政府推动各个机构换新形象」：桌面徽章纸片 | [Wikimedia Commons 原稿及授权](https://commons.wikimedia.org/wiki/File:NASA_logo.svg)；[SVG 原文件](https://upload.wikimedia.org/wikipedia/commons/e/e5/NASA_logo.svg) | NASA；肉丸徽章原设计 James Modarelli（1959）；Commons 文件机构署名为 NASA | 公有领域（PD-NASA）；徽记与商标使用另受限制，不暗示官方合作或背书 |
| `logos/nasa-worm.svg` | L015～L017、L020～L022：字标阶段图的矢量依据与最终蠕虫；本工单只交原稿，不制作变形阶段 | [Wikimedia Commons 原稿及授权](https://commons.wikimedia.org/wiki/File:NASA_Worm_logo.svg)；[SVG 原文件](https://upload.wikimedia.org/wikipedia/commons/a/a3/NASA_Worm_logo.svg) | Danne & Blackburn，1975 年 NASA Graphics Standards Manual；Commons 矢量转录 | 公有领域（Commons PD-NASA）；徽记与商标使用另受限制，不暗示官方合作或背书 |
| `textures/desktop-warm-generated.png` | L010～L022 桌面纸片场景：深棕桌面底材 | **生成**：用户指定的 OpenAI 兼容服务（端点由本机 `.env` 的 `openai_url` 指定，无公开素材 URL）；模型 `gpt-image-2.5-sunburst`；[完整提示词](#prompt-desktop) | 用户自建生图服务生成；本工单做色板校正与原生像素镜像扩展 | 服务授权条款未提供；记录为生成素材，仅用于本 spec 的本机学习，不标为公有领域或 CC0 |
| `textures/paper-ivory-generated.png` | L010～L022 徽章纸片、字标研究纸和 L018～L019 手册引文纸片：米白纸面颗粒 | **生成**：用户指定的 OpenAI 兼容服务（`openai_url`，无公开素材 URL）；模型 `gpt-image-2.5-sunburst`；[完整提示词](#prompt-paper) | 用户自建生图服务生成；本工单做色板校正与无缝镜像拼接 | 服务授权条款未提供；仅用于本 spec 的本机学习，不标为公有领域或 CC0 |
| `textures/tape-warm-generated.png` | L010～L013 徽章纸片及 L018～L019 引文纸片：胶带材质；后续镜头按设计裁成短胶带形状 | **生成**：用户指定的 OpenAI 兼容服务（`openai_url`，无公开素材 URL）；模型 `gpt-image-2.5-sunburst`；[完整提示词](#prompt-tape) | 用户自建生图服务生成；本工单做色板校正与无缝镜像拼接 | 服务授权条款未提供；仅用于本 spec 的本机学习，不标为公有领域或 CC0 |
| `textures/torn-paper-generated.png` | L005～L007「NASA自己废过一次 / 后来 / 它还长成了一种风格」：`VOID · 1992` 撕纸贴条的空白纸边，文字由后续镜头叠加 | **生成**：用户指定的 OpenAI 兼容服务（`openai_url`，无公开素材 URL）；模型 `gpt-image-2.5-sunburst`；[完整提示词](#prompt-torn) | 用户自建生图服务生成；保留返回的透明通道，做色板校正与横向镜像拼接 | 服务授权条款未提供；仅用于本 spec 的本机学习，不标为公有领域或 CC0 |

NASA 照片的拍摄日期、事件、作者和公有领域状态由 NASA HQ 的官方照片说明与 Commons 的逐文件元数据交叉核对。NASA 主站和 images-api 在本次环境中发生 TLS 连接失败，故照片直接取 NASA HQ 官方 Flickr 的 `Original`，并对照原图尺寸页；不是下载 Commons 的缩略图。照片和两个 SVG 均保持下载字节，不做调色、裁剪或重编码。两个 SVG 都是真矢量，无内嵌位图、无外部素材依赖，Chrome 实测正常显示。

## 原图分辨率与取景证据

| 照片编号 | 原图分辨率 | 原图文件字节数 | 取景说明 |
|---|---|---|---|
| NHQ202005210001 | 6283×3844 | 6,620,887 | 厂房门口、箭体红色蠕虫可见 |
| NHQ202005210002 | 7661×4519 | 12,219,244 | HUD 首选；可在 1080p 中清晰框出蠕虫 |
| NHQ202005210003 | 5541×2577 | 4,239,619 | 同次推出，飞船与搬运结构近景；不含蠕虫 |
| NHQ202005210004 | 8045×4384 | 10,559,455 | 同次推出的夜间发射场远景 |

字标可读性实测：从 NHQ202005210002 原图取 `(1340,1640)` 到 `(5180,3800)` 的 3840×2160 区域，下采样 50% 得到 1920×1080；字标框约为 `(565,425)` 到 `(745,510)`，约 180×85 像素，字形清晰且无需放大。此裁切仅用于可用性证据，不规定后续镜头构图；原素材保留全图。

本 worktree 的验收产物在 `out/qa/spec-60/62/`：`asset-overview.jpg` 为全部 10 个素材的缩略图和文件名；`photo-resolutions.csv` 为原图分辨率列表；`worm-1080p.jpg` 与 `worm-1080p-boxed.jpg` 为字标证据；`logos-browser.png` 与 `logos-browser-dom.html` 为浏览器显示证据；`asset-inventory.json` 逐文件记尺寸、大小和 SHA-256。

## 纹理交付与服务实测

只生成了工单指定的四类纹理，没有生成 NASA 场景或重画徽记；公开 NASA 照片已经足够。生成纹理是工单要求，用于匹配既定暖色色板和空白可叠加底材，并非公开图库照片不足。

调用方式为 imagegen 技能附带 CLI（`generate`、`generate-batch`），模型名和凭证从用户指定的只读 `.env` 载入进程环境；素材、提示词与日志均不保存凭证。

本次 4/4 个生成任务成功，日志未见重试；CLI 逐任务报告耗时约 22.3～34.5 秒，后三张并发。桌面和撕纸请求 `size=auto`，返回 1672×941；纸面与胶带请求 `1024x1024`，实际返回 1254×1254。提示词要求的 1920×1080 也没有得到原生 1080p。**本次观测到的原生输出均约 1.57 MP，尺寸参数未按请求值返回；未测出服务的硬分辨率上限，不能据此承诺原生 1080p / 4K。** 成功率与耗时只代表本次 4 个任务。

| 交付纹理 | 服务原生尺寸 | 交付尺寸 / 模式 | 后处理与使用约束 |
|---|---|---|---|
| 深色桌面 | 1672×941 | 1920×1080，RGB | 取 960×540 原生颗粒，拟合去除模型的大尺度照明，镜像扩展后映射到指定 `#251E17` → `#1B1611` 暖棕渐晕；没有栅格放大。100×100 取样中心约 `#272019`，四角约 `#1C1711`，与参照目标每通道差不超过 3。桌面自带暗角，不用于无缝重复 |
| 米白纸面 | 1254×1254 | 1920×1080，RGB；可双向平铺 | 裁取原生 960×540 材质并镜像拼接，通道中位数校到 `#EDE4D9`；相对两边像素完全相同，没有栅格放大 |
| 胶带材质 | 1254×1254 | 1920×1080，RGB；可双向平铺 | 裁取原生 960×540 材质并镜像拼接，通道中位数校到 `#DED8CE`；交付的是可裁切的胶带表面，不含预设短条轮廓或阴影；没有栅格放大 |
| 撕纸边缘 | 1672×941 | 3344×1080，RGBA；可横向平铺 | 服务实际返回透明背景而非提示词中的绿幕，故直接保留原始 alpha，无需抠图；不透明纸面中位数校到 `#EDE4D9`，横向镜像形成匹配边缘的重复周期，透明画布补足高度；没有栅格放大，不烘焙文字和投影 |

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

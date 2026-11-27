# 纯代码小样《雨后》（`pure-code-sample`）

spec #147：吸收参照片的方法（[研究记录](../../docs/research/noroi-iwai.md)），在 Remotion 里做一段 13 秒、两个镜头的剧场级日式动画小样，画面、配乐、音效全部纯代码。合成 `PureCodeSampleA`、`PureCodeSampleB`，1920×1080，24 帧。

| 文档 | 内容 |
|---|---|
| [简报](brief.md) | 观众此刻的感受、品质标准、"绝不能像"清单 |
| [镜头剧本](storyboard.md) | 两个镜头的画面、运镜、锚点、感受和声音 |
| [本期约定](contract.md) | 时间表、模块归属、镜头接口、画面事件种类、外观和动作规则、色彩剧本、每帧预算、资源上限、自查、汇报 |
| [乐谱与声音设计](sound-design.md) | 配乐思路、听点表、音效安排；数据在 [score.json](score.json) 和 [sound.json](sound.json) |
| [sources.md](sources.md) | 每个生成物由哪条命令生成 |

## 决定

| 项 | 结论 | 理由 |
|---|---|---|
| ① 目的与受众 | 第一部原创的纯代码动画，以建立能力为主；做成后可以发布到用户自己的账号，给喜欢日式动画短片的观众看 | 用户在 `/grill-with-docs` 里定的（2026-11-25） |
| ② 渠道与规格 | 横屏 16:9，1920×1080，24 帧，13 秒；开头靠雨后透出的光抓人 | 规格是用户定的；小样限 10–15 秒，13 秒放得下两个镜头的起承 |
| ③ 类型与基调 | 叙事短片，抒情里带一点幽默；安静、温暖 | 抖水的喜感和看光的抒情能在两个镜头里都出现 |
| ④ 叙事结构与文案 | 两个镜头，没有对白和字幕：雨停光来 → 最后一滴打中 → 抖水起飞 | 一个主角、一个场景、两个镜头的限制下，一次小转折加一次释放最完整 |
| ⑤ 画面风格 | 剧场级日式动画：赛璐璐角色加水粉底图；色彩剧本见本期约定 | spec #147 定的方向（走 the-last-page 的路子） |
| ⑥ 素材来源 | 纯代码 | spec #147 的硬约束，由 verify 里的纯代码护栏检查 |
| ⑦ 镜头语言 | S1 中远景缓慢推近，S2 近景、起飞后上摇跟随；相机每帧都动，角色一拍二 | 先给环境和光，再给角色的表演 |
| ⑧ 声音 | 没有人声；器乐配乐加音效，音效跟着画面事件走 | spec #147 定的；乐谱和声音设计见 #154 |
| ⑨ 剪辑 | 一次硬切，切在动作上（S1 闭眼 → S2 一缩） | 切在动作上能把两个景别接成一个连续的反应 |
| ⑩ 画面文字 | 没有 | 小样不需要；纯代码下的字要一笔笔写，留给正片 |
| ⑪ 调色与质感 | 固定顺序的摄影后期；柔和、略低对比；颗粒按亮度 | 参照片的做法，见研究记录「摄影」 |
| ⑫ 混音与响度 | −16 LUFS ±1 LU，真峰值不超过 −1 dBTP；配乐在大响动处让位；檐下和院子各有混响 | 沿用仓库的成片标准；让位和分场景混响是参照片的做法 |
| ⑬ 封面、多版本、授权 | 不做封面和竖屏；纯代码，`sources.md` 记录生成命令；发不发布由用户看完小样定 | 封面、竖屏、发布在 spec #147 的范围之外 |

## 故事

设计负责人构思了三个原创梗概（用户授权由设计负责人定），限制是一个原创主角、一个场景、两个镜头、器乐。

- **甲《雨后》（选定）**：夏日傍晚雷阵雨刚过，乡下老屋檐下的晾衣竹竿上缩着一只湿透的小麻雀。雨停光来，檐口最后一滴打在它头顶；它抖干羽毛，抬头看光，蹬离竹竿飞走，空竹竿弹几下。
- **乙《风铃》**：盛夏午后的檐廊，一只胖三花猫盯着风铃下摆动的纸条，扭身扑出，扑空翻倒，风铃"叮"一声，它若无其事地舔爪。
- **丙《萤》**：初夏入夜，稻田边水渠里的荷叶上坐着一只小青蛙。第一只萤火虫亮起，它伸舌去够没够着，萤火虫越来越多，它看呆了。

选甲的理由：

- 麻雀的轮廓圆而简单，多个角度保持造型一致的风险最小，这是设定（#152）最大的风险；乙的扑击和翻倒身体姿势复杂。
- 一个场景就能检验这类片子的核心外观：水粉的天空、云、树篱、木头和稻田，从冷的雨色到暖的夕光，带颜色的阴影，湿面上的高光；丙是夜景，用不上这些。
- 镜头 2 的动作链清楚、能逐项核对（预备 → 抖水拖影 → 停住 → 预备 → 起飞拖影 → 竹竿跟随），适合给两个模型做对比（#155、#156）。
- 画面事件清楚，声音有落点，还有一处故意不出声。
- 避开名作的标志画面：不用公交站、雨伞、站台这类组合。

## 引擎与设定

#152 建的画面引擎和主角，模块与文件的对应见 [本期约定](contract.md) 第 2 节。

- **主角**：麻雀的身体是一组带符号距离场（椭球、圆锥平滑并起来），按视角正交光线步进取样，等值线提取轮廓，平滑后再按画张抖动；填色是赛璐璐的受光、阴影两层，加背光轮廓光，线条是两端收尖的手绘笔画，画在 2 倍画布上再缩小。因为是三维形体，不同角度、姿势下是同一只鸟。
- **底图**：Node 里的水粉画笔（扁笔、干笔、笔毛、收尖）按场景纵深画五层：远景（天、云、远山、林带）、稻田、树篱、院子、檐口；`generate.ts` 烘焙成 PNG，镜头只读。
- **相机**：以米为单位的针孔相机；各层底图按纵深缩放平移，近的层移动得多。竹竿是按 3D 轴线投影的透视竹管。
- **摄影**：WebGL 1 后期链，顺序见本期约定第 5 节。
- **样张**：`PureCodeModelSheet`（五个角度的转面和六个姿势表情）、`PureCodeEngineStill`（S1 末尾机位的静帧）；单镜头预览 `PureCodeS1`、`PureCodeS2A`、`PureCodeS2B`。
- **每帧耗时**（`--gl=swangle`，#152 实测）：引擎静帧每帧约 0.3 秒（1 帧与 4 帧渲染的总耗时相减），预算 4 秒。

## 管线

#159 将两个镜头和 #158 声音命令接入两版成片：S1 共用，S2 分别取 A、B；S1 为 0–167 帧，S2 为 168–311 帧。画面按镜头内帧号绘制，切镜头时同时切换 `defaultPost` 加各镜头 `post` 覆盖。

- `model.ts`、`../../src/kit/shots.ts`：312 帧时间表、镜头接口、全片事件汇总和帧到采样换算。
- `shots/s1/timing.ts`、`shots/s2-{a,b}/timing.ts`：不依赖浏览器的镜头编号、时长与事件。元数据迁移保留原事件帧号；B 版竹竿水珠落地帧为原弹道计算的 95、97、100、102、104、109。
- `PureCodeSample.tsx`：共用画面组件，加两版各自的字面路径 `staticFile` 混音；共用预览的底图加载和 `delayRender` 绘制等待。
- `generate.ts`：烘焙雨色/夕光十张底图，生成 `data/events-a.json`、`data/events-b.json` 及其 public 副本，再串行调用 [声音命令](sound/README.md)，将各自混音复制为 `mix-a.wav`、`mix-b.wav`。
- `data/generated.json`：生成命令、源码与设计数据哈希、Node/FFmpeg 版本、事件表及媒体哈希；本次 `status: complete`，已登记两版混音。占位镜头、占位底图和占位声音不再使用；`audio.ts` 仅保留给既有纯逻辑测试。
- 缓存：源码、`score.json`、`sound.json`、运行版本、事件表或媒体哈希改变会失效；底图有独立缓存键，声音重试不必重烘焙。`--force` 强制全部重建。镜头绘图和后期不在媒体生成输入里，改画面后重新渲染两版即可。
- 入口 `episodes/Root.tsx` 按需加载另外两期，免得它们的字体初始化进入本期渲染。

从仓库根目录运行；以下命令包括镜头 1 定稿后的两版重新渲染：

```sh
node episodes/pure-code-sample/generate.ts
pnpm exec remotion render PureCodeSampleA out/qa/spec-147/159/pure-code-sample-a.mp4 --gl=swangle --concurrency=4
pnpm exec remotion render PureCodeSampleB out/qa/spec-147/159/pure-code-sample-b.mp4 --gl=swangle --concurrency=4
pnpm qa loudness out/qa/spec-147/159/pure-code-sample-a.mp4 --target-lufs -16 --tolerance 1 --max-true-peak -1 --out out/qa/spec-147/159/loudness-a
pnpm qa loudness out/qa/spec-147/159/pure-code-sample-b.mp4 --target-lufs -16 --tolerance 1 --max-true-peak -1 --out out/qa/spec-147/159/loudness-b
pnpm qa sheet out/qa/spec-147/159/pure-code-sample-a.mp4 --count 24 --out out/qa/spec-147/159/contact-a
pnpm qa sheet out/qa/spec-147/159/pure-code-sample-b.mp4 --count 24 --out out/qa/spec-147/159/contact-b
pnpm qa strip out/qa/spec-147/159/pure-code-sample-a.mp4 --from 144 --to 191 --every 1 --out out/qa/spec-147/159/cut-a
pnpm qa strip out/qa/spec-147/159/pure-code-sample-b.mp4 --from 144 --to 191 --every 1 --out out/qa/spec-147/159/cut-b
```

逐条串行运行，不同时开两份渲染。媒体位于 `public/episodes/pure-code-sample/`，验收产物位于 `out/qa/spec-147/159/`，均不进 Git。相关测试：`node --test src/kit/shots.test.ts src/kit/sound/sound.test.ts episodes/pure-code-sample/pipeline.test.ts episodes/pure-code-sample/sound/sound.test.ts`；静态检查 `pnpm verify --static`；完整验证由 land 跑。

**#159 验收**：两版使用 S1 第 51 帧的 `light_break` 重新生成声音，并按上述命令渲染带声成片。两版全部画面事件、交接处 F144–191 连续帧、三帧重复渲染、响度及成本实测见 `out/qa/spec-147/159/report.md`（主工作区）。镜头 1 定稿后继续按上述命令重渲和复查；交接构图、B 版振翅出画由设计负责人在 #157 评价。

## 实测

本机（WSL2，RTX 3090）的结论，只在这台机器上成立：

- **GPU 用不上**：无头 Chrome 的 `angle` 建不起 WebGL 上下文，日志是 `Extension not supported: VK_EXT_headless_surface`（#149）；`egl`、`angle-egl`、`vulkan`，以及给 EGL 指定 WSL 的 Mesa `d3d12` 驱动（`GALLIUM_DRIVER=d3d12`），也都建不起（2026-11-25 设计负责人补测）。
- **只能用 `swangle`**（SwiftShader），WebGL 报告的渲染器是 `ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)), SwiftShader driver)`；占位画面渲一帧 0.8–1.0 秒（#149）。
- **像素确定性**：同一帧在两个独立浏览器进程里各渲一次，RGBA 逐字节相同（#149）；跨后端、跨驱动不保证。
- 生成器在两个工作目录各跑一次，底图、音效、混音的哈希相同。

ADR 0002 的前提之一是 GPU 能否使用：结论是不能，但参照片本来就是纯 CPU 渲染，所以不推翻，改为盯每帧耗时，预算见本期约定第 7 节。

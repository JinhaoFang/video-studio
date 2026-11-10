# SRT 白板动画：方法借鉴与外部技能实测

关联工单：#135，父 spec：#132。研究日期：2026-11-09。研究对象为 `geeklee/srt-whiteboard-animation`，固定到提交 `696a7243c0e6ffb6827676e539c2ca5ebae2bf6b`（2026-07-27）。实际安装的 19 个文件逐一按 Git blob 哈希与该提交比对，一致；证据见 `02-source-pin.json`。[S1]

上游以 MIT 发布，版权声明为 `Copyright (c) 2026 江哥是老登啊`；如以后分发其代码或实质性副本，需要保留版权及许可声明。本次只提交这份研究笔记，例图、源码快照与视频仅保存在本机验收目录。[S2]

## 可借鉴的方法

### 字幕分幕：一幕只承担一个核心意思

上游先读 SRT，列出每幕的核心表达、主体、对应字幕与 `sceneDurationMs`，确认策略后才制作图片。25–35 秒是其建议的幕长，不能代替语义判断。`parse_srt.py` 实际只按连续字幕的时间跨度聚合：默认目标 30 秒、最短 25 秒、最长 35 秒；它不理解事件，也不会自动判断“一幕一个核心意思”。最后一幕可以短于建议最短时长。[S3][S4]

对本仓库讲解类视频有用的是“核心表达 → 画面主体 → 对应配音区间”这条对应关系。例如解释一个机制时，一幕先讲清一个因果关系，再换下一个关系；不把每条字幕都变成一张新幻灯片。幕长仍应服从当期文案与已有时间轴，不将上游秒数直接升级为工作室规则。

### 叙事分区：按照观众理解事件的顺序揭示

标注之前先读字幕、再实际查看图像，使用原图整数像素坐标；画布宽高必须与图片一致。对象按“场景铺垫 → 关键人物或物体 → 动作、冲突或变化 → 反应或结果”建立 `narrativeRole`、`subtitle`、`sequence` 与 `startMs`，而不是机械地从左到右画。其例子先出现猴子山与小猴，再出现抢香蕉的大猴，最后出现围观儿童。[S3][S5]

这适合逐步解释系统组成、过程和因果：先建立环境与对象，再出现连接、变化和结果。画面保留已画内容，观众可以回看关系。它也有边界：这是在同一张静态插画上逐步揭示，不是对象真的移动或发生形变；讲解对象必须连续运动时，仍需当期的 Remotion 动画实现。

### 分区遮罩：把“不提前出现”变成可检查的约束

上游规定的允许掩码是：

```text
当前区域允许绘制的像素
= 当前 region
− 所有后续模块的 region
− 当前模块 reveal.protectedRegions
```

在当前模块的开始时间之前，其线条、填充和图片内容应完全不可见；开始之后也只能出现当前笔迹已到达的部分。`protectedRegions` 使用相同的原图像素坐标，用于主体交叠或矩形框包含了后画对象的情况。区域内的落墨和上色都与允许掩码求交，已画内容保存在共享画布中。[S3][S6]

这对讲解片很有价值：后面的答案、结果或连接不能因为一个粗大的擦除框而提前泄露。适合把它借为镜头验收问题：“这一刻，观众是否已经看到后面才该知道的信息？”上游真实渲染器按 `startMs` 排序；`sequence` 和开始时间需要一致，单笔绘制的各区域应串行安排。`direction`、`handPath` 主要服务浏览器的矩形代理预览，不能据此认定最终笔迹已经验收。[S3][S6]

### 连续笔迹：先墨线，再颜色

每个区域内部先用 `ink` 铺线，再用 `color` 还原源图颜色，默认时间权重 2:1。默认网格路径 `grid` 较稳，`skeleton` 沿线稿骨架追踪；默认 `contour-wipe` 按轮廓扫描添彩，也可选择 `brush` 沿轨迹刷。笔尖跟随落墨位置，多个区域共用持久画布，避免每段重新清屏。[S3][S6][S7]

可借鉴之处是把“解释结构”和“强调状态”分开：先让观众看懂轮廓与关系，再用少量颜色突出变化。不是每种讲解内容都适合手绘速度；信息密集的表格、精确文字和快速变化的界面仍需已有的文字、图表或代码动画组件。

### 统一出图规范：让多幕看起来属于同一支片子

上游要求 16:9、极简素描线稿、干净留白、克制人物与对象；建议暖米黄纸色 `#F5EBD7`、深灰线条，仅少量红、橙、蓝点缀。源图禁止文字、字母、数字和标签，也排除摄影细节、3D、复杂背景和高饱和装饰。主体之间需要留白，便于分区。[S3]

可借的是“把线条、配色、构图、留白及禁用项写清，并逐张核对”的方法。上述颜色是对方的规范，不是本仓库的新令牌。正式讲解片的字幕和标签宜由 Remotion 独立排版，避免把不可编辑、可能出错的文字烘进图里。

文档与实现有差别：整合渲染器使用 `Config.canvas_hex` 的固定底色 `#F6F1E3`，四角采样用于识别并替换源图背景，并没有自动把采样颜色设为画布底色。不能只看文档就承诺源图纸色会原样保留。[S6][S7]

### 每步确认：记录上游的方法，不照搬为仓库流程

上游七步依次为：策略、线稿、标注并打开预览台、编号预览图、预览台调整保存、单幕渲染、多幕合并；每步之后都要求明确确认。标注后自动打开并载入预览台属于第三步交付。预览台用矩形代理检查布局、顺序和时序，写回文件依赖 Chrome/Edge 的 File System Access API；真实连续笔迹仍需命令行渲染。[S3][S8]

它降低了在错误图稿或时序上投入渲染的代价，值得借鉴“在代价高的制作前确认小样”。父 spec 已明确不采纳七步确认流程；若以后收纳，只应把它当作白板段落的工具，用户参与仍遵循本仓库设计负责人的规则。本次工单授权的是示例实测，没有运行或要求用户参与这七步。

## 五项收纳标准的实测

验收目录为：

`/root/project/video-studio.worktrees/135/out/qa/spec-132/135/`

下文证据文件名均相对该目录。所有外部命令通过参数数组执行，日志保留实际参数与输出。实测开始时分支是 `ticket/135`，工作树干净；`.agents` 指向 `/root/project/video-studio/.agents`。安装测试按派发的显式例外临时写入该链接，结束后恢复。

| 标准 | 结论 | 关键证据 |
|---|---|---|
| 1. 安装只增加锁文件变化 | 通过，限定项目级 Codex 安装 | `02-status.log` |
| 2. 输出写到允许目录 | 通过，实际写入本 worktree 的 `out/` | `05-render.log` |
| 3. 依赖隔离、包文件与验证 | 部分通过：隔离及静态通过；本机需环境绕法，完整验证待 `land` | `03-isolation.json`、`06-verify-static.log` |
| 4. 线稿来源可说明、支持用户供图 | 通过，不内置或绑定生图模型 | `04-image-provider-search.log`、`05-render.log` |
| 5. 示例 MP4 可用作 Remotion 素材 | 通过，实际渲染并由 Remotion 读取中段帧 | `05-probe.json`、`05-remotion-import.log` |

### 1. 安装是否只改变技能锁文件：通过

执行：

```text
["npx", "--yes", "skills", "add", "geeklee/srt-whiteboard-animation", "--agent", "codex", "--yes"]
```

安装器版本为 1.7.6。`--agent codex` 明确选择本次安装目标，`--yes` 代替交互确认，不使用全局安装。安装器报告 `Found 1 skill`，路径为 `.agents/skills/srt-whiteboard-animation`。安装前 `git status --short --untracked-files=all` 为空；安装后只有 ` M skills-lock.json`，没有其他跟踪或未跟踪文件变化。锁文件新增上游来源、`SKILL.md` 路径和计算哈希；`.agents` 与 `out` 都被现有忽略规则覆盖。

证据：`00-baseline.json`、`00-installation-manifest.json`、`01-installer-version.log`、`02-install.log`、`02-status.log`、`02-lock-diff.log`、`02-ignored.log`。该结论限定于上述项目级 Codex 安装命令，不推断其他 agent 或全局安装模式。

### 2. 能否指定仓库允许的输出目录：通过

`render_stream_whiteboard.py` 的第三个位置参数就是输出 MP4 路径，脚本会创建父目录，并将临时 `_raw.mp4` 放在最终视频旁；H.264 转码成功后删除临时文件。图片、标注和手部素材也是路径参数，没有必须写入 `assets/whiteboard/` 的限制。[S6][S7]

本次实际输出为 `/root/project/video-studio.worktrees/135/out/qa/spec-132/135/media/scene-01-whiteboard.mp4`；渲染退出 0，末行 `OUTPUT=` 指向同一路径。由参数可知也可指定 `public/episodes/<期>/`；本次按工单要求只实测 `out/`，没有向任何一期写素材。

证据：`04-render-help.log`、`05-render.log`、`media/scene-01-whiteboard.mp4`。

### 3. 依赖隔离与仓库验证：存在环境前置条件

上游 `prepare_env.py` 将虚拟环境固定在技能根目录的 `.venv`，通过那个解释器安装 `opencv-python`、`numpy`、`av`、`Pillow`，没有 Node 包安装逻辑。[S9]

本机实际路径为 `/root/project/video-studio/.agents/skills/srt-whiteboard-animation/.venv`，因为脚本对自己的位置调用 `resolve()`，会穿过 worktree 的软链接。首次探测退出 1，提示虚拟环境不存在；直接执行准备脚本又因系统 Python 3.10.12 缺少 `ensurepip` 而失败。这是本次实测中需要绕过的环境问题。

简单绕法不需要修改上游或安装系统包：删除本次创建但未成功的 `.venv`，用已有的 `uv` 在同一位置创建带 pip 的环境，再运行上游准备脚本补依赖：

```text
["uv", "venv", "--seed", "--python", "/usr/bin/python3", "/root/project/video-studio.worktrees/135/.agents/skills/srt-whiteboard-animation/.venv"]
["python3", "/root/project/video-studio.worktrees/135/.agents/skills/srt-whiteboard-animation/scripts/prepare_env.py"]
```

`package.json` 和 `pnpm-lock.yaml` 与安装前 SHA-256 一致。按本次派发执行 `["pnpm", "verify", "--static"]`，退出 0，ESLint、浏览器和 Node 类型检查、注释位置、依赖方向、文档命令护栏均通过。**没有执行完整 `pnpm verify`**，不能据此声称父 spec 的完整验证已通过；完整验证由 `land` 执行。

绕过环境前置问题后，上游准备脚本退出 0，最终 `--check` 也退出 0。四个模块的实际导入位置都在该 `.venv/lib/python3.10/site-packages/` 下，`sys.base_prefix` 为 `/usr`，未借用系统第三方包。实装版本为 OpenCV 5.0.0.93、NumPy 2.2.6、PyAV 17.1.0、Pillow 12.3.0；它们仅是本次外部技能的环境快照，没有加入本项目依赖。上游未锁定这些 Python 依赖版本。[S9]

证据：`03-env-before.log`、`03-env-install.log`（原始失败）、`03-python-options.json`、`03-env-seed.log`、`03-env-retry.log`、`03-env-after.log`、`03-packages.json`、`03-isolation.json`、`06-after-render-hashes.json`、`06-verify-static.log`。最终静态检查在示例渲染与 Remotion 导入完成后运行，退出 0。

### 4. 线稿依赖与用户供图：通过，生图能力需另备

上游要求由 agent 生成统一风格的图片，但仓库没有指定生图模型、模型权重、服务端点或生图客户端；`agents/openai.yaml` 只是技能元数据，不能据此断言它依赖某个 OpenAI 生图模型。对全部脚本搜索 `gemini|openai|api_key|http|model|requests|diffusion|imagegen` 无匹配。渲染器只接收现成图片、标注和可选手部图片，不要求 API 密钥或生图服务。[S3][S6]

因此没有生图工具也能由用户提供符合规范的图片，再根据字幕和实际图像制作同名标注；不能承诺“只给 SRT 就能自动出图”。本次使用上游现成 PNG 和标注，不调用生成式图片服务。正式采用时，图片的来源与授权仍需在当期 `sources.md` 登记。

证据：`04-image-provider-search.log`、固定提交的源码快照 `upstream/`；实际供图渲染结果见第五项。

### 5. 单幕 MP4 与 Remotion 兼容性：通过

用上游原始 `scene-01-monkey-mountain-banana.png`、同名标注和 `drawing-hand.png`，运行原版整合渲染器，未覆盖尺寸、帧率、路径模式或时长参数。示例原图为 1672×941，标注含 3 个区域、总时长 8600ms。实际命令参数数组为：

```text
[
  "/root/project/video-studio.worktrees/135/.agents/skills/srt-whiteboard-animation/.venv/bin/python",
  "/root/project/video-studio.worktrees/135/.agents/skills/srt-whiteboard-animation/scripts/render_stream_whiteboard.py",
  "/root/project/video-studio.worktrees/135/.agents/skills/srt-whiteboard-animation/examples/scene-01-monkey-mountain-banana.png",
  "/root/project/video-studio.worktrees/135/.agents/skills/srt-whiteboard-animation/examples/scene-01-monkey-mountain-banana.annotation.json",
  "/root/project/video-studio.worktrees/135/out/qa/spec-132/135/media/scene-01-whiteboard.mp4",
  "/root/project/video-studio.worktrees/135/.agents/skills/srt-whiteboard-animation/assets/drawing-hand.png"
]
```

渲染退出 0，经系统 FFmpeg 转码。`ffprobe` 实测：

| 项目 | 结果 |
|---|---|
| 容器、编码 | MP4，H.264 High / `avc1` |
| 分辨率 | 1080×600，显示比例 9:5 |
| 帧率、帧数 | 60 fps，516 帧 |
| 时长 | 8.600 秒 |
| 像素格式 | `yuv420p` |
| 音轨 | 无，只有一个视频流 |

默认 `cap_long_edge=1080` 表示长边 1080，不表示 1920×1080；宽高还会向下对齐到默认 10 像素网格。正式制作可通过 `--cap-long-edge`、`--grid-edge`、`--fps` 指定规格，再检查实际尺寸；本次未额外渲染其他规格。[S6][S7]

实际抽帧并查看：

| 文件 | 帧号、时间 | 观察 |
|---|---|---|
| `opening.png` | 0，0 秒 | 均匀暖色底，没有线稿提前出现 |
| `middle.png` | 258，4.300 秒 | 左侧已保留，中间主体正在落墨，右侧儿童尚未出现 |
| `ending.png` | 515，约 8.583 秒 | 完整插画出现，手部消失 |

进一步用项目现有 Remotion 4.0.534 和 `@remotion/media` 的 `<Video>`，在验收目录内创建 `remotion-import.tsx`；用 `staticFile()` 读取该 MP4，合成规格与素材相同。执行 `pnpm exec remotion still`，指定第 258 帧、验收目录的 `media/` 为 `--public-dir`，并复用本机已有的 Playwright Chromium。命令退出 0，得到 `remotion-middle.png`，实际查看与视频中段内容对应。两张中段图尺寸相同，RGB 通道平均绝对差约 1.96/255，最大差 10/255，证明实际解码和画面读取已完成，而不只是依据扩展名推断兼容性。

因此可将产出的 MP4 放入当期 `public/episodes/<期>/`，作为 Remotion 视频素材引用；声音与字幕仍由本仓库自己的合成、时间轴和混音机制处理。本次只做单帧导入验证，未创建正式期合成，也没有测试多幕合并。

证据：`05-render.log`、`05-probe.json`、`05-frame-opening.log`、`05-frame-middle.log`、`05-frame-ending.log`、`05-remotion-import.log`、`05-remotion-pixel-comparison.json`、上述 MP4 和 4 张 PNG；验收驱动保留为 `run-render.py`，完整执行记录为 `05-run-render.log`。

示例覆盖范围有两点限制：三个 `region` 互不重叠，且 `protectedRegions` 都为空，因此没有实测复杂交叠保护；保护区方法的结论来自源码。渲染器结尾会直接补上整张源图，区域未覆盖的像素可能在收尾同时出现，正式使用前仍需按当期标注抽查。[S5][S6]

### 字幕解析补测

上游没有提供 `.srt` 示例，因此把示例标注的三个 `subtitle` 及其起止时间转写为 `annotation-subtitles.srt`，没有冒充作者原始字幕。实际运行 `parse_srt.py`，解析出 3 条字幕、1 幕，时间跨度为 0.3–8.1 秒，`sceneDurationMs=7800`。示例标注的场景总长为 8600ms，另含开场空白与结尾停留；解析出来的跨度不等于可以不经换算就替换原标注的绝对时间轴。

证据：`annotation-subtitles.srt`、`04-parse.log`、`04-parse-output.json`。渲染仍使用上游原始图片与原始标注。

## 安装恢复

实测后删除了 `/root/project/video-studio/.agents/skills/srt-whiteboard-animation`，即 worktree 内 `.agents/skills/srt-whiteboard-animation` 的实际目标，连同本次创建的 `.venv`、`scripts/__pycache__` 和全部安装文件一起删除。执行 `["git", "restore", "--source=HEAD", "--", "skills-lock.json"]` 恢复本 worktree 的锁文件。

恢复后 `.agents` 软链接保持原状，技能目录列表与安装前一致，原有 435 个文件和链接逐项与基线完全相同。`skills-lock.json`、`package.json`、`pnpm-lock.yaml` 的 SHA-256 均与安装前一致；`git status` 只剩这份新研究笔记。视频、关键帧、源码快照、环境快照与日志都保留在本 worktree 的 `out/`，不进 git。

证据：`07-restoration.json`、`07-status.log`。

## 收纳建议

建议暂缓登记，补齐第三项后再由设计负责人决定收纳。第一、二、四、五项通过；第三项的依赖隔离、包文件不变和静态检查已通过，但本机直接准备环境失败，需要上面实测过的 `uv` 绕法，且完整 `pnpm verify` 按派发要求留给 `land`，目前不能认定“五项全部通过”。

作为白板段落工具，它有实际价值：不需要生图服务也能消费用户图片，输出路径可控，依赖不进入 Node 项目，MP4 已经通过 Remotion 实际读取。若后续收纳，建议只采用字幕与画面对应、语义顺序、允许掩码、先墨线后上色这些方法，不将七步确认变成本仓库流程。

不直接采用它的默认画幅、底色和手部素材作为工作室定稿：默认视频并非 Full HD，底色与文档建议值不同，内置手部带有作者标识。正式制作可自供手部图片，或用已有的 `--bare-tip` 关闭手部叠层；本次为原样实测，没有修改或另出这两种版本。复杂保护区、其他规格及多幕合并均不在本次示例覆盖内。本工单不登记技能、不改规则或 `docs/video/`；后续是否收纳及写入哪条用法由设计负责人处理。

## 出处

- [S1：固定提交与仓库内容](https://github.com/geeklee/srt-whiteboard-animation/tree/696a7243c0e6ffb6827676e539c2ca5ebae2bf6b)。
- [S2：LICENSE](https://github.com/geeklee/srt-whiteboard-animation/blob/696a7243c0e6ffb6827676e539c2ca5ebae2bf6b/LICENSE)。
- [S3：SKILL.md，工作流程、视觉规范、时序与遮罩不变量](https://github.com/geeklee/srt-whiteboard-animation/blob/696a7243c0e6ffb6827676e539c2ca5ebae2bf6b/SKILL.md)。
- [S4：scripts/parse_srt.py](https://github.com/geeklee/srt-whiteboard-animation/blob/696a7243c0e6ffb6827676e539c2ca5ebae2bf6b/scripts/parse_srt.py)。
- [S5：示例标注](https://github.com/geeklee/srt-whiteboard-animation/blob/696a7243c0e6ffb6827676e539c2ca5ebae2bf6b/examples/scene-01-monkey-mountain-banana.annotation.json)、[对应图片](https://github.com/geeklee/srt-whiteboard-animation/blob/696a7243c0e6ffb6827676e539c2ca5ebae2bf6b/examples/scene-01-monkey-mountain-banana.png)。
- [S6：scripts/render_stream_whiteboard.py](https://github.com/geeklee/srt-whiteboard-animation/blob/696a7243c0e6ffb6827676e539c2ca5ebae2bf6b/scripts/render_stream_whiteboard.py)。
- [S7：scripts/stream_render.py，默认参数与 H.264 转码](https://github.com/geeklee/srt-whiteboard-animation/blob/696a7243c0e6ffb6827676e539c2ca5ebae2bf6b/scripts/stream_render.py)。
- [S8：assets/preview.html](https://github.com/geeklee/srt-whiteboard-animation/blob/696a7243c0e6ffb6827676e539c2ca5ebae2bf6b/assets/preview.html)。
- [S9：scripts/prepare_env.py](https://github.com/geeklee/srt-whiteboard-animation/blob/696a7243c0e6ffb6827676e539c2ca5ebae2bf6b/scripts/prepare_env.py)。

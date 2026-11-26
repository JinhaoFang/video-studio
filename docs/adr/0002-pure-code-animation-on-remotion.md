# 纯代码动画留在 Remotion 里做

2026-11-25，用户定（`/grill-with-docs` 会话，开新一期之前）。

我们要做一类新片子：剧场级的日式动画短片，画面、配乐、音效都是纯代码（见 `GLOSSARY.md`）。参照的 [ChetasLua/noroi-iwai](https://github.com/ChetasLua/noroi-iwai/tree/edd3b89) 用 Python（numpy、OpenCV、pycairo）逐帧画画面，用 Node 合成声音，不经过任何视频框架。我们决定**不**照搬 Python 渲染，也**不**换成 HyperFrames，而是继续用 Remotion 做宿主：画面用 Canvas 2D 加 WebGL 着色器，声音用 `tools/` 里的 Node 脚本合成，昂贵的底图先烘焙。这类片子的质量来自制作方法（按部门分工、先写约定、先出设定、强制自查、声音跟着画面事件走），不来自渲染语言；方法在 Remotion 里都能落地，而仓库现有的验收工具、时间轴、verify、lint 和工单护栏都是 TypeScript，留在 Remotion 可以全部接着用。

## 考虑过的其他做法

- **照搬 Python 逐帧渲染**：参照片用这条路做到了这个质量，numpy 做浮点像素合成也很顺手。但仓库要多维护一套 Python 环境，verify 和 lint 也要跟着覆盖；用 WebGL 着色器能替代浮点像素这部分，所以没有选。
- **换成 HyperFrames**（Apache 2.0）：它的帧源和 `data-vfx-chain` 也能跑确定性的场景代码和 WebGL2 效果，但它的长处（网页素材、GSAP、模板、HeyGen 媒体）这类片子用不上，换过去要丢掉已有的工作室层。

## 后果

- 两件事要在第一个小样里实测：WSL 下无头 Chrome 的 WebGL 能不能走 GPU（Remotion 4 默认不开 GL，要显式指定 `angle`，失败时退回 CPU 的 `swangle`）；1080p 下渲一帧要多久。任何一项不可接受，就回来重新讨论这个决定。
- Remotion Studio 的实时预览对重帧会变慢，判断画面要靠渲出的静帧、1:1 裁切和连续帧条。

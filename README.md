# 视频工作室

用 Remotion 4 和 React 19 制作讲解视频。多期共用工具、组件与风格，每期的内容放在 `episodes/`。规则与工作流见 [文档地图](docs/README.md)。

## 环境要求

- Node.js ≥ 22.18.0：直接运行工具的 TypeScript 文件，无需编译。
- pnpm：安装依赖并运行项目命令。
- ffmpeg 和 ffprobe：媒体处理与验收工具使用，须在 PATH 中可用。
- gh：通过 GitHub CLI 读取和管理工单，使用前完成认证。

## 常用命令

```console
pnpm install
pnpm dev
pnpm verify
pnpm qa --help
pnpm check:commits origin/main ticket/12-review-rework
```

`pnpm dev` 启动 Remotion Studio；入口为 `episodes/index.ts`，在 `episodes/Root.tsx` 按文件夹注册各期合成。各期合成的生成、渲染和按句定时约定见 [NASA 朋克开场说明](episodes/nasa-punk-opening/README.md) 与 [ClinMesh 宣传片说明](episodes/clinmesh-promo/README.md)。

`pnpm verify` 按 `tools/verify.ts` 的步骤依次执行检查和单元测试，任一步失败立即停止。它检查 Git 跟踪文件及未被忽略的未跟踪代码，包含工作室自有技能脚本，排除参考资料、第三方技能和输出目录。文档命令检查的范围和规则见 [工作流的护栏说明](docs/workflow/README.md#护栏)。

`pnpm qa` 提供 `frames`、`sheet`、`compare`、`loudness`、`sentence`、`motion` 验收子命令，运行 `pnpm qa <子命令> --help` 查看用法；图片与报告默认写到 `out/qa/`，`sentence` 默认只输出按句计算的秒数。`pnpm check:commits <起点> <来源分支名>` 检查起点到 HEAD 的非合并提交信息。命令退出码为 0（通过）、1（检查未通过）、2（参数或运行错误）。

`pnpm qa motion <视频>` 检测长时间静止和短暂变化后恢复的闪现，输出 `motion.json`；用 `--from`、`--to` 限定扫描范围，`--keyframes <目录>` 可选输出区间关键帧。默认静止至少 3 秒、相对首帧差异不超过 0.003；闪现不超过 0.25 秒、峰值差异至少 0.03；彩图缩至 160×90 并模糊后，每通道忽略 2 级噪声，差异按 0～1 归一化。阈值可改，详见 `pnpm qa motion --help`。检出区间时退出 1，须结合画面复核有意停留或快速动画。

```console
pnpm build
npx remotion compositions
```

`pnpm build` 打包项目；`npx remotion compositions` 列出各期合成和规格。

媒体素材放在 `public/episodes/<期>/`，渲染输出放在 `out/`，不提交到 Git。

## 产品宣传片参考与扩展技能

制作产品宣传片（对标样板见 [ClinMesh 宣传片说明](episodes/clinmesh-promo/README.md)）时，在构思分镜与实现阶段配合以下参考站与外部技能使用：

### 灵感与分镜参考站

- [ShipScenes](https://shipscenes.com/)：科技与 SaaS 产品发布片拆解，用于确定整片叙事节奏、界面 `@2x` 局部裁剪特写构图与鼠标交互规格。
- [Motion Reference](https://motionreference.com/)：按转场、字效、版式与缓动分类的营销视频及 UI 动效库，用于挑选多焦点编排与镜头衔接手法。
- [Inspo.zone](https://www.inspo.zone/)：高审美视觉与动态设计灵感画廊，用于寻找开场氛围、暗场三维与多模态画面的视觉记忆点。

### 制作与声音技能

两个扩展技能记录在 `skills-lock.json` 中（本地安装目录 `.agents/` 与 `.claude/` 不提交到 Git），新环境可一键安装（加 `-g` 可安装到本机全局）：

```console
npx skills add vibe-motion/sound Vincentwei1021/video-shotcraft
```

- [`video-shotcraft`](https://github.com/Vincentwei1021/video-shotcraft)：提供 124 张调校参数的 Remotion 镜头配方卡（[在线样片画廊](https://vincentwei1021.github.io/video-shotcraft/library.html)）、`PageCam` 相机原语、产品片审美准则及 Freesound 音效拉取测峰脚本。
- [`sound`](https://github.com/vibe-motion/sound)：基于 Freesound 下载量、评分人数、录音设备描述与 CC0 许可筛选真实物理拟音，避免电子合成提示音。

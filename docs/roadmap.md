# 路线图

## 目标

1. **用 AI 做视频**：先复刻《设计风格小课 04：NASA 朋克》的开场 0:00～0:46，再用新选题做完整一期。
2. **复利**：以仓库的形式沉淀规则、工具、组件和风格，下一期视频从这里起步。

开发流程固定在 `workflow-v1`。做视频时发现的流程问题，记进本文的「待定」或 `docs/research/run-spec-migration.md`，攒够了再出下一个版本。

## 已定

| 事项 | 决定 | 写在哪 |
|---|---|---|
| 仓库形态 | 一个工作室仓库放所有期，可复用的放 `src/`，每期的放 `episodes/<期>/` | `AGENTS.md`「目录与归属」 |
| 时间机制 | 动画按台本句子编号定时，不写死帧号 | `docs/workflow/README.md`「一期视频」 |
| 包管理、媒体 | pnpm；媒体和渲染结果不进 git | `AGENTS.md` |
| 远程仓库 | `github.com/JinhaoFang/video-studio`（私有） | — |
| 开发流程 | Claude Code 当设计负责人，Codex 当工程负责人，用 `run-spec` 执行 spec；DispatchDock 只用两个技能，不用监控软件；版本 `workflow-v1` | `AGENTS.md`、`docs/roles/`、`docs/workflow/README.md`、`docs/agents/` |

## 进度

- [x] 建仓、复盘与流程改进：见 Release `workflow-v1`（https://github.com/JinhaoFang/video-studio/releases/tag/workflow-v1），汇报和复盘记录的链接都在那里
- [ ] 第一阶段：复刻开场 0:00～0:46
- [ ] 第二阶段：新选题完整一期

## 下一步

**检验流程**：第一阶段的 spec 从对齐开始在新会话里走一遍，看三件事：难回头的方向有没有先给用户看、替用户定的有没有单列、要靠判断验收的工单派发前有没有定稿；汇报里对比设计负责人和 Codex 的用量（`docs/research/run-spec-migration.md` 问题 37）。

**第一阶段**：单独建 spec。

1. 在新会话里跑 `/grill-with-docs`，主题"第一阶段：复刻开场 0:00～0:46"，先过下面的待定项。
2. 跑 `/to-spec`，再跑 `/to-tickets`。
3. 开新会话，对设计负责人说"执行 spec #<号>"。执行要放在新会话里：spec #37 是在对齐用的长会话里执行的，设计负责人的缓存读取约为 Codex 输入的 4.5 倍；spec #17 在新会话里执行，只有 1.3 倍。

## 第一阶段：复刻开场

输入：`docs/research/nasa-ep04/` 的 `shots.md` 前两章、`transcript.md` 前 22 句、`style.md`。

待定：

- 配音来源（MiniMax API、MiniMax 网页、其他 TTS）；开发期是否先用参考视频的音轨当临时配音（只在本机学习时用）；真实照片的来源和授权。
- 混音目标：参考视频实测 -16.0 LUFS、LRA 2.9 LU、真峰值 -1.0 dBTP（`pnpm qa loudness`）。定下后用 `loudness` 的阈值参数验收。
- 彩排推到这里的两项验收工具：动态自检（长时间静止、一闪而过的变化，阈值用真实渲染来定）；按台本句子编号取时间点（等时间轴格式定下）。
- kit 组件要写测试时，测试的运行环境怎么定：现在 `.test.ts` 都按 Node 环境检查和运行，测不了 JSX。

开工参照：`pnpm qa sheet <参考视频> --from 0 --to 46 --every 2` 生成的联系表，一页看完开场的镜头节奏。

## 待定

- **方法层要不要拆成单独的仓库**：两个技能和工作流文档，拆法见 `docs/workflow/README.md`「以后拆分」。等第三个仓库也要用，或者做视频期间技能改得频繁时再定。

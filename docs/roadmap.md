# 路线图

## 目标

1. **用 AI 做视频**：先复刻《设计风格小课 04：NASA 朋克》的开场 0:00～0:46，再用新选题做完整一期。
2. **复利**：以仓库的形式沉淀规则、工具、组件和风格，下一期视频从这里起步。

开发流程固定在 `workflow-v3.1`。做视频时发现的流程问题，记进本文的「待定」或 `docs/research/run-spec-migration.md`，攒够了再出下一个版本。

## 已定

| 事项 | 决定 | 写在哪 |
|---|---|---|
| 仓库形态 | 一个工作室仓库放所有期，可复用的放 `src/`，每期的放 `episodes/<期>/` | `AGENTS.md`「目录与归属」 |
| 时间机制 | 动画按台本句子编号定时，不写死帧号 | `docs/workflow/README.md`「一期视频」 |
| 包管理、媒体 | pnpm；媒体和渲染结果不进 git | `AGENTS.md` |
| 远程仓库 | `github.com/JinhaoFang/video-studio`（私有） | — |
| 开发流程 | Claude Code 当设计负责人，Codex 当工程负责人，用 `run-spec` 执行 spec；DispatchDock 只用两个技能，不用监控软件；版本 `workflow-v3.1`（spec #77 的派发排队与续做、`verify` `pr-check` `watch` `review-spec` 子命令；spec #94 的判定标准第二版、验证环境与验证排队、可直接删除的被忽略文件、`accept` 核对提交、收尾目标核对、以 PathJX spec #27 为底的汇报模板） | `AGENTS.md`、`docs/roles/`、`docs/workflow/README.md`、`docs/agents/` |
| 流程的版本 | `workflow-v1`：建仓、复盘与流程改进；`workflow-v2`：`setup-run-spec` 读懂目标仓库后按模板生成角色文档，设计负责人定为顶层设计与统筹，增加独占资源；`workflow-v3`：按 PathJX 第一阶段的真实使用改进（spec #77）；`workflow-v3.1`：按 PathJX #208、#209 的实测改进（spec #94），在 PathJX spec #233 实测（PR #243，10-31） | Release `workflow-v1`（https://github.com/JinhaoFang/video-studio/releases/tag/workflow-v1），`docs/research/run-spec-migration.md`，汇报 `docs/reports/spec-77-workflow-v3.html`、`docs/reports/spec-94-workflow-v3-1.html`，和 PathJX 第一阶段所用 v2 的差异及 PathJX 现状见 `docs/reports/workflow-v3-1-and-pathjx.html` |
| 方法层怎么改 | 放方法和思路，不放写死的规范；遇到的问题先记成观察，经过分析和评估再决定加不加、用什么形式；"汇报给人"由用户打分；先评估再拆（用户 10-31） | `docs/research/run-spec-migration.md`「v3.1 效果评估」 |
| CI | GitHub Actions 的设定不动；启动不了时改为本机验证（用户 10-31） | `docs/workflow/README.md`「护栏」 |
| 第一阶段 | 复刻开场 0:00～0:46：spec #60，PR #73，成片 47.9 秒；用户审片后返工 #74 | `docs/reports/spec-60-nasa-punk-opening.html` |

进行中的工作以 GitHub 上打开的 spec 为准，不写进本文。

## 下一步

**方法层拆成单独的仓库**：v3.1 效果评估已完成（10-31，`docs/reports/workflow-v3-1-evaluation.html`）：目标仓库一侧有效，方法层自身变复杂。拆的时候按评估的清单收拢成五条思路和一组机制，同时落地按影响分层的测试、评分表采集和按用户打分重做的汇报模板，清单用户 10-31 已确认（含没用上或无法判断的 17 项：10 项脚本留着、说明移出必读，7 项移到按需说明或删掉），见 `docs/research/run-spec-migration.md`「v3.1 效果评估」。拆法见 `docs/workflow/README.md`「以后拆分」。

**design-system 的规则**：从 v1 直接升到 v3，规则文档没按新模板重新生成，没核查过，按判定标准第二版检查一次。

**第二阶段**：在新会话里跑 `/grill-with-docs` 定新选题，再 `/to-spec`、`/to-tickets`，开新会话执行。开工前先过下面的待定项。

## 第一阶段留下的（spec #60）

- `land` 删除 worktree 时，会连带删掉里面被 git 忽略的媒体：`workflow-v3` 已改为移到保留目录并列出，要用的拷回主工作区。素材仍要从主工作区拷进 worktree。
- 并行切开的镜头，衔接只能在合并后验收：#66 和 #67 各自都通过了，合到一起才发现中间有 1.2 秒黑场。以后在 spec 里给"跨工单衔接"留一步设计验收。
- 并行镜头都要改总合成、令牌和本期 README，每次合并都冲突。第二期再用时，考虑让每个镜头自己登记，或者把令牌按镜头拆文件。
- 实测的量没有上限：#67 为逐帧证明跑了约 3.3 小时，其他镜头工单约 1 小时。工单的验收产物要写明到什么程度就够。
- 派发前先核对外部 API 的能力：#69 按不支持的 speed 参数合成，多花约 250 credits。仓库里的 `docs/research/nasa-ep04/elevenlabs-api.md` 早有记录。
- 审片返工 #74：开场同一张照片的推拉被做成溶解换页，根源是小样把镜头内换景别定成溶解、参考拆解用 2 秒联系表、验收只看静态对比图。已沉淀：`docs/roles/design.md`「镜头运动」和运镜验收要求，镜头剧本的“运镜”列（`docs/workflow/README.md`），桌子 SOP 经验要点（`docs/research/table-videosop.md` 第 4 节），lint 禁止镜头代码用 SVG `<image>`。
- 可以提进 `src/kit/` 的：字幕条、按句定时、颗粒暗角、红色手绘批注。第二期再用时提。

## 第二阶段：新选题

待定：

- kit 组件要写测试时，测试的运行环境怎么定：现在 `.test.ts` 都按 Node 环境检查和运行，测不了 JSX。
- 配音：ElevenLabs Alice × eleven_v4 在第一阶段实测可用（错字率 0%，后期变速收语速）。新选题照用，还是重新试听。

## 待定

无。

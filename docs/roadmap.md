# 路线图

## 目标

1. **用 AI 做视频**：先复刻《设计风格小课 04：NASA 朋克》的开场 0:00～0:46，再用新选题做完整一期。
2. **复利**：以仓库的形式沉淀规则、工具、组件和风格，下一期视频从这里起步。

开发流程固定在 `workflow-v3`。做视频时发现的流程问题，记进本文的「待定」或 `docs/research/run-spec-migration.md`，攒够了再出下一个版本。

## 已定

| 事项 | 决定 | 写在哪 |
|---|---|---|
| 仓库形态 | 一个工作室仓库放所有期，可复用的放 `src/`，每期的放 `episodes/<期>/` | `AGENTS.md`「目录与归属」 |
| 时间机制 | 动画按台本句子编号定时，不写死帧号 | `docs/workflow/README.md`「一期视频」 |
| 包管理、媒体 | pnpm；媒体和渲染结果不进 git | `AGENTS.md` |
| 远程仓库 | `github.com/JinhaoFang/video-studio`（私有） | — |
| 开发流程 | Claude Code 当设计负责人，Codex 当工程负责人，用 `run-spec` 执行 spec；DispatchDock 只用两个技能，不用监控软件；版本 `workflow-v3`（spec #77：规则分三层、派发排队与续做、`verify` `pr-check` `watch` `review-spec` 子命令、图优先的汇报模板） | `AGENTS.md`、`docs/roles/`、`docs/workflow/README.md`、`docs/agents/` |
| 流程的版本 | `workflow-v1`：建仓、复盘与流程改进；`workflow-v2`：`setup-run-spec` 读懂目标仓库后按模板生成角色文档，设计负责人定为顶层设计与统筹，增加独占资源；`workflow-v3`：按 PathJX 第一阶段的真实使用改进（spec #77） | Release `workflow-v1`（https://github.com/JinhaoFang/video-studio/releases/tag/workflow-v1），`docs/research/run-spec-migration.md` |
| 第一阶段 | 复刻开场 0:00～0:46：spec #60，PR #73，成片 47.9 秒；用户审片后返工 #74 | `docs/reports/spec-60-nasa-punk-opening.html` |

进行中的工作以 GitHub 上打开的 spec 为准，不写进本文。

## 下一步

**打 `workflow-v3` tag**：spec #77 的 PR 合并后，在合并提交上打 tag，推送前先问用户。推上去之前，配置说明和 `setup-run-spec` 里 `#workflow-v3` 的安装命令装不了。

**PathJX 升级到 `workflow-v3`**：在 PathJX 另开 spec。输入是 `docs/research/pathjx-rule-layers.md`：现有规则逐条归到三层的表，以及用 v3 模板为它重新生成的草稿；升级前先按 `docs/agents/run-spec.md`「升级须知」把进行中 spec 的修订并进正文。

**方法层拆成单独的仓库**：v3 发布后紧接着做（用户 10-29 同意），拆法见 `docs/workflow/README.md`「以后拆分」。

**第二阶段**：在新会话里跑 `/grill-with-docs` 定新选题，再 `/to-spec`、`/to-tickets`，开新会话执行。开工前先过下面的待定项。

**检验流程的结论（spec #60）**：在新会话里执行，设计负责人主会话缓存读取约 3,530 万 token，是 Codex 输入（约 6,700 万）的 0.53 倍，比 #17 的 1.3 倍、#37 的 4.5 倍都低。按设计负责人只做令牌和小样的分工，11 张工程工单派给 Codex，用户只审成片。

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

- **本仓库的规则要不要按 v3 重排**：`setup-run-spec` 的模板把设计负责人定为顶层设计与统筹、规则分三层，本仓库的 `docs/roles/design.md` 仍按镜头动画、风格亲手做来写（spec #77 只补了 `run-spec` 会指向的几条），"记进仓库"还没按三层分流，`AGENTS.md` 里"和用户交流用中文"属于个人偏好，`dual-role-workflow` 也还装着。第二阶段收尾复盘时，对照模板和第一阶段的用量一起改。
- **验证副产物会进 `land` 的保留清单**：`land` 在安装后记快照、再跑验证，验证写出的被忽略文件（例如 Python 的 `__pycache__`、`.pytest_cache`）不在快照里，每次合并都会被列出。本仓库的 `pnpm verify` 不写这类文件，PathJX 很可能会。PathJX 升级时实测；需要的话加一个可选配置，列出可以直接删除的被忽略路径模式。

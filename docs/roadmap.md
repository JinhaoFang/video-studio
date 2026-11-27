# 路线图

## 目标

本仓库是用 agent 做视频的工作室，视频类型不限，被邀请进来的人都是用户。它有三个目的：

1. **做出满意的视频**：任何用户从 `/grill-with-docs` 开始，用仓库做出自己满意的一期。
2. **沉淀**：把制作中得到的经验写进工作室层（规则、工具、组件、风格、术语），下一期从这里起步；入口和标准见 `docs/workflow/README.md`「复利」。
3. **可以对外交付**：用户愿意的话，做出来的视频可以对外发布；仓库不默认保证，某一期要发布时，由它自己满足条件（`sources.md` 没有未登记项）。

本文只写工作室层的方向、已定和待定；每期的计划写在各自的 spec 或期目录里。

开发流程用 `workflow-v7`，从 `JinhaoFang/agent-workflow` 安装；它从 2026-10-31 起在那边单独维护。做视频时发现的流程问题，记进那边的观察记录 `docs/research/run-spec-migration.md`，按那边 `AGENTS.md`「怎么改方法层」处理。

## 已定

| 事项 | 决定 | 写在哪 |
|---|---|---|
| 仓库形态 | 一个工作室仓库放所有期，可复用的放 `src/`，每期的放 `episodes/<期>/` | `AGENTS.md`「目录与归属」 |
| 时间机制 | 按时间轴锚点定时，不写死全片帧号：有旁白时锚点是句子编号，没有旁白时是镜头起点和画面事件（用户 11-25，spec #147） | `docs/workflow/README.md`「一期视频」 |
| 包管理、媒体 | pnpm；媒体和渲染结果不进 git | `AGENTS.md` |
| 远程仓库 | `github.com/JinhaoFang/video-studio`（公开） | — |
| 开发流程 | 设计负责人是和用户对话的主会话，工程负责人由它按席位派发，用 `run-spec` 执行 spec；用哪个框架和模型写在个人席位配置里，仓库只登记工作类型 `前端`、`动画`；派发层随 `run-spec` 自带，不再需要 DispatchDock；版本 `workflow-v7`（11-17），各版本内容见 `JinhaoFang/agent-workflow` 的 README「版本」 | `AGENTS.md`、`docs/roles/`、`docs/workflow/README.md`、`docs/agents/` |
| 流程的版本 | `workflow-v1`～`workflow-v3.1` 从本仓库发布；之后的版本从 `JinhaoFang/agent-workflow` 发布 | `JinhaoFang/agent-workflow` 的 README |
| 方法层仓库 | 开发流程带着历史拆到 `JinhaoFang/agent-workflow`（公开）；视频的组件、风格、工具、规则和护栏留在本仓库；本仓库的两个技能从 `workflow-v4` 起换成安装版本，不进 git（用户 10-31） | `docs/workflow/README.md`「方法层仓库」 |
| 方法层怎么改 | 放方法和思路，不放写死的规范；遇到的问题先记成观察，经过分析和评估再决定加不加、用什么形式；"汇报给人"由用户打分（用户 10-31） | `JinhaoFang/agent-workflow` 的 `AGENTS.md`「怎么改方法层」 |
| 协作边界 | 派发前独立审查由用户选择；工单准确定位参照、定稿、契约和验收产物，实现位置由执行者决定；工程推送仅限派发明确授权的本工单分支。规则边界已同步（用户 11-05） | `docs/agents/issue-tracker.md`、`docs/roles/`、`docs/workflow/README.md` |
| CI | GitHub Actions 的设定不动；启动不了时改为本机验证（用户 10-31） | `docs/workflow/README.md`「护栏」 |
| 第一阶段 | 复刻开场 0:00～0:46：spec #60，PR #73，成片 47.9 秒；用户审片后返工 #74。这一期复刻他人的视频，台本照录原片旁白，2026-11-27 连同参考视频的转写、拆解和取样出的 `src/styles/nasa-punk/` 一起移出仓库，git 历史不改写（用户 11-27） | 提交 `ffe625a`的 `episodes/nasa-punk-opening/`、`docs/research/nasa-ep04/`、`docs/reports/spec-60-nasa-punk-opening.html` |
| ClinMesh 宣传片 | 协作者在本机制作、经 PR #121 入库的一期产品宣传片；spec #122 收敛为只剩最终版 `ClinMeshPromo`，文档按事实重写，verify 能拦住 suite 层的测试失败（用户 11-09）。这是协作者的内部产品宣传片，素材授权没登记完，2026-11-27 移出仓库，git 历史不改写（用户 11-27） | 提交 `ffe625a`的 `episodes/clinmesh-promo/`、`docs/reports/spec-122-clinmesh-cleanup.html` |
| 仓库定位 | 视频类型不限；目的是做出满意的视频、沉淀、可以对外交付；被邀请进来的人都是用户，不分主次（用户 11-09） | `AGENTS.md`、`GLOSSARY.md` |
| 工作室层的沉淀 | 本仓库跨期共享的部分叫工作室层，"方法层"只指 `agent-workflow`；沉淀只从新会话的 `/retro` 进入，满足四条标准；推翻已定事项时请当初定的人确认；改了工作室层的 PR 合并前在新会话里用 `code-review` 审一次；不设人工把关（用户 11-09） | `docs/workflow/README.md`「复利」、`docs/adr/0001-studio-layer-without-gatekeeper.md` |
| 帮不懂视频的用户 | 核心是在必要的时候请用户参与（只有用户知道的、之后改起来代价大的、满不满意），问新手给样片、说大白话；一期 13 项决定是设计负责人的检查清单；视频知识放 `docs/video/`，只写知识不写步骤；不加新流程、技能或简报文件，入口不变；白板技能按实测收纳，mg-styles 的评审打分不纳入（用户 11-09，spec #132）。11-26 剧组底座把 13 项清单改成按部门排，"不加新流程"这一半由用户确认改掉；不加技能和简报文件仍成立 | `docs/workflow/README.md`「一期视频」、`docs/roles/design.md`「工作流」、`docs/video/`、`docs/reports/spec-132-video-novice.html` |
| 纯代码动画 | 原创的剧场级日式动画短片，画面、配乐、音效全部由仓库代码算出（`GLOSSARY.md`「纯代码」）；宿主是 Remotion，Canvas 2D 加 WebGL，声音用 Node 合成，本机只能用软件图形 `--gl=swangle`；第一部小样 13 秒、两个镜头，镜头 2 的 A、B 两版各成一部（spec #147，PR #164）。用户看片选了 A；用哪个模型属于个人席位，仓库只记对比证据；参照片方法的验证结论在研究记录第 7 节（用户 11-26，复盘） | `docs/adr/0002-pure-code-animation-on-remotion.md`、`episodes/pure-code-sample/README.md`、`docs/reports/spec-147-pure-code-sample.html`、`docs/research/noroi-iwai.md` |
| 视觉工单的自查 | 工作类型是「前端」「动画」的工单，执行者交付前一轮一轮自查画面（多帧、1:1 裁切、连续帧条、写下最差三处并改、对照反面清单），记录写进汇报；自查不代替设计负责人验收（用户 11-26，spec #147 复盘） | `docs/roles/engineering.md`「完成标准」 |
| 剧组底座 | 一期由剧组来做：编剧、美术、摄影、动作、剪辑、声音六个部门，设计负责人兼任导演和制片；各类片子用同一个剧组，只是各部门的做法不同，每期六个部门都在，用不上的写「不适用」和理由。13 项清单改成按部门排，新增 ⑭ 动作；各部门写明交出什么、交给谁、怎么自查；交接以全片装配为主干，镜头之间看切点表，画面和声音之间看听点表，上游锁定后下游才开工；视频工单写 `部门：`，和工作类型分开；设计负责人只亲手做纸面决定、验收和最后微调，画面的定稿也可以派出去迭代；`docs/video/` 缺的转场、连贯规则、机位图、动作、拟音等知识由纯代码动画正片 spec 补（用户 11-26） | `docs/workflow/README.md`「一期视频」、`docs/adr/0003-crew-base-by-department.md`、`docs/roles/`、`GLOSSARY.md`「剧组」 |
| 纯代码动画正片 | 《雨后》65 秒、12 个镜头，剧组底座第一次在完整片子上跑通：纸面决定 → 设定和底图 → 全片预演给用户看 → 按段派镜头 → 画面锁定 → 听点表和混音 → 成片和封面；引擎、声音合成、样张工具提进 `src/kit/`，纯代码护栏按 `episodes/pure-code.json` 登记检查，`docs/video/` 补了 90 条带出处的知识（spec #168，PR #205；用户看成片的结论记在 #195） | `episodes/after-rain/README.md`、`docs/reports/spec-168-after-rain.html` |
| 对外展示 | 《雨后》公开分享，让更多人看到一人剧组能做出什么、也开始自己做：根目录 README 面向第一次来的人，中文为主、英文版单独一个文件，以《雨后》为代表作讲剧组怎么运转、怎么跑起来、怎么做自己的一部；开发命令移到 `docs/development.md`；成片、封面和缩略图发在 GitHub Release，README 引用 Release 里的文件，媒体仍不进 git；只发《雨后》成片，小样视频不发；复刻他人视频的 NASA 朋克开场和内部产品宣传片 ClinMesh 移出仓库，剩下的代码和文档按 MIT（用户 11-27） | `README.md`、`README.en.md`、`episodes/after-rain/README.md`「GitHub 展示」 |

进行中的工作以 GitHub 上打开的 spec 为准，不写进本文。

## 下一步

任何用户都可以开一期：在新会话里跑 `/grill-with-docs` 定选题，要拆工单的再 `/to-spec`、`/to-tickets`，开新会话执行；走不走 spec 由用户决定。做完后按「复利」开新会话跑 `/retro`。开工前先看下面的待定项。

## 第一阶段留下的（spec #60）

- `land` 删除 worktree 时，会连带删掉里面被 git 忽略的媒体：`workflow-v3` 已改为移到保留目录并列出，要用的拷回主工作区。素材仍要从主工作区拷进 worktree。
- 并行切开的镜头，衔接只能在合并后验收：#66 和 #67 各自都通过了，合到一起才发现中间有 1.2 秒黑场。以后在 spec 里给"跨工单衔接"留一步设计验收。已由剧组底座处理：全片装配和切点表。
- 并行镜头都要改总合成、令牌和本期 README，每次合并都冲突。第二期再用时，考虑让每个镜头自己登记，或者把令牌按镜头拆文件。已由剧组底座处理：制片的归属表加每个镜头一个目录，spec #147 的 A、B 两版合并零冲突。
- 实测的量没有上限：#67 为逐帧证明跑了约 3.3 小时，其他镜头工单约 1 小时。工单的验收产物要写明到什么程度就够。
- 派发前先核对外部 API 的能力：#69 按不支持的 speed 参数合成，多花约 250 credits。仓库里的 `docs/research/elevenlabs-api.md` 早有记录。
- 审片返工 #74：开场同一张照片的推拉被做成溶解换页，根源是小样把镜头内换景别定成溶解、参考拆解用 2 秒联系表、验收只看静态对比图。已沉淀：`docs/roles/design.md`「镜头运动」和运镜验收要求，镜头剧本的“运镜”列（`docs/workflow/README.md`），桌子 SOP 经验要点（`docs/research/table-videosop.md` 第 4 节），lint 禁止镜头代码用 SVG `<image>`。
- 可以提进 `src/kit/` 的：字幕条、按句定时、颗粒暗角、红色手绘批注。第二期再用时提（按句定时和字幕调度已在 #114 提出）。
- 配音：Alice × eleven_v4 在第一阶段实测可用（错字率 0%，后期变速收语速）；ClinMesh 用的是 MiniMax 原速。每期自己选。

## 待定

- kit 组件要写测试时，测试的运行环境怎么定：现在 `.test.ts` 都按 Node 环境检查和运行，测不了 JSX。
- kit 复用欠账：中英文加空格（`text-spacing.ts`）和颗粒暗角（`FilmFinish.tsx`）在 NASA 朋克开场和 ClinMesh 两期各写过一份，没有提进 `src/kit/`；两期 11-27 移出仓库后，当前版本里已经没有这两段代码，旧实现见提交 `ffe625a`；以后要不要复用、怎么复用，等下一期真用到时再定。
- 时间轴来源类型：`tools/build-timeline.ts` 只认 `temporary` 和 `elevenlabs`，非 ElevenLabs 的正式配音（如 ClinMesh 的 MiniMax）只能记成 `elevenlabs`。#114 曾加过 `local`，后来按审阅撤回；要不要加，再定。
- 视频知识的维护：做完一期后由 `/retro` 按这一期的证据更正和补充 `docs/video/`（spec #147 复盘改了日式动画等条目与代码路线冲突的说法，补了静默与环境底噪、视线引导、纯代码合成的声音）；出处里的平台规格页会改版，什么时候复查还没定。
- `land` 保留被忽略文件时同一个文件列两次，第二次移动报「文件不存在」：spec #168 出现 14 次，每次手动移到保留目录再重跑。根因在 `agent-workflow`；本仓库能先做的是把能按生成清单重建的期媒体（如 `public/episodes/after-rain/`）加进 `docs/agents/run-spec.json` 的 `disposableIgnored`，加不加、按期加还是等上游修，再定。
- 执行者 worktree 里没有 Remotion 的无头浏览器，spec #168 的镜头工单都借主工作区的路径渲染；派发安装时带上，还是写进工程文档，再定。

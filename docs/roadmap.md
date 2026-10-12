# 路线图

## 目标

1. **用 AI 做视频**：先复刻《设计风格小课 04：NASA 朋克》的开场 0:00～0:46，再用新选题做完整一期。
2. **探索 DispatchDock**：只用它的两个技能（`codex-dispatch`、`dual-role-workflow`），不用监控软件。使用记录见 `docs/research/dispatchdock-notes.md`。
3. **复利**：以仓库的形式沉淀规则、工具、组件和风格，下一期视频从这里起步。人和 agent 一起搭建这个仓库的过程也要复盘记录，作为在别的仓库复用这套做法的参照。

## 已定（2026-10-11）

| 事项 | 决定 | 写在哪 |
|---|---|---|
| 仓库形态 | 一个工作室仓库放所有期，可复用的放 `src/`，每期的放 `episodes/<期>/` | `AGENTS.md`「目录与归属」 |
| 分工 | Claude Code 当设计负责人，Codex 当工程负责人 | `AGENTS.md`、`docs/roles/` |
| 技能 | Matt 的技能负责想清楚、拆工单、审查、复盘；DispatchDock 负责派发；Remotion 是两边都用的领域知识。DispatchDock 只装在 `.claude/skills/`，Codex 看不到 | `docs/workflow/README.md` |
| 工单 | 只存在 GitHub Issues 一份，按 issue 号派发，不复制进仓库 | `docs/agents/issue-tracker.md` |
| Codex 权限 | 完全权限（`--sandbox danger-full-access`），可以联网、用 `gh` 读 issue | `docs/agents/run-spec.md` |
| 时间机制 | 动画按台本句子编号定时，不写死帧号 | `docs/workflow/README.md` |
| 包管理、媒体 | pnpm；媒体和渲染结果不进 git | `AGENTS.md` |
| 远程仓库 | `github.com/JinhaoFang/video-studio`（私有） | — |
| 护栏 | `pnpm verify`、commit-msg 钩子、CI（推送 `spec/**` 和 PR） | `docs/workflow/README.md`「护栏」 |
| 并行派发 | 可做的工程工单各开一个 git worktree 并行跑 Codex | `run-spec` 第 4、5 步 |
| 审查 | 单张工单只做实测验收；每批合并后和 spec 收尾时由 Codex 跑 `code-review`，设计负责人取舍 | `run-spec` 第 6 步 |
| 合并方式 | PR 只用 merge commit（GitHub 设置已锁定），每个提交和它的 `Refs` 都留在 `main` 上 | — |
| 工单写法 | spec 和工单不写文件路径，需要时用功能描述「边界」；spec 不列工单清单 | `docs/agents/issue-tracker.md` |
| 执行技能 | `run-spec`：机械步骤交给工单脚本（`dispatch`、`land`、`accept`、`cleanup`），本仓库特有的值放配置，复制技能、写一份配置就能迁移 | `docs/agents/run-spec.md` |
| 汇报 | spec 收尾时写 HTML 可视化汇报存进 `docs/reports/`，再清理中间产物；不发布到外部服务 | `run-spec` 第 7 步 |

## 进度

- [x] 参考视频拆解：`docs/research/`
- [x] 规则文档、工单约定、GitHub 仓库和标签
- [x] DispatchDock 技能安装与冒烟测试
- [x] 彩排：spec #1"工作室护栏与验收工具"
- [x] 彩排复盘：结论见 `docs/research/rehearsal-findings.md`「复盘结论」
- [x] spec #17：工单脚本补齐与技能改名，汇报见 `docs/reports/spec-17-run-spec.html`
- [x] 建仓过程复盘：记录见 `docs/reports/bootstrap-retro.md`，可复用的开局步骤见 `docs/workflow/bootstrap.md`
- [ ] 迁移初始化技能（`setup-run-spec`）
- [ ] 第一阶段：复刻开场 0:00～0:46
- [ ] 第二阶段：新选题完整一期

## 下一步：第一阶段

**第一阶段**：单独建 spec，在新会话里：

1. 跑 `/grill-with-docs`，主题"第一阶段：复刻开场 0:00～0:46"，先过下面的待定项。
2. 跑 `/to-spec`，再跑 `/to-tickets`。
3. 开新会话，对设计负责人说"执行 spec #<号>"。

**迁移初始化技能**：第一次真正把 `run-spec` 迁移到别的仓库时，单独建 spec。仿照 Matt 的 `setup-matt-pocock-skills`：先查看目标仓库，确认 Matt 的技能和 DispatchDock 已装好并初始化，再问几项只有人能回答的值，写好 `docs/agents/run-spec.json`、`run-spec.md` 和工单约定，补忽略规则和执行角色标签，最后自检。Matt 的 setup 技能只能由用户手动运行，初始化技能要在对的时候提示用户去跑。讨论时先定三件事：

- 技能从哪里分发（例如按 `docs/workflow/README.md`「以后拆分」把方法层拆出去，用 `npx skills add` 安装）；
- 初始化技能是负责安装 Matt 和 DispatchDock，还是只检查它们装好了没有；
- 文档命令护栏、`pnpm verify` 这类仓库级护栏要不要随行。

输入：`docs/workflow/bootstrap.md`「交给初始化技能的范围」，标【初始化】的步骤是候选。起点是本机的手工迁移包：仓库外的同级目录 `run-spec-package/`，不进 git，里面的 `README.md` 写了手工安装步骤。

## 第一阶段：复刻开场

输入：`docs/research/nasa-ep04/` 的 `shots.md` 前两章、`transcript.md` 前 22 句、`style.md`。

待定：

- 配音来源（MiniMax API、MiniMax 网页、其他 TTS）；开发期是否先用参考视频的音轨当临时配音（只在本机学习时用）；真实照片的来源和授权。
- 混音目标：参考视频实测 -16.0 LUFS、LRA 2.9 LU、真峰值 -1.0 dBTP（`pnpm qa loudness`）。定下后用 `loudness` 的阈值参数验收。
- 彩排推到这里的两项验收工具：动态自检（长时间静止、一闪而过的变化，阈值用真实渲染来定）；按台本句子编号取时间点（等时间轴格式定下）。
- kit 组件要写测试时，测试的运行环境怎么定：现在 `.test.ts` 都按 Node 环境检查和运行，测不了 JSX。

开工参照：`pnpm qa sheet <参考视频> --from 0 --to 46 --every 2` 生成的联系表，一页看完开场的镜头节奏。注册第一个合成后，删掉 README 里"没有合成时 `remotion compositions` 要加 `--quiet`"那句说明。

## 彩排中核实的结论

- **`code-review` 重名**：用 Skill 工具调用 `code-review`，加载的是仓库里 Matt 的版本（Standards、Spec 两条线并行的子代理审查）。用户在输入框直接打 `/code-review` 时调用哪个，没有实测。
- **sub-issue 与阻塞关系**：gh 2.83 用 `gh api` 一次就建成了；注意 POST 的响应返回的是被操作的那个 issue（父 issue 或被阻塞的 issue），不是新加上的关系。现在统一用 `tickets.ts link`。
- **eslint 覆盖范围**：已由 `pnpm verify` 解决，范围是 git 跟踪的和未被忽略的全部代码。

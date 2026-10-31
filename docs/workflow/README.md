# 制作工作流

一项工作从想法到合并，谁在什么时候用什么。具体步骤写在各技能和角色文档里，这里是总图。

## 一项工作的生命周期

| 阶段       | 谁触发                                          | 用什么                                         | 产物在哪                                                             |
| ---------- | ----------------------------------------------- | ---------------------------------------------- | -------------------------------------------------------------------- |
| 想清楚     | 用户                                            | `/grill-with-docs`                             | 术语进 `GLOSSARY.md`，难回头的决定进 `docs/adr/`                     |
| 写 spec    | 用户                                            | `/to-spec`                                     | GitHub issue                                                         |
| 拆工单     | 用户                                            | `/to-tickets`                                  | spec 的 sub-issue，带阻塞关系；格式见 `docs/agents/issue-tracker.md` |
| 执行与验收 | 用户在新会话里说"执行 spec #号"，设计负责人照做（会话可以放在后台，见下文） | `run-spec`（内部用 `codex-dispatch`）          | 集成分支上的提交、工单下的验收评论、`docs/reports/` 的汇报           |
| 合并       | 用户                                            | PR（正文用 `/pr` 的格式），只能用 merge commit | `main`                                                               |
| 复盘       | 用户                                            | `/retro`                                       | 规则文档、检查脚本、文档指针                                         |

执行阶段的回路：

```
GitHub                        设计负责人（Claude Code）                      工程负责人（Codex）
spec #S     ─ 确认基线（verify）；工程类 spec 先做独立审查（review-spec）
 └ 工单 #T  ─ 选出前置都已关闭的工单
   role:design      → 自己做、验收、提交
   role:engineering → 按 issue 号派发，到并发上限排队 ───────────→ 读 #T 的正文和评论、#S 的正文，做完、提交（Refs: #T）、写汇报
                     ← 看汇报（TODO(design)、推断清单）、实测验收产物 ←──────────┘
   ready-for-human  → 告诉用户要做什么
 └ 合并、评论验收结论、关闭 #T；每批合并后派 Codex 审查；全部关闭后再审一次、开 PR "Closes #S"、查 PR（pr-check）、写汇报、清理
```

执行会话可以放在后台跑（可选）：`claude --bg -n <名字> --permission-mode <和平时相同的模式> "<开场白>"` 启动，`claude attach <名字>` 进入；在里面按 ← 回到会话列表、按 Ctrl+Z 回到 shell，会话都继续运行。`claude agents` 看有哪些会话，`claude logs <名字>` 看最近的输出，`claude stop <id>` 停下。后台会话不依附终端，关掉终端不会中断派发出去的 Codex；前台会话在 Codex 运行期间要一直开着。权限模式要和平时一致，不一致时碰到确认就停下等人。

## 什么放在哪里

- **GitHub**：spec、工单、验收评论、PR。它们是过程记录，只存这一份。
- **仓库**：长期有效的东西，包括规则（`AGENTS.md`、角色文档、本文件）、术语与 ADR、研究、每期的台本和镜头剧本、代码和工具。工单要用仓库里的文件时写路径，不复制内容。
- **只在本机**：`.codex-runs/`（派发记录、进度、原始日志）；媒体放 `public/episodes/`，渲染输出放 `out/`。
- **各类文档的职责**：路线图只放目标、已定（索引）、下一步和待定；汇报一个 spec 一份；研究目录放调研和证据，结论数字只写在一处，别处链接。草稿、工作表、回执、核验记录是工单的验收产物，放 `out/qa/`，不进 `docs/`；要留的结论并进现有文档。新增文档前先找能并入的；被链接不是保留的理由。

## 护栏

能机械判断的规则交给护栏，不靠自觉：

- `pnpm verify`：步骤见 `tools/verify.ts`，运行时每步先打印 `[verify]` 标签。完成标准都以它通过为准。设计负责人用工单脚本的 `verify` 子命令跑它：屏幕只看尾部和一行结论，完整输出进日志，退出码照实，不用 `| tail` 这种会吞掉退出码的写法。
- commit-msg 钩子：按 `AGENTS.md` 的格式检查提交信息。
- CI：开 PR、推送 `ticket/**` 和手动触发时跑 `pnpm verify`，并逐条检查分支上的提交信息，兜住绕过本地钩子的提交。工单分支只有派发时加了 `--allow-push` 才会被推上去。集成分支 `spec/**` 推送时不跑：`land` 合并每张工单前已在本机跑过同样的验证。同一个 PR 的新运行会取消还没跑完的旧运行。本地复现：`pnpm verify`，再 `pnpm check:commits origin/main <分支>`。收尾时工单脚本的 `pr-check` 等 PR 的检查跑完。CI 启动不了时（用户 10-31）：GitHub Actions 的设定不动，改为本机验证。判断办法：`gh run view <运行号>` 里作业一步都没跑就失败，注解写 `The job was not started`（例如 10-29 起的账号计费问题）。在 PR 分支上跑上面两条本地复现命令，把结论评论到 PR，代替这次的 CI 结果。

pnpm 的版本由 `package.json` 的 `packageManager` 固定，本机装的 pnpm 会自动切换到这个版本，本地和 CI 一致。文档命令护栏会检查内置命令白名单版本是否一致；升级时按 `tools/check-doc-commands.ts` 文件头的方法更新白名单和版本。

规则文档命令检查的范围和规则写在检查脚本的文件头，运行 `node tools/check-doc-commands.ts --help` 查看用法。研究记录和工作汇报不在范围内，可以如实保留历史命令。

## 一期视频

一期对应一个 spec 和一个目录 `episodes/<期>/`。目录里放本期说明、台本、镜头剧本、`sources.md`、`data/` 下的生成数据和本期镜头代码。

镜头剧本 `storyboard.md` 一个镜头一行，列为：镜头、句子范围、参考段落（复刻时）、画面、运镜。运镜一列写清镜头跟着谁、揭示什么、停在哪里；同一素材上换景别写成推拉或横移，换素材、换场景才写溶解或切，规则见 `docs/roles/design.md`「镜头运动」。复刻参考时，这一列要按 10fps 以上的密集帧核对后再写。示例见 [NASA 朋克开场镜头剧本](../../episodes/nasa-punk-opening/storyboard.md)。

时间机制：台本每句一个编号（`L001`、`L002`……）和句后停顿，以每句音频的实测时长累计生成时间轴，记录每句的起止帧和配音来源。镜头代码按"某句开始后多少帧"定时，不写死帧号。改稿或重配音后重新生成时间轴，动画会跟着走。当前格式、生成工具和 `pnpm qa sentence` 按句取点用法见 [NASA 朋克开场说明](../../episodes/nasa-punk-opening/README.md)。

配音和成片的工具先看 `--help`：逐句配音 `pnpm tts`、等比变速 `node tools/stretch-voice.ts`、配音打分 `pnpm qa voice`、配乐与混音 `node tools/mix-opening.ts`、运动自检 `pnpm qa motion`。本期的复现命令见 [NASA 朋克开场说明](../../episodes/nasa-punk-opening/README.md)。`--help` 里没有的几条：

- 凭据只从环境变量或 `--env` 指定的文件读，不复制进仓库和日志。
- `eleven_v4` 不支持 Speed，请求成功不代表生效（[API 研究](../research/nasa-ep04/elevenlabs-api.md)）。
- 变速总是从原始目录生成到新目录；时间轴读变速后的实测时长，来源说明写明默认倍率和例外。
- 成片响度用 `pnpm qa loudness` 验收：目标 -16 LUFS、容差 1 LU、真峰值不超过 -1 dBTP，LRA 只报告。
- 配音打分的截断标记和运动自检的检出都是复核线索，结合原始转写或画面再下结论。

## 复利

- 每个 spec 或每一期结束都跑 `/retro`。能机械检查的错误做成检查脚本或钩子，需要判断的写进规则文档，找东西费劲的地方加文档指针。
- 第二次用到的代码提到 `src/kit/`，第二次用到的风格提到 `src/styles/`。
- 满意的镜头记下来作为对标片，以后同类镜头照着它验收。

## 以后拆分

仓库按目录分成两层，拆分时按目录切开：

- **方法层**：`AGENTS.md`、`docs/roles/`、`docs/workflow/`、`docs/agents/`、`.claude/skills/run-spec`、`.claude/skills/setup-run-spec`、`tools/`、`.githooks/`、`.github/`、`src/kit/`、`src/styles/`，加上 `skills-lock.json` 和 DispatchDock 的安装命令。
- **产物层**：`episodes/`、`docs/research/`（里面有对他人作品的转写，不能公开）、本机的 `public/episodes/`。

依赖只能从产物层指向方法层：每期可以用 `src/kit/`，`src/` 和 `tools/` 不能引用 `episodes/`。注册各期合成的 Remotion 入口（`episodes/index.ts`、`episodes/Root.tsx`）属于产物层，所以 `src/` 里没有入口；拆出去的方法层要用时，自己配一个入口。拆分时用 `git filter-repo --path …` 带着历史抽出需要的目录；提交信息尾注里的 `Refs: #号` 用 `--replace-message` 改成 `Refs: JinhaoFang/video-studio#号`，这样拆出去以后链接仍然指向原仓库的 issue。

## 注意

- 派发、合并、验收、审查、收尾的具体步骤只写在执行技能 `run-spec` 里，本仓库特有的值见 `docs/agents/run-spec.md`。
- `code-review` 重名：用 Skill 工具调用 `code-review`，加载的是仓库里 Matt 的版本（Standards、Spec 两条线并行的子代理审查）。用户在输入框直接打 `/code-review` 时调用哪个，没有实测。

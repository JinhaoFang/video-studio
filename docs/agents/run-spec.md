# 执行技能的本仓库配置

执行技能（`.claude/skills/run-spec/`）只写通用步骤，本仓库特有的值放在两处：

- `docs/agents/run-spec.json`：工单脚本要读的值；
- 本文：配置项的含义，以及脚本用不到、但设计负责人执行时要知道的值。

## 脚本读取的配置

`run-spec.json` 的前六项必填，缺文件或缺项时脚本以 2 退出，并说明缺了什么。`codexConcurrency`、`prCheckCommand`、`verificationEnv`、`exclusiveVerification`、`disposableIgnored` 可选，不写就取默认值，格式错误同样以 2 退出；`doctor` 报告它们的实际取值和来源（配置、环境变量或默认）。命令一律写成参数数组。

`symlinkDirectories` 在读取配置时统一规范化：去掉末尾斜杠、`./` 和重复斜杠，转成相对仓库根目录的形式，再按首次出现的顺序去重。派发、合并和自检共用这个结果。这里只做路径的词法规范化，不解析软链接的真实目标；目录不能使用绝对路径或 `..`，也不能在规范化后为空（指向仓库根目录）。无效项以 2 退出，报错写明数组下标（从 0 开始）和原值。

| 配置项 | 本仓库的值 | 含义 |
|---|---|---|
| `verificationCommand` | `["pnpm", "verify"]` | 验证命令。`land` 在 worktree 里合并前运行它；派发指令也让 Codex 用它验证。 |
| `installCommand` | `["pnpm", "install", "--frozen-lockfile"]` | 安装命令。`dispatch` 新建 worktree 后运行，失败以 2 退出，重跑时补完安装；`land` 每次 rebase 之后、验证之前再运行一次，前面合并的工单加了依赖也不会让验证失败，失败按需返工处理。成功都只打印一行，失败回放完整输出。每次安装后记下 worktree 里已有的被忽略文件（安装产物快照），`land` 删除 worktree 前，快照外的被忽略文件移到保留目录。 |
| `symlinkDirectories` | `["references", ".agents"]` | 不进 git、但 Codex 要读的目录。`dispatch` 把它们从主工作区软链接进 worktree，派发指令要求只读使用。本仓库是参考资料和第三方技能（Matt 的技能、Remotion 技能）。 |
| `acceptanceRoot` | `"out/qa"` | 验收产物根目录。每张工单写到下面的 `spec-<S>/<T>/`；`land` 把它复制回主工作区，`cleanup` 整个删掉 `spec-<S>/`。已复制的记录和验收产物在删除 worktree 前按内容核对，变了就重新复制；其余被忽略的工单产物在 `<仓库目录>.worktrees/.kept/<T>/`，`cleanup` 列出后删除。 |
| `codexSandbox` | `"danger-full-access"` | 派发时 Codex 的权限。用户要求完全权限，让 Codex 能联网、能用 `gh` 读 issue。 |
| `dispatchScript` | `".claude/skills/codex-dispatch/codex-task.mjs"` | DispatchDock 的派发脚本，路径相对主工作区。 |
| `codexConcurrency` | 不写（默认 `2`） | 可选。同时运行的 Codex 派发上限，`dispatch` 到上限时排队。它是 Codex 账号的属性，环境变量 `RUN_SPEC_CODEX_CONCURRENCY` 优先于配置，账号上限不同的机器各自设。 |
| `prCheckCommand` | 不写（默认 `["gh", "pr", "checks", "{pr}", "--watch"]`） | 可选。`pr-check` 运行的 PR 检查命令，每个参数里的 `{pr}` 换成 PR 号。仓库的 CI 不能用时改成本机 CI，例如 `["make", "ci-local", "PR={pr}"]`。 |
| `verificationEnv` | 不写（默认 `{}`） | 可选。验证要用的环境变量，字符串到字符串的对象；值里的 `{mainRoot}` 换成主工作区路径，进程里已有的同名变量优先。`verify`、`land`、`pr-check` 和 `dispatch` 的安装与 Codex 进程都带上它，实际值写进派发指令和派发记录，所以不放密钥。本仓库的验证不依赖环境变量。 |
| `exclusiveVerification` | 不写（默认 `false`） | 可选。开启后完整验证在全仓库排队，一次只跑一个：锁在 git 公共目录，`verify`、`land` 的验证和非默认的 PR 检查命令共用，持锁进程被杀后等待者自动回收；派发指令要求 Codex 用主工作区的 `tickets.ts verify <T>` 做完整验证。验证吃满 CPU、内存或独占端口、数据库的仓库开它；本仓库的验证一分钟内跑完，并发不互相干扰，不开。 |

## 执行时要知道的其他值

- **按批审查**：审查不走 `dispatch`，不会排队：先用 `tickets.ts slots` 看名额，再用 `dispatchScript` 指向的派发脚本直接派发，`--sandbox` 填 `codexSandbox`。
- **`claude` CLI**：`watch`（小模型巡检）和 `review-spec`（派发前的独立审查）调用 `claude -p`，`doctor` 检查它可用。它们用的是 Claude 的额度。
- **汇报目录**：`docs/reports/`。写法见 `run-spec` 技能的 `report.md`，从同目录的 `report-template.html` 复制；spec #94 之前的汇报用的是旧模板。
- **实测用时**：一张工程工单派发后 5～10 分钟结束，一次按批审查约 4 分钟。告诉用户粗略用时就按这个估。
- **独占资源**：无。
- **常见的共享登记处**：`pnpm qa` 的子命令登记表、工单脚本的子命令登记表。并行的工单都要往里加一项时，派发的补充说明写"只加自己那一项"。

## 装到别的仓库

`run-spec` 和初始化技能 `setup-run-spec` 的来源是本仓库，两个都在 `.claude/skills/` 下进 git。别的仓库从版本 tag 安装：在根目录运行安装命令，再由用户输入 `/setup-run-spec`：它查看仓库、讲清步骤，写执行配置和工单约定，建标签，设合并方式，最后自检和冒烟测试。

```bash
npx skills add JinhaoFang/video-studio#workflow-v3.1 --skill run-spec --skill setup-run-spec -a claude-code -y
```

- 装进去的两个技能只在 `.claude/skills/`，不进 git，Codex 看不到。
- `#` 后面是版本，也就是本仓库的 tag，当前是 `workflow-v3.1`。安装工具用 `git clone --branch` 取这个版本，所以别的仓库固定在这个版本上，不会跟着本仓库的 `main` 变。
- 升级就是把命令里的版本换成新 tag 再运行。`npx skills update` 和按锁文件恢复的 `npx skills experimental_install` 都会把它们装进 `.agents/skills/`，Codex 就能看到了（2026-10-12 实测）。在那些仓库里用 `update` 更新别的技能时点名技能，更新完运行 `node .claude/skills/run-spec/scripts/tickets.ts doctor`。
- 本仓库改了这两个技能，攒成一个版本后打新 tag（`workflow-v3.1`……），同时把本节、`setup-run-spec` 第 5 步和它的配置模板里命令的版本号改掉；各仓库换成新版本号再运行安装命令才拿到。重装会改那边 `skills-lock.json` 里两项的哈希，要提交：design-system 重装后没提交，主工作区一直不干净，`land` 会拒绝合并。
- 早期手工迁移、`run-spec` 进过 git 的仓库，`/setup-run-spec` 会把它换成安装版本。那个 PR 合并后更新本地 `main`，先 `git fetch origin main:main` 再切过去；先切到还停在旧提交的本地 `main` 再拉取，git 会把 `run-spec` 从磁盘上删掉（design-system 实际碰到过），删了就重新运行安装命令。

## 升级须知

从 `workflow-v3` 升到 `workflow-v3.1`，配置不用改就能跑，三个新配置项不写时行为和 v3 相同。按仓库的情况决定开哪些：

- **`verificationEnv`**：验证要靠环境变量才能跑通的仓库（浏览器目录、测试预算、并行度）写进来，Codex 和 `land` 就不必各自猜。不放密钥：实际值会写进派发记录。
- **`exclusiveVerification`**：几个完整验证同时跑会互相拖慢、超时或抢端口的仓库开它。PathJX 的 #208、#209 就是并发的完整测试让 E2E 超时。
- **`disposableIgnored`**：保留目录里堆满字节码、测试缓存、构建输出的仓库，把这些模式写进来，`land` 直接删掉，不再移到保留目录。

两处行为变了，不用配置：

- **`accept` 核对提交**：以通过关闭前，「提交」里的每个提交号都要在远端集成分支上。设计工单提交后先推送集成分支再验收；没有提交的只读工单加 `--no-commits`。
- **收尾先核对目标**：开 PR 前按问题陈述的口径重测现状，结果写进汇报的「目标核对」。

升级后运行 `node .claude/skills/run-spec/scripts/tickets.ts doctor`，确认三个新配置项的取值和来源。

还在 `workflow-v2` 的仓库，先按 `workflow-v3` tag 里本节的三件事处理，再装 v3.1。

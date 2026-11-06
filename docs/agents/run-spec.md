# 执行技能的本仓库配置

执行技能（`.claude/skills/run-spec/`）只写通用步骤，本仓库特有的值放在两处：

- `docs/agents/run-spec.json`：工单脚本要读的值；
- 本文：配置项的含义，以及脚本用不到、但设计负责人执行时要知道的值。

## 脚本读取的配置

`run-spec.json` 的前四项必填，工程席位的权限由 `codexSandbox` 或个人席位配置给出，缺文件或缺项时脚本以 2 退出，并说明缺了什么。其余可选，不写就取默认值，格式错误同样以 2 退出；`doctor` 报告它们的实际取值和来源（配置、环境变量或默认）。命令一律写成参数数组。

`symlinkDirectories` 在读取配置时统一规范化：去掉末尾斜杠、`./` 和重复斜杠，转成相对仓库根目录的形式，再按首次出现的顺序去重。派发、合并和自检共用这个结果。这里只做路径的词法规范化，不解析软链接的真实目标；目录不能使用绝对路径或 `..`，也不能在规范化后为空（指向仓库根目录）。无效项以 2 退出，报错写明数组下标（从 0 开始）和原值。

| 配置项 | 本仓库的值 | 含义 |
|---|---|---|
| `verificationCommand` | `["pnpm", "verify"]` | 完整验证：ESLint、类型检查、护栏和全部测试，步骤见 `tools/verify.ts`，约 25 秒。`land` 合并前在 worktree 里运行它（改动全部匹配 `staticOnlyPaths` 时除外），`tickets.ts verify --full` 也用它。 |
| `installCommand` | `["pnpm", "install", "--frozen-lockfile"]` | 安装命令。`dispatch` 新建 worktree 后运行，失败以 2 退出，重跑时补完安装；`land` 每次 rebase 之后、验证之前再运行一次，前面合并的工单加了依赖也不会让验证失败，失败按需返工处理。成功都只打印一行，失败回放完整输出。每次安装后记下 worktree 里已有的被忽略文件（安装产物快照），`land` 删除 worktree 前，快照外的被忽略文件移到保留目录。 |
| `symlinkDirectories` | `["references", ".agents"]` | 不进 git、但派出去的 agent 要读的目录。`dispatch` 把它们从主工作区软链接进 worktree，派发指令要求只读使用。本仓库是参考资料和第三方技能（Matt 的技能、Remotion 技能）。 |
| `acceptanceRoot` | `"out/qa"` | 验收产物根目录。每张工单写到下面的 `spec-<S>/<T>/`；`land` 把它复制回主工作区，`cleanup` 整个删掉 `spec-<S>/`。已复制的记录和验收产物在删除 worktree 前按内容核对，变了就重新复制；其余被忽略的工单产物在 `<仓库目录>.worktrees/.kept/<T>/`，`cleanup` 列出后删除。 |
| `codexSandbox` | `"danger-full-access"` | 工程席位用 Codex 时的权限（旧兼容项）。用户要求完全权限，让执行者能联网、能用 `gh` 读 issue；其他框架的权限写在个人席位配置里。 |
| `workTypes` | `{"前端":"镜头、样式、预览页这类视觉实现"}` | 工作类型词表。工单写一行 `工作类型：前端` 时按席位配置的「前端」档派发；视觉实现和脚本、管线适合的模型不同。 |
| `seats`、`agents` | 不写 | 用哪个框架、模型和并发上限属于个人和本机，写在 `~/.config/agent-workflow/seats.json`；仓库没有硬要求，不覆盖。格式见 `setup-run-spec` 的 `seats.md`，实际值用 `doctor` 看。 |
| `prCheckCommand` | 不写（默认 `["gh", "pr", "checks", "{pr}", "--watch"]`） | 可选。`pr-check` 运行的 PR 检查命令，每个参数里的 `{pr}` 换成 PR 号。CI 启动不了时不改这一项，按 `docs/workflow/README.md`「护栏」改为本机验证。 |
| `verificationEnv` | 不写（默认 `{}`） | 可选。验证要用的环境变量，字符串到字符串的对象；值里的 `{mainRoot}` 换成主工作区路径，进程里已有的同名变量优先。`verify`、`land`、`pr-check` 和 `dispatch` 的安装与执行者进程都带上它，实际值写进派发指令和派发记录，所以不放密钥。本仓库的验证不依赖环境变量。 |
| `exclusiveVerification` | 不写（默认 `false`） | 可选。开启后完整验证在全仓库排队，一次只跑一个：锁在 git 公共目录，`verify`、`land` 的验证和非默认的 PR 检查命令共用；持锁进程被杀后，等验证作业的整个进程组都退出才回收（Windows 只看持锁进程）；持锁期间嵌套调用的 `verify` 沿用同一把锁，不会死锁；派发指令要求执行者用主工作区的 `tickets.ts verify <T>` 做完整验证。验证吃满 CPU、内存或独占端口、数据库的仓库开它；本仓库的验证一分钟内跑完，并发不互相干扰，不开。 |
| `staticCheckCommand` | `["pnpm", "verify", "--static"]` | 可选。静态检查：完整验证里除测试以外的全部步骤，约 6 秒。配了它，派发指令要求执行者开发时只跑相关测试和静态检查，完整验证由 `land` 跑一次。 |
| `staticOnlyPaths` | `["**/*.md", "docs/reports/*.html"]` | 可选，和 `staticCheckCommand` 一起配。gitignore 写法；一张工单的改动全部匹配时，`land` 和设计工单的 `verify` 只跑静态检查。只放验证不会读的文件：Markdown 文档和 HTML 汇报。台本 `episodes/<期>/script.md` 会被管线工具读，但测试不读它，完整验证也测不到，所以同样只跑静态检查。 |
| `disposableIgnored` | 不写（默认 `[]`） | 可选。`land` 删除 worktree 前可以直接删掉的被忽略文件，gitignore 写法的模式数组，例如 `**/__pycache__/`、`.pytest_cache/`、`apps/*/dist/`。匹配的文件直接删除、输出删了多少，其余照旧移到保留目录；`.codex-runs/` 和本 spec 的验收产物目录（`<acceptanceRoot>/spec-<S>/`）永远不按它删，验收产物根目录下别的路径（例如测试输出）照样按模式处理；`--dry-run` 列出将删的数量。本仓库合并后的保留目录是空的，不写。 |

## 执行时要知道的其他值

- **框架**：各席位用到的 agent 命令行要装好并登录，`doctor` 逐个检查，并列出每个席位实际用的框架、模型和来源。
- **汇报目录**：`docs/reports/`。写法见 `run-spec` 技能的 `report.md`，从同目录的 `report-template.html` 复制；切换到 `workflow-v4` 之前写的汇报用的是旧模板。
- **实测用时**：一张工程工单派发后 5～10 分钟结束，一次按批审查约 4 分钟。告诉用户粗略用时就按这个估。
- **独占资源**：无。
- **常见的共享登记处**：`pnpm qa` 的子命令登记表、工单脚本的子命令登记表。并行的工单都要往里加一项时，派发的补充说明写"只加自己那一项"。

## 来源与版本

`run-spec` 和 `setup-run-spec` 从 `JinhaoFang/agent-workflow` 安装，当前是 `workflow-v5`，记在 `skills-lock.json`；安装、版本和升级见那边的 README。两个技能装在本机的 `.claude/skills/` 和 `.agents/skills/`，不进 git，每台跑执行会话的机器各自安装；派发层会对派出去的 agent 屏蔽它们。

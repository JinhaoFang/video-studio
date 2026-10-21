# 执行技能的本仓库配置

执行技能（`.claude/skills/run-spec/`）只写通用步骤，本仓库特有的值放在两处：

- `docs/agents/run-spec.json`：工单脚本要读的值；
- 本文：配置项的含义，以及脚本用不到、但设计负责人执行时要知道的值。

## 脚本读取的配置

`run-spec.json` 的每一项都必填。缺文件或缺项时，脚本以 2 退出，并说明缺了什么。命令一律写成参数数组。

`symlinkDirectories` 在读取配置时统一规范化：去掉末尾斜杠、`./` 和重复斜杠，转成相对仓库根目录的形式，再按首次出现的顺序去重。派发、合并和自检共用这个结果。这里只做路径的词法规范化，不解析软链接的真实目标；目录不能使用绝对路径或 `..`，也不能在规范化后为空（指向仓库根目录）。无效项以 2 退出，报错写明数组下标（从 0 开始）和原值。

| 配置项 | 本仓库的值 | 含义 |
|---|---|---|
| `verificationCommand` | `["pnpm", "verify"]` | 验证命令。`land` 在 worktree 里合并前运行它；派发指令也让 Codex 用它验证。 |
| `installCommand` | `["pnpm", "install", "--frozen-lockfile"]` | 安装命令。`dispatch` 新建 worktree 后运行，失败以 2 退出，重跑时补完安装；`land` 每次 rebase 之后、验证之前再运行一次，前面合并的工单加了依赖也不会让验证失败，失败按需返工处理。成功都只打印一行，失败回放完整输出。 |
| `symlinkDirectories` | `["references", ".agents"]` | 不进 git、但 Codex 要读的目录。`dispatch` 把它们从主工作区软链接进 worktree，派发指令要求只读使用。本仓库是参考资料和第三方技能（Matt 的技能、Remotion 技能）。 |
| `acceptanceRoot` | `"out/qa"` | 验收产物根目录。每张工单写到下面的 `spec-<S>/<T>/`；`land` 把它复制回主工作区，`cleanup` 整个删掉 `spec-<S>/`。 |
| `codexSandbox` | `"danger-full-access"` | 派发时 Codex 的权限。用户要求完全权限，让 Codex 能联网、能用 `gh` 读 issue。 |
| `dispatchScript` | `".claude/skills/codex-dispatch/codex-task.mjs"` | DispatchDock 的派发脚本，路径相对主工作区。 |

## 执行时要知道的其他值

- **按批审查**：审查不走 `dispatch`，用 `dispatchScript` 指向的派发脚本直接派发，`--sandbox` 填 `codexSandbox`。
- **汇报目录**：`docs/reports/`。HTML 汇报的范例是 `docs/reports/spec-17-run-spec.html`；spec #1 的是改版前的 Markdown 汇报。
- **实测用时**：一张工程工单派发后 5～10 分钟结束，一次按批审查约 4 分钟。告诉用户粗略用时就按这个估。
- **独占资源**：无。
- **常见的共享登记处**：`pnpm qa` 的子命令登记表、工单脚本的子命令登记表。并行的工单都要往里加一项时，派发的补充说明写"只加自己那一项"。

## 装到别的仓库

`run-spec` 和初始化技能 `setup-run-spec` 的来源是本仓库，两个都在 `.claude/skills/` 下进 git。别的仓库从版本 tag 安装：在根目录运行安装命令，再由用户输入 `/setup-run-spec`：它查看仓库、讲清步骤，写执行配置和工单约定，建标签，设合并方式，最后自检和冒烟测试。

```bash
npx skills add JinhaoFang/video-studio#workflow-v2 --skill run-spec --skill setup-run-spec -a claude-code -y
```

- 装进去的两个技能只在 `.claude/skills/`，不进 git，Codex 看不到。
- `#` 后面是版本，也就是本仓库的 tag，当前是 `workflow-v2`。安装工具用 `git clone --branch` 取这个版本，所以别的仓库固定在这个版本上，不会跟着本仓库的 `main` 变。
- 升级就是把命令里的版本换成新 tag 再运行。`npx skills update` 和按锁文件恢复的 `npx skills experimental_install` 都会把它们装进 `.agents/skills/`，Codex 就能看到了（2026-10-12 实测）。在那些仓库里用 `update` 更新别的技能时点名技能，更新完运行 `node .claude/skills/run-spec/scripts/tickets.ts doctor`。
- 本仓库改了这两个技能，攒成一个版本后打新 tag（`workflow-v2`……），同时把本节、`setup-run-spec` 第 5 步和它的配置模板里命令的版本号改掉；各仓库换成新版本号再运行安装命令才拿到。重装会改那边 `skills-lock.json` 里两项的哈希，要提交：design-system 重装后没提交，主工作区一直不干净，`land` 会拒绝合并。
- 早期手工迁移、`run-spec` 进过 git 的仓库，`/setup-run-spec` 会把它换成安装版本。那个 PR 合并后更新本地 `main`，先 `git fetch origin main:main` 再切过去；先切到还停在旧提交的本地 `main` 再拉取，git 会把 `run-spec` 从磁盘上删掉（design-system 实际碰到过），删了就重新运行安装命令。

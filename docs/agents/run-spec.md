# 执行技能的本仓库配置

执行技能（`.claude/skills/run-spec/`）只写通用步骤，本仓库特有的值放在两处：

- `docs/agents/run-spec.json`：工单脚本要读的值；
- 本文：配置项的含义，以及脚本用不到、但设计负责人执行时要知道的值。

## 脚本读取的配置

`run-spec.json` 的每一项都必填。缺文件或缺项时，脚本以 2 退出，并说明缺了什么。命令一律写成参数数组。

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
- **常见的共享登记处**：`pnpm qa` 的子命令登记表、工单脚本的子命令登记表。并行的工单都要往里加一项时，派发的补充说明写"只加自己那一项"。

## 装到别的仓库

`run-spec` 和初始化技能 `setup-run-spec` 的来源是本仓库，两个都在 `.claude/skills/` 下进 git。别的仓库在根目录运行安装命令，再由用户输入 `/setup-run-spec`：它查看仓库、讲清步骤，写执行配置和工单约定，建标签，设合并方式，最后自检和冒烟测试。

```bash
npx skills add JinhaoFang/video-studio --skill run-spec --skill setup-run-spec -a claude-code -y
```

- 装进去的两个技能只在 `.claude/skills/`，不进 git，Codex 看不到。
- 更新就是重新运行这条命令。`npx skills update` 和按锁文件恢复的 `npx skills experimental_install` 都会把它们装进 `.agents/skills/`，Codex 就能看到了（2026-10-12 实测）。在那些仓库里用 `update` 更新别的技能时点名技能，更新完运行 `node .claude/skills/run-spec/scripts/tickets.ts doctor`。
- 本仓库改了这两个技能，合进 `main` 以后，各仓库重新运行安装命令才拿到。

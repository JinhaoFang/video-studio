# 执行技能的本仓库配置

执行技能（`.claude/skills/run-spec/`）只写通用步骤，本仓库特有的值放在两处：

- `docs/agents/run-spec.json`：工单脚本要读的值；
- 本文：配置项的含义，以及脚本用不到、但设计负责人执行时要知道的值。

## 脚本读取的配置

`run-spec.json` 的每一项都必填。缺文件或缺项时，脚本以 2 退出，并说明缺了什么。命令一律写成参数数组。

| 配置项 | 本仓库的值 | 含义 |
|---|---|---|
| `verificationCommand` | `["pnpm", "verify"]` | 验证命令。`land` 在 worktree 里合并前运行它；派发指令也让 Codex 用它验证。 |
| `installCommand` | `["pnpm", "install", "--frozen-lockfile"]` | 安装命令。`dispatch` 新建 worktree 后运行。 |
| `symlinkDirectories` | `["references", ".agents"]` | 不进 git、但 Codex 要读的目录。`dispatch` 把它们从主工作区软链接进 worktree，派发指令要求只读使用。本仓库是参考资料和第三方技能（Matt 的技能、Remotion 技能）。 |
| `acceptanceRoot` | `"out/qa"` | 验收产物根目录。每张工单写到下面的 `spec-<S>/<T>/`；`land` 把它复制回主工作区，`cleanup` 整个删掉 `spec-<S>/`。 |
| `codexSandbox` | `"danger-full-access"` | 派发时 Codex 的权限。用户要求完全权限，让 Codex 能联网、能用 `gh` 读 issue。 |
| `dispatchScript` | `".claude/skills/codex-dispatch/codex-task.mjs"` | DispatchDock 的派发脚本，路径相对主工作区。 |

## 执行时要知道的其他值

- **按批审查的权限**：审查用 DispatchDock 的派发脚本直接派发，`--sandbox` 填上面的 `codexSandbox`。
- **汇报目录**：`docs/reports/`，范例是 `docs/reports/spec-1-guardrails.md`。
- **实测用时**：一张工程工单派发后 5～10 分钟结束，一次按批审查约 4 分钟。告诉用户粗略用时就按这个估。
- **常见的共享登记处**：`pnpm qa` 的子命令登记表、工单脚本的子命令登记表。并行的工单都要往里加一项时，派发的补充说明写"只加自己那一项"。

## 迁移到别的仓库

前提：

- 装了 Matt 的技能，并跑过它的仓库设置，有 `docs/agents/issue-tracker.md`；GitHub 上有 `role:engineering`、`role:design`、`ready-for-human` 三个标签。
- 按 `dual-role-workflow` 建好了 `AGENTS.md` 和 `docs/roles/` 下的两份角色文档。
- 装了 DispatchDock 的 `codex-dispatch` 技能。
- `gh` 2.83 以上（要用 sub-issue 和阻塞关系的 API）；Node 22.18 以上（工单脚本是直接运行的 TypeScript）。

步骤：

1. 复制技能目录，确认它会进 git，第三方技能仍然不进。
2. 写一份 `docs/agents/run-spec.json`，按上表逐项改成新仓库的值。
3. 复制本文，改掉「执行时要知道的其他值」。
4. 在 `docs/agents/issue-tracker.md` 里补上本仓库的工单约定，可以参照本仓库那一节。

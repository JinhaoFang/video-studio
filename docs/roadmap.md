# 路线图

## 目标

1. **用 AI 做视频**：先复刻《设计风格小课 04：NASA 朋克》的开场 0:00～0:46，再用新选题做完整一期。
2. **探索 DispatchDock**：只用它的两个技能（`codex-dispatch`、`dual-role-workflow`），不用监控软件。使用记录见 `docs/research/dispatchdock-notes.md`。
3. **复利**：以仓库的形式沉淀规则、工具、组件和风格，下一期视频从这里起步。

## 已定（2026-10-11）

| 事项 | 决定 | 写在哪 |
|---|---|---|
| 仓库形态 | 一个工作室仓库放所有期，可复用的放 `src/`，每期的放 `episodes/<期>/` | `AGENTS.md`「目录与归属」 |
| 分工 | Claude Code 当设计负责人，Codex 当工程负责人 | `AGENTS.md`、`docs/roles/` |
| 技能 | Matt 的技能负责想清楚、拆工单、审查、复盘；DispatchDock 负责派发；Remotion 是两边都用的领域知识。DispatchDock 只装在 `.claude/skills/`，Codex 看不到 | `docs/workflow/README.md` |
| 工单 | 只存在 GitHub Issues 一份，按 issue 号派发，不复制进仓库 | `docs/agents/issue-tracker.md` |
| Codex 权限 | 完全权限（`--sandbox danger-full-access`），可以联网、用 `gh` 读 issue | `studio-tickets` 技能；派发默认配置 `~/.config/codex-dispatch/config.json` |
| 时间机制 | 动画按台本句子编号定时，不写死帧号 | `docs/workflow/README.md` |
| 包管理、媒体 | pnpm；媒体和渲染结果不进 git | `AGENTS.md` |
| 远程仓库 | `github.com/JinhaoFang/video-studio`（私有） | — |

## 进度

- [x] 参考视频拆解：`docs/research/`
- [x] 规则文档、工单约定、GitHub 仓库和标签
- [x] DispatchDock 技能安装与冒烟测试
- [ ] 彩排：spec"工作室护栏与验收工具"
- [ ] 第一阶段：复刻开场 0:00～0:46
- [ ] 第二阶段：新选题完整一期

## 下一步：彩排

目的是把整套流程完整走一遍，同时做出后面要用的护栏和验收工具。在新会话里：

1. 跑 `/grill-with-docs`，主题"工作室护栏与验收工具"。下面是供讨论的候选内容，还没有定：
   - `pnpm verify`：eslint 覆盖 `src` 和 `episodes`（现在的 `pnpm lint` 只查 `src`），加上 tsc，再加一项"代码注释只能写在文件头"的检查。
   - 提交钩子：按 `AGENTS.md` 的提交格式检查类型、范围、正文和 `Refs` / `Role` 尾注，拒绝署名尾注。
   - 依赖方向检查：`src/` 和 `tools/` 不能引用 `episodes/`，保证以后能把方法层单独拆出去（见 `docs/workflow/README.md`「以后拆分」）。
   - 验收工具：按时间点抽关键帧；拼带时间码的联系表；渲染帧和参考视频同一时间点左右并排对比；测响度（LUFS、真峰值）。
   - 工单脚本：把 `studio-tickets` 里写回评论、关闭工单这类机械步骤做成命令。
2. 跑 `/to-spec`，再跑 `/to-tickets`。
3. 对设计负责人说"执行 spec #<号>"。

彩排时要观察的：

- Codex 是否守住角色和写入范围。
- 汇报 9 项是否齐全，推断清单是否真的有用。
- 在 gh 2.83 下，sub-issue 和阻塞关系的 API 用起来是否顺畅（`gh issue create --parent` 要 2.94 以上，目前走 `gh api`）。
- `code-review` 实际调用的是哪个版本（见下面的待核实）。

## 第一阶段：复刻开场

输入：`docs/research/nasa-ep04/` 的 `shots.md` 前两章、`transcript.md` 前 22 句、`style.md`。开发期可以先用参考视频的音轨当临时配音，只在本机学习时用。

待定：配音来源（MiniMax API、MiniMax 网页、其他 TTS）；真实照片的来源和授权。

## 待核实

- **`code-review` 重名**：Claude Code 自带一个 `/code-review`，Matt 的技能也叫 `code-review`，需要实测实际调用的是哪个。如果 Matt 的版本被挡住，就把"对照工单检查"写进 `studio-tickets`。
- **eslint 只查 `src`**：`tsconfig.json` 已经包含 `episodes`，但 `pnpm lint` 里的 eslint 还没有覆盖它。放进彩排的护栏一起解决。

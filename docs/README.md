# 文档地图

| 文档 | 内容 |
|---|---|
| `../AGENTS.md` | 共同规则、角色、目录与归属（两个 agent 每次都会读） |
| `roadmap.md` | 目标、已定的决策、下一步和待定，**新会话从这里看起**；进行中的工作看 GitHub 上打开的 spec |
| `workflow/README.md` | 制作工作流总图：每个阶段谁触发、用什么、产物在哪里 |
| `workflow/bootstrap.md` | 开局：在新仓库里，或迁进已有仓库时，和 agent 一起搭起这套工作方式的步骤，以及哪些步骤交给迁移初始化技能 |
| `roles/design.md` | 设计负责人：自己做和派出去的判断标准、验收方法 |
| `roles/engineering.md` | 工程负责人：硬规则、可用技能、完成标准、汇报格式 |
| `agents/issue-tracker.md` | GitHub 工单的操作方法和本仓库的工单约定 |
| `agents/run-spec.md`、`agents/run-spec.json` | 执行技能的本仓库配置：脚本读取的值、其他本仓库特有的值、迁移方法 |
| `agents/triage-labels.md`、`agents/domain.md` | Matt 技能的标签表、术语文档布局 |
| `research/nasa-ep04/` | 参考视频拆解：`pipeline.md` 流程、`shots.md` 镜头表、`style.md` 视觉与声音、`transcript.md` 旁白时间轴 |
| `research/table-videosop.md` | 对照：另一位作者的 Table-Video SOP，以及可以借用的做法 |
| `research/dispatchdock-notes.md` | 使用 DispatchDock 的实测记录 |
| `research/run-spec-migration.md` | 流程每个版本的问题记录（design-system 迁移、PathJX 第一阶段、v3 的实测），`run-spec` 和初始化技能改进的输入 |
| `research/pathjx-rule-review/` | 规则归类的判定标准第二版（`criteria.md`）和 PathJX 规则复核明细；归类规则时读 |
| `research/pathjx-rule-layers.md` | 已被判定标准第二版取代的三层归类表，只作记录 |
| `research/rehearsal-findings.md` | 彩排发现：Matt 技能与 DispatchDock 结合的问题和已定的调整，spec #1 完成后复盘用 |
| `reports/` | 每个 spec 完成后，设计负责人给用户的工作汇报：从 spec #17 起是 HTML 可视化页面，spec #1 是 Markdown；`bootstrap-retro.md` 是建仓过程的复盘记录，`bootstrap-retro.html` 是它的可视化版本 |

`GLOSSARY.md` 和 `docs/adr/` 由 `/grill-with-docs` 在第一次定下术语或决策时自动生成。

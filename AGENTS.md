# 视频工作室

用 agent 制作讲解视频的工作室仓库：多期视频共用规则、工具、组件和风格，每期一个目录。Remotion 4 + React 19，包管理用 pnpm。文档地图见 `docs/README.md`。

## 角色

| 角色 | 担任者 | 负责 | 角色文档 |
|---|---|---|---|
| 设计负责人 | 和用户对话的 Claude Code | 方向与取舍、台本与镜头剧本、风格与镜头动画、规则文档、spec 与工单、派发与验收 | `docs/roles/design.md` |
| 工程负责人 | Codex，由设计负责人用 `codex-dispatch` 派发 | 能写清要求、能客观验收的执行：工具与管线、组件实现、测试、渲染与混音、素材整理 | `docs/roles/engineering.md` |

开工时你会被告知自己的角色，先读对应的角色文档再动手。角色只认这个告知，和你是哪个模型无关；没被告知时先问用户。仓库里的技能两个角色都看得到，每个角色用哪些技能以角色文档为准。

## 共同规则

- 和用户交流用中文；思考、文件名、目录名、代码标识符用英文。
- 代码文件只在文件头部写一段集中说明（做什么、怎么用、待定事项），正文不写注释。
- 提交只 `git add` 具体文件，用 `git commit -m "<标题>" -m "<正文>" -m "<尾注>" -- <路径…>`，每个 `-m` 是一段。提交信息的格式：

  ```
  <类型>(<范围>): <摘要>

  <正文：为什么改、改了什么、怎么验证的，分条写>

  Refs: #<工单号>
  Role: design | engineering
  ```

  - 类型：`feat` 新功能、`fix` 修复、`docs` 文档、`refactor` 重构、`test` 测试、`build` 依赖与构建、`chore` 杂项。
  - 范围：改动所在的模块，用目录名，如 `kit`、`styles`、`tools`、`workflow`、`roles`、`skills`；每期的改动用期目录名；跨多个模块的整仓改动用 `repo`。
  - 摘要用中文，一行说清结果。正文必写，改错字也写一句。
  - 尾注：最后一段只写 `Refs: #<工单号>`（可以多行；工单由验收关闭，不写 `Closes`）和 `Role`，两项在同一段。用 `-m` 时放进同一个 `-m`，中间是真正的换行，bash 里写 `-m $'Refs: #12\nRole: design'`。`spec/*` 和 `ticket/*` 分支上 `Refs` 必写。尾注只有这两项，不加任何署名尾注（包括 AI 署名和 Co-Authored-By）。
  - 回滚提交也按这个格式写。
  - 格式由 commit-msg 钩子检查（`pnpm install` 时启用，没生效就运行 `node tools/install-hooks.ts`），CI 再查一遍。
- 只做工单范围内的事。新增依赖在汇报里写明理由，优先选发布超过 7 天的版本。
- 媒体（配音、音乐、图片、视频素材、渲染结果）不进 git：素材放 `public/episodes/<期>/`，渲染输出放 `out/`，来源和授权记在该期的 `sources.md`。
- `references/` 是参考资料，只读。
- 调用外部程序时参数用数组传，不拼 shell 字符串。
- 验证命令：`pnpm verify`，步骤见 `tools/verify.ts`。CI 什么时候跑见 `docs/workflow/README.md`「护栏」。

## 目录与归属

| 位置 | 放什么 | 归属 |
|---|---|---|
| `docs/`、`GLOSSARY.md`、`docs/adr/` | 规则、工作流、研究、术语、决策记录 | 设计 |
| `src/styles/` | 风格皮肤：一套设计令牌一个文件夹 | 设计 |
| `src/kit/` | 跨期复用的组件与机制（字幕条、按句定时、镜头、颗粒暗角……） | 工程，按令牌和设计定稿实现 |
| `episodes/index.ts`、`episodes/Root.tsx` | Remotion 入口：注册各期的合成，用 `<Folder>` 分组 | 谁新增合成谁登记 |
| `episodes/<期>/` | 本期说明、台本、镜头剧本、`sources.md`、本期镜头代码 | 设计 |
| `episodes/<期>/data/` | 工具生成的数据（时间轴等） | 工程 |
| `tools/`、测试、`package.json`、构建配置 | 工程脚本：验收（抽帧、对比、响度）与管线（配音、对齐、混音、渲染） | 工程 |

一段代码第一次写时放在所在期的目录；第二期还要用，再提到 `src/kit/`。依赖只从 `episodes/` 指向 `src/`：`src/` 和 `tools/` 不引用 `episodes/`，kit 组件的素材路径由参数传入。

## Agent skills

### Issue tracker

Issues live in this repo's GitHub Issues, managed via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary — the five canonical roles, label string = role name. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: root `GLOSSARY.md` + `docs/adr/`. See `docs/agents/domain.md`.

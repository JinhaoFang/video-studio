# 重建计划：在本仓库复现"设计负责人 + Codex 执行"的视频制作流程

依据：`docs/research/nasa-ep04/`（流程、视觉、镜头表）和 `references/DispatchDock/`。
状态：**方案，待用户确认后实施**。"待定"的事项见第 5 节。

## 1. 目标

不是只做出一条像的视频，而是把**做视频的方法**搭起来：文档分工、派活回路、验收工具、可复用的视觉系统和音频管线。复刻 NASA 那期的一段，只是用来检验这套方法的样片。

## 2. 本机现状（2026-10-11 核实）

| 项目 | 状态 |
|---|---|
| 视频框架 | 本仓库已是 Remotion 4.0.534 + React 19 空项目；`.agents/skills/` 下装了 Remotion 系列技能 |
| 媒体工具 | ffmpeg / ffprobe 可用 |
| GPU | RTX 3090 24GB，驱动 591.86，CUDA 12.6 + cuDNN 9；WSL 里的 `nvidia-smi` 在 `/usr/lib/wsl/lib/`，不在 PATH |
| 语音识别 | faster-whisper large-v3 在 GPU 上实测可用：354 秒音频 46 秒转完，带词级时间戳。可以直接用来做"旁白逐句对齐"。（本次装在会话临时目录里，项目要用时由工程负责人正式装） |
| Codex | `codex-cli 0.161.0` 已装，`~/.codex/auth.json` 存在（登录是否有效未验证） |
| DispatchDock 派发脚本 | Linux + Node 22.23 下空跑（`CODEX_DRY_RUN=1`）正常；官方要求 Node 24、只支持 Windows，真实派发未验证 |
| git | 仓库属主是 root，当前用户是 jh1，普通 `git` 命令报 "dubious ownership"。Codex 要在 git 仓库里提交，**必须先解决**（见第 5 节） |

## 3. 分阶段

### 阶段 0：地基（一次性）

1. **建分工文档**（设计负责人写），照 DispatchDock 自己的仓库做：
   - `AGENTS.md`：项目介绍、技术栈、角色表、共同规则（中文交流、只 `git add` 具体文件、`[设计]` / `[工程]` 提交前缀、验证命令 `npm run lint`、**代码文件不写注释，只在文件头集中说明**——Codex 读不到 `~/.claude/CLAUDE.md`，所以要写进 `AGENTS.md`）、文件归属、文档地图。
   - `docs/roles/design.md`、`docs/roles/engineering.md`（汇报格式照搬 9 项，重点是 TODO(design) 和推断清单）。
   - `docs/design.md`：以 `docs/research/nasa-ep04/style.md` 为起点，写成"已定 / 待定"。
   - `docs/specs/README.md`：任务说明索引。
   - `.gitignore` 加 `.codex-runs/`。
   - 在 `CLAUDE.md` 里只写一行 `@AGENTS.md`。
2. **装派发技能**：把 `codex-dispatch`、`dual-role-workflow` 放进本项目 `.claude/skills/`（只影响本项目，不动全局的 `~/.claude/skills/`）。
3. **真实冒烟测试**：派一个"只回复 OK，不改任何文件"的任务，确认 Codex 能在本仓库跑通、汇报能写回 `.codex-runs/`。会消耗少量 Codex 额度。
4. **第一个工程任务 `001-验收工具`**（派给 Codex）：
   - 按时间点从 Remotion 渲染关键帧、拼带时间码的联系表；
   - 和参考视频同一时间点的帧左右并排对比；
   - 测成片响度（integrated LUFS、真峰值）。
   验收标准：对参考视频和任意一次渲染各跑一遍，产物能直接用 Read 看。

### 阶段 1：风格样片——复刻开场 0:00～0:46

范围是前两章"一个被废过的标志"+"1974 年的提案：蠕虫"（逐镜头见 `docs/research/nasa-ep04/shots.md`，旁白和时间码见 `transcript.md` 前 22 句）。选这段，是因为它覆盖了全片的大部分技术层：实拍照片 + HUD 叠层、撕纸贴条、翻牌年份钟、桌面纸片、字标变形和红色批注、字幕条、逐句配音、低频铺底和提示音。而且每一帧都有参考可以对照。

| 任务 | 谁做 | 产物 | 怎么验收 |
|---|---|---|---|
| 样片镜头表 | 设计 | `docs/specs/` 里的镜头剧本：每个镜头的主体变化、进场点挂在哪句旁白上 | 用户看一遍 |
| 视觉令牌 | 设计 | `docs/design.md` 定稿颜色、字体、字幕条、暗角和颗粒 | 关键帧和参考对比 |
| `002-配音与逐句对齐` | 工程 | 台本行文件 → 每行一个音频 → 实测时长 → 时间轴 JSON；可用 GPU 上的 faster-whisper 做词级校准 | 时间轴和音频时长一致；用户试听 |
| `003-字幕条组件` | 工程 | 按 `docs/design.md` 实现，数据来自时间轴 | 关键帧对比；推断清单 |
| `004-素材搜集` | 工程 | NASA 公有领域照片（images.nasa.gov）+ 出处清单 | 出处逐条可查 |
| 镜头动画代码 | 设计 | `src/` 下的各镜头组件 | 渲染短片 + 关键帧对比 |
| `005-配乐音效合成与混音` | 工程 | 程序合成的低频铺底、翻牌嘀嗒等；混到约 -16 LUFS | 响度报告 + 用户试听 |
| `006-渲染管线` | 工程 | 一条命令出成片（Remotion 渲染 + FFmpeg 合成与响度标准化） | 成片能完整解码；响度达标 |

分工照 dual-role-workflow：要边看边调的镜头动画设计负责人自己写；能写清楚、能客观验收的派给 Codex。

### 阶段 2：完整一期

样片通过后，按 `docs/research/nasa-ep04/pipeline.md` 第 4 节的阶段做完整一期：调研与事实核对 → 台本 → 分镜 → 配音 → 对齐 → 搜图 → 镜头 → 配乐音效混音 → 渲染 → 封面、标题、简介。
可以把 Table-Video SOP 的镜头剧本、动作与声音标记、动态自检、期末复盘补进来（见 `docs/research/table-videosop.md` 第 3 节）。

## 4. 风险与注意

- **版权**：复刻用的游戏截图、品牌图只适合自己学习。要公开发布，换成自己的选题和素材，或者照原作那样标出处、只作评论引用。
- **字体**：Archivo、Geist、Space Mono 用 Google Fonts；思源黑体用 Noto Sans SC 代替。都是 OFL。
- **原片分辨率**：参考只有 852×480，复刻按 1920×1080 / 30fps 做，对比时先把渲染缩到参考尺寸。

## 5. 需要用户决定

1. **git 属主**：二选一——把仓库属主改成 jh1（`sudo chown -R jh1:jh1 /root/project/my-video`），或者加全局例外（`git config --global --add safe.directory /root/project/my-video`）。两个都会改系统或全局配置，需要用户执行或授权。
2. **第一阶段目标**：复刻开场 46 秒（推荐）／新选题直接做完整一期。
3. **工程负责人**：用 Codex（推荐，这正是要学的方法；冒烟测试会用一点额度）／全部由 Claude Code 单独完成。
4. **配音来源**（到 `002` 再定也可以）：MiniMax `speech-2.8-hd` API（和原作一致，需要账号和费用）／MiniMax 网页手动生成后交给工程对齐／其他 TTS。

# noroi-iwai 与 the-last-page：纯代码日式动画的做法

对应工单 #148，父 spec #147。研究对象是同一作者（ChetasLua）的两部纯代码动画短片，版本固定为：

- `ChetasLua/noroi-iwai` [`edd3b89753d8f17353ec17f8738b39a781667c6b`][N]（下文记作 N）
- `ChetasLua/the-last-page` [`c41fef30b607a2498ee325f9549729d9a8e940c0`][L]（下文记作 L）

2026-11-25 读取。两个仓库都没有许可证文件，GitHub API 的 `license` 字段也为空，所以本文只摘要方法、结构和数值，不移植代码，也不转载完整提示词。方括号里的记号链接到固定提交上的源文件。参照片的数字只写在本文，别处引用时链接到这里。

## 1. 两部片子的事实

| | N：呪い / 祝い | L：The Last Page |
|---|---|---|
| 类型 | 日式动画同人片（原作《咒术回战》），有演唱 | 原创吉卜力式短片，主角是一只小红狐，没有人物 |
| 片长与帧数 | 114 秒，2,736 帧，37 个镜头 [N-readme] | 65 秒，1,560 帧，9 个镜头 [L-readme] |
| 画面规格 | 1920×1080，24 帧 | 2048×1152，24 帧；网页上按 1.85:1 显示，上下各裁 22 px [L-contract] |
| 画面代码 | Python：numpy、OpenCV、SciPy、pycairo、numba、Pillow | 同左 |
| 声音代码 | 不依赖第三方包的 Node 脚本（Node 24 以上） | Python（numpy、numba、SciPy） |
| 人声 | 有：声门脉冲加 44 段声管模型合成的演唱 [N-voice-tract] | 没有独唱；配乐里有合成的合唱，只唱元音、没有歌词 [L-inst]、[L-score] |
| 节拍 | 160 BPM，每拍 9 帧，每小节 36 帧；37 个镜头里 32 个是 72 帧（两小节）[N-film] | 镜头时长照简报的分秒表定，多数是 168 帧（7 秒）[L-prompt]、[L-contract] |
| 规模 | 197 个文件，约 4.57 万行 | 69 个文件，约 2.34 万行 |
| 渲染耗时 | 未公开 | 18 核 M5 Pro 上底图缓存好以后约 7 分钟渲完全片 [L-readme] |
| 提交 | 3 次，2026-11-25，尾注都是 `Co-Authored-By: Claude Opus 5.5` | 1 次，2026-11-24，尾注同左；约定和提示词里写的是"Opus 5.6" |
| 没公开的部分 | `.gitignore` 排除了 `docs/`、`ref/`、`.slots/` 和 `tools/` 下的 `ear.py`、`listen.py`、`governor.py`、`whisper_ja.py`、`cmp.py` [N-gitignore] | 公开了提示词 [L-prompt] 和分工约定 [L-contract] |

两部片子都声明"没有图像模型、没有图片文件、没有采样、没有字体"，每个随机种子固定 [N-readme]、[L-readme]。

## 2. 制作怎样组织

L 公开了全过程的输入，N 的约定没有公开，但代码结构与 L 一致，可以互相印证。

**提示词只有三条消息** [L-prompt]：第一条是完整简报加一套五阶段的画面管线说明，末尾带一个 `swarm` 斜杠命令；第二条是中途改模型名、要求不复用旧作；第三条是交付后要求录一版 16:9 全画质视频。简报包括逐镜内容、品质标准（狐狸、纸鸟、线条、上色、背景、光、动画、导演、文字）、声音要求、"绝不能像"清单，并允许执行者修改提示词本身。

**分工约定** [L-contract] 把工作拆成 8 条"线"（lane），每条线负责若干镜头，主线（lead）负责主角。约定里写了：

- **引擎和归属**：列出引擎各文件提供的函数，"先读这些文件"；不是自己的引擎文件不许改，发现 bug 绕开并在汇报里写出来，辅助函数加在自己的文件里。
- **镜头接口**：每个镜头一个模块，类上有 `id`、帧数 `n`、后期参数 `finish`，`setup()` 一次性画底图并缓存，`frame(f)` 返回浮点 RGB（亮处可以超过 1）。后期和胶片光学由驱动统一加，镜头自己不加。
- **时间表**：每个镜头的全片帧区间、本地帧数和负责的线。
- **色彩剧本**：按段落写到色值（夜空、石头、铜绿、唯一的暖光……），并规定阴影永远带颜色，不用灰和黑；不用霓虹、青橙、HDR。
- **外观规则**：背景、赛璐璐、光、运动各一段（见第 3 节）。
- **"绝不能像"清单**：3D 着色、矢量、等宽描边、完美椭圆和直尺线、粒子系统、复制粘贴（没有两本书、两只鸟、两块石头相同）、浑浊颜色、像没画完的空白、合成噪声条纹、HDR 光晕。
- **主角接口**：主角由主线画，各线只拿到一个灰模替身和主角的位置标记；接触阴影、灯笼照在背景上的光由各线按标记自己画。
- **每帧预算**：一帧 CPU 耗时不超过 2.5 秒，目标 1 秒以内；每帧只是帧号的纯函数，帧之间不带状态，可以并行渲染。
- **资源上限**：每条线最多 4 个进程、OpenCV 4 线程；8 条线共用 18 核和 24 GB，缓存用 float16，不常驻大数组；不留后台进程。
- **自查协议**（必做）：见第 5 节。
- **汇报格式**：350 词以内，写清写了哪些文件、主角标记、每帧耗时、强项、还剩的弱点、发现的引擎问题。

N 的结构和这一致：`film.py` 是时间表 [N-film]，`jj/` 是引擎，`chars/` 一个角色一个模块，`shots/` 一个镜头一个模块，文件头的说明里出现"lane"（如 `SUKUNA lane`）[N-sukuna-body]。

## 3. 画面的做法

按动画公司的环节归类。

### 构图

- 以米为单位的 3D 针孔相机（`+X` 右、`+Y` 前、`+Z` 上），平面先在 UV 里画好，再按平面基底算单应性贴进画面；线段先按近平面裁切再投影，避免穿过镜头背后时绕满屏 [L-prompt]、[L-cam]。
- 灭点放在画面宽度的 55%–65%，一侧放重量，另一侧留呼吸 [L-prompt]、[L-contract]。
- 先定一个统一的光源方向，地上的光斑、窗格影子、光柱和投影都按它算，保证互相对齐 [L-prompt]。

### 原画与动画

- **一拍二、一拍三**：画张号用 `f // 2` 或 `f // 3`，相机每帧都动 [L-contract]。L 的特写镜头里，狐狸的画张按两帧换，灯笼火苗和浮尘按三帧换，背景的推镜按帧走 [L-s3]。N 的 37 个镜头里有 26 个用到 `f // 2`、11 个用到 `f // 3`。
- **关键姿势硬停**：L 的时间工具分两种，一种是停在上一个关键姿势的值、不插值，另一种才是缓动插值 [L-comp]。特写镜头里耳朵转动、眨眼都写成"第几张画 → 值"的硬切表；眨眼在闭眼那张停 8 帧 [L-s3]。
- **眼动**：N 的眼睛扫视在两帧内跳到新位置，然后完全静止 [N-a2]。
- **画张抖动跟着姿势走**：同一个姿势保持时沿用同一张画的抖动种子，换姿势才换一张画 [L-foxact]；控制点抖动 0.3–0.8 px [L-contract]。
- **拖影**：最快的帧画成拉长的形状加干笔速度线 [L-contract]；N 有专门的拖影模块，画肢体扫过的弧线、残影和整个人的速度尾 [N-fig-smear]。
- **预备、跟随**：约定要求有预备动作和跟随动作，草、常春藤、纸张按画出来的曲线弯曲 [L-contract]。

### 角色构造

- N 的头部在正面坐标里画一次，然后按任意偏航、俯仰、滚转投影，轮廓来自头部网格 [N-head3]。全身角色由 3D 骨架摆姿势，用距离场捏出体块，再"重画"成手绘线条和赛璐璐色块，体块本身不上屏 [N-figure]、[N-fig-sdf]。手也是同样做法 [N-hands]。
- L 的狐狸分成四分之三侧头、侧面、坐姿身体、爪、尾巴几个模块，表演单独放一个模块，由主线负责 [L-readme]。

### 上色与线条

- 赛璐璐：平涂加**一层**硬边阴影，可以有轮廓光，角色上不用柔和渐变 [L-contract]。
- 线条：按 2 倍尺寸在 pycairo 上画再缩小；暖色深线，1.6–3.2 px，有压感，两端收尖，像抬笔那样断开 [L-contract]、[L-ink]。
- 重复的自然物（叶、枝、电线、瓦片）每个实例用自己种子的曲线生成，不平移复制同一个形状 [L-prompt]。

### 美术（底图）

- 一切的单位是笔触：弯曲、带刷毛、收尖的平头笔，按到折线的距离栅格化，"不用模糊来掩盖形体" [N-paint]。
- 先定大块明暗（眯眼看有 3–5 块），再逐个处理物件，每本书、每块石头、每团叶子各有自己的颜色；笔触顺着形体走，不用一张全局纹理滤镜；留出安静的区域，不用同样大小的笔触铺满画面 [L-contract]。
- 平涂区域可以用多尺度的斑驳噪声、低分辨率的扁笔点、纸纹和深阴影里的暖色反光打破；不要在填色上用细长的行列噪声，1:1 放大会看出条纹 [L-prompt]。
- N 的草坡底图让每一笔"记住自己从哪里取色"，每帧把一张小的颜色引导图（明暗、云影、阵风、接触阴影）通过这些笔触重新读一遍，光变了而笔触一笔不动 [N-grass]。

### 摄影（后期）

两部片子都在最后统一加后期，镜头只给参数。N 的 `jj/comp.py` 里有两个同名的 `finish`，Python 里后定义的覆盖前面的，所以 N 实际用的是电视动画版 [N-comp]：

- **35mm 胶片**（L 用这一套 [L-comp]；N 的文件里也有，但被覆盖）：高光光晕（亮度阈值 0.72，三档模糊半径 6.5/24/72 px）→ 四角色差和片门抖动 → 暗角 → 抬黑位加 `tanh` 高光肩（拐点 0.80，上限 0.965）→ 按亮度加颗粒（暗部颗粒多、亮部干净）→ 极轻的磁带色度柔化和隔行调制。
- **电视动画**（N 实际使用）：柔焦（亮区向邻域漫出）→ 阈值泛光 → 四角色差 → 暗角 → 可选的分区调色和饱和度 → 抬黑位 → 高光肩（拐点 0.84，上限 0.985）→ 按亮度加颗粒。每个镜头只改几个参数，例如泛光强度、暗角、颗粒、调色 [N-a2]、[N-b1]。

### 底图缓存与渲染

- `setup()` 画好的底图存成 float16 `.npy`，文件名带版本号；先写临时文件再原子替换，读取时用内存映射，只在用到的那帧转成 float32 [N-a2]、[N-gojo-cache]、[L-contract]。
- 镜头渲染成近无损的 `mkv`，源文件比渲染结果新时才重渲 [N-tools-film]。

## 4. 声音的做法

### 画面事件到音效（N）

1. 每个镜头在 `EVENTS` 里声明画面事件：本地帧号、种类、参数（大小、声像、一句说明，例如"四个瞳孔在两帧内锁定镜头"）[N-a2]。37 个镜头都有这一项。
2. `tools/events.py` 读取所有镜头的 `EVENTS`，加上镜头起点，写成全片事件表；某个镜头正在改、读不出来时，沿用上一次读到的事件 [N-events]。
3. `audio/event_map.mjs` 把每种画面事件映射成一组音效（偏移帧、音效名、参数）；映射为空表示**故意不出声** [N-event-map]。
4. 每个音效渲染时返回 `sync`，即从第一个采样到"必须落在画面那一帧"的时刻的秒数 [N-sfx-lib]，也就是本仓库术语里的对齐点。
5. 混音器按事件表放音效；还没有镜头模块的段落用手写的草稿提示表 [N-mix]、[N-cues]。

### 电平与混音（N）

- DSP 全部 48 kHz 双精度。内部规矩："噪声一律限带、不做饱和、8 kHz 以上的能量收着" [N-sfx-dsp]。
- 每个音效的参考电平是"最响的 100 ms 为 −18 LUFS，峰值不超过 −1.5 dBFS"，再按电平表摆到片中位置：0 dB 是大撞击，拟音在 −10 到 −22，空气声在 −20 到 −34 [N-sfx-lib]、[N-sfx-levels]。
- 混音器测量每个音效在音乐里"冒出来多少"（最响的 43 ms 内第二强的 Bark 频带高出音乐多少 dB），按撞击、拟音、主角音效三类要求不同的冒出量；大响动处给配乐压低（ducking），人声只压同样幅度的 18% [N-mix]。
- 每个场景一个合成的房间脉冲响应：早期反射按场景几何手工摆放，加上分频段的扩散尾音，例如开场漆黑的虚空 T60 4.2 秒、木头小房间里的书桌 0.38 秒 [N-rooms]。
- 有一个音效测量脚本，给每个音效算感知频谱质心、衰减、频带分布、起音、音调性、起音次数，列出最相近的几对和刺耳的音效 [N-sfx-measure]。

### 配乐（L）

- 一个八音动机，最后一个音只有在墨水碰到纸页时才落到主音上；调性从 D 小调独奏毡锤钢琴，到 D 大调日出，再到 F 大调飞翔，最后结束在一个 F 上 [L-score]。
- 乐器按物理描述合成：钢琴有音板和共鸣弦的脉冲响应，弦乐声部由多名独立的演奏者组成（各自有音高漂移、揉弦、弓压和弓噪），另有铜管、合唱、竖琴、钟琴、定音鼓、大鼓、镲 [L-inst]。
- 每件乐器在一个合成的录音棚里有座位坐标，早期反射按座位算；片中另有阅览厅、塔、天空、小钢琴房几个房间 [L-rooms]。
- 音效从发声机制出发：颗粒、拍翼、粘滑摩擦、刷毛、敲击木头和铜、流动的空气；毛笔声读取画面里线条的笔尖速度和压力数据 [L-sfx]、[L-scenes]。
- 混音分几个段落，每段配乐和音效各有电平；静默段用窗口精确切出；再加两条推子曲线；按 −15.5 LUFS 调整总增益（最多 ±1.5 dB），限幅器上限 −1.4 dB [L-build]。

### 声音自查（L）

`audio/qa.py` 把 33 个听点和画面事件的时刻列成表，在指定频带里找实际起音，偏差超过 **1 帧**就标出；另外查爆音、静默段电平、首尾电平、各段立体声相关度和左右平衡；`audio/check.py` 出频谱图、逐秒电平、响度和起音表 [L-audio-qa]、[L-audio-check]。

## 5. 自查与验收工具

**L 的自查协议** [L-contract]：

1. 先编译检查，然后用读图工具看自己的帧：至少 6 个不同的帧，每帧看全帧和至少 3 处 600×450 的 1:1 裁切。
2. 照实写下"最不像吉卜力剧场版静帧的三处"并改掉，至少 4 轮；每轮眯眼看是否有 3–5 块清楚的明暗。
3. 用连续帧条看运动（例如第 60、62、64、66、68、70 帧），不只看静帧。
4. 一臂远看能当电影截图时停，或者大约 8 轮时停。
5. 检查图用 JPEG，每条线最多约 60 张，旧的删掉。

**工具**：

| 用途 | N | L |
|---|---|---|
| 静帧加 1:1 裁切（默认 600×450） | `tools/still.py`，另有联系表和连续帧条 [N-still] | `tools/still.py` [L-still] |
| 看运动 | `tools/strips.sh`：每个镜头隔帧取 36 张排成 6×6 [N-strips] | 连续帧联系表 |
| 找跳帧、闪帧、死帧 | `tools/pops.py`：非剪辑点的单帧闪烁、14 帧以上的冻结、近黑近白帧 [N-pops] | `tools/diffs.py`：逐镜帧差排行 [L-diffs] |
| 跨镜头看 | `tools/look.py` 联系表 | `tools/look.py` [L-look] |
| 角色和部件设定页 | 手、角色、文字、全身角色各有设定页脚本，例如 `tools/hands_sheet.py`、`nt_sheet.py`、`ink_sheet.py`、`fig_demo.py` | — |
| 成品播放测试 | — | `tools/playtest.mjs`：无头 Chrome 打开网页、点播放、截图、检查报错 [L-playtest] |

## 6. 与本仓库的对照

| | 已经有的 | 缺的 | 要靠小样实测的 |
|---|---|---|---|
| 宿主与渲染 | Remotion 4，验收工具、时间轴、verify 都是 TypeScript（ADR 0002） | Canvas 2D 加 WebGL 的画面管线、底图烘焙 | WSL 无头 Chrome 的 WebGL 能否用 GPU，1080p 每帧耗时（#149） |
| 术语 | `GLOSSARY.md` 已有纯代码、底图、一拍二、画面事件、对齐点 | — | — |
| 时间 | 按台本句子编号定时 | 没有旁白时的锚点 | 镜头起点加画面事件能否覆盖全部定时（#151） |
| 分工约定 | 角色文档、工单模板、`工作类型` 词表 | 引擎归属、镜头接口、色彩剧本、"绝不能像"清单、每帧预算、资源上限 | 约定能否让两个模型画出像同一部片子的镜头（#155、#156） |
| 自查 | `pnpm qa frames`、`sheet`、`compare`、`loudness` | 1:1 裁切、按帧取的连续帧条（#150）；执行者的自查回路 | 自查要求能否让派出去的执行者真的看图并改到位（#155、#156） |
| 跳帧检查 | 设计负责人验收时看密集帧 | 类似 `pops.py` 的自动帧差报告 | — |
| 声音 | 响度验收（−16 LUFS，真峰值 −1 dBTP）；配音与配乐来自服务或素材库 | 纯代码合成的乐器、音效库、事件驱动的混音器、场景混响 | 纯代码钢琴和弦乐的音质（#158） |
| 素材来源 | `sources.md` 记录外部来源和授权 | 记录"每个生成物由哪条命令生成"的写法；纯代码护栏 | 护栏能否机械判断（#149） |

## 7. 待小样验证的假设

每条写明在本 spec 里由哪张工单、用哪种验收产物检验。小样看完后由 `/retro` 逐条判断哪些成立、哪些进工作室层。

2026-11-26 复盘补上了最后一列：成立 15 条，部分成立 7 条，不成立 2 条，没验证 1 条。这些结论只写在这里，别处引用时链接过来。部分成立和不成立的几条有个共同点：问题都出在交接处，比如镜头 1 和镜头 2 之间、乐谱和混音之间；写下的约定和清单能用来验收，保证不了执行者照做。

### 理念

| # | 假设 | 检验方法 | 工单 | 结论（2026-11-26 复盘） |
|---|---|---|---|---|
| 理-1 | 质量来自制作方法（分工约定、先出设定、强制自查、声音跟着画面事件），不来自渲染语言；同样的方法在 Remotion 里能做到 | 镜头 1 的关键帧和 1:1 裁切，与参照片静帧的观感对照；用户看小样的判断 | #153、#159 | 成立（初步）：在 Remotion 里用 Canvas 2D 加 WebGL 做出了赛璐璐角色、水粉底图和摄影后期，用户看片选了 A；和参照片静帧的正式对照没做（#153、#157） |
| 理-2 | 先写"绝不能像"清单，比只写正面要求更能让执行者避开网页动画感 | 镜头 2 两份产出逐条对照清单的自查记录；验收时按清单找违规 | #155、#156、#157 | 部分成立：清单是好用的验收尺子，B 版的青橙色块和均匀光斑都是按清单定位的；但挡不住违规，B 的执行者自查时看见了光斑，没改（#156、#157） |
| 理-3 | 纯代码约束让成片可复现、`sources.md` 天然干净 | 纯代码护栏通过；`sources.md` 每项都有生成命令；抽帧渲两次像素一致 | #149、#159 | 成立：纯代码护栏进了 verify，三轮审查补漏后证明不了来源就拒绝；生成清单记哈希；同一帧渲两次 RGBA 逐字节相同（#149、#159、#160、#161、#163） |

### 方法

| # | 假设 | 检验方法 | 工单 | 结论（2026-11-26 复盘） |
|---|---|---|---|---|
| 法-1 | 统一的镜头接口（编号和时长、后期参数、画面事件、按帧出画面）让渲染、事件汇总、出静帧的工具对每个镜头都通用 | 占位镜头和两个正式镜头都只经过同一套工具渲染和汇总事件，不为某个镜头写特例 | #149、#153、#159 | 成立：占位镜头、镜头 1、镜头 2 的 A/B 两版都只经过同一套渲染、事件汇总和预览工具（#159） |
| 法-2 | 后期由驱动统一加、镜头只给参数，镜头之间的画面质感一致 | 两个镜头交接处的密集帧和并排对比 | #159 | 成立：A、B 共用默认后期加镜头覆盖，交接处质感一致；B 的色彩跳变来自背景画法，不是后期（#157） |
| 法-3 | 先由设计负责人亲手做出引擎、设定和对标镜头，再把同类镜头派出去，派出去的产出能对上定稿 | 镜头 2 与镜头 1 的并排对比；设定里主角多角度一致 | #152、#153、#155、#156 | 部分成立：引擎和设定先做了，但镜头 2 在镜头 1 定稿前派出，两版对标的是镜头 1 第 2 轮的中间渲染。A 用同一套底图，颜色接得上；B 自己画背景，颜色跳了；交接时主体位置都没约束，A 从约 62% 跳到约 38%（#155、#156、#157） |
| 法-4 | 画面事件由镜头声明、汇总成全片事件表，音效按对齐点落位，能做到声画同帧 | 事件表单元测试；成片里抽查所有画面事件，偏差不超过 1 帧（参照 L 的口径） | #149、#158、#159 | 成立：音效落位采样误差 0（A 19 次、B 22 次）。收尾审查发现 A、B 各有画面事件比实际画面晚 1–9 帧，事件帧要和动画用同一份时间数据（#147 收尾审查、#159） |
| 法-5 | 强制自查（至少 4 轮、每轮 6 帧加 3 处 1:1 裁切、连续帧条、写下最差三处）能让执行者自己把画面改到能交付 | 汇报里每轮的具体画面观察；验收时还剩几处要返工 | #153、#155、#156 | 部分成立：两个执行者各自查 5 轮，观察具体到画面位置，自报的弱点和设计负责人发现的重合（A 的锯齿翅膀，B 的半透明叠影和光斑）；但发现了不一定改到位，设计负责人验收省不了（#155、#156） |
| 法-6 | 色彩剧本写到色值、规定阴影带颜色，能让不同执行者的镜头颜色连贯 | 两个镜头并排时的色相、明暗对照；阴影区域取色 | #151、#155、#156、#159 | 部分成立：A 守住了色彩剧本，B 用了色彩剧本明确排除的青橙对比；色彩剧本是验收依据，保证不了执行者照做（#157） |
| 法-7 | 底图先烘焙、镜头只读烘焙结果，能把每帧耗时压进预算 | 带缓存与不带缓存时每帧耗时的实测 | #149、#152 | 成立：镜头 1 单帧作画加后期 1.03–1.22 秒（`--gl=swangle`），预算 4 秒、目标 2 秒（#153） |
| 法-8 | 声音的量化自查（起音偏差、频谱、各轨电平、响度）能在用户试听前挡住明显问题 | 量化验收报告；用户试听时提出的问题里有几条量化报告没发现 | #158、#159 | 不成立：音高、电平、落位、响度全部通过，用户两次看片都听出 7–9 秒声音断了；当时的测试断言静默区间等于零，把错的设计判成合格。量化只能证明做到了设计写的（#157，`docs/video/sound.md`「静默与环境底噪」） |

### 细节

| # | 假设 | 检验方法 | 工单 | 结论（2026-11-26 复盘） |
|---|---|---|---|---|
| 细-1 | 一拍二、一拍三加关键姿势硬停、相机每帧动，比平滑插值更像手绘动画 | 动作区间按帧取的连续帧条，看画张是否成对重复、关键姿势是否停住 | #153、#155、#156 | 成立：连续帧条里画张成对重复、关键姿势停住、最快的帧一拍一，相机整段在推（#153、#155） |
| 细-2 | 同一姿势沿用同一张画的抖动、换姿势才换画，比每帧都抖更稳 | 静止区间的连续帧条，看线条是否闪烁 | #152、#153 | 成立：静止区间的连续帧条里线条不闪（#153） |
| 细-3 | 2 倍尺寸画线再缩小、有压感、两端收尖、断笔，1:1 看像手绘线 | 设定和镜头的 1:1 裁切 | #152 | 成立：设定和镜头的 1:1 裁切里线条有粗细、两端收尖（#152、#153） |
| 细-4 | 赛璐璐只用平涂加一层硬边阴影，角色上不用渐变，就能和水粉底图分开又统一 | 静帧和设定的 1:1 裁切；"绝不能像"清单自查 | #152 | 成立：设定和镜头的 1:1 裁切（#152、#153） |
| 细-5 | 底图笔触顺着形体、先定 3–5 块大明暗、留安静区域，比全局纹理滤镜更像水粉 | 静帧眯眼看明暗；底图 1:1 裁切 | #152 | 部分成立：树篱、稻田读得出笔触；云的受光仍是一道道笔触，夕光偏灰紫，镜头 1 自查 6 轮后仍列为弱点（#153） |
| 细-6 | 后期按固定顺序（柔焦 → 高光光晕 → 四角色差 → 暗角 → 抬黑位压高光 → 按亮度加颗粒）用 WebGL 着色器实现，效果能达到参照片的胶片质感 | 后期开关前后的同帧对比和 1:1 裁切 | #149、#152 | 成立：WebGL 1 后期链按固定顺序实现，镜头只给参数（#152） |
| 细-7 | 拖影只放在最快的帧上，能表达速度又不显得乱 | 最快动作区间按帧取的连续帧条 | #153、#155、#156 | 部分成立：A 的起飞是张翅加干笔速度线；B 用了几层半透明身体叠影，1:1 认不出形状。约定写了画法，执行者不一定照做（#157） |
| 细-8 | 故意不出声的地方要写明，混音器才不会补上声音 | 声音设计说明里的静默清单，与成片里对应时段的电平 | #154、#158 | 不成立，方向要改：静默写明了，第一版却做成配乐在静默开始那一帧硬切，第二版做成整条总线静音。做对的办法是乐谱不出新音、底噪一直在（#157，`docs/video/sound.md`「静默与环境底噪」） |
| 细-9 | 每个场景一个混响，比全片一个混响更有空间感 | 用户试听 | #154、#158 | 没验证：没有专门试听混响 |

### 经验

| # | 假设 | 检验方法 | 工单 | 结论（2026-11-26 复盘） |
|---|---|---|---|---|
| 验-1 | 每帧是帧号的纯函数、所有随机固定种子，就能并行渲染并保证同一帧像素一致 | 同一帧渲两次逐像素比较 | #149、#159 | 成立（#149、#159） |
| 验-2 | 给每帧耗时定预算、给并行定线程和内存上限，本机（24 线程、19 GB）能同时跑两个画镜头的执行者而不卡死 | 两份镜头 2 并行期间的资源占用和每帧耗时 | #151、#155、#156 | 成立：两个画镜头的执行者同时在跑，都跑完了，没有资源故障（#155、#156） |
| 验-3 | 检查图有数量上限、旧的删掉，能避免执行者的上下文和磁盘被检查图塞满 | 两份镜头 2 的 worktree 里检查图数量；派发记录的 token 用量 | #155、#156 | 部分成立：检查图都在上限内，但 B（pi）的派发日志有 770 MB，输入 8510 万 token，是 A 的 7 倍；日志为什么这么大还没查（#156、#157） |
| 验-4 | 汇报里写出还剩的弱点和具体画面观察，验收时能直接定位问题 | 验收时汇报列出的弱点和设计负责人自己发现的问题的重合度 | #155、#156、#157 | 成立：见法-5（#155、#156、#157） |
| 验-5 | 只有一个镜头的对比也能分出两个模型的审美高下 | 盲评结果和理由；差距不明显时记下，正片再加一组对比 | #157 | 成立，只有一个样本：设计负责人和用户都判 A 更好；A 用时 43.5 分钟、输入 1197 万 token，B 用时 135 分钟、输入 8510 万。用户选 A，用户本机的个人席位据此把「动画」配给 agy / gemini-4-neon-high / high。只比了一个镜头，前端和审查没比（#157） |

## 8. 与 `docs/video/` 的冲突

下列说法和参照片的事实冲突，留给 `/retro` 处理，本工单不改原文。2026-11-26 复盘已按本表改了 `docs/video/visual-style.md` 和 `docs/video/sound.md`，前四行另有本仓库小样作证据（角色表演和水粉底图都由代码画出）。

| 位置 | 原文说法（摘要） | 冲突的事实 |
|---|---|---|
| `docs/video/visual-style.md`「日式动画（二维人物与绘画背景）」的素材来源 | 原创人物分层、表情与背景要由用户提供或素材库授权；代码只能做取景、遮挡和简单局部运动，复杂表演仍缺原画 | N、L 的人物原画、表情和绘画背景全部由代码画出：N 的头部在任意角度下由同一份正面设计投影 [N-head3]，全身角色由 3D 骨架摆姿势后重画成线条和色块 [N-figure]；L 的狐狸有转耳、嗅、眨眼的表演 [L-s3] |
| 同一条的「适合」 | 没有角色原画和场景美术时，长篇人物表演的准备成本高 | 参照片没有任何原画素材，114 秒、37 个镜头的人物表演都由代码完成 [N-readme]；成本表现为代码量，不是外部原画 |
| `docs/video/visual-style.md`「美式动画（夸张角色表演）」的素材来源 | 代码只能做简单分层角色与关节点动画；复杂人物表演需要用户提供的逐帧原画或预渲染视频 | 同上；N 还有跑、出拳、拖影、衣服的全身动作 [N-readme]、[N-figure]、[N-fig-smear] |
| `docs/video/visual-style.md`「手绘／插画」的素材来源 | 复杂逐帧表演需要额外原画 | 同上 |
| `docs/video/visual-style.md`「中式动画（以水墨为例）」的关键技法 | 持续变化的笔锋、渗化需要专门绘制的原画或预渲染素材；代码只能做有限的墨迹揭示 | N 的毛笔由几千根刷毛组成，沿设计好的路径拖动，汉字按笔顺一笔笔写出 [N-sumi]、[N-letters]；L 的毛笔字和印章也由代码书写 [L-readme] |
| `docs/video/visual-style.md`「扁平矢量动画」的关键技法 | 回弹缓动用 `cubic-bezier(0.34, 1.56, 0.64, 1)`；人物四肢绕关节点旋转，用父子层级带动 | 这两条在扁平矢量条目里成立；但 L 的"绝不能像"清单把"平滑的软件缓动"和"木偶式的关节旋转"列为日式动画要避开的网页动画感 [L-prompt]。冲突在于适用范围：条目没有写明这些技法不适用于手绘动画 |
| `docs/video/sound.md` 全篇 | 声音来源只列了配音服务和素材库 | 不是冲突，是缺项：参照片的配乐、音效（N 还有演唱）都由代码合成 [N-readme]、[L-inst] |

## 出处

[N]: https://github.com/ChetasLua/noroi-iwai/tree/edd3b89753d8f17353ec17f8738b39a781667c6b
[N-readme]: https://github.com/ChetasLua/noroi-iwai/blob/edd3b89753d8f17353ec17f8738b39a781667c6b/README.md
[N-gitignore]: https://github.com/ChetasLua/noroi-iwai/blob/edd3b89753d8f17353ec17f8738b39a781667c6b/.gitignore
[N-film]: https://github.com/ChetasLua/noroi-iwai/blob/edd3b89753d8f17353ec17f8738b39a781667c6b/film.py
[N-a2]: https://github.com/ChetasLua/noroi-iwai/blob/edd3b89753d8f17353ec17f8738b39a781667c6b/shots/a2.py
[N-b1]: https://github.com/ChetasLua/noroi-iwai/blob/edd3b89753d8f17353ec17f8738b39a781667c6b/shots/b1.py
[N-paint]: https://github.com/ChetasLua/noroi-iwai/blob/edd3b89753d8f17353ec17f8738b39a781667c6b/jj/paint.py
[N-grass]: https://github.com/ChetasLua/noroi-iwai/blob/edd3b89753d8f17353ec17f8738b39a781667c6b/jj/grass.py
[N-comp]: https://github.com/ChetasLua/noroi-iwai/blob/edd3b89753d8f17353ec17f8738b39a781667c6b/jj/comp.py
[N-head3]: https://github.com/ChetasLua/noroi-iwai/blob/edd3b89753d8f17353ec17f8738b39a781667c6b/jj/head3.py
[N-figure]: https://github.com/ChetasLua/noroi-iwai/blob/edd3b89753d8f17353ec17f8738b39a781667c6b/jj/figure.py
[N-fig-sdf]: https://github.com/ChetasLua/noroi-iwai/blob/edd3b89753d8f17353ec17f8738b39a781667c6b/jj/fig_sdf.py
[N-fig-smear]: https://github.com/ChetasLua/noroi-iwai/blob/edd3b89753d8f17353ec17f8738b39a781667c6b/jj/fig_smear.py
[N-hands]: https://github.com/ChetasLua/noroi-iwai/blob/edd3b89753d8f17353ec17f8738b39a781667c6b/jj/hands.py
[N-sumi]: https://github.com/ChetasLua/noroi-iwai/blob/edd3b89753d8f17353ec17f8738b39a781667c6b/jj/sumi.py
[N-letters]: https://github.com/ChetasLua/noroi-iwai/blob/edd3b89753d8f17353ec17f8738b39a781667c6b/jj/letters.py
[N-gojo-cache]: https://github.com/ChetasLua/noroi-iwai/blob/edd3b89753d8f17353ec17f8738b39a781667c6b/chars/gojo_cache.py
[N-sukuna-body]: https://github.com/ChetasLua/noroi-iwai/blob/edd3b89753d8f17353ec17f8738b39a781667c6b/chars/sukuna_body.py
[N-tools-film]: https://github.com/ChetasLua/noroi-iwai/blob/edd3b89753d8f17353ec17f8738b39a781667c6b/tools/film.py
[N-events]: https://github.com/ChetasLua/noroi-iwai/blob/edd3b89753d8f17353ec17f8738b39a781667c6b/tools/events.py
[N-still]: https://github.com/ChetasLua/noroi-iwai/blob/edd3b89753d8f17353ec17f8738b39a781667c6b/tools/still.py
[N-strips]: https://github.com/ChetasLua/noroi-iwai/blob/edd3b89753d8f17353ec17f8738b39a781667c6b/tools/strips.sh
[N-pops]: https://github.com/ChetasLua/noroi-iwai/blob/edd3b89753d8f17353ec17f8738b39a781667c6b/tools/pops.py
[N-event-map]: https://github.com/ChetasLua/noroi-iwai/blob/edd3b89753d8f17353ec17f8738b39a781667c6b/audio/event_map.mjs
[N-cues]: https://github.com/ChetasLua/noroi-iwai/blob/edd3b89753d8f17353ec17f8738b39a781667c6b/audio/cues.mjs
[N-mix]: https://github.com/ChetasLua/noroi-iwai/blob/edd3b89753d8f17353ec17f8738b39a781667c6b/audio/mix.mjs
[N-rooms]: https://github.com/ChetasLua/noroi-iwai/blob/edd3b89753d8f17353ec17f8738b39a781667c6b/audio/rooms.mjs
[N-sfx-dsp]: https://github.com/ChetasLua/noroi-iwai/blob/edd3b89753d8f17353ec17f8738b39a781667c6b/audio/sfx_dsp.mjs
[N-sfx-lib]: https://github.com/ChetasLua/noroi-iwai/blob/edd3b89753d8f17353ec17f8738b39a781667c6b/audio/sfx_lib.mjs
[N-sfx-levels]: https://github.com/ChetasLua/noroi-iwai/blob/edd3b89753d8f17353ec17f8738b39a781667c6b/audio/sfx_levels.mjs
[N-sfx-measure]: https://github.com/ChetasLua/noroi-iwai/blob/edd3b89753d8f17353ec17f8738b39a781667c6b/audio/sfx_measure.mjs
[N-voice-tract]: https://github.com/ChetasLua/noroi-iwai/blob/edd3b89753d8f17353ec17f8738b39a781667c6b/audio/voice_tract.mjs
[L]: https://github.com/ChetasLua/the-last-page/tree/c41fef30b607a2498ee325f9549729d9a8e940c0
[L-readme]: https://github.com/ChetasLua/the-last-page/blob/c41fef30b607a2498ee325f9549729d9a8e940c0/README.md
[L-prompt]: https://github.com/ChetasLua/the-last-page/blob/c41fef30b607a2498ee325f9549729d9a8e940c0/PROMPT.md
[L-contract]: https://github.com/ChetasLua/the-last-page/blob/c41fef30b607a2498ee325f9549729d9a8e940c0/docs/CONTRACT.md
[L-cam]: https://github.com/ChetasLua/the-last-page/blob/c41fef30b607a2498ee325f9549729d9a8e940c0/lp/cam.py
[L-ink]: https://github.com/ChetasLua/the-last-page/blob/c41fef30b607a2498ee325f9549729d9a8e940c0/lp/ink.py
[L-comp]: https://github.com/ChetasLua/the-last-page/blob/c41fef30b607a2498ee325f9549729d9a8e940c0/lp/comp.py
[L-foxact]: https://github.com/ChetasLua/the-last-page/blob/c41fef30b607a2498ee325f9549729d9a8e940c0/lp/foxact.py
[L-s3]: https://github.com/ChetasLua/the-last-page/blob/c41fef30b607a2498ee325f9549729d9a8e940c0/shots/s3.py
[L-still]: https://github.com/ChetasLua/the-last-page/blob/c41fef30b607a2498ee325f9549729d9a8e940c0/tools/still.py
[L-look]: https://github.com/ChetasLua/the-last-page/blob/c41fef30b607a2498ee325f9549729d9a8e940c0/tools/look.py
[L-diffs]: https://github.com/ChetasLua/the-last-page/blob/c41fef30b607a2498ee325f9549729d9a8e940c0/tools/diffs.py
[L-playtest]: https://github.com/ChetasLua/the-last-page/blob/c41fef30b607a2498ee325f9549729d9a8e940c0/tools/playtest.mjs
[L-score]: https://github.com/ChetasLua/the-last-page/blob/c41fef30b607a2498ee325f9549729d9a8e940c0/audio/score.py
[L-inst]: https://github.com/ChetasLua/the-last-page/blob/c41fef30b607a2498ee325f9549729d9a8e940c0/audio/inst.py
[L-rooms]: https://github.com/ChetasLua/the-last-page/blob/c41fef30b607a2498ee325f9549729d9a8e940c0/audio/rooms.py
[L-sfx]: https://github.com/ChetasLua/the-last-page/blob/c41fef30b607a2498ee325f9549729d9a8e940c0/audio/sfx.py
[L-scenes]: https://github.com/ChetasLua/the-last-page/blob/c41fef30b607a2498ee325f9549729d9a8e940c0/audio/scenes.py
[L-build]: https://github.com/ChetasLua/the-last-page/blob/c41fef30b607a2498ee325f9549729d9a8e940c0/audio/build.py
[L-audio-qa]: https://github.com/ChetasLua/the-last-page/blob/c41fef30b607a2498ee325f9549729d9a8e940c0/audio/qa.py
[L-audio-check]: https://github.com/ChetasLua/the-last-page/blob/c41fef30b607a2498ee325f9549729d9a8e940c0/audio/check.py

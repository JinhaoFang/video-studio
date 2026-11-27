# 纯代码动画正片《雨后》（`after-rain`）

spec #168：纯代码小样《雨后》（[pure-code-sample](../pure-code-sample/README.md)）的完整版。12 个镜头，65 秒，1920×1080，24 帧；画面、配乐、音效、人声全部由本仓库的代码算出来（`GLOSSARY.md`「纯代码」）。

| 文档 | 内容 |
|---|---|
| [镜头剧本](storyboard.md) | 节拍表、12 个镜头、镜头内的锚点、时间表、切点表、编剧自查 |
| [场景平面与机位图](layout.md)、[俯视图](layout.svg) | 院子和稻田的平面布局，光、风、雨，两条动作轴线，每个镜头的机位 |
| [美术](art.md)、[缩略条](color-script.svg)、[色样](color-keys.svg) | 色彩剧本（四种光、光在画面上的方向、每个镜头的大色块、各场后期参数）、按光照分的色指定、设定清单、美术的「绝不能像」 |
| [动作规则](motion.md) | 节奏与换拍、鸟怎么动（挪脚、起飞、按景别简化的振翅、波浪式飞行、降落、抖羽）、起飞失败的喜剧时机、人的腿脚表演、特效动画、麻雀三种状态的衔接、动作的「绝不能像」 |
| [主旋律与声音设计](sound-design.md)、[乐谱](score.json) | 主旋律怎么从小样动机长出来、配乐在哪里出、声音分层、背景人声、麻雀叫声、静默、接法上的声音、混音目标；乐谱数据沿用小样格式 |
| [本期约定](contract.md) | 写代码的人都照着做：时间表、模块和镜头目录的归属、镜头接口、画面事件种类、外观和动作规则的出处、每帧预算和资源上限、自查与汇报 |

## 决定

按剧组的部门分组（`docs/workflow/README.md`「一期视频」），每项一行结论、一句理由。依据都在 spec #168，下表只写结论；制作中才定下的项随时补上。

### 导演、制片

| 项 | 结论 | 理由 |
|---|---|---|
| ① 目的与受众 | 第一部能发布的原创纯代码动画短片，给喜欢日式动画短片的观众看；同时检验剧组底座在一部完整片子上好不好用 | 用户的目标是一部能发布到自己账号的作品 |
| ② 渠道与规格 | B 站和 YouTube 共用一个母版：16:9，1920×1080，24 帧，65 秒（#186 后从 67.5 秒缩短）；第一秒就是雨。不做竖屏 | 两个平台都接受横屏母版；时长落在 60–90 秒，开头靠雨声和雨抓人 |
| ③ 类型与基调 | 叙事短片；安静、温暖，抒情里带一点幽默 | 沿用用户已认可的小样基调 |
| ⑬ 封面、多版本、授权 | 封面用第 8 镜晒太阳的画面加片名和印章；"画面与声音全部由代码生成"写进视频简介，不进片尾；不做多语言和字幕 | 第 8 镜是全片最暖、最有余韵的一格；B 站封面规格在交付时核实（#194） |
| 范围 | 12 个镜头；角色是麻雀、远处的鸟群、只露腰以下的人；场景是同一个院子的几个机位加稻田上空 | 小样的麻雀和院子直接用上，钱花在新镜头上 |
| 分工 | 纸面决定由设计负责人写；设定、底图、全片装配、片名与署名、镜头都派「动画」档；镜头按段派五张，一段里的切点由同一个执行者做 | 主会话的 token 花在决定和验收上（ADR 0003）；减少交接处出错 |
| 用户参与 | 选故事（已在 grill 完成）、看预演和试听样（#186）、看成片（#195） | 其余由设计负责人按行业做法定 |
| 预算 | 粗估 agent 活跃 40–55 小时、日历 3–5 天；实际时间和 token 写进汇报 | 用户要用它估算以后的片子 |

### 编剧

| 项 | 结论 | 理由 |
|---|---|---|
| ④ 梗概 | 被雷雨和同伴冲散的小麻雀羽毛湿透，飞不起来；被路过的人惊起，扑腾两下又掉回竹竿；它在雨后的夕光里晒干羽毛，飞过金色的稻田，回到同伴中间 | 小样的一次小转折扩成完整的起承转合 |
| ④ 结构 | 起（1–2）、承（3–6）、转（7–9）、合（10–12）；没有对白和旁白，节拍表并进镜头剧本 | 没有对白时，靠行动、反应和声音交代因果（`planning.md`「无对白叙事」） |
| 伏笔与回收 | 同伴的叫声、湿透、光、飞不起来、哼的旋律、往稻田去的人、屋里的人、最后一滴，后面都回收；逐条见镜头剧本「编剧自查」 | 没有对白，前后照应就是叙事的骨架 |
| 幽默 | 起飞失败靠停顿和快慢反差；甩水用三次法则，第三次最大 | 笑点不靠夸张变形（`planning.md`「喜剧的三次法则」） |
| 人物 | 走过的人就是屋里说话的那个人；雨停后提竹篮去田里看水，看了麻雀一眼，没有惊动它；全片只露腰以下，不画脸 | 院子有人住、有生活感，又不让人抢走主角 |

### 美术

| 项 | 结论 | 理由 |
|---|---|---|
| ⑤ 画面风格 | 沿用小样定稿：赛璐璐角色、水粉底图、摄影后期 | 用户看小样选了 A 版 |
| ⑤ 色彩剧本 | 雷雨的冷蓝灰 → 光来时转金 → 晒太阳最暖最亮 → 飞过稻田的金橙 → 暮色紫蓝，屋里的灯是唯一的暖点；色值、缩略条和色指定见 [art.md](art.md) | 颜色本身讲时间和情绪 |
| 光的方向 | 记在场景坐标里：太阳方位角 28.3°（西边，稻田那一侧），高度从 27.4° 降到落山（[layout.md](layout.md)「光、风、雨」） | 反向机位的光影由此推出 |
| ⑥ 素材来源 | 纯代码；有宽松许可的第三方代码改了用，在 `sources.md` 登记出处、许可和改动 | `GLOSSARY.md`「纯代码」 |
| ⑪ 调色与质感 | 后期链全片统一，每场只调参数：雷雨更灰更雾，晒太阳光晕更强，暮色颗粒更明显；黑位按场换色相、亮度不变（参数见 [art.md](art.md)「各场的后期参数」） | 同一个世界，不同的时刻 |
| 片名与署名 | 片名「雨后」用画底图的水粉笔刷按规范笔顺写行楷，竖排，「雨」的四个点像最后四滴雨落下；署名「溯游」是一方白文印，印文用《说文》字形 | 片名和署名本身就是作品的一部分；字形依据见 `visual-style.md`「篆书字形依据」 |
| 「绝不能像」 | 沿用小样简报的清单，另加：人走路像假人；雨像均匀的粒子；鸟群一模一样、动作整齐划一；青橙调色；暮色发灰（[art.md](art.md)） | 这三样是正片新增的东西最容易出的错 |

### 摄影

| 项 | 结论 | 理由 |
|---|---|---|
| ⑦ 轴线与方向 | 主轴是"栖点 → 鸟群"（方位角 55°），人的路线大致同向；往右就是往稻田、往同伴那边去；除首尾 1、12 镜的反向机位，所有机位都在轴线靠屋子的一侧 | 不同执行者画的镜头接得上；人和麻雀往同一个方向去，说明去的是同一个地方 |
| ⑦ 反向机位 | 1、12 镜回看屋子，同一组机位首尾呼应；第 10 镜是正对主轴的迎面镜头 | 越轴放在方向建立之前和故事讲完之后；中途换到屋子方向用中性镜头 |
| ⑦ 焦段 | 开场和稻田用广角，麻雀近景用 75–100 毫米长焦，人走过用贴地低机位只拍到腰 | 广角给空间和空气，长焦把背景虚掉，低机位藏住人的上半身 |
| ⑦ 运镜 | 每帧都动，起止都慢；每个镜头写清跟着谁、揭示什么、停在哪里；飞行用跟拍和摇镜 | `docs/roles/design.md`「镜头运动」 |
| ⑦ 取景 | 切点两侧主体的画面位置对上（切点表）；第 2 镜故意把麻雀的视线空间压窄，第 9 镜打开 | 视线引导；构图本身说出"去不了 → 能去" |

### 动作

| 项 | 结论 | 理由 |
|---|---|---|
| ⑭ 先排演后细化 | 全片装配第一版只有关键姿势，用户看的就是这一版；镜头工单从批准过的关键姿势开始补中间画、拖影和特效 | 动作的大方向不在细化阶段返工 |
| ⑭ 鸟的动法 | 按真实的鸟：地上双脚跳；起飞先蹲、腿蹬、第一下下扑；扑几下收翅前冲，飞出波浪线；落地张翅、展尾、脚向前 | `motion.md`「鸟类运动」 |
| ⑭ 节奏 | 角色一拍二；最快的动作一拍一并画拖影；关键姿势停得住 | 沿用小样的动作规则 |
| ⑭ 动作规则 | 帧数、喜剧时机、人的腿脚表演、特效动画、状态衔接和动作的「绝不能像」见 [motion.md](motion.md) | 镜头工单照着做，不同执行者画的动作是同一个规矩 |

### 剪辑

| 项 | 结论 | 理由 |
|---|---|---|
| ⑨ 节奏 | 慢（雨）→ 稍紧（受惊）→ 最慢（晒太阳，全片唯一的长停顿）→ 渐快（看光、起飞）→ 放开（飞过稻田）→ 慢（暮色） | 情绪线就是节奏线 |
| ⑨ 接法 | 开场声音先行加淡入；3 → 4 J 切；10 → 11 遮挡转场；11 → 12 叠化（全片唯一）；其余硬切；逐个见切点表 | 少而准的转场，每个都有叙事理由 |
| ⑨ 4 → 5 | spec 暂定的"切在动作上"改为接反应镜头的硬切，切点落在水花最高的那一帧 | 两侧不是同一主体的同一个动作，按 `editing.md` 的定义是动作和反应 |
| 全片装配 | 开工后第一张画面工单做出来（#185），之后每个镜头落地都替换进去 | 交接错误要放进整条片子才看得出来 |
| ⑩ 画面文字 | 只有片尾的片名和署名，片头不放字 | 第一秒给雨 |

### 声音

| 项 | 结论 | 理由 |
|---|---|---|
| ⑧ 分层 | 环境（大雨 → 雨的尾声 → 暮蝉、风吹稻田，底噪从头到尾都在）、拟音、音效、叫声（麻雀 5 声，远处有同伴）、背景人声、配乐；见 [sound-design.md](sound-design.md) | 每个看得见的接触都有声音 |
| ⑧ 人声 | 本仓库代码合成：屋里模糊的说话、那个人的哼唱；放远、隔墙、听不清字 | 仍然是纯代码；距离和遮挡藏住合成痕迹 |
| ⑧ 主旋律 | 哼唱的旋律从小样钢琴动机（C–A 向下的三度）发展而来，第 11 镜配乐第一次完整奏出 | 剧中声音转成配乐，首尾呼应 |
| ⑧ 静默 | 不出新音，环境声不断，不降到数字静音 | 小样两次被听出"断了"（#157） |
| ⑫ 混音与响度 | −16 LUFS ±1 LU，真峰值不超过 −1 dBTP；大响动处配乐让位；按场景各有混响；断音用 `pnpm qa dropouts` 查 | 仓库的成片标准 |

## 代码

《雨后》的内容只放在这里，小样和正片都从这里取用（#174）。通用机制在 `src/kit/`，索引见 `docs/workflow/README.md`「工具」。

| 文件 | 内容 |
|---|---|
| [scene.ts](scene.ts) | 场景布置（米）：参考相机、竹竿与晾衣架、檐口、屋子、水洼 W1、小路、树篱、稻田，各镜头的参考机位，各层底图的纵深，太阳（夕光、低夕光）和天光方向 |
| [sparrow.ts](sparrow.ts) | 主角树麻雀：距离场体块、赛璐璐、线条，任意角度都是同一只鸟；湿、甩乱、干由 `wet`、`ruffle` 两个连续参数控制，`sparrowPoses` 是各镜头的关键姿势 |
| [tokens-sparrow.ts](tokens-sparrow.ts) | 麻雀按光照和干湿分的色板、轮廓光色、远处鸟群的剪影色和金边 |
| [flock.ts](flock.ts) | 远处鸟群：5–7 只各不相同的逆光剪影，停栖时的小动作、主角落下时邻鸟错开挪步、波浪式飞行 |
| [person.ts](person.ts) | 走过院子的人（只到腰）：转面、陷泥走路 `mudWalkPose`、停步转向 `stopTurnPose`、竹篮、场景里的路线和摆放、远处戴斗笠的小人影 |
| [tokens-person.ts](tokens-person.ts) | 人和随身道具按光照分的色值 |
| [plates.ts](plates.ts) | 水粉底图的内容：院子五层（远景、稻田、树篱、院子、檐口），雨和夕光两种状态，第 3 镜（小样 S1）用 |
| [plates-views.ts](plates-views.ts) | 正片新机位的底图：屋子正面（雨、暮色亮灯）、贴地低机位、稻田上空大远景、迎面看屋子，以及近景的虚化背景 |
| [generate.ts](generate.ts) | 正片唯一的生成入口：烘焙全部底图、汇总全片画面事件 `data/events.json`、合成混音 `mix.wav`，带缓存，写 `data/generated.json`；用法 `node episodes/after-rain/generate.ts [--force]` |
| [auditions/](auditions/) | 试听样（哼唱、隔墙交谈、麻雀叫声）的配方和生成器，清单在 `data/auditions.json` |
| [pole.ts](pole.ts) | 晾衣竹竿：透视竹管、受光带、水珠，`bend` 让它下沉和弹回 |
| [stage.ts](stage.ts) | 舞台：按相机摆底图（院子五层和新机位底图），把麻雀放进场景 |
| [tokens.ts](tokens.ts) | 本期令牌：色值、线条、样张底色、摄影默认值 |
| [sheets/](sheets/) | 设定图的入口：`AfterRainSparrowSheet`、`AfterRainPersonSheet`，由 #180、#181 填内容 |
| [AfterRain.tsx](AfterRain.tsx) | 正片合成 `AfterRain`：按时间表找当前镜头（第 11→12 镜叠化时两镜同画），套后期链，挂混音 |
| [model.ts](model.ts) | 正片规格和时间表 `shotTable`（12 镜，1560 帧），叠化区间查询 `activeShots`，画面事件种类表 |
| [shots/](shots/) | 各镜头的代码，一个目录一段（`s01-02`、`s03`、`s04-06`、`s07-09`、`s10-11`、`s12`），各自的 `timing.ts` 放动作和画面事件共用的帧号；`index.ts` 是登记表 |
| [usePlates.ts](usePlates.ts) | 按镜头懒加载、缓存底图，换镜头时等新底图画好再出帧 |
| [grade.ts](grade.ts) | 各场的后期参数和黑位（雨色、夕光、晒太阳、低夕光、暮色），第 3 镜雨色转夕光、叠化时的插值 |
| [sound/](sound/) | 全片声音：按 `score.json` 编译配乐，合成哼唱、麻雀叫、拟音和环境底，混音到 −16 LUFS；正式声音由 #193 完成：雨按物理分层合成、屋里的说话隔墙处理、逐个画面事件按 [sound-design.md](sound-design.md)「听点表」落位 |
| [title/](title/) | 片名「雨后」的行楷字骨和书写时间、署名「遡游」的满白文印，预览合成 `AfterRainTitlePreview`；`export-cover.ts` 导出透明底封面字和放大的印章检查图。笔刷和刻印工具在 kit 的 `engine/calligraphy.ts`、`engine/seal.ts` |

[layout.md](layout.md) 里新增的对象（屋子正面、小路、水洼 W1、电线和鸟群）由底图和镜头工单按那里的坐标写进代码。

## 成片与封面复现

从仓库根目录执行。`browser` 指向本机锁定时使用的 Chrome Headless Shell。生成器先重建画面、事件和最终混音，再渲染 `AfterRain`。本机一次运行一个 Remotion 进程。

```bash
qa=out/qa/spec-168/194
film=out/after-rain/after-rain.mp4
browser=/root/project/video-studio/node_modules/.remotion/chrome-headless-shell/linux64/chrome-headless-shell-linux64/chrome-headless-shell
mkdir -p "$qa" out/after-rain
node episodes/after-rain/generate.ts
/usr/bin/time -f 'elapsed_seconds=%e exit=%x' -o "$qa/render-time.txt" \
  pnpm exec remotion render AfterRain "$film" --gl=swangle --concurrency=4 \
  --browser-executable="$browser" --log=verbose > "$qa/render.log" 2>&1
```

封面取第 8 镜末帧 F995（镜内 F143）。此时光线已走到低夕光，麻雀晒干了羽毛，半闭着眼停在竹竿上。两版都将片名和印章落在左侧留白，给朝右的鸟喙留出空间。B 站版从 4K 底图裁出 4:3，再按上传尺寸缩小。

```bash
pnpm exec remotion still AfterRain "$qa/cover-base.png" --frame=995 --scale=2 \
  --gl=swangle --browser-executable="$browser"
node episodes/after-rain/title/export-cover.ts --out "$qa/title.png"
ffmpeg -y -i "$qa/cover-base.png" -i "$qa/title.png" -filter_complex \
  '[1:v]scale=3840:2160:flags=lanczos[t];[0:v][t]overlay=0:216:format=rgb' \
  -frames:v 1 -q:v 2 -pix_fmt yuvj444p out/after-rain/cover-youtube.jpg
ffmpeg -y -i "$qa/cover-base.png" -i "$qa/title.png" -filter_complex \
  '[0:v]crop=2880:2160:240:0[b];[1:v]scale=3840:2160:flags=lanczos[t];[b][t]overlay=-160:216:format=rgb,scale=1200:900:flags=lanczos' \
  -frames:v 1 -q:v 2 -pix_fmt yuvj444p out/after-rain/cover-bilibili.jpg
```

成片、封面和简介放 `out/after-rain/`；`$qa` 下是验收产物，spec 收尾清理时会删掉。

| 交付位置 | 内容 |
|---|---|
| `out/after-rain/after-rain.mp4` | 两平台共用的 1080p24 有声正片 |
| `out/after-rain/cover-youtube.jpg`、`out/after-rain/cover-bilibili.jpg` | 3840×2160 宽封面、1200×900 首页封面。规格出处见 [sources.md](sources.md#194-锁定版正片与发布封面) |
| `out/after-rain/description.md` | 设计负责人定稿的简介，带署名（执行者的草稿在 `$qa/description.md`） |
| `out/after-rain/after-rain-web.mp4`、`out/after-rain/shots-12.jpg`、`out/after-rain/social-preview.jpg` | GitHub 展示用的 540p 小文件版、十二镜缩略条、仓库社交预览图，做法见下文「GitHub 展示」 |
| `$qa/sheet/`、`$qa/cuts-*.jpg`、`$qa/master-check.json` | 全片联系表、逐切点对照、逐帧时间戳与锁定版像素核对 |
| `$qa/loudness.json`、`$qa/dropouts.json`、`$qa/levels.svg` | 对交付 MP4 的响度、真峰值、断音报告与电平图 |
| `$qa/repeat.json`、`$qa/manifest-check.json`、`$qa/render-time.txt` | 三帧独立复渲的 RGB 字节比对、生成清单核对、全片墙钟耗时 |

### GitHub 展示

仓库首页 README 和 GitHub Release 用到三个文件，都从成片和 YouTube 封面用 FFmpeg 派生，不新增素材：

- **`after-rain-web.mp4`**：960×540、两遍编码，视频 1090 kb/s、AAC 128 kb/s，共 9.9 MB。GitHub 免费账户的视频附件上限是 10 MB（[GitHub 文档「附加文件」](https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/attaching-files)），拖进 issue 或 PR 的评论框得到附件链接，README 里单独一行写这个链接就能直接播放。评论要发出去，链接才对外可见：只上传不发出时，不登录访问返回 404（11-27 实测）。同样的码率试过 1280×720，第 1 镜的雨丝和瓦顶高光被抹平；README 的播放器最宽约 880 像素，540p 保留的细节更多。
- **`shots-12.jpg`**：每镜一帧拼成 4×3，帧号 F72、F216、F372、F492、F582、F684、F792、F960、F1044、F1134、F1260、F1500，每格 640×360。
- **`social-preview.jpg`**：从 4K 封面裁 2:1 再缩到 1280×640，70 KB。GitHub 要求社交预览图小于 1 MB、建议 1280×640，只能在仓库 Settings 的「Social preview」里上传（[GitHub 文档](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/customizing-your-repositorys-social-media-preview)）。

```bash
src=out/after-rain/after-rain.mp4
dst=out/after-rain
log=out/qa/after-rain-web
mkdir -p "$log"
ffmpeg -y -i "$src" -vf scale=960:540:flags=lanczos -c:v libx264 -preset slower -b:v 1090k \
  -pass 1 -passlogfile "$log/x264" -an -f mp4 /dev/null
ffmpeg -y -i "$src" -vf scale=960:540:flags=lanczos -c:v libx264 -preset slower -b:v 1090k \
  -pass 2 -passlogfile "$log/x264" -c:a aac -b:a 128k -movflags +faststart -pix_fmt yuv420p "$dst/after-rain-web.mp4"
ffmpeg -y -i "$dst/cover-youtube.jpg" -vf 'crop=3840:1920:0:120,scale=1280:640:flags=lanczos' \
  -q:v 2 "$dst/social-preview.jpg"
ffmpeg -y -i "$src" -vf 'select=eq(n\,72)+eq(n\,216)+eq(n\,372)+eq(n\,492)+eq(n\,582)+eq(n\,684)+eq(n\,792)+eq(n\,960)+eq(n\,1044)+eq(n\,1134)+eq(n\,1260)+eq(n\,1500),scale=640:360:flags=lanczos,tile=4x3:padding=6:color=0x1d1a22' \
  -frames:v 1 -q:v 3 "$dst/shots-12.jpg"
```

Release `after-rain-v1` 挂成片、小文件版、两张封面和缩略条；README 的封面和缩略条直接引用 Release 里的文件。

首页默认显示英文 `README.md`，简体中文版是 `README.zh-CN.md`；Release 的说明也用英文，链到中文版。GitHub 的仓库搜索默认只查仓库名、简介和话题，不查 README 正文（[GitHub 文档「搜索仓库」](https://docs.github.com/en/search-github/searching-on-github/searching-for-repositories#search-by-repository-name-description-or-contents-of-the-readme-file)），所以简介写成中英双语，并写明用 AI agent 和 Claude Opus 做。11-27 实测，简介只有中文时，英文词和模型名都搜不到本仓库。话题沿用同类项目常用的词。这几项都不在 git 里，11-27 的设置如下：

```bash
gh repo edit JinhaoFang/video-studio \
  --description "One person, a crew of AI agents, films made entirely from code. After the Rain (《雨后》) is a Japanese-style animated short: picture, score, rain, birdsong and voices are all generated by Remotion and React code written by AI agents led by Claude Opus 5.5. 一个人带一支 AI agent 剧组做视频：纯代码动画短片《雨后》，画面和声音全部由代码生成。" \
  --homepage https://github.com/JinhaoFang/video-studio/releases/tag/after-rain-v1 \
  --add-topic remotion,react,typescript,animation,short-film,procedural-generation,generative-art,sound-synthesis \
  --add-topic ai-agents,claude-code,codex,video-production,video-as-code,code-generated-video,ai-video,anime
gh release edit after-rain-v1 --title "《雨后》After the Rain — an animated short film made entirely from code"
```

### 本机渲染耗时

锁定版全片墙钟 **27 分 36.05 秒**，含打包和封装。四路并行平均每交付一帧用 **1.062 秒**。Remotion 全片日志中单帧用时最长的是第 9 镜 F1074，**12.945 秒**。`$qa/frame-times.csv` 按全片帧号列出 1560 次作画与后期的毫秒数，`$qa/timing.json` 按镜头汇总，叠化单列。

按本期约定，再用 `remotion still` 串行单独渲代表帧。下表取 Remotion 的 `Rendered still`，不含打包，日志和取样记录见 `$qa/stills/` 与 `$qa/single-frame-times.json`。这批单帧里最慢的是第 3 镜雨滴击中麻雀的 F439，3.770 秒。

| 镜头 | 全片帧 | 秒 | 镜头 | 全片帧 | 秒 |
|---|---:|---:|---|---:|---:|
| 1 | 84 | 1.905 | 7 | 800 | 2.479 |
| 2 | 236 | 2.597 | 8 | 995 | 3.056 |
| 3 | 439 | 3.770 | 9 | 1074 | 3.111 |
| 4 | 527 | 2.120 | 10 | 1173 | 1.647 |
| 5 | 582 | 2.732 | 11 | 1332 | 1.765 |
| 6 | 694 | 1.981 | 12 | 1492 | 1.553 |
| 11→12 叠化 | 1355 | 2.108 | | | |

### 成片测量

```bash
pnpm qa sheet "$film" --count 24 --cols 4 --out "$qa/sheet"
pnpm qa loudness "$film" --target-lufs -16 --tolerance 1 --max-true-peak -1 --out "$qa"
pnpm qa dropouts "$film" --floor -60 --out "$qa"
```

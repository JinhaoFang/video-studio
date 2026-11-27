# 声音

对应「一期视频」部门表里声音的 ⑧ 声音（旁白、配乐、音效）和 ⑫ 混音与响度。只写知识：有哪些选项、各是什么意思、适合什么情况、样片和出处；不写先做什么、后做什么，制作步骤见 `docs/workflow/README.md`「一期视频」。条目格式见 [visual-style.md](visual-style.md)「条目格式」。

下文的「适合」是根据来源描述归纳的用途，不表示某种声音只能用于某类视频，也不替具体一期定方向。声音的性别感、年龄感、音色、语速和情绪是不同维度，可以组合；音色描述不等于对说话人真实身份的判断。依据是 ElevenLabs 官方 [Voice Design](https://elevenlabs.io/docs/eleven-creative/voices/voice-design.md) 对这些维度的分别定义。

样片只提供在线试听或观看，不搬运。ElevenLabs 预听的权利属于平台及相关权利人，链接不代表取得合成或成片使用许可；下列预听地址来自其[公开 Voices API](https://api.elevenlabs.io/v1/voices)。Mixkit 样片属于其 Stock Music Free License 或 Sound Effects Free License，本文仅供试听，实际素材使用范围以[对应许可](https://mixkit.co/license/)为准。耶鲁教学片段的电影版权属于各自权利人，本文只链接教学页面观看，不表示取得素材授权。

## ⑧ 声音设计

### 声音分层与对白、音乐、音效分轨

- **一句话**　分层说明每种声音在片里做什么，分轨让这些声音能独立调整和交付。
- **适合**　同一场景有多种声源，或交付时需要保留单独的对白、音乐和音效以便重混。
- **标志特征**　对白或人声承担角色发声，拟音对应表演和接触，硬音效对应可定位的声响事件（如雷击），环境声交代持续的空间，设计音用加工或合成塑造特定听感，音乐组织情绪与节奏。同一事件可以有多层，例如落地的一下可同时带衣料摩擦、撞击和音乐重音。
- **关键技法**　对白（D）、音乐（M）、音效（E）各是一条合成分轨（stem），制作时可细分更多轨。拟音、硬音效、环境和设计音通常汇入 E。可听清的对白或后续要替换的人声留在 D，作为环境的背景人声可按交付要求归入 E。分轨共用同一时间起点、时长和声道布局，按原电平相加能还原对应混音。片中各层的相对电平见下方的混音条目。[分轨平衡与人声让位](#分轨平衡与人声让位)
- **出处**　声音层与可定位效果参照乌得勒支艺术大学声音教材《The Sound Track》第 30–31、114 页。分轨交付和等增益重合成参照美国电影艺术与科学学院档案建议。[HKU 教材](https://www.hku.nl/getmedia/4bb61eb2-c777-4eb3-ab13-83251a22ea8b/HKU-The-Sound-Track-Engels-leesbare-pdf.pdf#page=31) · [Academy DME Composited Stems](https://academydigitalpreservationforum.org/recommended-practices/audio/archiving/dme-composited-stems/)

### 听点会与听点表

- **一句话**　导演和声音团队对着同一版画面商定哪里能听到什么，以及这些声音要让观众注意到什么。
- **适合**　画面锁定后，统筹对白、拟音、音效、环境和配乐的进出、各层的注意力和有意留白。
- **标志特征**　讨论以全片装配为共同参照。听点表的条目能定位到镜头和事件，记录起止时间码或帧号、对齐点、声音层、声音内容和叙事意图。导演确认的取舍也能落在表上，例如「脚碰地时为重音」「此处无新音，底声延续」。后一种也有独立条目可查。[静默与环境底噪](#静默与环境底噪)
- **出处**　参与者和讨论内容见 Vancouver Film School 的声音编辑课程说明，声音效果的时间码、编号、描述与备注见 Taylor & Francis 出版的听点单。全片装配、画面锁定和表的用途沿用本仓库约定。[VFS「Sound Editor」](https://vfs.edu/content/sound-editor) · [Sample Sound Effects Spotting Sheet](https://s3-eu-west-1.amazonaws.com/s3-euw1-ap-pe-ws4-cws-documents.ri-prod/9781138795433/forms/sample_sound_effects_spotting_sheet_copyedited.pdf) · [工作流「交接」](../workflow/README.md#交接)

## ⑧ 旁白

### 有旁白

- **一句话**：画面之外有一个声音，把事情讲清楚，或者说出人物心里的话。
- **适合**：解释因果、补充背景的科普和产品介绍，以及带个人视角的回忆、故事；纯看动作就能明白的段落未必需要解释声。
- **标志特征**：旁白说话时，画面中不必有一个同步张嘴的人；它可以提供画面之外的信息，不只重复屏幕文字。
- **样片**：[耶鲁 Film Analysis「VOICE OVER」中的《冰风暴》片头](https://filmanalysis.yale.edu/sound/)（电影版权保留，仅观看教学片段）：用旁白交代年代、主题和人物视角。
- **出处**：[耶鲁 Film Analysis，Part 5: Sound，VOICE OVER](https://filmanalysis.yale.edu/sound/)：画外叙述的定义及回忆、人物主观视角的用法；科普和产品片用途另参照 ElevenLabs [Voice Library 的 Educational、Narration、Advertisement 分类](https://elevenlabs.io/docs/eleven-creative/voices/voice-library.md)。

### 无旁白

- **一句话**：没有额外的讲解声，内容靠画面、文字、人物对白或声音本身表达；无旁白仍然可以有配乐和音效。
- **适合**：看动作就能懂的演示、以气氛为主的片段，以及对白已经承担信息的故事。抽象关系或背景信息很多时，单靠画面可能不够明确。
- **标志特征**：没有独立解释画面的叙述者；声音可以来自画面内外的事件，也可以是观众听得到、故事里的人听不到的配乐。
- **样片**：[耶鲁「DIEGETIC/NON-DIEGETIC SOUND」中的《崩溃边缘的女人》片段](https://filmanalysis.yale.edu/sound/)（电影版权保留，仅观看教学片段）：对白和场景声本身承载事件。
- **出处**：[耶鲁 Film Analysis，Source、DIEGETIC/NON-DIEGETIC SOUND、VOICE OVER](https://filmanalysis.yale.edu/sound/)；上述演示和氛围片的适用范围是据声音来源及叙述功能作的用途归纳。

### 性别感：男声、女声、中性声

- **一句话**：这是声音让人联想到的身份感觉；「偏低的女声」「柔和的男声」「中间音高的中性声」都能描述得通。
- **适合**：有明确人物的故事，声音身份感可以呼应人物；没有人物身份要求的科普、广告和企业片，三类都可以承载讲解。专业、亲切或有力量还取决于音色和表达，单写性别不足以描述它们。
- **标志特征**：描述同时包含性别感与实际声音特征，例如「中性声，中间音高，清楚、平稳」，而不是只用「男声」代替「沉稳」。
- **样片**：[Alice 女声预听](https://storage.googleapis.com/eleven-public-prod/premade/voices/Xb7hH8MSUJpSbSDYk0k2/d10f7534-11f6-41fe-a012-2de1e482d336.mp3)、[Eric 男声预听](https://storage.googleapis.com/eleven-public-prod/premade/voices/cjVigY5qzO86Huf0OWal/d098fda0-6456-4030-b3d8-63aa048c9070.mp3)（ElevenLabs 官方英文预听，仅试听）：示例只覆盖其中两类，不代表中性声不存在。
- **出处**：[ElevenLabs Voice Design，Gender](https://elevenlabs.io/docs/eleven-creative/voices/voice-design.md) 明确给出低沉女声、浑厚男声和中性声的描述；[Voice Library，Gender](https://elevenlabs.io/docs/eleven-creative/voices/voice-library.md) 列 Male、Female、Neutral。类型不按性别固定分配是依据这些独立维度作的归纳。

### 年龄感：年轻、成熟、年长

- **一句话**：听起来像刚成年的朋友、成熟的讲述者，还是有岁月感的人；这是听感，未必是声源的真实年龄。
- **适合**：年轻感可对应同龄交流、轻松的社交内容；成熟感可对应平稳讲解、企业介绍；年长感可对应回忆、历史人物或长者角色。目标是人物和表达一致，并非受众几岁就只能听几岁的声音。
- **标志特征**：年龄感与语速、音色分别描述；年长不等于必然沙哑、年轻也不等于必然高声快讲。
- **样片**：[Jessica](https://storage.googleapis.com/eleven-public-prod/premade/voices/cgSgspJ2msm6clMCkdW9/56a97bf8-b69b-448f-846c-c3a11683d45a.mp3)、[Eric](https://storage.googleapis.com/eleven-public-prod/premade/voices/cjVigY5qzO86Huf0OWal/d098fda0-6456-4030-b3d8-63aa048c9070.mp3)（ElevenLabs 官方英文预听，仅试听）：官方分别标为年轻女声和中年男声；这组同时改变了性别与表达，只能作整体印象参考，不能单独证明年龄带来的效果。
- **出处**：[ElevenLabs Voice Design，Age](https://elevenlabs.io/docs/eleven-creative/voices/voice-design.md) 把年龄定义为 perceived age，并列年轻、中年、年长的描述；[公开 Voices API](https://api.elevenlabs.io/v1/voices) 提供示例的标签和用途。角色与类型的对应是据这些描述作的用途归纳。

### 音色：清亮、温厚、沙哑、气声

- **一句话**：同样一句话，可以听起来清楚明亮、圆润厚实、带颗粒，或像贴近耳边轻声说。
- **适合**：清亮、咬字明确可用于信息密集的解释；温厚、平滑可用于平和叙述和交谈；沙哑、粗粝可用于有经历感的角色；带气声的轻柔表达可用于私密、安静的段落。后两类的角色感较强，不宜仅凭名称假定它们能把术语讲清楚。
- **标志特征**：描述区分高低、共鸣和质地，例如「音高偏低、共鸣饱满、少气声」；音色与情绪分开，温厚不等于开心，低沉也不等于难过。
- **样片**：[Alice「Clear, Engaging Educator」](https://storage.googleapis.com/eleven-public-prod/premade/voices/Xb7hH8MSUJpSbSDYk0k2/d10f7534-11f6-41fe-a012-2de1e482d336.mp3)、[Lily「Velvety Actress」](https://storage.googleapis.com/eleven-public-prod/premade/voices/pFZP5JQG7iQjIQuC4Bku/89b68b35-b3dd-4348-a84a-a3c13a3c2b30.mp3)（ElevenLabs 官方英文预听，仅试听）：名称和说明用于定位示例，不把这两个短样当成全部音色的代表。
- **出处**：[ElevenLabs Voice Design，Tone/Timbre](https://elevenlabs.io/docs/eleven-creative/voices/voice-design.md) 区分音色与情绪，列出 deep、smooth、raspy、breathy、resonant 等描述；[公开 Voices API](https://api.elevenlabs.io/v1/voices) 提供上述声线说明。各类视频的适配是用途归纳。

### 语速与节奏：平稳、轻快、缓慢留白

- **一句话**：不只是一分钟说多少字，还包括在哪里停、哪个词加重、话是一口气冲出去还是从容说完。
- **适合**：平稳、有分句的表达适合讲解和教学；轻快、紧凑适合简短广告和兴奋的评论；缓慢、停顿明确适合回忆、沉思和悬念。快讲不能代替内容取舍，慢讲也不自动产生分量。
- **标志特征**：描述同时包含快慢、停顿与重音；例如「自然语速，术语前后有停顿，结论词有重音」。不同语言、句子和服务没有通用的最佳字速。
- **样片**：[Alice 官方英文预听](https://storage.googleapis.com/eleven-public-prod/premade/voices/Xb7hH8MSUJpSbSDYk0k2/d10f7534-11f6-41fe-a012-2de1e482d336.mp3)（仅试听）：可作为完整句子的节奏参考，不能据英文短样推定中文语速。
- **出处**：[ElevenLabs Voice Design，Pacing、Text to preview](https://elevenlabs.io/docs/eleven-creative/voices/voice-design.md)：快、正常、慢、从容、急促、均匀或带突然停顿的节奏都可分别描述；完整句段比极短片语更能呈现表现。上述用途是据其教学、广告、叙事等用例作的归纳。

### 情绪与表达：中性、亲切、兴奋、严肃、克制

- **一句话**：声音是在平静说明、像朋友聊天、热情招呼，还是压着情绪讲一件有分量的事。
- **适合**：中性、平静适合事实说明；亲切、安抚适合教学和服务解释；兴奋适合体育评论、活动和促销；严肃适合风险、重要事实；克制或忧伤可用于人物回忆和戏剧段落。情绪需要呼应文意，严肃信息配欢快叫卖声会改变它的含义。
- **标志特征**：情绪有对应的重音、音高起伏和句尾处理，不靠整体音量大小命名；同一音色可以有不同表达。可组合成「成熟中性声，平滑温厚，自然语速，语气平静而关切」。
- **样片**：[Sarah「Reassuring, Confident」](https://storage.googleapis.com/eleven-public-prod/premade/voices/EXAVITQu4vr4xnSDxMaL/01a3e33c-6e99-4ee7-8543-ff2216a32186.mp3)、[Jessica「Playful, Bright, Warm」](https://storage.googleapis.com/eleven-public-prod/premade/voices/cgSgspJ2msm6clMCkdW9/56a97bf8-b69b-448f-846c-c3a11683d45a.mp3)（ElevenLabs 官方英文预听，仅试听）：用于理解整体表达差异，不是同一声线的情绪对照实验。
- **出处**：[ElevenLabs Voice Design，Prompting guide、Text to preview、Example Prompts](https://elevenlabs.io/docs/eleven-creative/voices/voice-design.md)：情绪、角色、节奏分别描述，示例含热烈体育评论、朋友式企业讲述和安抚式服务声音；文本与表达矛盾会影响结果。类型对应和组合句是据此作的归纳示例。

### 试听形式：官方短样

- **一句话**：直接听到现成的一小段声音，比只看「温暖」「专业」这些标签更容易形成印象。
- **适合**：不了解声线术语的人辨认自己喜欢的整体感觉；原有样本的文本、语言和情绪各不相同，不能据此判定谁念本期中文最好。
- **标志特征**：试听说明包含说人话的差别，例如「这条像朋友解释，那条更像正式播报」；同时标明示例语言与来源。名称、热度和标签不能代替本期文本的发音表现。
- **样片**：[Alice 教学声线短样](https://storage.googleapis.com/eleven-public-prod/premade/voices/Xb7hH8MSUJpSbSDYk0k2/d10f7534-11f6-41fe-a012-2de1e482d336.mp3)（ElevenLabs 官方英文预听，仅试听）。
- **出处**：[ElevenLabs Voice Library，Finding voices、Language、Category](https://elevenlabs.io/docs/eleven-creative/voices/voice-library.md)；[Voice Design，Text to preview](https://elevenlabs.io/docs/eleven-creative/voices/voice-design.md)：文本会影响节奏、情绪和表现。把标签译成听感说明、将异文短样限于初步印象，是据此作的比较方法归纳。

### 试听形式：同文干声与带画面的小样

- **一句话**：同文干声是不同候选读同一段话、没有配乐；带画面小样则能听见它与画面、音乐合在一起的感觉。
- **适合**：同文干声适合比较声线和咬字；带画面小样适合判断整体基调。对新手可比较的是「哪条更容易听懂」「像不像在对你说话」「有没有太推销、太冷或太夸张」，而非模型参数。
- **标志特征**：可比样本使用同一语言、同一文本、相近感知响度和相同播放条件；文本包含本期术语、数字及完整句子。声线比较与快慢、情绪比较分开描述。可辨认的差异包括读音、吞字、重音、停顿、情绪和句尾是否完整；带画面版另体现音乐是否盖住人声。
- **关键技法**：同文、相近响度和相同背景减少文本、音量与配乐对判断的干扰；这是一种比较依据，不规定候选数量、确认轮次或固定步骤。
- **出处**：[ElevenLabs Voice Design，Text to preview、Loudness](https://elevenlabs.io/docs/eleven-creative/voices/voice-design.md) 说明预听文本、上下文和预听音量的影响；[EBU R 128，第 3 页](https://tech.ebu.ch/docs/r/r128.pdf) 说明峰值相同仍会有感知响度差异；[Adobe 自动压低背景音](https://helpx.adobe.com/premiere/desktop/add-audio-effects/adjust-volume-and-levels/automatically-duck-audio.html) 说明人声与配乐平衡。同文比较形式及面向新手的比较维度是这些依据的工程归纳。

### 本仓库来源：ElevenLabs

- **一句话**：仓库已经用 ElevenLabs 做过中文正式旁白，声线是否合适、具体模型能控制什么，都有独立的实测记录。
- **适合**：了解 NASA 朋克开场（复刻练习，2026-11-27 移出仓库）的声音选择与发音、变速限制；这份单期记录不能代表其他声线、模型或账号。
- **素材来源**：已用服务；不是本次工单新增的素材。模型能力、默认声线可用性和使用许可均有上下文限制。
- **出处**：[ElevenLabs API 研究](../research/elevenlabs-api.md)；该期 README「正式配音」和 sources.md 的配音与许可记录见提交 `ffe625a` 的 `episodes/nasa-punk-opening/`：引用既有经验，不把历史参数写成当前通用能力。

### 本仓库来源：MiniMax

- **一句话**：ClinMesh 宣传片（协作者的内部产品宣传片，2026-11-27 移出仓库）最终旁白用的是 MiniMax Audio「沉稳高管」，相关经验记录在该期说明里。
- **适合**：了解已有产品宣传片的声音来源与实际处理边界；「沉稳高管」是本期使用的声线名，不是全部企业片的固定答案。
- **素材来源**：已用服务；本期生成、切句属于未入库的本机步骤，配音也没有经过现有配音工具的错字率评分，不能与另一服务直接作质量排名。
- **出处**：该期 README「制作步骤」「复现」「已知偏离」「与首期的差异」和 sources.md 的未登记项，见提交 `ffe625a` 的 `episodes/clinmesh-promo/`：账号、模型及商用条款尚未补齐，不由知识文档补作授权结论。

## ⑧ 人声

### 背景人声（walla／ガヤ）

- **一句话**　从背景能听出有人在说话，观众的注意力仍留在前景。
- **适合**　餐厅、街道等多人交谈的空间。同样的语流处理也适用于一墙之隔的单人说话，这类声源保留一人的节奏与起伏。
- **标志特征**　听得出短句般的强弱、起伏和停顿。若场景只需交代有人，词句无需可辨，偶尔冒出的一个声音也不会让人错认成主角对白。
- **关键技法**　多人层可由不同音高、说话节奏和方向的声音错开叠加。隔墙声可兼用高频衰减与空间处理。电平是在场景中相对前景衡量的，听感上低于主对白或主要动作，安静时仍可察觉有人。电平差、频带重叠、声像和时间空隙都会影响可懂度，恰当的电平取决于当时的前景内容。[声音远近与景别](#声音远近与景别)
- **出处**　日本动画音响监督明田川进说明了ガヤ的可懂程度、分角色表演和叠录。Juniper Post 举出餐厅交谈声处于配乐下的例子。Best 等的听觉实验比较了空间分离、频带重叠和时间重叠对同时说话时语音识别的影响。[明田川进《音物语》](https://anime.eiga.com/news/column/aketagawa_oto/117964/) · [Juniper Post「Why Walla Walla Walla?」](https://juniperpost.com/why-walla-walla-walla-2/) · [频带重叠实验摘要](https://api.crossref.org/works/10.1121/1.4803517) · [时间重叠实验摘要](https://api.crossref.org/works/10.1121/1.3533733)

### 纯代码人声合成

- **一句话**　代码产生声带振动般的脉冲和气流声，再用随口形变化的共鸣把它们变成人声。
- **适合**　无词哼唱、模糊说话和非词汇发声。可辨台词还需要细致的音素时序和语调设计。
- **标志特征**　声门脉冲的重复频率决定基频。不同声道形状让不同频带突出，形成可分辨的元音色彩。说话有发声与停顿、音高滑动、开合口形及气流变化。闭口哼唱的音高可沿旋律变化，口腔出口闭合，鼻腔支路开放，仍有连续、有音高的声音。
- **关键技法**　源—滤波模型可用时变的共振峰频率和带宽描述声道，也可用数字波导模拟波在分段声管内的传播、反射及鼻腔分支。语流可由短段发声、气声和停顿组成，起伏和重音由基频与力度曲线描述。哼唱可共用声门激励，用相对稳定的声道形状、旋律音高和呼吸般的包络保持连贯。已有生成手段可供对照。[本仓库来源：纯代码合成](#本仓库来源纯代码合成)
- **素材来源**　可编程实现及许可原文如下。MIT 版本在复制或分发实质部分时保留版权声明和许可全文。代码来源的登记要求见术语表的「纯代码」。[GLOSSARY.md](../../GLOSSARY.md)

  | 实现 | 许可原文 | 用途与可用性 |
  | --- | --- | --- |
  | [Pink Trombone 原版](https://dood.al/pinktrombone/) | [MIT，作者声明见页面源码或固定快照](https://github.com/imaginary/pink-trombone/blob/dd2e9447e1e101139aa37a949dd1e6f2ba0842b6/index.html#L29-L47) | 可用其人声合成代码。原版为浏览器交互演示。 |
  | [pink-trombone-mod](https://github.com/chdh/pink-trombone-mod/tree/359c2d3b42b10280404c1650dc601902112b4c90) | [MIT](https://github.com/chdh/pink-trombone-mod/blob/359c2d3b42b10280404c1650dc601902112b4c90/LICENSE.md) | 可用。TypeScript 合成核心按采样率生成缓冲区，可分别控制声门音高、张力、声道及鼻腔，适合离线合成模糊语流和无词哼唱。 |
  | [Soundpipe 的 voc 模块](https://github.com/PaulBatchelor/Soundpipe/tree/3efb43bdabd0ed23b17c694292b5a79f1692a3ea) | [MIT，Soundpipe](https://github.com/PaulBatchelor/Soundpipe/blob/3efb43bdabd0ed23b17c694292b5a79f1692a3ea/LICENSE)及 [MIT，Pink Trombone 上游](https://github.com/imaginary/pink-trombone/blob/dd2e9447e1e101139aa37a949dd1e6f2ba0842b6/index.html#L29-L47) | 可用其 C 声道模块，保留两份版权和许可声明。接口可控制音高、口腔和鼻腔，接入 Node 管线需 C 构建或移植。[voc 模块说明](https://paulbatchelor.github.io/res/soundpipe/docs/voc.html) |
  | [SAM JavaScript 移植](https://github.com/discordier/sam/tree/fa70b9679a731731d91c6592fdd44d990002b0f9) | [许可不明，作者在 README 的 License 节说明未授予开源许可](https://github.com/discordier/sam/blob/fa70b9679a731731d91c6592fdd44d990002b0f9/README.md#license) | 不可用。 |

- **样片**　Pink Trombone 作者网页的交互合成演示（合成代码 MIT，仅在线试听），可用来对照音高与口形变化。[Pink Trombone](https://dood.al/pinktrombone/)
- **出处**　阿姆斯特丹大学 Praat 手册解释声源、共振峰和音高目标，斯坦福 CCRMA 教材论述数字声管与演唱鼻腔支路。TypeScript 接口见固定版本源码。noroi-iwai 仅据仓库研究记录引用其声门脉冲与分段声管方法摘要。[Praat「Source-filter synthesis」](https://www.fon.hum.uva.nl/praat/manual/Source-filter_synthesis.html) · [CCRMA「Singing Kelly-Lochbaum Vocal Tract」](https://ccrma.stanford.edu/~jos/pasp/Singing_Kelly_Lochbaum_Vocal_Tract.html) · [Synthesizer.ts](https://github.com/chdh/pink-trombone-mod/blob/359c2d3b42b10280404c1650dc601902112b4c90/src/Synthesizer.ts) · [Glottis.ts](https://github.com/chdh/pink-trombone-mod/blob/359c2d3b42b10280404c1650dc601902112b4c90/src/Glottis.ts) · [Tract.ts](https://github.com/chdh/pink-trombone-mod/blob/359c2d3b42b10280404c1650dc601902112b4c90/src/Tract.ts) · [noroi-iwai 研究记录「声音的做法」](../research/noroi-iwai.md#4-声音的做法)

## ⑧ 配乐

配乐风格和情绪不是同一件事：同属电影配乐，可以是希望、悲伤、幽默或紧张。下列是常用选择，具体曲目的乐器、节奏与情绪以曲目本身为准；分类依据是 [Mixkit 的 Genre、Mood、Instrument 标签](https://mixkit.co/free-stock-music/)。

### 企业背景乐与电子节拍

- **一句话**：稳定重复的节奏在底下向前走，给产品和信息一个持续推进的感觉。
- **适合**：产品演示、科技和企业介绍；基调可积极、自信或平静，不能把「企业音乐」一概当成激昂。很强的节拍不适合所有安静叙述。
- **标志特征**：可听到重复的节拍或伴奏型；分类常包含 bass、drums、electronic，曲目可标为 positive、driving，也可为 relaxed、calm。
- **样片**：[Mixkit Corporate Music](https://mixkit.co/free-stock-music/corporate-music/) 中的《Pop Track 03》《Curiosity》（Stock Music Free License，仅试听）。
- **出处**：[Mixkit Corporate Music 曲目及情绪、乐器、用途标签](https://mixkit.co/free-stock-music/corporate-music/)；适配产品片是据其 technology、corporate 等标签作的归纳，不是单一音乐流派的严格定义。

### 原声吉他与轻快民谣

- **一句话**：像有人轻轻弹着吉他，亲近、日常，旋律和节拍通常容易跟上。
- **适合**：生活方式、家庭、轻松教学和温暖的品牌内容；轻快版本不适合直接套在悲剧或严肃风险说明上。
- **标志特征**：常见原声吉他、拨弦、轻打击乐；情绪可为 happy、friendly、carefree，不要求每首都有同一编制。
- **样片**：[Mixkit Folk Pop](https://mixkit.co/free-stock-music/folk-pop/) 中的《Smile》《Summer Fun》（Stock Music Free License，仅试听）。
- **出处**：[Mixkit Folk Pop](https://mixkit.co/free-stock-music/folk-pop/) 的乐器、情绪和 lifestyle 标签；上述类型适配为用途归纳。

### 氛围电子与持续铺底

- **一句话**：音乐像一层空气铺在画面下面，不一定有很显眼的旋律和鼓点。
- **适合**：空间、自然、沉思或科幻气氛；可以安静，也可以神秘不安，不能把 ambient 直接等同于放松。
- **标志特征**：常见持续合成器音色和较长的声音尾部；标签既有 meditative、relaxed，也有 mysterious、space。
- **样片**：[Mixkit Ambient](https://mixkit.co/free-stock-music/ambient/) 中的《Relax Beat》《Feedback Dreams》（Stock Music Free License，仅试听）。
- **出处**：[Mixkit Ambient](https://mixkit.co/free-stock-music/ambient/) 的曲目、合成器与情绪标签；用途依具体曲目归纳。

### 钢琴、弦乐与电影配乐

- **一句话**：用旋律、和声和配器的变化，把一段叙述里的期待、感动或失落带出来。
- **适合**：人物故事、回忆、纪录式叙述和有情绪转折的品牌片；强调史诗感的版本会给简单说明增加额外的戏剧意味。
- **标志特征**：曲目可包含钢琴、弦乐、铜管和打击乐；同一 film score 分类同时有 reflective、melancholic、hopeful、humorous，不能只靠分类名定情绪。
- **样片**：[Mixkit Film Score](https://mixkit.co/free-stock-music/film-score/) 中的《Silent Descent》《Discover》《Secret Garden》（Stock Music Free License，仅试听）。
- **出处**：[Mixkit Film Score](https://mixkit.co/free-stock-music/film-score/) 的曲目与标签；[耶鲁 Sound，SOUND BRIDGE、DIEGETIC/NON-DIEGETIC SOUND](https://filmanalysis.yale.edu/sound/) 对音乐与场景情绪的分析。

### 摇滚与强节奏音乐

- **一句话**：鼓、低音和吉他把动作往前推，听起来更有冲劲。
- **适合**：运动、动作、竞赛和强调能量的活动宣传；不适合所有需要从容理解的信息段落。摇滚也有反思、舒缓的曲目。
- **标志特征**：强节奏版本常有明确鼓点和重复段落；曲目标签可为 energetic、driving、aggressive，其他曲目也会标 reflective、melancholic。
- **样片**：[Mixkit Rock](https://mixkit.co/free-stock-music/rock/) 中的《K.O.》《Sports Rock》（Stock Music Free License，仅试听）。
- **出处**：[Mixkit Rock](https://mixkit.co/free-stock-music/rock/) 的 sports、action、乐器和情绪标签；适用范围是用途归纳。

### 爵士与休闲音乐

- **一句话**：带有爵士乐器和节奏感觉，可以像轻松交谈，也可以有俏皮或浪漫的气氛。
- **适合**：都市生活、餐饮、轻喜剧和休闲场景；不是所有爵士都慢，也不是所有曲目都适合严肃解释。
- **标志特征**：示例常见低音、鼓、铜管或木管；分类同时包含 relaxed、romantic、humorous、lively 等不同情绪。
- **样片**：[Mixkit Jazz](https://mixkit.co/free-stock-music/jazz/) 中的《Upbeat Jazz》《Smooth Like Jazz》（Stock Music Free License，仅试听）。
- **出处**：[Mixkit Jazz](https://mixkit.co/free-stock-music/jazz/) 的曲目和 comedy、city、cocktail lounge 等标签；场景适配是用途归纳。

### 紧张与悬念配乐

- **一句话**：让人感觉事情还没有解决，似乎有什么正在逼近。
- **适合**：悬疑、调查、惊悚和危险揭示；不适合把中性事实无意渲染成威胁。
- **标志特征**：可由持续低音、重复脉冲、打击乐或不安的音色构成；紧张是情绪标签，既可来自电子音乐，也可来自电影配乐。
- **样片**：[Mixkit Tension](https://mixkit.co/free-stock-music/mood/tension/) 中的《Echoes》《Fallen (Asper)》（Stock Music Free License，仅试听）。
- **出处**：[Mixkit Tension](https://mixkit.co/free-stock-music/mood/tension/) 的 drone、atmospheres、mysterious、thriller 等标签；[耶鲁 Sound 对《司汤达综合征》中不安配乐的分析](https://filmanalysis.yale.edu/sound/)。

### 铺底配乐与米老鼠式对点

- **一句话**　铺底配乐跟着整段戏的情绪走，米老鼠式配乐用音符、节奏或音高走势追随一连串动作。
- **适合**　铺底适合对白、细碎拟音和需要连贯情绪的段落。密集对点适合节奏本身就是笑点的表演，例如乐句逐次呼应踮脚、停步和失衡。两种做法可以同段并用，铺底中只在少数动作上响起重音。
- **标志特征**　铺底的乐句可跨越动作或剪切，独立维持一段情绪。米老鼠式对点可以在画面上逐一指出音型对应的动作，音乐会随动作量改变节奏密度。
- **出处**　Berklee 的配乐课程第 8、10 课涵盖随画面写作和铺底。Lea Jacobs 分析动画中音乐与动作的节奏同步。[Berklee「Film Scoring 101」](https://online.berklee.edu/courses/film-scoring-101) · [*Film Rhythm after Sound* 第 3 章「Mickey Mousing Reconsidered」](https://www.ucpress.edu/books/film-rhythm-after-sound/paper)

### 主题动机

- **一句话**　短到能记住的一小段音乐，和人物、地方或情绪反复联系起来。
- **适合**　提示人物或情绪回来，或让前段留下的一小截旋律在后段得到回应。
- **标志特征**　经过移调、换乐器或改速度，观众仍可凭节奏、音程或旋律方向辨认两处是同一动机。
- **关键技法**　动机可单独露出、发展成较长乐句，也可换和声与配器讲出不同情绪。一期内实际怎样发展，见小样的配乐思路。[纯代码小样的声音设计](../../episodes/pure-code-sample/sound-design.md#配乐的思路)
- **出处**　Berklee 的 Motific Writing 和 Theme Adaptation 课程内容涵盖短动机写作、主题适配与变奏。[Berklee「Film Scoring 101」](https://online.berklee.edu/courses/film-scoring-101)

### 音乐强调音、速度图与对点

- **一句话**　强调音用一次音乐重音标出某个画面时刻，速度图让音乐拍点能对上选定的画面时刻。
- **适合**　揭示、碰撞、动作转折等需要突出一拍的地方。乐句还要顺着几个相隔不等的时刻往前走时，速度图可在各乐句里维持合适的拍感。
- **标志特征**　对点（hit point）在画面上有帧号或时间码，在音乐上有拍位或可辨认的音符、和弦起音。速度图描述节拍速度沿时间的变化，节拍变化处仍能听出乐句的连贯性。
- **关键技法**　重音可以是有清楚起音的单音、和弦或乐句中的力度变化。时长不等的锚点可通过选择拍位、局部换速或调整拍号与小节长度来容纳。独立的撞击声和提示声另有条目。[转场声与强调声](#转场声与强调声)
- **出处**　Berklee 第 6–8 课涵盖标记、速度与拍号图以及随画面写作。Ableton 的视频章说明 hit point 和音乐拍位的同步关系。[Berklee「Film Scoring 101」](https://online.berklee.edu/courses/film-scoring-101) · [Ableton「Working with Video」](https://www.ableton.com/en/manual/working-with-video/)

### 剧中声音转成配乐

- **一句话**　故事里有人哼过或弹过的旋律，后来由配乐接过去，观众还能认出来。
- **适合**　把早先的声源变成后段的回忆或情绪线索，也可以在同一段里让听觉视角从场景移到配乐。
- **标志特征**　第一次能从环境、声像或画面定位到声源。接过去以后，音色、配器或空间感改变，旋律或节奏中的辨认线索保存了下来。
- **关键技法**　配乐可以接唱原有的下一拍，也可以在相隔数镜后重现同一动机。音高轮廓或节奏保持可辨，房间色彩或声像随声源归属改变。同一声音跨剪切时也涉及声音桥。[声音桥](#声音桥)
- **出处**　耶鲁电影分析教材解释剧内与剧外声音以及声音来源的重新理解。保留动机而变配器的用途参照主题适配教学。[耶鲁「Sound」，DIEGETIC/NON-DIEGETIC SOUND、OFFSCREEN SOUND](https://filmanalysis.yale.edu/sound/) · [Berklee「Film Scoring 101」，Theme Adaptation](https://online.berklee.edu/courses/film-scoring-101)

## ⑧ 音效

### 动作与材质声

- **一句话**：脚步、翻纸、敲击等声音，让观众感觉物体确实在动、在接触。
- **适合**：需要实体感的动画、动作演示和故事；声音的材质、距离与动作不一致时，会改变对物体的理解。
- **标志特征**：声音起点与接触、落地等事件相对应，音色能提示材质；后期加入的声音也可以与画面同步。
- **样片**：[Mixkit Footsteps](https://mixkit.co/free-sound-effects/footsteps/)（Sound Effects Free License，仅试听）。
- **出处**：[耶鲁 Sound，POSTSYNCHRONIZATION DUBBING、SYNCHRONOUS SOUND、SOUND PERSPECTIVE](https://filmanalysis.yale.edu/sound/)；[Mixkit Footsteps](https://mixkit.co/free-sound-effects/footsteps/) 的动作声音示例。

### 拟音（动作、脚步、羽毛与道具）

- **一句话**　为画面里的表演和接触补出同步的细小声响，让观众听出动作的重量和材质。
- **适合**　近处脚步、身体运动、翅膀张合、手与道具的互动。动作与声音起点的对应关系见已有条目。[动作与材质声](#动作与材质声)
- **标志特征**　脚步的间隔、强弱和着地质地随步态与表面改变。羽毛窸窣和振翅扫过可分别听出细碎摩擦与较宽的空气声。道具拿起、碰撞、放下时有各自的起音和余振。
- **关键技法**　动作声可以用衣物或羽片的摩擦和气流层表达。脚步的主体是触地瞬态，后面可带湿泥吸附、水洼溅水或鞋底离地的声音。羽毛可用短促的轻擦模拟细部，翅膀的空气层可参考快速开合轻质材料的拟音。道具可分接触瞬态和由材料、空腔或松动部件引出的衰减声，例如竹篮碰擦与吱呀。分解为瞬态、短噪声和余振也便于独立合成。
- **出处**　Berklee 说明脚步、衣物和道具的拟音分工。乌得勒支艺术大学教材第 114 页讨论拟音脚步和人的步态，Science World 展示用轻开合雨伞模仿翅膀。[Berklee「Foley Artist」](https://www.berklee.edu/careers/roles/foley-artist) · [HKU《The Sound Track》](https://www.hku.nl/getmedia/4bb61eb2-c777-4eb3-ab13-83251a22ea8b/HKU-The-Sound-Track-Engels-leesbare-pdf.pdf#page=115) · [Science World「Foley Artist Recipe Book」](https://www.scienceworld.ca/stories/foley-artist-recipe-book/)

### 树麻雀叫声

- **一句话**　树麻雀（*Passer montanus*）的接触叫是短促的单音节，警报叫可以由几个有谐波的短音组成。
- **适合**　用频率走势、时长与重复方式区分呼应同伴的接触叫和捕食者接近时的警报叫。
- **标志特征**　韩国多点野外录音研究的接触叫与警报叫合计约在 1–10 kHz。A 型接触叫在窝和繁殖点附近出现，B 型接触叫频率范围更高、时长更长。警报叫含 1–3 个具谐波结构的音符。[Cho 等，摘要及 Methods](https://doi.org/10.1038/s41598-025-88287-8)
- **关键技法**　图 3 的示例谱图可作为调频和包络参照。A 型约 60 ms，主能量纹从约 3 kHz 迅速上扫至 5–6 kHz，回落后留一小段低频余音。B 型约 75 ms，从约 3.5 kHz 上扫至约 6.5 kHz 后回落。图 1 拟合线随录音点噪声变化，A 型整音节能量峰约 3.5–4.5 kHz，B 型约 3.7–4.7 kHz。示例警报叫有两个音符，起音相隔约 80 ms。上述图读数对应所示录音或拟合线。[论文图 1](https://pmc-oa-opendata.s3.amazonaws.com/PMC11825673.1/41598_2025_88287_Fig1_HTML.jpg) · [论文图 3](https://pmc-oa-opendata.s3.amazonaws.com/PMC11825673.1/41598_2025_88287_Fig3_HTML.jpg)
- **样片**　Jarek Matusiak 的树麻雀录音 XC42213（CC BY-NC-ND 2.5，仅在线试听）可作叫声成串的节奏参照。档案类型标为「call」。[英国皇家鸟类保护协会（RSPB）树麻雀页面](https://www.rspb.org.uk/birds-and-wildlife/tree-sparrow) · [XC42213 原录音与许可](https://xeno-canto.org/42213/embed)
- **出处**　Cho、Lee、Jang、Son、Sung，2025 年发表于《Scientific Reports》。音节类型见 Methods，峰值频率指单个发声单元内能量最高的频率。图 1 给出实测值和拟合趋势，图 3 给出各类型示例。[论文、图表及测量口径](https://doi.org/10.1038/s41598-025-88287-8)

### 环境与空间声

- **一句话**：雨声、人群、房间或机器的底声，让人知道故事发生在哪里。
- **适合**：交代地点、保持空间连续性，以及提示画面外还有什么；以抽象图形为主的说明片不一定需要拟造一个真实场所。
- **标志特征**：声音可持续存在，不必每次都有可见声源；远近、清晰度、音量与混响共同形成空间感觉。
- **样片**：[Mixkit Ambience](https://mixkit.co/free-sound-effects/ambience/)（Sound Effects Free License，仅试听）；[耶鲁 SOUND PERSPECTIVE 的《安倍逊大族》片段](https://filmanalysis.yale.edu/sound/)（电影版权保留，仅观看）。
- **出处**：[耶鲁 Sound，OFFSCREEN SOUND、SOUND PERSPECTIVE](https://filmanalysis.yale.edu/sound/)；[Mixkit Ambience](https://mixkit.co/free-sound-effects/ambience/)。

### 雨声

- **一句话**　大雨是成千上万个雨滴的撞击叠成的宽带「沙」声，加上近处听得清的撞击、雨打水面的「叮咚」和檐口的流水。
- **适合**　雨景的环境声，以及纯代码片子里要合成雨的时候。
- **标志特征**　远处是连续的宽带声，随阵风成片起伏，不是一条不变的噪声。近处的撞击能听出落在什么上（瓦、木板、叶子、竹子）。只有水面上才有短促、往上滑的「叮咚」，密度远低于撞击。只用低通噪声加随机正弦「叮」，听起来更像油锅或电流声（《雨后》预演，#186）。
- **关键技法**　分层合成。远处的雨幕是大量撞击统计叠加的宽带噪声，几路独立噪声左右去相关，整体随阵风起伏。近处的撞击按材质给不同的瞬态和共振，按泊松过程随机出现，密度跟雨量走，每一下的大小、音色、声像都不同。雨滴落进水里会带进一个小气泡，气泡振动发出一声频率往上滑的短音，频率由气泡大小决定（Minnaert 共振），流水、雨打水面的声音都可以由大量这样的气泡音随机叠加合成。流水和檐口落水单独一层，最近的一股要听得出位置。
- **素材来源**　已用方法：《雨后》正片（spec #168）按这几层用 Node 合成，做法和分层见 [本期声音设计](../../episodes/after-rain/sound-design.md)「雨声要像真的」；退雨按画面编排成远处先停、近处后停、大水滴最后停，这是本期的声画安排，不是雨声的通用特征。
- **出处**　van den Doel 指出液体发声的基本机制是气泡的声辐射，给出单个气泡的声音模型，并用它随机合成溪流、倒水、雨和浪的声音。[van den Doel，〈Physically based models for liquid sounds〉，ACM TAP 第 2 卷第 4 期，2005](https://doi.org/10.1145/1101530.1101554) · [本期声音设计](../../episodes/after-rain/sound-design.md)

### 静默与环境底噪

- **一句话**：片子里的"静默"是安静下来，不是声音断掉：配乐和音效停了，场所里很轻的底声还在。
- **适合**：情绪停顿、喜剧里的一拍留白、大事前后的屏息。声音彻底消失听起来像设备出了故障，不像安静。
- **标志特征**：静默段里仍听得到场所的底声，例如空气、远处的虫鸣、房间的回响；电平明显下降，但不掉到数字静音，也就是波形上的一条平线。进入静默前正在响的声音按自己的余音收完，不在静默开始那一帧被截断。只量"静默区间是不是零"，会把声音断掉判成合格。
- **关键技法**：
  - 静默靠对比做出来：先有声，再撤掉。配乐不出新音，已经响起的音自然衰减。
  - 底噪（room tone，又叫空气声）单独一轨，从头铺到尾，不参与静默和让位。剪开的对白或音效之间的空隙用底噪补上，否则背景声会随片段时有时无。
  - 远处的动物叫声、隔壁的钟声、细碎的窸窣，以及孤立声音上的一点混响，都能让人觉得周围很安静。
- **出处**：Michel Chion，[*Audio-Vision: Sound on Screen*](https://cup.columbia.edu/book/audio-vision/9780231185899)，Claudia Gorbman 译，Columbia University Press，第 57–58 页：静默从来不是中性的空白，是前面听到的声音的反面，是对比的产物；远处动物叫声、钟声、窸窣可作为静默的同义声音。页码与引文据 [Film Quarterly 2016 年的 Chantal Akerman 声音专文](https://filmquarterly.org/2016/09/16/walking-talking-singing-exploding/)转引。[Frame.io Workflow Guide「Roomtone」](https://workflow.frame.io/guide/roomtone)：底噪是录音所在环境的声音，用来填补剪辑留下的空隙，形成一条连续的底。[纯代码小样的声音设计](../../episodes/pure-code-sample/sound-design.md)只作单期实现引用：静默最初做成静音配乐，用户看片两次听出声音断了，过程记在 #157。

### 界面反馈与提示音

- **一句话**：短促的点击、确认或报错声，把一次操作和它的结果连起来。
- **适合**：软件演示、状态变化、成功或错误提示；频繁提示会增加听觉事件数量，重点并非每个元素都响。
- **标志特征**：声音对应可辨认的状态变化；确认、错误、通知可以用不同的短声表达，不需要真实世界的可见发声物体。
- **样片**：[Mixkit Interface](https://mixkit.co/free-sound-effects/interface/)（Sound Effects Free License，仅试听）。
- **出处**：[Mixkit Interface 的界面、通知和点击声音分类](https://mixkit.co/free-sound-effects/interface/)；将这些声音对应到操作结果是据素材用途作的归纳。

### 转场声与强调声

- **一句话**：「呼」的一下提示移动或换场，短促的撞击声提示一个重点落下。
- **适合**：运动明显的转场、标题揭示和动作重点；平静段落不必因有一次切换就带一次撞击声。
- **标志特征**：扫过声有移动或渐变过程，撞击声有明确的起音；声音与视觉事件相联系，持续时间和尾音影响它占据注意力的范围。
- **样片**：[Mixkit Transition](https://mixkit.co/free-sound-effects/transition/)、[Mixkit Impact](https://mixkit.co/free-sound-effects/impact/)（Sound Effects Free License，仅试听）。
- **出处**：[Mixkit Transition](https://mixkit.co/free-sound-effects/transition/)、[Impact](https://mixkit.co/free-sound-effects/impact/) 的分类与声音示例；[耶鲁 Sound，SYNCHRONOUS SOUND、Quality](https://filmanalysis.yale.edu/sound/) 对同步、音色、延音等属性的说明。适用范围为用途归纳。

### 声音桥

- **一句话**：画面已经换了，上一场的声音还在；或者下一场的声音已经传来，画面还没过去。
- **适合**：连接场景、维持情绪，或让观众提前感知下一处空间；它不一定是额外添加的「呼」声，也可以是对白、环境或音乐。
- **标志特征**：声音边界与画面切点错开；观众能辨认声音跨越了两个镜头或场景。
- **样片**：[耶鲁 SOUND BRIDGE 中的《一一》片段](https://filmanalysis.yale.edu/sound/)（电影版权保留，仅观看教学片段）。
- **出处**：[耶鲁 Film Analysis，SOUND BRIDGE](https://filmanalysis.yale.edu/sound/)：跨场声音的定义、连续性和创造性用法。

### 本仓库来源：纯代码合成

- **一句话**：配乐和音效不用任何采样或素材库，乐器和音效都由仓库里的 Node 代码算出来，按乐谱和画面事件混音。
- **适合**：纯代码的片子，以及要求每个声音都能复现、来源清单天然干净的片子。乐器的真实感不如录音，要靠试听判断能不能接受。
- **标志特征**：每个声音由一条生成命令和固定种子产生，同一种子合成两次结果完全相同；音效按画面事件的对齐点落位，落位误差可以按采样数量出来。
- **素材来源**：已用方法，见纯代码小样（spec #147）：毡锤钢琴、弦乐、竖琴、钟琴和十四种音效全部合成。音高、电平和落位都量过，用户试听前发现不了"静默被做成断音"这类设计错误，见上文「静默与环境底噪」。
- **出处**：[纯代码小样的声音合成说明](../../episodes/pure-code-sample/sound/README.md)、[研究记录「声音的做法」](../research/noroi-iwai.md#4-声音的做法)：参照片的配乐、音效（noroi-iwai 还有演唱）都由代码合成。

## ⑫ 混音与响度

### 分轨平衡与人声让位

- **一句话**：旁白、音乐和音效各有自己的位置；有人说话时，背景音乐可以暂时退后。
- **适合**：以讲清内容为主的视频；无旁白的音乐片段可由音乐或音效承担注意力中心，不必套同一种人声优先关系。
- **标志特征**：对白、音乐、音效和环境声可分别控制；压低背景音（ducking）表现为说话时背景变小，结束后平滑恢复。整片响度合格不能证明每个字都没被音乐盖住。
- **关键技法**：分轨增益和音量包络控制相对平衡；ducking 控制让位量和过渡快慢，没有所有曲目通用的固定电平差。
- **出处**：[Adobe Essential Sound](https://helpx.adobe.com/premiere/desktop/add-audio-effects/adjust-volume-and-levels/audio-editing-with-essential-sound-panel.html) 区分 Dialogue、Music、SFX、Ambience；[Adobe 自动压低背景音](https://helpx.adobe.com/premiere/desktop/add-audio-effects/adjust-volume-and-levels/automatically-duck-audio.html) 说明让位量、触发和淡变。NASA 朋克开场的混音经验（该期已移出仓库，见提交 `ffe625a`）只作为单期实现引用，其占位音色及平衡并非通用定稿。

### 对白清理、均衡与动态控制

- **一句话**：减少不需要的噪声、调整声音的频率成分，并控制忽大忽小，让内容更容易听懂。
- **适合**：噪声、音色差异或句间大小变化已经干扰理解的对白；不是所有声音都需要加相同的处理。
- **标志特征**：清理针对背景噪声、嗡声、齿音等问题；均衡（EQ）改变频率平衡；动态处理改变大小声之间的关系。这些处理与单纯把整条音轨调大不是一回事。
- **关键技法**：降噪、EQ、压缩器分别对应不同问题；压缩处理的是动态，不等于降低文件体积的音频编码压缩。
- **出处**：[Adobe Essential Sound 对对白响度、降噪、compression 和 EQ 的说明](https://helpx.adobe.com/premiere/desktop/add-audio-effects/adjust-volume-and-levels/audio-editing-with-essential-sound-panel.html)；[Adobe Repair dialogue](https://helpx.adobe.com/premiere/desktop/add-audio-effects/adjust-volume-and-levels/repair-dialogue.html)。

### 空间感与混响

- **一句话**：声音像在耳边、房间里还是远处，不只取决于大小，还取决于音色、方向和回声尾巴。
- **适合**：有明确空间的故事和音效；直接面向观众的解释声可保持较近、较清楚的感觉，不必模仿画面里每一个房间。
- **标志特征**：远近变化伴随清晰度和混响变化；环境、音效和对白的空间关系可相互呼应。
- **样片**：[耶鲁 SOUND PERSPECTIVE 的《安倍逊大族》片段](https://filmanalysis.yale.edu/sound/)（电影版权保留，仅观看）：门内外的人声变化用于分析距离感。
- **出处**：[耶鲁 Sound，SOUND PERSPECTIVE、Quality](https://filmanalysis.yale.edu/sound/)；解释声保持清楚的适用描述，依据该教材对空间写实与叙述可懂度取舍的分析归纳。

### 声音远近与景别

- **一句话**　远处的声听起来更轻、更少细节，近处的声有更明显的直接声和材质细节。
- **适合**　同一角色从近景到远景、声源在画外靠近或远离、隔门隔墙。景别改变时，声音视点可以随观察位置移动，也可以留在人物身边，延续同一听觉视点。
- **标志特征**　听觉视点移近时，同一接触的直接声更突出，起音与细节更清楚。移远时，直达声减弱，有明显反射的空间里其占比也常下降。墙后的人声高频和细节衰减，仍可感到语调或起伏。这些线索与既有的空间处理可以配合。[空间感与混响](#空间感与混响)
- **关键技法**　距离感由电平、直达声与混响的比例和频谱一起表达。隔墙声可用高频衰减模拟遮挡造成的闷感，保留适量低中频和来自对应空间的反射。景别提供叙事线索，实际电平和混响比例取决于声源、距离和场所。
- **出处**　Kolarik 等综述声音电平、直达与混响能量比、频谱等距离线索及各自适用的距离。耶鲁教材举出门内外的声音透视及与对白可懂度的取舍。[Kolarik 等「Auditory distance perception in humans」](https://doi.org/10.3758/s13414-015-1015-1) · [耶鲁「SOUND PERSPECTIVE」](https://filmanalysis.yale.edu/sound/)

### 响度、真峰值与响度范围

- **一句话**：响度描述一段内容听起来多响，真峰值描述最尖的波形有多高，响度范围描述节目内部大小声变化的分布。
- **适合**：比较成片的整体大小、判断技术峰值与动态情况；它们不能替代对读音、情绪或人声可懂度的判断。
- **标志特征**：综合响度（Integrated，LUFS；LKFS 为等价命名）对应节目整体测量；真峰值用 dBTP 表示，包含重建波形的峰值；LRA 用 LU 表示节目内部的响度变化。只对齐峰值，并不能让两段声音听起来一样响。
- **关键技法**：响度归一化与动态压缩是不同概念：整体增益改变平均大小，压缩改变强弱关系；峰值余量可能限制整体增益。测量的节目范围、声道与计量口径都会影响结果。
- **出处**：[ITU-R BS.1770](https://www.itu.int/rec/R-REC-BS.1770/en) 定义节目响度和真峰值算法；[EBU R 128，第 3–5 页](https://tech.ebu.ch/docs/r/r128.pdf) 定义 Programme Loudness、Maximum True Peak Level、LRA 及单位；[Spotify 的增益与峰值余量说明](https://support.spotify.com/us/artists/article/loudness-normalization/)。

### 本仓库成片标准

- **一句话**：工作室已有统一的成片响度目标、容差和真峰值上限，数字只保留在制作工作流中。
- **适合**：本仓库一般成片验收；平台或委托方另有交付规格时，其适用对象和测量口径需要单独区分。
- **标志特征**：目标、容差、真峰值上限及 LRA 的处理均引用同一处约定；本页不另立数字，也不把某期内部混音参数当作整仓标准。
- **出处**：[制作工作流「一期视频」的成片响度条目](../workflow/README.md#一期视频)；NASA 朋克开场 README 的混音与成片实测（该期已移出仓库，见提交 `ffe625a`）只引用，不重复抄录响度数字。

### 广播与广播内容流媒体：EBU R 128 系列

- **一句话**：广播节目有明确的响度、容差和真峰值推荐；流媒体分发还考虑设备、播放环境和元数据。
- **适合**：采用 EBU 体系的广播或交付合同；它是行业推荐体系，不是所有网络视频平台的共同上传规则。
- **标志特征**：R 128 的节目整体测量、峰值限制与 R 128 s2 的流媒体分发条件有不同适用范围；分发响度、制作响度和设备播放调整不能直接混为一项。
- **出处**：[EBU R 128，第 3–4 页的目标、容差及最大真峰值条款](https://tech.ebu.ch/docs/r/r128.pdf)；[EBU R 128 s2，第 3–5 页的流媒体与设备条件](https://tech.ebu.ch/docs/r/r128s2.pdf)。所有响度数字以原文为准，本页只引用。

### Spotify：音乐播放归一化与母带建议

- **一句话**：Spotify 的音乐播放可以自动调整大小，让不同歌曲衔接时不至于忽大忽小；官方也给出母带响度与峰值建议。
- **适合**：交付 Spotify 音乐时理解其播放和母带规则；这页针对音乐，不能直接充当视频、播客或其他平台的验收规格。
- **标志特征**：归一化发生在播放时；普通、较响、较轻的播放设置有不同目标，网页播放器和部分第三方设备行为也不同。母带建议与播放档位是两个不同概念。
- **出处**：[Spotify for Artists「Loudness normalization on Spotify」](https://support.spotify.com/us/artists/article/loudness-normalization/) 的 How we adjust loudness、Premium listeners、Mastering tips：目标及峰值数字只引用该页，不在本文复制。

### YouTube：上传编码建议与响度信息的边界

- **一句话**：YouTube 已核实的上传指南给出音频编码、声道与采样率建议，但该页没有列综合响度目标。
- **适合**：理解上传文件的音频格式；不能据这份文档把网上流传的某个 LUFS 数字写成官方上传门槛。
- **标志特征**：编码参数与响度参数分别看待；「这份上传指南未列响度目标」不等于「平台不会进行声音处理」。
- **出处**：[YouTube「Recommended upload encoding settings」](https://support.google.com/youtube/answer/1722171?hl=en)，Audio codec、Channels、Sample rate、Recommended audio bitrates。本条只陈述已核实页面的内容，不补写未核实的播放归一化数值。

### Vimeo：上传音频格式与响度信息的边界

- **一句话**：Vimeo 的上传压缩指南有音频格式建议；该页同样没有列出 LUFS 目标。
- **适合**：理解 Vimeo 上传文件的编码、数据率和采样率；格式合规与混音听感、响度合格需要分别理解。
- **标志特征**：Audio guidelines 涵盖 codec、data rate、sample rate；不能从这些值推导出官方响度门槛，也不能据此推断其全部播放处理。
- **出处**：[Vimeo「Video and audio compression guidelines」](https://help.vimeo.com/hc/en-us/articles/12426043233169-Video-and-audio-compression-guidelines)，Audio guidelines。本文没有可信的一方依据可给这份指南补一个响度目标，因此不列数字。

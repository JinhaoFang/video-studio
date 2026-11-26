# 镜头语言

对应「一期视频」部门表里摄影的 ⑦ 镜头语言：机位图、景别、角度、焦距与景深、运镜、构图。只写知识：有哪些选项、各是什么意思、适合什么情况、样片和出处；不写先做什么、后做什么，制作步骤见 `docs/workflow/README.md`「一期视频」。条目格式见 [visual-style.md](visual-style.md)「条目格式」。

本仓库自己总结的运镜规则见 `docs/roles/design.md`「镜头运动」，本文只引用，不另写一套。

景别说的是主体在画面里有多大，角度说的是从哪里看，运镜说的是观看位置或方向怎样改变，构图说的是画面内各元素怎样摆。这些概念也适用于动画；实现手段可以不同。景别的边界随作品而变，下面的人体范围是便于辨认的参照，不是裁切规范。

「适合」是依据各条所述效果给出的应用建议，效果还受内容、声音和上下文影响，不是某个角度必然代表某种情绪。「样片」栏区分片段、剧照和示意图；电影材料未见可复用许可，原片权利归各权利人，链接仅供观看、比较，不搬运。

## 机位

### 机位图

- **一句话**　从上往下看整个场景的一张图，让人看出每个镜头从哪里拍、朝哪里拍，以及主体在哪里、往哪里动。
- **适合**　核对同一场景里多个镜头的空间关系，把镜头剧本中的镜号与场景位置对应起来。俯视图只给出水平位置和朝向，机位高度、仰俯角和实际构图见对应镜头。
- **标志特征**　同一份场景平面上能找到地标、主体位置、主体动线、轴线，以及图中每个镜头的编号、机位和朝向。
- **关键技法**　机位与朝向是一组标记，主体动线与轴线各有图例。日式动画的镜头版面（layout）呈现镜头里的画面，俯视平面图可作为它的空间参照。轴线、30° 规则和屏幕方向见 [⑨ 剪辑](editing.md#-剪辑)。
- **样片**　Shot Designer 的产品示意图展示俯视标记如何关联机位、人物及镜头清单。示意图归 Hollywood Camera Work 所有，仅供在线对照。[Shot Designer](https://www.hollywoodcamerawork.com/shot-designer.html#af_position_1)
- **出处**　日本动画人·演出协会（JAniCA）的课程用俯视平面图解释镜头草版面的取景。Shot Designer 的产品说明用同一平面图展示相机位置、朝向和人物走位。[JAniCA「平面図とラフレイアウトの画面との関係」](https://www.janica.jp/course/perspective/basic20150920.html) · [Shot Designer「A Camera Diagram That Makes Itself」及「Animate Action in Real-Time」](https://www.hollywoodcamerawork.com/shot-designer.html#af_position_1)

俯视示意，图中符号按本例图例读。`H` 是屋子，`A` 是路口，`B` 是院门，点线表示路口到院门的轴线。`P0`、`P1` 是主体的起止位置，横向箭头表示走位。`S01`、`S02` 是镜头剧本里的镜号，朝向箭头分别指向起点和终点。

```text
+-----------------------------------------+
|                    H                    |
|                                         |
| A . . . . . . . . . . . . . . . . . B   |
| P0 -------------------------------> P1  |
| ^                                   ^   |
| |                                   |   |
| S01                                 S02 |
+-----------------------------------------+
```

## 景别

### 大远景

- **一句话**：环境占了大部分画面，人很小，甚至要找一找才看得见。
- **适合**：交代故事发生在哪里、展示规模，或表现人在环境中的渺小；需要看清表情、字或操作细节时不合适。
- **标志特征**：建筑、地貌或人群成为主要形状；单个人物只占很小一块。
- **关键技法**：主体与大范围环境同框，以两者的大小关系传达信息。
- **样片**：[耶鲁「EXTREME LONG SHOT」中的《大开眼戒》《夏天的故事》](https://filmanalysis.yale.edu/cinematography/#extremelongshot)（剧照；原片版权，仅观看）。
- **出处**：耶鲁大学 Film Analysis，[Cinematography — Scale / Extreme Long Shot](https://filmanalysis.yale.edu/cinematography/#scale)：主体很小，可用于建立场景，也可承担段落之间的过渡。

### 全景

- **一句话**：能看到一个人的全身，也能看出他周围是什么地方。
- **适合**：完整的动作、舞蹈、人物走位和人与环境的关系；细微表情容易被环境分走注意力。
- **标志特征**：人物从头到脚可见，全身接近画面高度，周围仍有活动空间。
- **关键技法**：用完整身体和周围空间呈现动作，动作可以在同一个取景范围内展开。
- **样片**：[耶鲁「LONG SHOT」中的《大开眼戒》《夏天的故事》](https://filmanalysis.yale.edu/cinematography/#longshot)（剧照；原片版权，仅观看）。
- **出处**：耶鲁大学 Film Analysis，[Long Shot](https://filmanalysis.yale.edu/cinematography/#longshot)：全身动作与环境能够同时呈现。

### 中景

- **一句话**：大致看到人的腰部以上，既看得见脸，也看得见手势。
- **适合**：对话、人物讲解、两三个人的互动；环境全貌和很小的操作细节不容易兼顾。
- **标志特征**：人物以腰部以上为主要范围，同框可以容纳多个人。
- **关键技法**：脸部反应与上半身动作在同一画面内可辨。
- **样片**：[StudioBinder 镜头大全中的「Medium Shot」示例](https://www.studiobinder.com/blog/ultimate-guide-to-camera-shots/)（剧照与教学示例；未见可复用许可，仅观看）。
- **出处**：哥伦比亚大学 Film Language Glossary，[Medium Shot](https://filmglossary.ccnmtl.columbia.edu/term/medium-shot/)：通常是腰部以上，可容纳多个人物。

### 中近景

- **一句话**：大致看到胸部以上，注意力更多落在脸和说话反应上。
- **适合**：访谈、人物自述、解释重点；需要完整手势或人物走位时范围偏紧。
- **标志特征**：胸部以上占据主要画面，环境仍能提供少量背景信息。
- **关键技法**：用比中景更紧的取景加强脸部信息，同时保留肩胸的姿态。
- **样片**：[耶鲁「MEDIUM CLOSE-UP」中的《大开眼戒》《夏天的故事》](https://filmanalysis.yale.edu/cinematography/#mediumcloseup)（剧照；原片版权，仅观看）。
- **出处**：耶鲁大学 Film Analysis，[Medium Close-Up](https://filmanalysis.yale.edu/cinematography/#mediumcloseup)：以胸部以上作为常见参照。

### 特写

- **一句话**：一张脸或一个重要物件占了画面的大部分。
- **适合**：突出表情、反应、证据和关键物件；单独使用时难以交代周围空间。
- **标志特征**：头部或相近大小的物体成为主要内容，背景信息明显减少。
- **关键技法**：通过主体相对画面的大小，把观看重点集中到一个对象。
- **样片**：[耶鲁「CLOSE-UP」中的人物与物件示例](https://filmanalysis.yale.edu/cinematography/#closeup)（剧照；原片版权，仅观看）。
- **出处**：耶鲁大学 Film Analysis，[Close-Up](https://filmanalysis.yale.edu/cinematography/#closeup)：景别以同一作品内的相对关系判断，特写也可以没有人物。

### 大特写

- **一句话**：只看眼睛、嘴、手指或物件的一小部分，把很小的细节放得很大。
- **适合**：揭示细节、强调感官体验、制造紧张；需要辨认完整物体或动作关系时信息不足。
- **标志特征**：一个局部占满大部分画面，完整的人或物被裁出画外。
- **关键技法**：局部取景突出细节；动画中也可以直接画出这个局部。
- **样片**：[耶鲁「EXTREME CLOSE-UP」中的《天堂的颜色》《龙猫》等](https://filmanalysis.yale.edu/cinematography/#extremecloseup)（剧照；原片版权，仅观看）。
- **出处**：耶鲁大学 Film Analysis，[Extreme Close-Up](https://filmanalysis.yale.edu/cinematography/#extremecloseup)：可用于身体局部和小物件，并以动画说明同一种效果可以有不同实现。

## 角度

### 平视

- **一句话**：像与对方面对面一样，从大致与眼睛齐平的位置看他。
- **适合**：访谈、日常交流和希望观众贴近人物的片段；需要强调上下位置差异时作用有限。
- **标志特征**：观察高度接近人物眼睛，观看方向没有明显俯下或仰起。
- **关键技法**：观察高度随主体而定，儿童的平视高度与成人不同。
- **样片**：[StudioBinder「Eye-level framing」中的《夜行者》](https://www.studiobinder.com/blog/rules-of-shot-composition-in-film/#5-eye-level)（剧照与教学示例；原片版权，仅观看）。
- **出处**：StudioBinder 原创教学，[Eye-level framing](https://www.studiobinder.com/blog/rules-of-shot-composition-in-film/#5-eye-level)；耶鲁大学 [Level of Framing](https://filmanalysis.yale.edu/cinematography/#levelframe)：观察高度会影响观众与人物的关系。

### 俯拍

- **一句话**：从主体上方向下看，能看见更多顶部和周围布局。
- **适合**：交代位置关系、展示桌面或地面，也可供弱小、受压等情绪方向参考；细腻的正面表情可能不突出。
- **标志特征**：观看方向朝下，主体顶部可见；正上方向下的鸟瞰是其中更极端的角度。
- **关键技法**：观察位置高于主体，并朝主体向下取景；高度与朝向是两个不同因素。
- **样片**：[耶鲁「ANGLE OF FRAMING」中的《天堂的颜色》](https://filmanalysis.yale.edu/cinematography/#angleframe)（剧照；原片版权，仅观看）。
- **出处**：耶鲁大学 Film Analysis，[Angle of Framing](https://filmanalysis.yale.edu/cinematography/#angleframe) 与 [Extreme Long Shot](https://filmanalysis.yale.edu/cinematography/#extremelongshot)：俯视与鸟瞰的形式，以及角度含义随语境变化的例子。

### 仰拍

- **一句话**：从主体下方向上看，让人或物显得高大、占据上方。
- **适合**：强调体量、高度或人物的力量，也可表现另一个人较低的观看位置；不适合把它当成“强大”的固定符号。
- **标志特征**：观看方向朝上，能看到主体下侧，背景常包含上方空间。
- **关键技法**：观察位置低于主体，并朝主体向上取景。
- **样片**：[耶鲁「ANGLE OF FRAMING」中的父亲形象](https://filmanalysis.yale.edu/cinematography/#angleframe)（《天堂的颜色》剧照；原片版权，仅观看）。
- **出处**：耶鲁大学 Film Analysis，[Angle of Framing](https://filmanalysis.yale.edu/cinematography/#angleframe)：同一角度可以突出权势，也可以因情节而产生反讽。

### 倾斜角度

- **一句话**：整个画面像歪了一下，原本水平或竖直的东西变斜了。
- **适合**：失衡、混乱、不安或夸张的动作段落；以清晰阅读和稳定观察为主的内容通常不需要这种干扰。
- **标志特征**：地平线或建筑竖线相对画面边缘倾斜。
- **关键技法**：取景框绕观看方向旋转，改变画面的水平关系。
- **样片**：[耶鲁「CANTED FRAMING」中的《刀马旦》](https://filmanalysis.yale.edu/cinematography/#cantedframe)（剧照；原片版权，仅观看）。
- **出处**：耶鲁大学 Film Analysis，[Canted Framing](https://filmanalysis.yale.edu/cinematography/#cantedframe)：倾斜取景及其混乱、失稳的效果。

## 焦距与景深

### 广角、长焦与透视

- **一句话**　在同一画幅上，广角装进更宽的范围，长焦取更窄的一块，近看还是远看则会改变物体之间看起来的大小关系。
- **适合**　广角近机位能交代大范围环境，强调前后距离。长焦远机位能隔着距离取到近景，或让背景看起来更贴近主体。
- **标志特征**　保持主体在画面中同样大时，广角近机位下近物相对远物显得更大，前后距离感更强。长焦远机位下近远物体的相对大小更接近，背景看起来被拉近。
- **关键技法**　焦距和画幅决定视角。针孔投影下，从同一机位改焦距只改变取景和统一的放大倍率。为维持同一主体大小而移近或移远，才会改变视点和前后物体的大小比例。二维动画可以用不同视点的透视画法表现这种差别，虚拟相机可以用机位距离和视角表现。
- **样片**　Blender 手册展示同一轨道的不同取景范围。页面标为 CC BY-SA 4.0，本处仅供在线对照。[Blender「Lens」](https://docs.blender.org/manual/en/latest/render/cameras.html#lens)
- **出处**　Nikon 说明焦距与视角、放大倍率的关系。MIT 教材给出针孔投影式，画面坐标随焦距放大，并随相机坐标中的深度成反比。[Nikon「Understanding Focal Length」](https://www.nikonusa.com/learn-and-explore/c/tips-and-techniques/understanding-focal-length) · [MIT《Foundations of Computer Vision》第 5 章 §5.3，式 5.3–5.4](https://visionbook.mit.edu/imaging.html#eq-perspctiveProj1)

### 景深、虚焦与分层

- **一句话**　景深是从镜头看过去仍然清楚的那段距离，范围外的东西会虚掉。
- **适合**　浅景深能从环境里突出一张脸或小物件。要同时认出近处动作和远处反应时，多层保持清晰更便于读图。
- **标志特征**　浅景深时焦点附近的轮廓清楚，较近或较远的细节可比焦点更软。深景深时相隔较远的几层仍能看清。移焦时，清晰范围随焦点从一层转到另一层。
- **关键技法**　虚拟镜头的对焦距离定位清晰范围，光圈影响虚焦程度。二维分层画面可给前景、主体和背景各自的清晰度，依它们相对焦点的位置模拟虚焦。各层独立处理能保留焦内主体的边缘，也能区分焦点前后的模糊程度。
- **样片**　《中央车站》的剧照可在线比较同一帧里焦内和焦外的细节。原片版权归权利人，仅供观看。[耶鲁 Film Analysis「Shallow Focus」](https://filmanalysis.yale.edu/cinematography/#shallowfocus)
- **出处**　耶鲁 Film Analysis 定义景深、浅焦、深焦和移焦。Blender 手册列出虚拟相机的对焦距离与光圈参数及虚焦示例。[耶鲁「Depth of Field」](https://filmanalysis.yale.edu/cinematography/#depthoffield) · [耶鲁「Racking Focus」](https://filmanalysis.yale.edu/cinematography/#rackingfocus) · [Blender「Depth of Field」](https://docs.blender.org/manual/en/latest/render/cameras.html#depth-of-field)

## 运镜

### 固定镜头

- **一句话**：观看位置和方向保持不动，让人物或画面里的东西自己动。
- **适合**：看表演、比较关系、阅读文字和观察完整动作；它同样可以紧张或有趣，节奏取决于画面内发生的事。
- **标志特征**：背景的取景关系保持稳定，主体可以进入、离开或穿过画面。
- **关键技法**：相机位置、朝向和取景范围保持固定，变化来自镜头内部。
- **样片**：[StudioBinder「Static Shot or Fixed Shot」中的《非亲兄弟》](https://www.studiobinder.com/blog/ultimate-guide-to-camera-shots/#static-shot)（教学片段；原片版权，仅观看）。
- **出处**：StudioBinder 原创教学，[Static / Fixed Shot](https://www.studiobinder.com/blog/ultimate-guide-to-camera-shots/#static-shot)：固定取景突出主体在环境中的外观、动作和对白。

### 推近与拉远

- **一句话**：像向对象走近，或从对象身边退开，让观看距离连续改变。
- **适合**：推近突出对象和情绪，拉远揭示周围环境或人物处境；需要观众同时看清整幅关系时，过多距离变化会分散注意力。
- **标志特征**：相机在空间中前进或后退；有纵深的场景中，前后景的相对大小与遮挡关系会随之变化。
- **关键技法**：相机沿空间路径移动，取景随距离连续变化。
- **样片**：[耶鲁「TRACKING SHOT」中的列车离开与孩子奔跑](https://filmanalysis.yale.edu/cinematography/#trackingshot)（片段；原片版权，仅观看）。
- **出处**：耶鲁大学 Film Analysis，[Tracking Shot](https://filmanalysis.yale.edu/cinematography/#trackingshot)：相机可以向前、向后或侧向移动；仓库中的具体用法见页首引用。

### 横移与跟拍

- **一句话**：观看位置沿着场景移动，像在旁边陪人走一段。
- **适合**：展示沿途环境、连接相邻位置，或持续跟住运动主体；复杂背景和多层移动可能增加观看负担。
- **标志特征**：相机位置侧向改变；跟拍时取景随主体移动，以保持主体可见。
- **关键技法**：横移描述相机的路径，跟拍描述它在跟着谁；跟拍也可以包含推拉、摇镜或升降。
- **样片**：[耶鲁「TRACKING SHOT」的侧向移动](https://filmanalysis.yale.edu/cinematography/#trackingshot) 与 [「FOLLOWING SHOT」中的舞会](https://filmanalysis.yale.edu/cinematography/#followingshot)（片段；原片版权，仅观看）。
- **出处**：耶鲁大学 Film Analysis，[Tracking Shot](https://filmanalysis.yale.edu/cinematography/#trackingshot) 与 [Following Shot](https://filmanalysis.yale.edu/cinematography/#followingshot)：移动路径与跟随功能的区别。

### 左右摇镜

- **一句话**：站在一个地方向左或向右转头，依次看到同一空间里的不同部分。
- **适合**：连接两个人或位置、跟随横向动作、揭示原本在画外的东西；快速摇动会让细节难以辨认。
- **标志特征**：相机所在位置基本不变，观看方向左右旋转。
- **关键技法**：水平转动相机；速度和揭示内容会影响观众感到从容还是急迫。
- **样片**：[耶鲁「PAN」中的《毒品网络》《司汤达综合征》](https://filmanalysis.yale.edu/cinematography/#pan)（片段；原片版权，仅观看）。
- **出处**：耶鲁大学 Film Analysis，[Pan](https://filmanalysis.yale.edu/cinematography/#pan)：左右旋转直接连接同一空间内的位置，速度有叙事作用。

### 上下摇镜

- **一句话**：站在一个地方抬头或低头，让视线从下往上或从上往下扫过去。
- **适合**：揭示高度、上下位置关系，或延迟露出某个对象；需要同时比较上下内容时，固定全景可能更清楚。
- **标志特征**：相机所在位置基本不变，观看方向上下旋转。
- **关键技法**：垂直转动相机，画外信息随朝向变化逐渐进入画面。
- **样片**：[耶鲁「TILT」中的《围城》](https://filmanalysis.yale.edu/cinematography/#tilt)（片段；原片版权，仅观看）。
- **出处**：耶鲁大学 Film Analysis，[Tilt](https://filmanalysis.yale.edu/cinematography/#tilt)：垂直摇动及其空间揭示、期待与悬念作用。

### 升降镜头

- **一句话**：观看位置本身升高或降低，像搭着一个能在空中移动的平台。
- **适合**：从人物扩展到场景全貌、越过遮挡、建立空间规模；简单的局部说明通常不需要这么大的空间变化。
- **标志特征**：相机的空间高度改变，还可以同时前后或侧向移动。
- **关键技法**：相机沿空间路径升降，与只改变朝向的上下摇镜区分。
- **样片**：[耶鲁「CRANE SHOT」中的《大玩家》](https://filmanalysis.yale.edu/cinematography/#craneshot)（片段；原片版权，仅观看）。
- **出处**：耶鲁大学 Film Analysis，[Crane Shot](https://filmanalysis.yale.edu/cinematography/#craneshot)：空中移动可提供俯瞰感，也可形成流动的长镜头。

### 变焦

- **一句话**：观看位置保持不变，像调整望远镜一样，让画面变近或变远。
- **适合**：把注意力集中到对象或细节，或产生明确的观察感；需要表现实际穿过空间时，它与推拉的效果不同。
- **标志特征**：主体大小和取景范围改变，相机位置保持不变，不产生相机前后移动造成的视差。
- **关键技法**：改变镜头焦距；二维画面的数字放大可以改变取景大小，但不能补出原本没有的空间信息。
- **样片**：[耶鲁「ZOOM SHOT」中的《司汤达综合征》](https://filmanalysis.yale.edu/cinematography/#zoomshot)（片段；原片版权，仅观看）。
- **出处**：耶鲁大学 Film Analysis，[Zoom Shot](https://filmanalysis.yale.edu/cinematography/#zoomshot)：改变焦距以突出人物或画中细节；[Tracking Shot](https://filmanalysis.yale.edu/cinematography/#trackingshot)：相机实际位移的对照定义。

### 手持感

- **一句话**：画面带着人手拿相机时的轻微晃动，像有人就在现场看着。
- **适合**：纪实感、临场感、慌乱或不稳定的主观体验；长时间读字、精确对比和容易晕动的观看场景不适合持续晃动。
- **标志特征**：取景有可见的不规则偏移或转动；运动不一定平滑。
- **关键技法**：手持式运动强调身体带来的不稳定；稳定器跟拍可以很平滑，两者效果有区别。
- **样片**：[耶鲁「HANDHELD CAMERA, STEADYCAM」中的《黑暗中的舞者》](https://filmanalysis.yale.edu/cinematography/#handheldcamera)（片段；原片版权，仅观看）。
- **出处**：耶鲁大学 Film Analysis，[Handheld Camera, Steadycam](https://filmanalysis.yale.edu/cinematography/#handheldcamera)：手持的灵活与晃动、稳定器的平滑效果及其风格化使用。

### 画面震动

- **一句话**　重物一落地，整个取景跟着一颤，再逐渐稳下来。
- **适合**　碰撞、重踏或环境震动能通过画框的短暂扰动让人感到冲击。以读字或观察细小动作见长的画面，剧烈或持续的晃动会遮住信息。
- **标志特征**　场景里的静止边缘随取景一起偏移或转动。冲击附近的偏移较大，后续摆动减弱，并回到原有取景或原有运镜轨迹。
- **关键技法**　震动可视为叠加在运镜上的位移或旋转。振幅表示偏离有多大，时间包络表示幅度如何升到峰值、维持和衰减到零。重击可用较大振幅，短促的硬物撞击和持续振动的薄板对应不同的衰减时长。幅度与衰减时长可独立变化。
- **样片**　Unity 用脚落地触发震动的示意图可在线辨认触发点、相机和画面的关系。图示版权归 Unity，仅供观看。[Unity「Cinemachine Impulse Sources」](https://docs.unity3d.com/Packages/com.unity.cinemachine@2.6/manual/CinemachineImpulseSourceOverview.html#cinemachine-impulse-sources)
- **出处**　Unity Cinemachine 文档用振幅说明冲击强弱，并以撞击混凝土与薄金属为例解释不同的时间包络。[Unity「Amplitude」](https://docs.unity3d.com/Packages/com.unity.cinemachine@2.6/manual/CinemachineImpulseSourceOverview.html#amplitude) · [Unity「Time envelope」](https://docs.unity3d.com/Packages/com.unity.cinemachine@2.6/manual/CinemachineImpulseSourceOverview.html#time-envelope)

## 构图

### 居中与对称

- **一句话**：主要对象在中间，或者两侧形成相互呼应的形状。
- **适合**：突出单一对象、强调秩序、仪式感或压迫感；这些情绪取决于场景内容，居中本身不保证庄重或稳定。
- **标志特征**：居中指主体靠近中心；对称指两侧的形状、位置或体量相互对应，两者可以同时出现。
- **关键技法**：中心位置与两侧视觉关系共同组织注意力。
- **样片**：[StudioBinder「Balance and symmetry」中的《全金属外壳》《2001 太空漫游》《月升王国》](https://www.studiobinder.com/blog/rules-of-shot-composition-in-film/#3-balance-symmetry)（剧照；原片版权，仅观看）。
- **出处**：StudioBinder 原创教学，[Balance and symmetry](https://www.studiobinder.com/blog/rules-of-shot-composition-in-film/#3-balance-symmetry)：以不同影片说明居中、对称可以表达不同关系和情绪。

### 三分构图

- **一句话**：把画面想成九宫格，让主体靠近其中的分割线或交点。
- **适合**：同时呈现人物与环境、安排两个人的相对位置；需要严格居中或对称时不必套用。
- **标志特征**：两条横线、两条竖线将画面分成九块，重要对象接近这些线或交点。
- **关键技法**：主体偏离中心，画面其他部分可以交代它与环境或另一人物的关系。
- **样片**：[StudioBinder「The Rule of Thirds」中的《夜行者》](https://www.studiobinder.com/blog/rules-of-shot-composition-in-film/#2-rule-of-thirds)（剧照与九宫格示意图；原片版权，仅观看）。
- **出处**：StudioBinder 原创教学，[The Rule of Thirds](https://www.studiobinder.com/blog/rules-of-shot-composition-in-film/#2-rule-of-thirds)：九宫格的形式及其安排人物关系的例子；文末说明构图规则属于建议。

### 引导线

- **一句话**：道路、墙边、栏杆或动作方向像箭头一样，把视线带向重点。
- **适合**：复杂环境中突出对象、连接人物与目标、展示方向；线条都指向无关对象时会让重点变乱。
- **标志特征**：实际边缘或隐含的方向线通向主要对象，或连接几个相关元素。
- **关键技法**：用场景线条和运动方向建立观看路径。
- **样片**：[StudioBinder「Leading lines」中的《夜行者》事故现场](https://www.studiobinder.com/blog/rules-of-shot-composition-in-film/#4-leading-the-eye)（剧照与教学示例；原片版权，仅观看）。
- **出处**：StudioBinder 原创教学，[Leading lines](https://www.studiobinder.com/blog/rules-of-shot-composition-in-film/#4-leading-the-eye)：实线与隐含方向都可以引导注意力、连接人物和物件。

### 视线空间

- **一句话**　人物望向哪边，画框就在那边给他多留些空位。
- **适合**　侧脸、对话或看向画外目标时，留白能让观众跟着人物的眼睛看。视线方向紧贴画边时，画面容易显得局促。
- **标志特征**　侧向看的主体落在画面一侧，从脸到注视方向一侧的画边，留白通常比脑后多。
- **关键技法**　构图给目光所指方向留空间（looking room 或 nose room）。运动主体前方的余地称为运动空间（leading room），目光方向和移动方向可以分别读。
- **样片**　MediaCollege 同页的看向画外与向前爬行两张示例可在线对照留白的用途。页面标明版权及网站使用条款，仅供观看。[MediaCollege「Camera Framing」](https://www.mediacollege.com/video/camera/tutorial/01-framing.html)
- **出处**　MediaCollege 的取景课用人物的注视与爬行分别说明 looking room 与 leading room。[MediaCollege「Some Rules of Framing」](https://www.mediacollege.com/video/camera/tutorial/01-framing.html)

### 头顶空间

- **一句话**　头顶到画面上边缘之间留出的距离。
- **适合**　人物中近景通常只留少量头顶空间。高处环境本身有信息时，上方可以留得更多。
- **标志特征**　头部完整入画时，可以直接看出头顶与上画边之间的距离。紧取景里，主体的头部与上边缘接近。
- **关键技法**　头顶空间随景别与画面重点调整。收紧人物取景时，上沿可以更贴近头部。环境承担信息时，上方留白也属于构图的一部分。
- **出处**　MediaCollege 定义 headroom，并说明中景以上的较紧取景通常留得少。摄影指导 Art Adams 以自己在海边取景的例子说明留白如何随环境和叙事改变。[MediaCollege「Some Rules of Framing」](https://www.mediacollege.com/video/camera/tutorial/01-framing.html) · [Art Adams「A Short History of Headroom, and How to Use It」](https://www.provideocoalition.com/the-history-of-headroom/)

### 前、中、后景分层

- **一句话**：近处、中间和远处都有内容，让一幅画面同时讲清几层关系。
- **适合**：展示人物之间的距离、空间关系或同场发生的多件事；只有一个小屏重点时，层次过多可能增加理解负担。
- **标志特征**：重要元素分布在不同的远近位置；层次存在不代表所有层都清晰。
- **关键技法**：位置安排形成纵深；景深决定多少距离范围内的内容清晰，两者可分别变化。
- **样片**：[StudioBinder「Deep space composition」中的《公民凯恩》《夜行者》](https://www.studiobinder.com/blog/rules-of-shot-composition-in-film/#7-deep-space)（剧照；原片版权，仅观看）。
- **出处**：StudioBinder 原创教学，[Deep space composition](https://www.studiobinder.com/blog/rules-of-shot-composition-in-film/#7-deep-space)；耶鲁大学 [Deep Focus](https://filmanalysis.yale.edu/cinematography/#deep)：纵深布局与多个层面同时清晰的区别。

### 日式动画的版面分层

- **一句话**　每个镜头的版面会画出人物在哪、身后是什么、哪些东西挡在人物前面。
- **适合**　二维角色与绘画背景合成的镜头，尤其是角色会经过前景遮挡或需要独立运镜的画面。
- **标志特征**　前景物能盖住角色的一部分，底图可从角色和前景之后露出。同一场景物件可按镜头中实际遮挡关系处在不同层。
- **关键技法**　镜头版面用同一画框交代角色位置、背景透视和遮挡。独立的前景景物（如放在角色前方的 BOOK 素材）可以遮住角色，角色层可独立换画，底图层承载身后环境。前景和底图可继续拆层，实际张数由镜头的遮挡和运动决定。
- **样片**　《地海战记》制作日记并列展示同一镜的版面原图与完成画面。图像按吉卜力的版权声明保留权利，仅供在线对照。[制作日记「レイアウト」](https://www.ghibli.jp/ged_01/30special/000575.html) · [吉卜力网站版权说明](https://www.ghibli.jp/misc/)
- **出处**　吉卜力的版面篇说明角色和背景共用版面，合成篇展示了两者的叠放。笹木信作的 JAniCA 讲义「シルエットによる平面構成③」以靠近相机的角色与 BOOK 说明前景的遮挡关系。[吉卜力「レイアウト」](https://www.ghibli.jp/ged_01/30special/000575.html) · [吉卜力「撮影（映像演出）」](https://www.ghibli.jp/ged_01/30special/000613.html) · [JAniCA《レイアウトの歴史講座（第2回）》第 7 页](https://www.janica.jp/course/perspective/history02_handout.pdf#page=7)

### 多层视差

- **一句话**　像从车窗往外看，近处的树掠过去，远山只慢慢挪动。
- **适合**　横移与跟拍中表现远近关系，也可用几张平面画做出静态绘画环境的空间感。需要镜头绕物体看到侧面时，多层平面只能呈现已画出的视角。
- **标志特征**　相机横移时，同一时间段内近景比中景在画面上移得多，中景又比远景移得多。主体自身的走位可以叠加在这一视差上。
- **关键技法**　相机保持朝向与焦距且横向平移时，针孔投影中，静止层的画面位移量与该层到相机的深度成反比。相机坐标中的深度为 `Z`，近、中、远层的位移量之比就是各自 `1/Z` 的比值。二维多层合成可用各层的位移系数近似这组比例。Godot 横移示例的树林、丘陵、天空取相机移动基准的 0.7、0.5、0.1 倍，数值对应示例中的远近关系。
- **样片**　Toon Boom 多平面示意可在线比较侧视的分层距离与相机看到的组合画面。图示归 Toon Boom，仅供观看。[Toon Boom Harmony「About Multiplane」](https://docs.toonboom.com/help/harmony-24/premium/staging/about-multiplane.html)
- **出处**　村田和也的 JAniCA 讲义说明各深度层按投影尺度分别确定滑动量。相机横移相同距离时，各层位移量的比例由 MIT 教材的针孔投影式推得。Godot 文档给出二维横移系数及对应的动态示例。[JAniCA《パースの基礎講座》第 6–8 页](https://www.janica.jp/course/perspective/basic01_handout.pdf#page=6) · [MIT《Foundations of Computer Vision》第 5 章 §5.3，式 5.3](https://visionbook.mit.edu/imaging.html#eq-perspctiveProj1) · [Godot「Scroll scale」](https://docs.godotengine.org/en/stable/tutorials/2d/2d_parallax.html#scroll-scale)

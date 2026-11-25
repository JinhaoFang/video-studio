# 纯代码管线占位小样

工单 #149，父 spec #147。合成 `PureCodeSample`：1920×1080、24 fps、240 帧（10 秒），一个占位镜头。只验收管线，不作为美术或风格定稿。

先运行 `node episodes/pure-code-sample/generate.ts`，再运行 `pnpm exec remotion render PureCodeSample out/qa/spec-147/149/PureCodeSample.mp4 --gl=swangle --concurrency=2`。素材写进本 worktree 的 `public/episodes/pure-code-sample/`，不会进入 Git；事件表和生成清单进入 `data/`。

## 镜头与事件

`model.ts` 的 `Shot<Surface>` 只有 spec 规定的四项：编号与时长、后期参数、画面事件、按镜头内帧号绘制。`shotTable` 记录编号、起点和时长；`collectEvents` 生成保留局部帧号的全片事件表。动画只使用镜头内帧号。

`shot.ts` 实现占位镜头：Canvas 2D 读取烘焙底图并画圆块，交给 WebGL 1 着色器做暗角和颗粒。圆块在镜头内第 48 帧触地，音效的内部对齐点放在全片对应的采样位置。`PureCodeSample.tsx` 等待底图载入和绘制完成后才释放 Remotion 的渲染等待句柄；不依赖时钟、CSS 动画或随机运行状态。入口按需加载其他期，避免它们的字体初始化进入本期渲染。

## 生成、混音与缓存

生成器用 Node 计算 RGB 底图，再用 FFmpeg 编码 PNG；Node 用固定种子的噪声与衰减振荡器合成 48 kHz PCM16 撞击声。音效内部的第 480 个采样是对齐点，混音起点为 `round(事件帧 × 采样率 / fps) - 480`。本例第 48 帧的对齐点是第 96000 个采样；文件头部的 10 ms 是预备声。

混音先排成完整的 10 秒双声道 PCM，再用 FFmpeg `loudnorm` 的输入响度测量计算固定增益，由 Node 写出最终 WAV。这里只应用常量增益，不做会改变对齐点的时域处理。先转双声道再测量，避免将单声道测量值直接用于双声道成片时多出约 3 LU。最后仍需对 AAC 成片运行 `pnpm qa loudness` 验收。

`data/generated.json` 记录生成命令、输入源码哈希、FFmpeg 版本、媒体哈希和混音参数。`generate.ts`、`model.ts`、`audio.ts`、所用令牌或 FFmpeg 版本改变，以及产物缺失、哈希不匹配、事件表变化，都会使缓存失效。`--force` 强制重建；`--help` 显示帮助。缓存只覆盖生成物，修改镜头或着色器后要重新渲染。

## 检查与实测

- 相关测试：`node --test episodes/pure-code-sample/pipeline.test.ts tools/check-guardrails.test.ts tools/verify.test.ts`。
- 静态检查：`pnpm verify --static`，包含 `node tools/check-guardrails.ts pure-code`。
- 纯代码护栏检查本期入口的源码依赖，以及 `episodes/index.ts` 的即时加载依赖；只允许通过静态 `staticFile` 使用清单中的生成媒体，拒绝字体包、文字栅格化、外部资源和无法静态确认的媒体路径。本地媒体存在时核对内容哈希，干净 checkout 可在未生成媒体时检查声明；渲染前必须生成媒体。清单或生成源码过期会失败。
- 关键帧：使用现有 `pnpm qa frames`；不修改验收工具的子命令登记表。
- 响度：`pnpm qa loudness out/qa/spec-147/149/PureCodeSample.mp4 --target-lufs -16 --tolerance 1 --max-true-peak -1 --out out/qa/spec-147/149/loudness`。
- GPU、耗时和像素确定性不放入日常验证；本次原始日志与报告在 `/root/project/video-studio.worktrees/149/out/qa/spec-147/149/`。本机 `angle` 因缺少 `VK_EXT_headless_surface` 无法创建 WebGL 上下文，实际渲染使用 `swangle`（SwiftShader）。跨后端、跨驱动的像素一致性未作承诺。

## 待设计定稿

`TODO(design)`：后续工单替换占位圆块、地面、10 秒时长、触地听点及合成撞击声。颜色、尺寸、暗角和颗粒取自已有 NASA-punk 令牌，仅用于占位管线，不据此确定本期风格。

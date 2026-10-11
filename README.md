# 视频工作室

用 Remotion 4 和 React 19 制作讲解视频。多期共用工具、组件与风格，每期的内容放在 `episodes/`。规则与工作流见 [文档地图](docs/README.md)。

## 环境要求

- Node.js ≥ 22.18.0：直接运行工具的 TypeScript 文件，无需编译。
- pnpm：安装依赖并运行项目命令。
- ffmpeg 和 ffprobe：媒体处理与验收工具使用，须在 PATH 中可用。
- gh：通过 GitHub CLI 读取和管理工单，使用前完成认证。

## 常用命令

```console
pnpm install
pnpm dev
pnpm verify
```

`pnpm dev` 启动 Remotion Studio；入口为 `episodes/index.ts`，在 `episodes/Root.tsx` 注册各期合成。当前尚未注册任何合成。

`pnpm verify` 依次执行 ESLint、浏览器与 Node 环境的 TypeScript 检查、Node 自带的单元测试；任一步失败立即停止。它检查 Git 跟踪文件及未被忽略的未跟踪代码，包含工作室自有技能脚本，排除参考资料、第三方技能和输出目录。目前没有测试时会跳过测试运行。

```console
pnpm build
npx remotion compositions --quiet
```

`pnpm build` 打包项目；`npx remotion compositions --quiet` 列出合成 ID。当前 Remotion 4.0.534 的表格输出遇到空列表会报错，`--quiet` 可正常返回空列表。

媒体素材放在 `public/episodes/<期>/`，渲染输出放在 `out/`，不提交到 Git。

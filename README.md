# WNote

一个轻量级的 Markdown 笔记应用，基于 Electron + React + Rust WASM 构建。

## 特性

- Markdown 实时编辑与预览
- Rust WASM 高性能解析器
- 多标签页支持
- 文档大纲导航
- 代码高亮（Shiki）
- 数学公式渲染（KaTeX）
- Mermaid 图表支持
- 自动保存
- 多语言支持（中文 / English）
- 亮色 / 暗色主题

## 技术栈

- **主进程**: Electron + TypeScript
- **渲染进程**: React + TypeScript + Vite
- **Markdown 解析**: Rust + wasm-bindgen
- **数据存储**: better-sqlite3
- **代码规范**: ESLint + Prettier + Husky + Commitlint

## 项目结构

```
packages/
├── main/        # Electron 主进程
├── preload/     # 预加载脚本
├── renderer/    # 渲染进程（页面入口）
├── ui/          # 编辑器组件库
├── md-parser/   # Rust WASM Markdown 解析器
├── shared/      # 共享类型与常量
└── logger/      # 日志模块
```

## 环境要求

- Node.js >= 22
- pnpm >= 10
- Rust（用于编译 md-parser）

## 开发

```bash
# 安装依赖
pnpm install

# 启动开发服务
pnpm dev

# 代码检查
pnpm lint

# 格式化
pnpm format

# 类型检查
pnpm typecheck
```

## 构建

```bash
# 打包（不生成安装包）
pnpm pack

# 生成安装包
pnpm dist

# 平台指定
pnpm dist:mac
pnpm dist:win
pnpm dist:linux
```

## 提交规范

使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范，支持的 scope：

`main` | `preload` | `renderer` | `ui` | `deps` | `config` | `release`

示例：

```
feat(ui): add toolbar component
fix(main): resolve file save encoding issue
chore(deps): update electron to v35
```

## License

MIT

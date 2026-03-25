# PageGen

PageGen 是一个基于 Tauri + React 的桌面应用，用于 AI 辅助的页面生成、预览、编辑与导出。

这个仓库采用分层 README 体系，目标是控制上下文大小，并保证每次改动都能追溯到对应文档。

## 当前状态

- 应用可以启动并以桌面客户端运行
- 项目创建、预览、代码编辑、设置、导出、AI 生成链路都已接通
- 已接入 OpenAI 兼容代理生成
- 当前仍处于 MVP 阶段，后续需要继续做结构整理、性能优化和编辑体验提升

## 开发前先读

在改代码之前，先按顺序阅读：

1. [docs/README.md](/Users/mac/code/yuanxing/pagegen/docs/README.md)
2. [docs/process/planning.md](/Users/mac/code/yuanxing/pagegen/docs/process/planning.md)
3. [docs/process/tdd.md](/Users/mac/code/yuanxing/pagegen/docs/process/tdd.md)
4. 进入目标目录后，先读该目录下的 `README.md`

## 工作规则

- 先有计划，再开始实现
- 任何非平凡改动，都必须能对应到文档或任务项
- 默认遵循 TDD
- 根 README 只保留地图，不承载实现细节
- 功能边界或行为变化后，更新最近的相关 README

## 文档地图

- [docs/README.md](/Users/mac/code/yuanxing/pagegen/docs/README.md)：文档总索引
- [docs/product/README.md](/Users/mac/code/yuanxing/pagegen/docs/product/README.md)：产品目标与流程缺口
- [docs/architecture/README.md](/Users/mac/code/yuanxing/pagegen/docs/architecture/README.md)：系统结构与边界
- [docs/process/README.md](/Users/mac/code/yuanxing/pagegen/docs/process/README.md)：执行流程与规则
- [docs/decisions/README.md](/Users/mac/code/yuanxing/pagegen/docs/decisions/README.md)：架构决策记录
- [tasks/README.md](/Users/mac/code/yuanxing/pagegen/tasks/README.md)：任务流转与执行状态
- [src/README.md](/Users/mac/code/yuanxing/pagegen/src/README.md)：前端结构说明
- [src-tauri/README.md](/Users/mac/code/yuanxing/pagegen/src-tauri/README.md)：后端结构说明

## 快速开始

```bash
npm install
npm run tauri dev
```

```bash
npm test -- --run
cd src-tauri && cargo test --lib
```

## 边界说明

这个 README 只负责导航。如果某部分开始包含具体实现、流程细节或模块说明，就应该把内容下沉到 `docs/` 或对应目录的 README 中。

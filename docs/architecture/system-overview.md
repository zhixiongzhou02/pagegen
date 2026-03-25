# 系统概览

PageGen 当前主要分成三层：

1. `src/` 中的 React UI
2. `src/services/` 中的 IPC 调用层
3. `src-tauri/src/` 中的 Rust 后端

## 主运行链路

1. 用户动作从 React 发起
2. React 通过 IPC 调用 Tauri 命令
3. Rust 读取设置和项目状态
4. Rust 执行生成、存储或导出
5. 更新后的项目数据再返回到 React

## 边界规则

UI 组件不应该知道后端存储细节。Rust 后端也不应该承担展示层逻辑。

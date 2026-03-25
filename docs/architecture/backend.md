# 后端架构

## 主要区域

- `commands.rs`：Tauri 命令入口
- `ai_service.rs`：模型调用
- `file_storage.rs`：项目存储
- `settings.rs`：本地设置存储
- `exporter.rs`：导出逻辑

## 后端规则

- Tauri 命令尽量保持薄
- 外部 API 处理放在 service 层，不放在命令入口里
- 文件布局变化需要同步更新文档
- 后端行为改动默认先写 Rust 测试

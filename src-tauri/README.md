# 后端地图

这个目录是 Tauri + Rust 后端。

## 主要区域

- `src/commands.rs`：Tauri 命令入口
- `src/ai_service.rs`：模型调用
- `src/file_storage.rs`：项目存储
- `src/settings.rs`：设置存储
- `src/exporter.rs`：导出逻辑

## 规则

- 命令入口保持薄
- IO 和外部提供方逻辑放在独立模块中
- 后端行为变化默认先写 Rust 测试

## 建议继续阅读

- [../docs/architecture/backend.md](/Users/mac/code/yuanxing/pagegen/docs/architecture/backend.md)
- [../docs/process/tdd.md](/Users/mac/code/yuanxing/pagegen/docs/process/tdd.md)

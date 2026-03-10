# Changelog

All notable changes to Quick Preview will be documented here.

---

## [1.0.0] - 2026-03-10

### 🎉 Initial Release

#### 核心功能
- **文件夹书签**：左侧边栏管理常用路径，localStorage 持久化
- **图片网格**：4 列固定布局，虚拟滚动，懒加载占位骨架
- **JPG+RAW 合并**：同名文件自动合并为一个格子，设置可关闭
- **空格预览**：打开鼠标 hover 的图片全屏预览
- **预览导航**：方向键切换上下张，显示文件信息
- **F 键标记**：网格和预览中均可快速 pick/unpick
- **多选模式**：工具栏开关，点击格子批量选中
- **导出**：系统目录选择器，复制选中图片（含 RAW）到目标目录
- **快捷键自定义**：设置页可修改所有快捷键绑定

#### 技术
- Tauri v2 + Rust 后端（文件扫描、文件复制）
- React 19 + TypeScript + Vite 7 前端
- Tailwind CSS v4 + Framer Motion 动画
- 自研虚拟滚动，不依赖第三方滚动库
- `asset://` 协议加载本地图片，无 base64 性能损耗

# Quick Preview

> 摄影师本地选片工具 — 快速浏览、标记、导出照片

![Platform](https://img.shields.io/badge/platform-macOS-lightgrey)
![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Tech](https://img.shields.io/badge/Tauri-v2-orange)

## 产品定位

Quick Preview 专为摄影师的选片流程设计。核心工作流：

**打开文件夹 → 浏览网格 → 空格预览 → F 键标记 → 导出选中**

区别于 Lightroom 等重型软件，Quick Preview 只做一件事：帮你从一批照片里快速挑出想要的。

---

## 功能特性

### 📁 文件夹书签
- 左侧边栏管理常用文件夹，一键切换
- 书签数据持久化到本地 localStorage
- 支持添加、删除，显示文件夹路径

### 🖼 图片网格
- 固定 4 列布局，格子大小随窗口自适应
- **虚拟滚动**：仅渲染视口内的格子，万张照片不卡顿
- **懒加载**：图片加载前显示骨架占位，避免黑屏闪烁
- **JPG+RAW 合并**：相机双存模式下，同名 JPG 和 RAW 合并为一个格子展示

### 🔍 图片预览
- 鼠标 hover 后按空格打开当前图片全屏预览
- 方向键 ← → 切换上下张
- 显示文件名、文件大小、修改时间
- Framer Motion 丝滑进出动画，背景模糊遮罩

### ✅ 选片 (Pick)
- **F 键**：在网格或预览中快速标记/取消当前图片
- **多选模式**：工具栏开启后，点击格子即可选中/取消
- 已选图片显示蓝色勾选角标和蓝色边框
- 工具栏实时显示已选数量

### 📤 导出
- 点击导出按钮，系统文件选择器选择目标目录
- 复制选中图片（含对应 RAW 文件）到目标目录

### ⚙️ 设置
- **合并同名 JPG+RAW**：开关控制（默认开启）
- **快捷键自定义**：所有快捷键均可在设置页修改，点击按键区域后按下新键即可绑定

---

## 默认快捷键

| 快捷键 | 功能 |
|--------|------|
| `Space` | 打开/关闭预览（打开 hover 的图片） |
| `F` | 标记/取消标记当前图片 |
| `←` / `→` | 预览中切换上下张 |
| `Escape` | 关闭预览 |

所有快捷键均可在设置页自定义。

---

## 技术方案

### 架构

```
quick-preview/
├── src/                    # 前端 (React + TypeScript)
│   ├── components/
│   │   ├── MediaGrid.tsx   # 虚拟滚动图片网格
│   │   ├── PreviewModal.tsx # 全屏预览弹窗
│   │   ├── SettingsModal.tsx # 设置弹窗
│   │   └── Sidebar.tsx     # 左侧书签栏
│   ├── lib/
│   │   ├── mediaUtils.ts   # 文件分组、格式化工具
│   │   └── storage.ts      # localStorage 持久化
│   ├── types/index.ts      # TypeScript 类型定义
│   └── App.tsx             # 主应用逻辑
└── src-tauri/              # 后端 (Rust)
    └── src/lib.rs          # Tauri commands 实现
```

### 前端技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| React | 19 | UI 框架 |
| TypeScript | 5.8 | 类型安全 |
| Vite | 7 | 构建工具 |
| Tailwind CSS | 4 | 样式 |
| Framer Motion | 12 | 动画 |
| Lucide React | — | 图标 |

### 后端技术栈 (Rust / Tauri v2)

| 模块 | 说明 |
|------|------|
| `tauri-plugin-dialog` | 系统文件/目录选择器 |
| `tauri::asset-protocol` | 本地文件安全访问（图片加载） |

### Tauri Commands

```rust
// 扫描目录，返回图片文件列表（过滤隐藏文件，按文件名排序）
scan_directory(path: String) -> Result<Vec<FileInfo>, String>

// 复制文件列表到目标目录
copy_files(files: Vec<String>, target_dir: String) -> Result<u32, String>
```

### 图片加载方案

使用 Tauri 的 `asset://` 协议 + `convertFileSrc()` 将本地路径转换为 webview 可访问的 URL，**不走 base64**，性能更好，大图也不会卡。

### 虚拟滚动实现

自研轻量虚拟滚动（未依赖第三方库），原理：
1. 监听容器 `scroll` 事件获取 `scrollTop`
2. 计算当前视口内可见的行范围（加前后各 2 行 overscan）
3. 只渲染可见行的格子，其余行通过总高度 spacer 维持滚动条正确

### 数据持久化

书签和设置（含自定义快捷键）存储在 `localStorage`，无需后端数据库。

---

## 开发

```bash
# 安装依赖
npm install

# 开发模式
npm run tauri dev

# 构建
npm run tauri build
```

**环境要求：**
- Rust 1.70+
- Node.js 18+
- macOS 12+（Tauri v2 要求）

---

## Changelog

见 [CHANGELOG.md](./CHANGELOG.md)

# 更新日志 (Changelog)

本文档记录了 Web Refresh Assistant 项目的所有重要更改。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [未发布] - Unreleased

### 计划中
- [ ] 添加更多代理源支持
- [ ] 支持自定义请求头
- [ ] 添加访问统计图表
- [ ] 支持批量网址处理

---

## [v1.2] - 2025-12-28

### 🚀 架构升级 (Architecture Upgrade)
- **在线演示**: [https://web-refresh-assistant.vercel.app/](https://web-refresh-assistant.vercel.app/)
- **Vercel Serverless 适配**: 彻底重构后端逻辑，支持部署到 Vercel Serverless 环境
  - 移除了后端的长任务（Long-running Task）逻辑
  - 新增 `/api/visit` 单次访问接口
  - 新增 `/api/get-proxies` 代理获取接口
  - 添加 `vercel.json` 和 `api/index.js` 配置文件
- **客户端循环控制**: 
  - 前端重构为客户端控制循环（Client-side Loop），不再依赖后端维持任务状态
  - 任务进度、日志、停止逻辑完全由浏览器端控制，避免 Serverless 超时限制

### ⚡ 改进 (Improved)
- **本地存储**: 历史记录改为存储在浏览器 LocalStorage，不再依赖后端内存
- **用户体验**: 优化了开始/停止任务的响应速度，状态反馈更即时

---

## [v1.1] - 2024-12-19

### 🔧 修复 (Fixed)
- **脚本稳定性**: 修复 `init-and-start.bat` 脚本自动跳出问题
- **端口清理**: 优化端口清理逻辑，添加错误检查避免无效操作
- **启动体验**: 智能依赖检查，已存在时跳过安装提升启动速度

### ⚡ 改进 (Improved)
- **错误处理**: 增加各步骤错误处理和友好提示信息
- **用户界面**: 美化完成信息显示，提供服务地址和停止方法
- **启动脚本**: 优化批处理文件的执行流程和错误捕获

### 📝 文档 (Documentation)
- **README**: 明确区分PowerShell和批处理文件启动方式
- **启动说明**: 添加详细的快速启动说明和功能对比

---

## [v1.0] - 2024-12-19

### 🎉 新增 (Added)
- **核心功能**: 网址自动刷新访问工具基础功能
- **前端界面**: 基于 React 18.3.1 + TypeScript 的现代化Web界面
- **后端服务**: 基于 Express 4.16.1 的API服务
- **代理支持**: 集成免费代理池，支持多种代理源
- **实时监控**: 实时进度显示和日志输出
- **历史记录**: 任务执行历史记录和详细报告

### 🛠️ 技术栈 (Tech Stack)
- **前端**: React + TypeScript + Ant Design 5.26.1
- **后端**: Node.js + Express + WebSocket支持
- **工具**: Axios HTTP客户端、CORS跨域支持
- **构建**: React Scripts构建工具

### 📁 项目结构 (Project Structure)
- **frontend/**: React前端应用
- **backend/**: Express后端服务
- **启动脚本**: PowerShell (.ps1) 和批处理 (.bat) 双重支持
- **一键部署**: 支持首次初始化和日常快速启动

### 🌐 功能特性 (Features)
- **双模式执行**: 支持按次数或按时间的访问模式
- **代理池集成**: 多个免费代理源可选，支持代理测试
- **实时反馈**: 动态进度条和实时日志显示
- **错误处理**: 完善的错误处理和用户提示
- **浏览器集成**: 自动打开浏览器访问界面
- **端口管理**: 自动处理端口占用问题

### 🔧 开发环境 (Development)
- **Node.js**: 建议 v16.0+
- **npm**: 建议 v8.0+
- **操作系统**: Windows 10+ (脚本针对Windows优化)
- **浏览器**: 支持所有现代浏览器

### 📋 许可证 (License)
- **开源协议**: MIT License

---

## 版本说明

### 版本格式
- **主版本号**: 重大功能更新或架构变更
- **次版本号**: 新功能添加或重要改进
- **修订版本号**: Bug修复或小幅优化

### 更新类型
- 🎉 **新增** (Added): 新功能或新特性
- ⚡ **改进** (Improved): 现有功能的改进和优化
- 🔧 **修复** (Fixed): Bug修复和问题解决
- 🗑️ **移除** (Removed): 已删除的功能或特性
- ⚠️ **弃用** (Deprecated): 即将移除的功能
- 🔒 **安全** (Security): 安全相关的更新

---

## 参与贡献

如果您发现了问题或有改进建议，欢迎：
- 提交 [Issue](https://github.com/JMoCoder/web_refresh_assistant/issues)
- 发起 [Pull Request](https://github.com/JMoCoder/web_refresh_assistant/pulls)
- 查看 [项目主页](https://github.com/JMoCoder/web_refresh_assistant)

---

**最后更新**: 2024年12月19日 
# Web Refresh Assistant

## 📋 项目摘要与快速启动

### 🚀 快速启动步骤

**首次运行或新环境：**
```bash
# 方式一：Windows PowerShell
.\init-and-start.ps1

# 方式二：Windows批处理（双击运行）
.\init-and-start.bat
```

**日常开发（依赖已安装）：**
```bash
# 方式一：Windows PowerShell
.\quick-start.ps1

# 方式二：Windows批处理（双击运行）
.\quick-start.bat
```

**快速启动说明：**
- **PowerShell脚本**（推荐）：功能更完整，支持自动端口清理
- **批处理文件**：可直接双击运行，操作更简便
- **首次运行**：自动安装依赖并启动服务
- **日常开发**：直接启动已配置的服务

**手动启动：**
```bash
# 1. 安装依赖（首次运行）
cd backend && npm install
cd ../frontend && npm install

# 2. 启动后端服务（端口：3001）
cd backend
npm start

# 3. 启动前端服务（端口：3000）
cd frontend
npm start

# 4. 浏览器访问：http://localhost:3000
```

---

## 📖 项目介绍

Web Refresh Assistant 是一个全栈Web应用程序，提供前后端分离的架构，支持现代化的Web开发体验。

### 🛠️ 技术栈

**前端：**
- React 18.3.1 + TypeScript
- Ant Design 5.26.1 (UI组件库)
- Axios (HTTP客户端)
- React Scripts (构建工具)

**后端：**
- Node.js + Express 4.16.1
- WebSocket支持 (ws 8.18.2)
- CORS跨域支持
- Morgan日志中间件

### 🏗️ 项目结构

```
web_refresh_assistant/
├── frontend/                 # React前端应用
│   ├── src/                 # 源代码目录
│   ├── public/              # 静态资源
│   ├── package.json         # 前端依赖配置
│   └── tsconfig.json        # TypeScript配置
├── backend/                 # Express后端应用
│   ├── routes/              # 路由模块
│   ├── public/              # 静态资源
│   ├── bin/www              # 启动入口
│   └── package.json         # 后端依赖配置
├── init-and-start.ps1       # 初始化并启动脚本（PowerShell）
├── quick-start.ps1          # 快速启动脚本（PowerShell）
├── init-and-start.bat       # 初始化并启动脚本（批处理）
├── quick-start.bat          # 快速启动脚本（批处理）
└── README.md               # 项目说明文档
```

### 🔧 开发环境要求

- **Node.js**: 建议 v16.0+ 
- **npm**: 建议 v8.0+
- **操作系统**: Windows 10+ (脚本针对Windows优化)
- **浏览器**: Chrome、Firefox、Safari等现代浏览器

### 🌐 端口配置

- **前端开发服务器**: http://localhost:3000
- **后端API服务器**: http://localhost:3001
- **代理配置**: 前端请求自动代理到后端3001端口

### 📝 开发说明

1. **前端代理配置**: 前端package.json中已配置proxy，API请求会自动转发到后端
2. **自动端口清理**: 启动脚本会自动清理占用的3000端口进程
3. **浏览器自动打开**: 启动脚本会在服务启动后自动打开浏览器
4. **热重载支持**: 前端支持代码热重载，后端需要手动重启

### 🚨 常见问题

**端口占用：**
- 脚本会自动处理3000端口占用问题
- 如遇到3001端口占用，请手动关闭相关进程

**依赖安装失败：**
```bash
# 清理缓存重新安装
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

**启动脚本权限问题：**
```powershell
# PowerShell执行策略设置
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### 🔄 部署说明

**生产环境构建：**
```bash
cd frontend
npm run build

cd ../backend
npm start
```

**环境变量配置：**
- 生产环境请根据实际需要配置相应的环境变量
- 数据库连接、API密钥等敏感信息请使用环境变量管理

---

## 📞 技术支持

如遇到问题，请检查：
1. Node.js和npm版本是否符合要求
2. 网络连接是否正常
3. 端口是否被占用
4. 依赖是否正确安装

---

**最后更新时间**: 2024年12月 
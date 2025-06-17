@echo off
REM -----------------------------------------------
REM 一键初始化并启动前后端服务，并自动打开浏览器
REM 适合首次部署或新环境
REM -----------------------------------------------

echo 正在检查并清理3000端口占用...
REM 杀掉占用3000端口的进程（增加错误处理）
netstat -ano | findstr :3000 >nul 2>&1
if %errorlevel% equ 0 (
    echo 发现3000端口被占用，正在清理...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000') do (
        echo 正在终止进程 %%a
        taskkill /PID %%a /F >nul 2>&1
    )
    echo 端口清理完成
) else (
    echo 3000端口未被占用，跳过清理
)

echo [1/5] 检查并安装后端依赖...
cd backend
if exist node_modules (
    echo 后端依赖已存在，跳过安装
) else (
    echo 正在安装后端依赖...
    npm install
    if %errorlevel% neq 0 (
        echo 后端依赖安装失败！
        pause
        exit /b 1
    )
)

echo [2/5] 检查并安装前端依赖...
cd ..\frontend
if exist node_modules (
    echo 前端依赖已存在，跳过安装
) else (
    echo 正在安装前端依赖...
    npm install
    if %errorlevel% neq 0 (
        echo 前端依赖安装失败！
        pause
        exit /b 1
    )
)

echo [3/5] 启动后端服务...
cd ..\backend
echo 正在启动后端服务（端口3001）...
start cmd /k "npm start"
if %errorlevel% neq 0 (
    echo 后端服务启动失败！
    pause
    exit /b 1
)

echo [4/5] 启动前端服务...
cd ..\frontend
echo 正在启动前端服务（端口3000）...
set BROWSER=none
start cmd /k "npm start"
if %errorlevel% neq 0 (
    echo 前端服务启动失败！
    pause
    exit /b 1
)

REM 等待5秒，确保服务启动
echo 等待服务启动完成...
timeout /t 5 /nobreak >nul

echo [5/5] 自动打开浏览器访问前端页面...
start http://localhost:3000/

echo.
echo ==========================================
echo   ✅ 全部完成！服务已启动
echo   🌐 前端地址: http://localhost:3000
echo   🔧 后端地址: http://localhost:3001
echo   📝 如需停止服务，请关闭相应的命令行窗口
echo ==========================================
pause 
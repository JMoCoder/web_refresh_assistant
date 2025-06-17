@echo off
REM -----------------------------------------------
REM 一键初始化并启动前后端服务，并自动打开浏览器
REM 适合首次部署或新环境
REM -----------------------------------------------

REM 杀掉占用3000端口的进程
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000') do taskkill /PID %%a /F

echo [1/5] 安装后端依赖...
cd backend
npm install

echo [2/5] 安装前端依赖...
cd ..\frontend
npm install

echo [3/5] 启动后端服务...
cd ..\backend
start cmd /k "npm start"

echo [4/5] 启动前端服务...
cd ..\frontend
set BROWSER=none
start cmd /k "npm start"

REM 等待5秒，确保服务启动
timeout /t 5

echo [5/5] 自动打开浏览器访问前端页面...
start http://localhost:3000/

echo 全部完成！如有端口占用或报错，请检查端口或依赖安装情况。
pause 
@echo off
REM -----------------------------------------------
REM 快速一键启动前后端服务，并自动打开浏览器
REM 适合依赖已安装后的日常开发
REM -----------------------------------------------

REM 杀掉占用3000端口的进程
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000') do taskkill /PID %%a /F

echo [1/3] 启动后端服务...
cd backend
start cmd /k "npm start"

echo [2/3] 启动前端服务...
cd ..\frontend
set BROWSER=none
start cmd /k "npm start"

REM 等待5秒，确保服务启动
timeout /t 5

echo [3/3] 自动打开浏览器访问前端页面...
start http://localhost:3000/

echo 全部完成！
pause 
# -----------------------------------------------
# 一键初始化并启动前后端服务，并自动打开浏览器
# 适合首次部署或新环境
# -----------------------------------------------

# 杀掉占用3000端口的进程（仅限Windows 10+ PowerShell 5.1+）
$port = 3000
$procId = (Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -First 1).OwningProcess
if ($procId) { Stop-Process -Id $procId -Force }

Write-Host "【1/5】安装后端依赖..."
Set-Location backend
npm install

Write-Host "【2/5】安装前端依赖..."
Set-Location ../frontend
npm install

Write-Host "【3/5】启动后端服务..."
Set-Location ../backend
Start-Process powershell -ArgumentList 'npm start'

Write-Host "【4/5】启动前端服务..."
Set-Location ../frontend
Start-Process powershell -ArgumentList 'npm start' -NoNewWindow -Environment @{ BROWSER = 'none' }

Start-Sleep -Seconds 5

Write-Host "【5/5】自动打开浏览器访问前端页面..."
Start-Process "http://localhost:3000/"

Write-Host "全部完成！如有端口占用或报错，请检查端口或依赖安装情况。" 
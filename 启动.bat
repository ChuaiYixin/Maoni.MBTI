@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo 正在启动开发服务器…
echo 启动成功后会自动打开浏览器，关闭本窗口即可停止服务。
echo.

npm run dev

pause

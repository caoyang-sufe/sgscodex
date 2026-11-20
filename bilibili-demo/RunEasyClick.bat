@echo off
chcp 65001 >nul
title 鼠标连点器启动器

echo 正在启动鼠标连点器...
echo 如果提示执行策略限制，请以管理员身份运行：
echo powershell -ExecutionPolicy Bypass -File "%~dp0EasyClick.ps1"
echo.

powershell -ExecutionPolicy Bypass -File "%~dp0EasyClick.ps1"

pause
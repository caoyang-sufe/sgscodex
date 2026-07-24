# 鼠标连点器 - PowerShell版本
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# 定义鼠标事件API
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;

public class Mouse {
    [DllImport("user32.dll")]
    public static extern void mouse_event(uint dwFlags, uint dx, uint dy, uint dwData, IntPtr dwExtraInfo);
    
    [DllImport("user32.dll")]
    public static extern short GetAsyncKeyState(int vKey);
}

public class KeyCode {
    public const int VK_ESCAPE = 0x1B;
}
'@

# 常量定义
$MOUSEEVENTF_LEFTDOWN = 0x02
$MOUSEEVENTF_LEFTUP = 0x04
$MOUSEEVENTF_RIGHTDOWN = 0x08
$MOUSEEVENTF_RIGHTUP = 0x10

# 获取用户设置
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "        鼠标连点器 v2.0 (PowerShell)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
$delay = Read-Host "请输入点击间隔(毫秒，建议50-1000)"
if ([string]::IsNullOrEmpty($delay)) { $delay = 100 }
$delay = [int]$delay

Write-Host ""
Write-Host "选择点击类型:" -ForegroundColor Yellow
Write-Host "  1. 左键点击"
Write-Host "  2. 右键点击"
$clickType = Read-Host "请输入选项(1-2)"
if ($clickType -eq "2") { $isRight = $true } else { $isRight = $false }

Write-Host ""
Write-Host "连点器即将启动..." -ForegroundColor Green
Write-Host "请将鼠标移到目标位置" -ForegroundColor Yellow
Write-Host "按 ESC 键停止连点" -ForegroundColor Red
Write-Host ""

Start-Sleep -Seconds 3

# 开始连点
$count = 0
$isRunning = $true

Write-Host "连点器已启动！" -ForegroundColor Green
Write-Host "点击间隔: $delay 毫秒" -ForegroundColor Cyan

while ($isRunning) {
    # 获取当前鼠标位置
    $pos = [System.Windows.Forms.Cursor]::Position
    
    # 模拟鼠标点击
    if ($isRight) {
        # 右键点击
        [Mouse]::mouse_event($MOUSEEVENTF_RIGHTDOWN, $pos.X, $pos.Y, 0, [IntPtr]::Zero)
        Start-Sleep -Milliseconds 10
        [Mouse]::mouse_event($MOUSEEVENTF_RIGHTUP, $pos.X, $pos.Y, 0, [IntPtr]::Zero)
    } else {
        # 左键点击
        [Mouse]::mouse_event($MOUSEEVENTF_LEFTDOWN, $pos.X, $pos.Y, 0, [IntPtr]::Zero)
        Start-Sleep -Milliseconds 10
        [Mouse]::mouse_event($MOUSEEVENTF_LEFTUP, $pos.X, $pos.Y, 0, [IntPtr]::Zero)
    }
    
    $count++
    if ($count % 10 -eq 0) {
        Write-Host "已点击 $count 次" -ForegroundColor Yellow
    }
    
    # 等待指定间隔
    Start-Sleep -Milliseconds $delay
    
    # 检查ESC键
    if ([Mouse]::GetAsyncKeyState([KeyCode]::VK_ESCAPE) -ne 0) {
        $isRunning = $false
        Write-Host ""
        Write-Host "连点已停止，共点击 $count 次" -ForegroundColor Green
    }
}
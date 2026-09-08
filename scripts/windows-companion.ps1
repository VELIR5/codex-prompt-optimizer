param([switch]$Install, [switch]$Uninstall)
$ErrorActionPreference = 'Stop'
$app = Split-Path -Parent $PSScriptRoot
$startup = [Environment]::GetFolderPath('Startup')
$launcher = Join-Path $startup 'PromptLens.cmd'
if ($Uninstall) { if (Test-Path $launcher) { Remove-Item -LiteralPath $launcher -Force }; Write-Host 'Prompt Lens startup entry removed.'; exit 0 }
if ($Install) {
  $cmd = "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$PSScriptRoot\windows-companion.ps1`""
  Set-Content -LiteralPath $launcher -Value "@echo off`r`n$cmd" -Encoding ASCII
  Write-Host "Installed. Start Prompt Lens from: $launcher"
  exit 0
}
Add-Type -AssemblyName System.Windows.Forms
Add-Type @'
using System;
using System.Runtime.InteropServices;
public static class PromptLensHotkeys {
 [DllImport("user32.dll")] public static extern bool RegisterHotKey(IntPtr hWnd, int id, uint fsModifiers, uint vk);
 [DllImport("user32.dll")] public static extern bool UnregisterHotKey(IntPtr hWnd, int id);
 [DllImport("user32.dll")] public static extern int GetMessage(out MSG msg, IntPtr hWnd, uint min, uint max);
 [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
 [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
 public struct MSG { public IntPtr hWnd; public uint message; public UIntPtr wParam; public IntPtr lParam; public uint time; public int x; public int y; }
}
'@
$MOD_CONTROL = 0x0002; $MOD_ALT = 0x0001
$previous = ''
function Test-CodexForeground {
  $window = [PromptLensHotkeys]::GetForegroundWindow(); if ($window -eq [IntPtr]::Zero) { return $false }
  [uint32]$processId = 0; [PromptLensHotkeys]::GetWindowThreadProcessId($window, [ref]$processId) | Out-Null
  try { return ((Get-Process -Id $processId -ErrorAction Stop).ProcessName -match '^(codex|OpenAI\.Codex)$') } catch { return $false }
}
function Set-Text($text, $restoreClipboard) { Set-Clipboard -Value $text; [System.Windows.Forms.SendKeys]::SendWait('^v'); Start-Sleep -Milliseconds 120; if ($null -ne $restoreClipboard) { Set-Clipboard -Value $restoreClipboard } }
function Optimize($text) {
  $clean = ($text -replace '[ \t]+',' ').Trim()
  if (!$clean) { return $clean }
  return "你是一名专业助手。明确目标、约束、验收标准、交付物和待确认问题。`r`n`r`n请给出可执行的结果，简要说明关键假设，控制范围，并只提出必要的澄清问题。`r`n`r`n用户需求：`r`n$clean"
}
$hotkeyOptimize = [PromptLensHotkeys]::RegisterHotKey([IntPtr]::Zero, 1, $MOD_CONTROL -bor $MOD_ALT, 0x4F)
$hotkeyRestore = [PromptLensHotkeys]::RegisterHotKey([IntPtr]::Zero, 2, $MOD_CONTROL -bor $MOD_ALT, 0x5A)
if (!$hotkeyOptimize -or !$hotkeyRestore) { throw 'Unable to register Ctrl+Alt+O/Z. Close another Prompt Lens instance or release the hotkeys.' }
Write-Host 'Prompt Lens running. Ctrl+Alt+O optimize; Ctrl+Alt+Z restore.'
try {
  while ($true) {
    $message = New-Object PromptLensHotkeys+MSG
    if ([PromptLensHotkeys]::GetMessage([ref]$message, [IntPtr]::Zero, 0, 0) -gt 0) {
      if ($message.message -eq 0x0312) {
        if (!(Test-CodexForeground)) { continue }
        $clipboardBefore = Get-Clipboard -Raw -ErrorAction SilentlyContinue
        [System.Windows.Forms.SendKeys]::SendWait('^a'); Start-Sleep -Milliseconds 80; [System.Windows.Forms.SendKeys]::SendWait('^c'); Start-Sleep -Milliseconds 120
        $text = Get-Clipboard -Raw
        if ($message.wParam.ToUInt32() -eq 1) { if ($text.Trim()) { $previous = $text; Set-Text (Optimize $text) $clipboardBefore } }
        elseif ($previous) { Set-Text $previous $clipboardBefore; $previous = '' }
      }
    }
    Start-Sleep -Milliseconds 25
  }
} finally { [PromptLensHotkeys]::UnregisterHotKey([IntPtr]::Zero,1) | Out-Null; [PromptLensHotkeys]::UnregisterHotKey([IntPtr]::Zero,2) | Out-Null }

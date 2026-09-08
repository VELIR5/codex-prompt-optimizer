param([switch]$Install, [switch]$Uninstall, [switch]$Configure)
$ErrorActionPreference = 'Stop'
$app = Split-Path -Parent $PSScriptRoot
$startup = [Environment]::GetFolderPath('Startup')
$launcher = Join-Path $startup 'Prompt Lens.lnk'
$configDir = Join-Path $env:APPDATA 'PromptLens'
$configPath = Join-Path $configDir 'templates.json'
function Initialize-Config {
  if (Test-Path $configPath) {
    try { Get-Content -LiteralPath $configPath -Raw | ConvertFrom-Json | Out-Null; return } catch { Remove-Item -LiteralPath $configPath -Force }
  }
  New-Item -ItemType Directory -Force -Path $configDir | Out-Null
  @'
{
  "activeTemplate": "task",
  "templates": {
    "task": { "name": "Task", "instruction": "Clarify the goal, constraints, acceptance criteria, deliverables, and open questions." },
    "coding": { "name": "Coding", "instruction": "Add relevant context, expected behavior, edge cases, test strategy, and implementation boundaries." },
    "review": { "name": "Review", "instruction": "Prioritize correctness, regressions, security, and missing tests. Report findings by severity." },
    "writing": { "name": "Writing", "instruction": "Preserve intent and facts while improving structure, clarity, tone, and audience fit." }
  }
}
'@ | Set-Content -LiteralPath $configPath -Encoding UTF8
}
Initialize-Config
if ($Configure) { Start-Process notepad.exe $configPath; exit 0 }
if ($Uninstall) { if (Test-Path $launcher) { Remove-Item -LiteralPath $launcher -Force }; Write-Host 'Prompt Lens startup entry removed.'; exit 0 }
if ($Install) {
  $shell = New-Object -ComObject WScript.Shell
  $shortcut = $shell.CreateShortcut($launcher)
  $shortcut.TargetPath = "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe"
  $shortcut.Arguments = "-NoProfile -STA -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$PSScriptRoot\windows-companion.ps1`""
  $shortcut.WorkingDirectory = $app
  $shortcut.WindowStyle = 7
  $shortcut.Save()
  Write-Host "Installed. Start Prompt Lens from: $launcher"
  exit 0
}
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
Add-Type @'
using System;
using System.Runtime.InteropServices;
public static class PromptLensHotkeys {
 [DllImport("user32.dll")] public static extern bool RegisterHotKey(IntPtr hWnd, int id, uint fsModifiers, uint vk);
 [DllImport("user32.dll")] public static extern bool UnregisterHotKey(IntPtr hWnd, int id);
 [DllImport("user32.dll")] public static extern bool PeekMessage(out MSG msg, IntPtr hWnd, uint min, uint max, uint remove);
 [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
 [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
 [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);
 public struct MSG { public IntPtr hWnd; public uint message; public UIntPtr wParam; public IntPtr lParam; public uint time; public int x; public int y; }
 public struct RECT { public int Left; public int Top; public int Right; public int Bottom; }
}
'@
$MOD_CONTROL = 0x0002; $MOD_ALT = 0x0001
$previous = ''
function Test-CodexForeground {
  $window = [PromptLensHotkeys]::GetForegroundWindow(); if ($window -eq [IntPtr]::Zero) { return $false }
  [uint32]$processId = 0; [PromptLensHotkeys]::GetWindowThreadProcessId($window, [ref]$processId) | Out-Null
  try { return ((Get-Process -Id $processId -ErrorAction Stop).ProcessName -match '^(ChatGPT|codex|OpenAI\.Codex)$') } catch { return $false }
}
function Set-Text($text, $restoreClipboard) { Set-Clipboard -Value $text; [System.Windows.Forms.SendKeys]::SendWait('^v'); Start-Sleep -Milliseconds 120; if ($null -ne $restoreClipboard) { Set-Clipboard -Value $restoreClipboard } }
function Optimize($text) {
  $clean = ($text -replace '[ \t]+',' ').Trim()
  if (!$clean) { return $clean }
  try { $config = Get-Content -LiteralPath $configPath -Raw | ConvertFrom-Json; $template = $config.templates.($config.activeTemplate); $instruction = $template.instruction; if (!$instruction) { throw 'Active template has no instruction.' } }
  catch { throw "Unable to read Prompt Lens templates at $configPath : $_" }
  return "You are an expert assistant. $instruction`r`n`r`nReturn a practical answer, state assumptions briefly, keep scope bounded, and ask only essential clarifying questions.`r`n`r`nUser request:`r`n$clean"
}
$form = New-Object Windows.Forms.Form
$form.FormBorderStyle = 'None'; $form.ShowInTaskbar = $false; $form.TopMost = $true; $form.Text = 'Prompt Lens'
$form.StartPosition = 'Manual'; $form.Size = New-Object Drawing.Size(112,34); $form.BackColor = [Drawing.Color]::FromArgb(18,60,53)
$form.Opacity = 0.98
$button = New-Object Windows.Forms.Button
$button.Dock = 'Fill'; $button.FlatStyle = 'Flat'; $button.FlatAppearance.BorderSize = 0
$button.BackColor = [Drawing.Color]::FromArgb(18,60,53); $button.ForeColor = [Drawing.Color]::FromArgb(230,255,173)
$button.Font = New-Object Drawing.Font('Segoe UI',9,[Drawing.FontStyle]::Bold); $button.Text = '✦ 优化'
$form.Controls.Add($button)
$button.Add_Click({
  if (!(Test-CodexForeground)) { return }
  if ($script:previous) { $clipboardBefore = Get-Clipboard -Raw -ErrorAction SilentlyContinue; Set-Text $script:previous $clipboardBefore; $script:previous = ''; $button.Text = '✦ 优化'; $button.BackColor = [Drawing.Color]::FromArgb(18,60,53); return }
  $clipboardBefore = Get-Clipboard -Raw -ErrorAction SilentlyContinue
  [System.Windows.Forms.SendKeys]::SendWait('^a'); Start-Sleep -Milliseconds 80; [System.Windows.Forms.SendKeys]::SendWait('^c'); Start-Sleep -Milliseconds 120
  $text = Get-Clipboard -Raw
  if ($text.Trim()) { $script:previous = $text; Set-Text (Optimize $text) $clipboardBefore; $button.Text = '↶ 恢复'; $button.BackColor = [Drawing.Color]::FromArgb(50,75,67) }
})
$timer = New-Object Windows.Forms.Timer; $timer.Interval = 350
$timer.Add_Tick({
  $window = [PromptLensHotkeys]::GetForegroundWindow()
  if ($window -eq [IntPtr]::Zero) { $form.Hide(); return }
  [uint32]$processId = 0; [PromptLensHotkeys]::GetWindowThreadProcessId($window, [ref]$processId) | Out-Null
  try { $name = (Get-Process -Id $processId -ErrorAction Stop).ProcessName } catch { $name = '' }
  if ($name -match '^(ChatGPT|codex|OpenAI\.Codex)$') { $rect = New-Object PromptLensHotkeys+RECT; [PromptLensHotkeys]::GetWindowRect($window, [ref]$rect) | Out-Null; $form.Location = New-Object Drawing.Point(($rect.Right - 260),($rect.Bottom - 105)); $form.Show() } else { $form.Hide() }
})
$timer.Start()
$hotkeyOptimize = [PromptLensHotkeys]::RegisterHotKey([IntPtr]::Zero, 1, $MOD_CONTROL -bor $MOD_ALT, 0x4F)
$hotkeyRestore = [PromptLensHotkeys]::RegisterHotKey([IntPtr]::Zero, 2, $MOD_CONTROL -bor $MOD_ALT, 0x5A)
if (!$hotkeyOptimize -or !$hotkeyRestore) { throw 'Unable to register Ctrl+Alt+O/Z. Close another Prompt Lens instance or release the hotkeys.' }
Write-Host 'Prompt Lens running. Ctrl+Alt+O optimize; Ctrl+Alt+Z restore.'
try {
  $form.Show()
  while ($true) {
    $message = New-Object PromptLensHotkeys+MSG
    if ([PromptLensHotkeys]::PeekMessage([ref]$message, [IntPtr]::Zero, 0, 0, 1)) {
      if ($message.message -eq 0x0312) {
        if (!(Test-CodexForeground)) { continue }
        $clipboardBefore = Get-Clipboard -Raw -ErrorAction SilentlyContinue
        [System.Windows.Forms.SendKeys]::SendWait('^a'); Start-Sleep -Milliseconds 80; [System.Windows.Forms.SendKeys]::SendWait('^c'); Start-Sleep -Milliseconds 120
        $text = Get-Clipboard -Raw
        if ($message.wParam.ToUInt32() -eq 1) { if ($text.Trim()) { $previous = $text; Set-Text (Optimize $text) $clipboardBefore } }
        elseif ($previous) { Set-Text $previous $clipboardBefore; $previous = '' }
      }
    }
    [Windows.Forms.Application]::DoEvents()
    Start-Sleep -Milliseconds 25
  }
} finally { $timer.Stop(); $form.Close(); [PromptLensHotkeys]::UnregisterHotKey([IntPtr]::Zero,1) | Out-Null; [PromptLensHotkeys]::UnregisterHotKey([IntPtr]::Zero,2) | Out-Null }

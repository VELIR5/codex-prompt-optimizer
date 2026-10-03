param(
  [switch]$Install,
  [switch]$Uninstall,
  [switch]$Configure,
  [switch]$SelfTest,
  [string]$ConfigPath
)
# NOTE: keep this file ASCII-only. Windows PowerShell 5.1 reads BOM-less files with the
# ANSI code page, so non-ASCII characters would be garbled or break parsing.
# Chinese prompt text is produced by scripts/optimize-cli.mjs and exchanged as UTF-8 files.
$ErrorActionPreference = 'Stop'

$app = Split-Path -Parent $PSScriptRoot
$cli = Join-Path $PSScriptRoot 'optimize-cli.mjs'
$startupLauncher = Join-Path ([Environment]::GetFolderPath('Startup')) 'Prompt Lens.lnk'
$desktopLauncher = Join-Path ([Environment]::GetFolderPath('Desktop')) 'Prompt Lens.lnk'
$legacyTaskName = 'PromptLens Companion'
$runKey = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run'
$runName = 'PromptLens'
$dataDir = Join-Path $env:APPDATA 'PromptLens'
if (!$ConfigPath) { $ConfigPath = Join-Path $dataDir 'templates.json' }
$logPath = Join-Path $dataDir 'companion.log'
$codexProcessNames = @('ChatGPT', 'codex', 'OpenAI.Codex')
$powershellExe = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
$launchArgs = "-NoProfile -STA -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$PSCommandPath`""
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

# ---------------------------------------------------------------- shared helpers

function Write-Log([string]$message) {
  # Never log prompt contents; only events and error messages.
  try {
    New-Item -ItemType Directory -Force -Path $dataDir | Out-Null
    if ((Test-Path -LiteralPath $logPath) -and (Get-Item -LiteralPath $logPath).Length -gt 262144) {
      Move-Item -LiteralPath $logPath -Destination "$logPath.old" -Force
    }
    Add-Content -LiteralPath $logPath -Value ('{0:yyyy-MM-dd HH:mm:ss} {1}' -f (Get-Date), $message) -Encoding UTF8
  } catch { }
}

function Resolve-Node {
  $command = Get-Command node.exe -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($command) { return $command.Source }
  $candidates = @()
  if ($env:ProgramFiles) { $candidates += Join-Path $env:ProgramFiles 'nodejs\node.exe' }
  if (${env:ProgramFiles(x86)}) { $candidates += Join-Path ${env:ProgramFiles(x86)} 'nodejs\node.exe' }
  if ($env:LOCALAPPDATA) { $candidates += Join-Path $env:LOCALAPPDATA 'Programs\nodejs\node.exe' }
  foreach ($candidate in $candidates) { if (Test-Path -LiteralPath $candidate) { return $candidate } }
  return $null
}

function Invoke-NodeCli([string[]]$Arguments) {
  if (!$script:nodePath) { $script:nodePath = Resolve-Node }
  if (!$script:nodePath) { throw 'Node.js was not found. Install Node.js 20+ and make sure node.exe is on PATH.' }
  $psi = New-Object System.Diagnostics.ProcessStartInfo
  $psi.FileName = $script:nodePath
  $psi.Arguments = (($Arguments | ForEach-Object { '"' + ($_ -replace '"', '\"') + '"' }) -join ' ')
  $psi.UseShellExecute = $false
  $psi.CreateNoWindow = $true
  $psi.RedirectStandardOutput = $true
  $psi.RedirectStandardError = $true
  $psi.StandardOutputEncoding = $utf8NoBom
  $psi.StandardErrorEncoding = $utf8NoBom
  $process = [System.Diagnostics.Process]::Start($psi)
  $stdout = $process.StandardOutput.ReadToEnd()
  $stderr = $process.StandardError.ReadToEnd()
  if (!$process.WaitForExit(15000)) { try { $process.Kill() } catch { }; throw 'The Prompt Lens optimizer timed out.' }
  if ($process.ExitCode -ne 0) { throw ('The Prompt Lens optimizer failed: ' + $stderr.Trim()) }
  return $stdout
}

function Initialize-Config {
  # Creates the default file only when it is missing. Existing files are never rewritten or deleted.
  if (!(Test-Path -LiteralPath $ConfigPath)) { Invoke-NodeCli -Arguments @($cli, '--init-config', $ConfigPath) | Out-Null }
}

function Get-OptimizedText([string]$text) {
  $base = Join-Path ([System.IO.Path]::GetTempPath()) ('promptlens-' + [guid]::NewGuid().ToString('N'))
  $inFile = "$base.in.txt"
  $outFile = "$base.out.json"
  try {
    [System.IO.File]::WriteAllText($inFile, $text, $utf8NoBom)
    Invoke-NodeCli -Arguments @($cli, '--input', $inFile, '--output', $outFile, '--config', $ConfigPath) | Out-Null
    return ([System.IO.File]::ReadAllText($outFile, $utf8NoBom) | ConvertFrom-Json)
  } finally {
    Remove-Item -LiteralPath $inFile, $outFile -Force -ErrorAction SilentlyContinue
  }
}

function Get-ClickOffset {
  $offset = @{ FromRight = 720; FromBottom = 135 }
  try {
    $config = [System.IO.File]::ReadAllText($ConfigPath, [System.Text.Encoding]::UTF8) | ConvertFrom-Json
    if ($config.inputClickOffset) {
      if ($null -ne ($config.inputClickOffset.fromRight -as [int])) { $offset.FromRight = [int]$config.inputClickOffset.fromRight }
      if ($null -ne ($config.inputClickOffset.fromBottom -as [int])) { $offset.FromBottom = [int]$config.inputClickOffset.fromBottom }
    }
  } catch { }
  return $offset
}

function Remove-LegacyStartup {
  if (Test-Path -LiteralPath $startupLauncher) { Remove-Item -LiteralPath $startupLauncher -Force }
  try {
    if ((Get-Command Get-ScheduledTask -ErrorAction SilentlyContinue) -and (Get-ScheduledTask -TaskName $legacyTaskName -ErrorAction SilentlyContinue)) {
      Unregister-ScheduledTask -TaskName $legacyTaskName -Confirm:$false
    }
  } catch { Write-Host "Could not remove the legacy scheduled task '$legacyTaskName': $($_.Exception.Message)" }
}

function Stop-OtherInstances {
  $others = @(Get-CimInstance Win32_Process -Filter "Name = 'powershell.exe'" -ErrorAction SilentlyContinue | Where-Object {
      $_.ProcessId -ne $PID -and $_.CommandLine -and $_.CommandLine -like '*windows-companion.ps1*' -and
      $_.CommandLine -notmatch '\s-(Install|Uninstall|Configure|SelfTest)\b'
    })
  foreach ($other in $others) {
    Stop-Process -Id $other.ProcessId -Force -ErrorAction SilentlyContinue
    Wait-Process -Id $other.ProcessId -Timeout 5 -ErrorAction SilentlyContinue
  }
  return $others.Count
}

# ---------------------------------------------------------------- command modes

if ($SelfTest) {
  # Headless checks of the Node bridge. No UI, hotkeys, clipboard or startup entries are touched.
  $tempDir = Join-Path ([System.IO.Path]::GetTempPath()) ('promptlens-selftest-' + [guid]::NewGuid().ToString('N'))
  New-Item -ItemType Directory -Path $tempDir | Out-Null
  $script:failures = 0
  function Assert-Check([bool]$condition, [string]$label) {
    if ($condition) { Write-Host "ok   - $label" } else { Write-Host "FAIL - $label"; $script:failures++ }
  }
  $zhPrefix = [string][char]0x4F60  # first character of the zh prompt prefix
  try {
    $ConfigPath = Join-Path $tempDir 'templates.json'
    Initialize-Config
    Assert-Check (Test-Path -LiteralPath $ConfigPath) 'init creates the default config'
    $sample = "fix this:`n    def f():`n        return 1"
    $result = Get-OptimizedText $sample
    Assert-Check ($result.text.EndsWith($sample)) 'indentation is preserved'
    Assert-Check ($result.text.StartsWith($zhPrefix) -and !$result.warning) 'default language is zh'
    $unicode = (-join [char[]]@(0x4F18, 0x5316)) + ' ' + [char]::ConvertFromUtf32(0x1F600)
    Assert-Check ((Get-OptimizedText $unicode).text.EndsWith($unicode)) 'unicode round-trip'
    [System.IO.File]::WriteAllText($ConfigPath, '{ broken', $utf8NoBom)
    $result = Get-OptimizedText 'hello'
    Assert-Check ([bool]$result.warning -and $result.text.EndsWith('hello')) 'broken config falls back with a warning'
    Assert-Check ([System.IO.File]::ReadAllText($ConfigPath) -eq '{ broken') 'broken config is not deleted'
    $legacy = '{"activeTemplate":"task","templates":{"task":{"name":"Task","instruction":"Clarify the goal, constraints, acceptance criteria, deliverables, and open questions."}}}'
    [System.IO.File]::WriteAllText($ConfigPath, $legacy, (New-Object System.Text.UTF8Encoding($true)))
    $result = Get-OptimizedText 'hello'
    Assert-Check (!$result.warning -and $result.text.StartsWith($zhPrefix)) 'legacy BOM config uses the built-in zh template'
    $offset = Get-ClickOffset
    Assert-Check ($offset.FromRight -eq 720 -and $offset.FromBottom -eq 135) 'click offset defaults'
  } catch {
    Write-Host "FAIL - unexpected error: $($_.Exception.Message)"; $script:failures++
  } finally {
    Remove-Item -LiteralPath $tempDir -Recurse -Force -ErrorAction SilentlyContinue
  }
  if ($script:failures) { Write-Host "$($script:failures) self-test check(s) failed."; exit 1 }
  Write-Host 'Prompt Lens self-test passed.'
  exit 0
}

if ($Configure) {
  try { Initialize-Config } catch { Write-Host $_.Exception.Message }
  Start-Process notepad.exe -ArgumentList ('"' + $ConfigPath + '"')
  exit 0
}

if ($Uninstall) {
  Remove-LegacyStartup
  if (Test-Path -LiteralPath $desktopLauncher) { Remove-Item -LiteralPath $desktopLauncher -Force }
  Remove-ItemProperty -Path $runKey -Name $runName -ErrorAction SilentlyContinue
  $stopped = Stop-OtherInstances
  Write-Host "Prompt Lens removed from startup (stopped $stopped running instance(s)). Templates in $dataDir were kept."
  exit 0
}

if ($Install) {
  try { Initialize-Config } catch { Write-Host "Warning: $($_.Exception.Message)" }
  Remove-LegacyStartup
  $shell = New-Object -ComObject WScript.Shell
  $shortcut = $shell.CreateShortcut($desktopLauncher)
  $shortcut.TargetPath = $powershellExe
  $shortcut.Arguments = $launchArgs
  $shortcut.WorkingDirectory = $app
  $shortcut.WindowStyle = 7
  $shortcut.Save()
  # Single autostart mechanism: the per-user Run key (the Startup-folder shortcut is no longer used).
  New-ItemProperty -Path $runKey -Name $runName -Value "`"$powershellExe`" $launchArgs" -PropertyType String -Force | Out-Null
  Stop-OtherInstances | Out-Null
  Start-Process -FilePath $powershellExe -ArgumentList $launchArgs -WindowStyle Hidden
  Write-Host 'Installed. Prompt Lens is running now (tray icon) and will start automatically when you sign in.'
  exit 0
}

# ---------------------------------------------------------------- companion runtime

$mutex = New-Object System.Threading.Mutex($false, 'Local\PromptLensCompanion')
$ownsMutex = $false
try { $ownsMutex = $mutex.WaitOne(0) } catch {
  # A previous instance was killed while holding the mutex; ownership passes to us.
  if ($_.Exception -is [System.Threading.AbandonedMutexException] -or $_.Exception.InnerException -is [System.Threading.AbandonedMutexException]) { $ownsMutex = $true } else { throw }
}
if (!$ownsMutex) { Write-Log 'Another Prompt Lens instance is already running; exiting.'; exit 0 }

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Windows.Forms -WarningAction SilentlyContinue @'
using System;
using System.Windows.Forms;
public class PromptLensOverlay : Form {
  protected override bool ShowWithoutActivation { get { return true; } }
  protected override CreateParams CreateParams { get { var cp = base.CreateParams; cp.ExStyle |= 0x08000000 | 0x00000080; return cp; } }
}
'@
Add-Type @'
using System;
using System.Runtime.InteropServices;
public static class PromptLensNative {
  [DllImport("user32.dll")] public static extern bool RegisterHotKey(IntPtr hWnd, int id, uint fsModifiers, uint vk);
  [DllImport("user32.dll")] public static extern bool UnregisterHotKey(IntPtr hWnd, int id);
  [DllImport("user32.dll")] public static extern bool PeekMessage(out MSG msg, IntPtr hWnd, uint min, uint max, uint remove);
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
  [DllImport("user32.dll")] public static extern void mouse_event(uint flags, uint dx, uint dy, uint data, UIntPtr extra);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);
  [DllImport("user32.dll")] public static extern short GetAsyncKeyState(int vKey);
  public struct MSG { public IntPtr hWnd; public uint message; public UIntPtr wParam; public IntPtr lParam; public uint time; public int x; public int y; }
  public struct RECT { public int Left; public int Top; public int Right; public int Bottom; }
}
'@

$WM_HOTKEY = 0x0312
$MOD_CONTROL = 0x0002
$MOD_ALT = 0x0001
$script:previous = $null       # text before the last optimization
$script:lastOptimized = $null  # text we pasted, used to detect later edits
$script:busy = $false
$script:running = $true
$script:targetWindow = [IntPtr]::Zero
$script:tray = $null

function Show-Notice([string]$message, [string]$level = 'Info') {
  Write-Log "${level}: $message"
  if (!$script:tray) { return }
  if ($message.Length -gt 250) { $message = $message.Substring(0, 247) + '...' }
  $script:tray.BalloonTipTitle = 'Prompt Lens'
  $script:tray.BalloonTipText = $message
  $script:tray.BalloonTipIcon = [System.Windows.Forms.ToolTipIcon]$level
  $script:tray.ShowBalloonTip(4000)
}

function Get-CodexWindow {
  foreach ($name in $codexProcessNames) {
    $process = Get-Process -Name $name -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne [IntPtr]::Zero } | Select-Object -First 1
    if ($process) { return $process.MainWindowHandle }
  }
  return [IntPtr]::Zero
}

function Test-CodexForeground {
  $window = [PromptLensNative]::GetForegroundWindow()
  if ($window -eq [IntPtr]::Zero) { return $false }
  [uint32]$processId = 0
  [PromptLensNative]::GetWindowThreadProcessId($window, [ref]$processId) | Out-Null
  try { return ($codexProcessNames -contains (Get-Process -Id $processId -ErrorAction Stop).ProcessName) } catch { return $false }
}

function Wait-ModifierRelease {
  # Global hotkeys fire while Ctrl/Alt are still held; sending Ctrl+A then would become Ctrl+Alt+A.
  $deadline = [DateTime]::UtcNow.AddMilliseconds(1500)
  while ([DateTime]::UtcNow -lt $deadline) {
    $held = $false
    foreach ($vk in 0x10, 0x11, 0x12, 0x5B, 0x5C) { if ([PromptLensNative]::GetAsyncKeyState($vk) -band 0x8000) { $held = $true } }
    if (!$held) { return }
    Start-Sleep -Milliseconds 20
  }
}

function Enter-Codex([bool]$FromButton) {
  if (Test-CodexForeground) { return $true }  # focus is already where the user left it; do not click
  if (!$FromButton -or $script:targetWindow -eq [IntPtr]::Zero) { return $false }
  [PromptLensNative]::SetForegroundWindow($script:targetWindow) | Out-Null
  Start-Sleep -Milliseconds 150
  if (!(Test-CodexForeground)) { Show-Notice 'Could not bring Codex to the front. Click the Codex input box and try again.' 'Warning'; return $false }
  # Codex was in the background: click where the composer usually is (configurable via inputClickOffset).
  $offset = Get-ClickOffset
  $rect = New-Object PromptLensNative+RECT
  [PromptLensNative]::GetWindowRect($script:targetWindow, [ref]$rect) | Out-Null
  $x = [Math]::Max($rect.Left + 250, $rect.Right - $offset.FromRight)
  $y = $rect.Bottom - $offset.FromBottom
  [PromptLensNative]::SetCursorPos($x, $y) | Out-Null
  [PromptLensNative]::mouse_event(0x0002, 0, 0, 0, [UIntPtr]::Zero)
  [PromptLensNative]::mouse_event(0x0004, 0, 0, 0, [UIntPtr]::Zero)
  Start-Sleep -Milliseconds 120
  return $true
}

function Get-ClipboardText {
  try { if ([System.Windows.Forms.Clipboard]::ContainsText()) { return [System.Windows.Forms.Clipboard]::GetText() } } catch { }
  return $null
}

function Save-Clipboard {
  $saved = @{ Data = $null; Text = (Get-ClipboardText) }
  try {
    $source = [System.Windows.Forms.Clipboard]::GetDataObject()
    if ($source) {
      $snapshot = New-Object System.Windows.Forms.DataObject
      $count = 0
      foreach ($format in $source.GetFormats($false)) {
        try { $data = $source.GetData($format, $false); if ($null -ne $data) { $snapshot.SetData($format, $false, $data); $count++ } } catch { }
      }
      if ($count) { $saved.Data = $snapshot }
    }
  } catch { }
  return $saved
}

function Restore-Clipboard($saved) {
  try {
    if ($saved.Data) { [System.Windows.Forms.Clipboard]::SetDataObject($saved.Data, $true, 5, 60); return }
  } catch { }
  try {
    if ($saved.Text) { [System.Windows.Forms.Clipboard]::SetDataObject($saved.Text, $true, 5, 60) } else { [System.Windows.Forms.Clipboard]::Clear() }
  } catch { Write-Log "Clipboard restore failed: $($_.Exception.Message)" }
}

function Copy-ComposerText {
  # Clear first so an empty composer cannot leave stale clipboard content to be "optimized".
  try { [System.Windows.Forms.Clipboard]::Clear() } catch { }
  [System.Windows.Forms.SendKeys]::SendWait('^a'); Start-Sleep -Milliseconds 80
  [System.Windows.Forms.SendKeys]::SendWait('^c')
  $deadline = [DateTime]::UtcNow.AddMilliseconds(500)
  do {
    Start-Sleep -Milliseconds 40
    $text = Get-ClipboardText
    if ($text) { return $text }
  } while ([DateTime]::UtcNow -lt $deadline)
  return $null
}

function Paste-ComposerText([string]$text) {
  [System.Windows.Forms.Clipboard]::SetDataObject($text, $true, 5, 60)
  [System.Windows.Forms.SendKeys]::SendWait('^a'); Start-Sleep -Milliseconds 60
  [System.Windows.Forms.SendKeys]::SendWait('^v'); Start-Sleep -Milliseconds 250
}

function Format-Comparable([string]$text) {
  if ($null -eq $text) { return '' }
  return ($text -replace "`r`n?", "`n").Trim()
}

function Set-RestoreState($original, $optimized) {
  $script:previous = $original
  $script:lastOptimized = $optimized
  if ($script:button) {
    $label = if ($original) { 'Prompt Lens: restore original prompt' } else { 'Prompt Lens: optimize prompt' }
    $script:button.AccessibleName = $label
    if ($script:tooltip) { $script:tooltip.SetToolTip($script:button, $label) }
    $script:button.Invalidate()
  }
}

function Invoke-PromptLens([ValidateSet('Optimize', 'Restore', 'Toggle')][string]$Mode, [bool]$FromButton = $false) {
  if ($script:busy) { return }
  $script:busy = $true
  $clipboard = $null
  try {
    if (!(Enter-Codex $FromButton)) { return }
    Wait-ModifierRelease
    $clipboard = Save-Clipboard

    if ($Mode -eq 'Restore') {
      if (!$script:previous) { Show-Notice 'Nothing to restore yet.'; return }
      Paste-ComposerText $script:previous
      Set-RestoreState $null $null
      return
    }

    $text = Copy-ComposerText
    if ($Mode -eq 'Toggle' -and $script:previous -and (Format-Comparable $text) -eq (Format-Comparable $script:lastOptimized)) {
      Paste-ComposerText $script:previous
      Set-RestoreState $null $null
      return
    }
    if (!$text -or !$text.Trim()) { Show-Notice 'The Codex input box is empty, so nothing was changed.' 'Warning'; return }

    $result = Get-OptimizedText $text
    if (!$result.text) { return }
    Paste-ComposerText $result.text
    Set-RestoreState $text $result.text
    if ($result.warning) { Show-Notice $result.warning 'Warning' }
  } catch {
    Show-Notice ('Prompt Lens failed: ' + $_.Exception.Message) 'Error'
  } finally {
    if ($clipboard) { Restore-Clipboard $clipboard }
    $script:busy = $false
  }
}

function Draw-PromptLensMark($graphics, [bool]$badge) {
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $colors = @(
    [System.Drawing.Color]::FromArgb(65, 145, 255),
    [System.Drawing.Color]::FromArgb(80, 205, 150),
    [System.Drawing.Color]::FromArgb(245, 190, 70),
    [System.Drawing.Color]::FromArgb(220, 80, 120))
  $shapes = @(
    @(16, 3, 16, 15, 5, 15),
    @(16, 3, 27, 15, 16, 15),
    @(5, 17, 16, 17, 16, 29),
    @(16, 17, 27, 17, 16, 29))
  for ($i = 0; $i -lt 4; $i++) {
    $s = $shapes[$i]
    $points = [System.Drawing.Point[]]@(
      (New-Object System.Drawing.Point($s[0], $s[1])),
      (New-Object System.Drawing.Point($s[2], $s[3])),
      (New-Object System.Drawing.Point($s[4], $s[5])))
    $brush = New-Object System.Drawing.SolidBrush($colors[$i])
    $graphics.FillPolygon($brush, $points)
    $brush.Dispose()
  }
  if ($badge) { $graphics.FillEllipse([System.Drawing.Brushes]::White, 22, 22, 8, 8) }
}

function New-PromptLensIcon {
  $bitmap = New-Object System.Drawing.Bitmap(32, 32)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  try { $graphics.Clear([System.Drawing.Color]::Transparent); Draw-PromptLensMark $graphics $false } finally { $graphics.Dispose() }
  return [System.Drawing.Icon]::FromHandle($bitmap.GetHicon())
}

$form = $null
$timer = $null
$hotkeyOptimize = $false
$hotkeyRestore = $false
try {
  # Tray icon: error notifications and a way to quit without Task Manager.
  $script:tray = New-Object System.Windows.Forms.NotifyIcon
  $script:tray.Icon = New-PromptLensIcon
  $script:tray.Text = 'Prompt Lens (Ctrl+Alt+O / Ctrl+Alt+Z)'
  $menu = New-Object System.Windows.Forms.ContextMenuStrip
  [void]$menu.Items.Add('Edit templates', $null, { try { Initialize-Config; Start-Process notepad.exe -ArgumentList ('"' + $ConfigPath + '"') } catch { Show-Notice $_.Exception.Message 'Error' } })
  [void]$menu.Items.Add('Open log', $null, { try { if (Test-Path -LiteralPath $logPath) { Start-Process notepad.exe -ArgumentList ('"' + $logPath + '"') } else { Show-Notice 'No log entries yet.' } } catch { } })
  [void]$menu.Items.Add((New-Object System.Windows.Forms.ToolStripSeparator))
  [void]$menu.Items.Add('Exit Prompt Lens', $null, { $script:running = $false })
  $script:tray.ContextMenuStrip = $menu
  $script:tray.Visible = $true

  try { Initialize-Config } catch { Show-Notice $_.Exception.Message 'Error' }

  $form = New-Object PromptLensOverlay
  $form.FormBorderStyle = 'None'; $form.ShowInTaskbar = $false; $form.TopMost = $true; $form.Text = 'Prompt Lens'
  $form.StartPosition = 'Manual'; $form.Size = New-Object System.Drawing.Size(32, 32)
  $form.BackColor = [System.Drawing.Color]::FromArgb(42, 42, 42)
  $form.Region = New-Object System.Drawing.Region([System.Drawing.Rectangle]::new(0, 0, 32, 32))
  $form.Opacity = 0.96
  $script:button = New-Object System.Windows.Forms.Button
  $script:button.Dock = 'Fill'; $script:button.FlatStyle = 'Flat'; $script:button.FlatAppearance.BorderSize = 0; $script:button.TabStop = $false
  $script:button.BackColor = [System.Drawing.Color]::FromArgb(36, 36, 36)
  $script:button.Text = ''
  $script:button.Cursor = [System.Windows.Forms.Cursors]::Hand
  $script:button.Add_Paint({ param($control, $paintArgs) try { Draw-PromptLensMark $paintArgs.Graphics ([bool]$script:previous) } catch { } })
  $script:button.Add_Click({ Invoke-PromptLens -Mode Toggle -FromButton $true })
  $script:tooltip = New-Object System.Windows.Forms.ToolTip
  $form.Controls.Add($script:button)
  Set-RestoreState $null $null

  $timer = New-Object System.Windows.Forms.Timer
  $timer.Interval = 350
  $timer.Add_Tick({
      try {
        $window = Get-CodexWindow
        $script:targetWindow = $window
        if ($window -ne [IntPtr]::Zero) {
          $rect = New-Object PromptLensNative+RECT
          [PromptLensNative]::GetWindowRect($window, [ref]$rect) | Out-Null
          $form.Location = New-Object System.Drawing.Point(($rect.Right - 112), ($rect.Bottom - 86))
          if (!$form.Visible) { $form.Show() }
        } elseif ($form.Visible) { $form.Hide() }
      } catch { Write-Log "Overlay update failed: $($_.Exception.Message)" }
    })
  $timer.Start()

  $hotkeyOptimize = [PromptLensNative]::RegisterHotKey([IntPtr]::Zero, 1, $MOD_CONTROL -bor $MOD_ALT, 0x4F)
  $hotkeyRestore = [PromptLensNative]::RegisterHotKey([IntPtr]::Zero, 2, $MOD_CONTROL -bor $MOD_ALT, 0x5A)
  if (!$hotkeyOptimize -or !$hotkeyRestore) {
    Show-Notice 'Ctrl+Alt+O or Ctrl+Alt+Z is used by another app. The floating button still works.' 'Warning'
  }
  Write-Log 'Prompt Lens started.'

  while ($script:running) {
    $message = New-Object PromptLensNative+MSG
    # Only take WM_HOTKEY from the queue; every other message is left for DoEvents to dispatch.
    while ([PromptLensNative]::PeekMessage([ref]$message, [IntPtr]::Zero, $WM_HOTKEY, $WM_HOTKEY, 1)) {
      $id = $message.wParam.ToUInt32()
      if ($id -eq 1) { Invoke-PromptLens -Mode Optimize } elseif ($id -eq 2) { Invoke-PromptLens -Mode Restore }
    }
    [System.Windows.Forms.Application]::DoEvents()
    Start-Sleep -Milliseconds 25
  }
} catch {
  Write-Log "Fatal: $($_.Exception.Message)"
  throw
} finally {
  if ($timer) { $timer.Stop() }
  if ($hotkeyOptimize) { [PromptLensNative]::UnregisterHotKey([IntPtr]::Zero, 1) | Out-Null }
  if ($hotkeyRestore) { [PromptLensNative]::UnregisterHotKey([IntPtr]::Zero, 2) | Out-Null }
  if ($script:tray) { $script:tray.Visible = $false; $script:tray.Dispose() }
  if ($form) { $form.Close() }
  if ($ownsMutex) { $mutex.ReleaseMutex() }
  $mutex.Dispose()
  Write-Log 'Prompt Lens stopped.'
}

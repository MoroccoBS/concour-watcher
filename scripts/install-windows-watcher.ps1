param(
  [string]$TaskName = "CNCR Local Watcher",
  [int]$IntervalMinutes = 10
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$pnpm = (Get-Command pnpm -ErrorAction Stop).Source
$logDir = Join-Path $repoRoot "logs"
New-Item -ItemType Directory -Path $logDir -Force | Out-Null

$argument = @(
  "-NoProfile",
  "-ExecutionPolicy", "Bypass",
  "-Command",
  "Set-Location -LiteralPath '$repoRoot'; New-Item -ItemType Directory -Path '$logDir' -Force | Out-Null; & '$pnpm' watch:once *> '$logDir\watcher.log'"
) -join " "

$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument $argument -WorkingDirectory $repoRoot
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) `
  -RepetitionInterval (New-TimeSpan -Minutes $IntervalMinutes) `
  -RepetitionDuration (New-TimeSpan -Days 3650)
$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -WakeToRun `
  -MultipleInstances IgnoreNew
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited

Register-ScheduledTask `
  -TaskName $TaskName `
  -Action $action `
  -Trigger $trigger `
  -Settings $settings `
  -Principal $principal `
  -Force | Out-Null

Write-Host "Installed scheduled task '$TaskName'."
Write-Host "It will run pnpm watch:once every $IntervalMinutes minutes from:"
Write-Host "  $repoRoot"
Write-Host "Logs:"
Write-Host "  $logDir\watcher.log"

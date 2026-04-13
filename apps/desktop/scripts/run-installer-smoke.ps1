$ErrorActionPreference = "Stop"

$installer = "c:\eh-universe-web\dist\desktop\EH Code Studio-0.1.0-alpha-win-x64.exe"
if (-not (Test-Path $installer)) {
  throw "installer not found: $installer"
}

$installDir = Join-Path $env:LOCALAPPDATA "EHCodeStudioSmoke"
if (Test-Path $installDir) {
  Remove-Item -Recurse -Force $installDir
}
New-Item -ItemType Directory -Force -Path $installDir | Out-Null

Write-Output "[run-installer-smoke] silent install to: $installDir"

# NSIS silent install: /S
# Custom directory: /D=path (must be last, and should NOT be quoted)
$args = @("/S", ("/D=" + $installDir))

$p = Start-Process -FilePath $installer -ArgumentList $args -PassThru
Write-Output "[run-installer-smoke] installer pid=$($p.Id)"

try {
  Wait-Process -Id $p.Id -Timeout 180
} catch {
  throw "[run-installer-smoke] installer did not finish within 180s"
}

Write-Output "[run-installer-smoke] installer exited"

$exe = Join-Path $installDir "EH Code Studio.exe"
if (-not (Test-Path $exe)) {
  Write-Output "[run-installer-smoke] installed exe not found at expected path: $exe"
  Write-Output "[run-installer-smoke] install dir contents:"
  Get-ChildItem $installDir -Force | Select-Object Name,Length,LastWriteTime | Format-Table -AutoSize
  exit 1
}

Write-Output "[run-installer-smoke] launching installed app: $exe"
$app = Start-Process -FilePath $exe -PassThru
Write-Output "[run-installer-smoke] app pid=$($app.Id)"

Start-Sleep -Seconds 6
$alive = Get-Process -Id $app.Id -ErrorAction SilentlyContinue
if ($alive) {
  Write-Output "[run-installer-smoke] app still running after 6s"
  $alive | Select-Object Id,ProcessName,CPU,StartTime | Format-Table -AutoSize
  taskkill /PID $app.Id /F | Out-Null
  exit 0
}

Write-Output "[run-installer-smoke] app exited within 6s"
exit 1


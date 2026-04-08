$ErrorActionPreference = "Stop"

$exe = "c:\eh-universe-web\dist\desktop\win-unpacked\EH Code Studio.exe"
if (-not (Test-Path $exe)) {
  throw "exe not found: $exe"
}

Write-Output "[run-unpacked-smoke] starting: $exe"
$p = Start-Process -FilePath $exe -PassThru
Write-Output "[run-unpacked-smoke] pid=$($p.Id)"

Start-Sleep -Seconds 6

$alive = Get-Process -Id $p.Id -ErrorAction SilentlyContinue
if ($alive) {
  Write-Output "[run-unpacked-smoke] still running after 6s"
  $alive | Select-Object Id,ProcessName,CPU,StartTime | Format-Table -AutoSize
  exit 0
}

Write-Output "[run-unpacked-smoke] process exited within 6s"
exit 1


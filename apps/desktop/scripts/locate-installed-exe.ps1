$ErrorActionPreference = "Stop"

Write-Output "[locate-installed-exe] searching for installed executable..."

$targets = @(
  "EH Code Studio.exe",
  "eh-code-studio-desktop.exe"
)

$roots = @(
  "$env:LOCALAPPDATA\Programs",
  "$env:PROGRAMFILES",
  "$env:PROGRAMFILES(x86)",
  "$env:LOCALAPPDATA"
)

foreach ($root in $roots) {
  if (-not (Test-Path $root)) { continue }
  foreach ($name in $targets) {
    try {
      $hit = Get-ChildItem -Path $root -Recurse -Filter $name -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 5 FullName, Length, LastWriteTime
      if ($hit) {
        Write-Output ("[locate-installed-exe] hits for " + $name + " under " + $root)
        $hit | Format-Table -AutoSize
      }
    } catch {
      # ignore access denied
    }
  }
}

Write-Output "[locate-installed-exe] done"


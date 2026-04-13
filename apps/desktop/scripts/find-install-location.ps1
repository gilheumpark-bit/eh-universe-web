$ErrorActionPreference = "Stop"

$roots = @(
  "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall",
  "HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall",
  "HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall"
)

foreach ($root in $roots) {
  if (-not (Test-Path $root)) { continue }
  Get-ChildItem $root | ForEach-Object {
    try {
      $p = Get-ItemProperty $_.PsPath -ErrorAction Stop
      if ($p.DisplayName -and ($p.DisplayName -like "*EH Code Studio*")) {
        Write-Output "== Match =="
        $p | Select-Object DisplayName, DisplayVersion, Publisher, InstallLocation, UninstallString, QuietUninstallString |
          Format-List
      }
    } catch {}
  }
}


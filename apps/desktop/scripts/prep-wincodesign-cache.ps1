$ErrorActionPreference = "Stop"

$version = "2.6.0"
$localAppData = $env:LOCALAPPDATA
if (-not $localAppData) {
  throw "LOCALAPPDATA is not set."
}

$cacheRoot = Join-Path $localAppData "electron-builder\\Cache\\winCodeSign"
$targetDir = Join-Path $cacheRoot ("winCodeSign-" + $version)

# If already prepared, do nothing.
if (Test-Path $targetDir) {
  Write-Output ("[prep-wincodesign-cache] cache already exists: " + $targetDir)
  exit 0
}

New-Item -ItemType Directory -Force -Path $cacheRoot | Out-Null

$zipUrl = "https://github.com/electron-userland/electron-builder-binaries/archive/refs/tags/winCodeSign-$version.zip"
$tmpZip = Join-Path $env:TEMP ("electron-builder-binaries-winCodeSign-" + $version + ".zip")
$tmpDir = Join-Path $env:TEMP ("electron-builder-binaries-winCodeSign-" + $version + "-extracted")

Write-Output ("[prep-wincodesign-cache] downloading: " + $zipUrl)
Invoke-WebRequest -Uri $zipUrl -OutFile $tmpZip -UseBasicParsing -TimeoutSec 60
Write-Output ("[prep-wincodesign-cache] downloaded: " + $tmpZip)

if (Test-Path $tmpDir) {
  Remove-Item -Recurse -Force $tmpDir
}
New-Item -ItemType Directory -Force -Path $tmpDir | Out-Null

Write-Output ("[prep-wincodesign-cache] extracting zip to: " + $tmpDir)
Expand-Archive -Path $tmpZip -DestinationPath $tmpDir -Force

# The tag-zip expands to a root folder like:
# electron-builder-binaries-winCodeSign-2.6.0\winCodeSign\...
$root = Get-ChildItem -Path $tmpDir -Directory | Select-Object -First 1
if (-not $root) {
  throw "Unexpected zip structure: no root folder found in $tmpDir"
}

$sourceDir = Join-Path $root.FullName "winCodeSign"
if (-not (Test-Path $sourceDir)) {
  throw "Unexpected zip structure: winCodeSign folder not found at $sourceDir"
}

Write-Output ("[prep-wincodesign-cache] copying to cache: " + $targetDir)
New-Item -ItemType Directory -Force -Path $targetDir | Out-Null
Copy-Item -Path (Join-Path $sourceDir "*") -Destination $targetDir -Recurse -Force

Write-Output ("[prep-wincodesign-cache] done")


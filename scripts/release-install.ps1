# plugin-switch one-click installer (ASCII-only by design).
# Installs the bundled dsh-profile-plugin-switch package next to this script.
# Usage:
#   powershell -ExecutionPolicy Bypass -File .\install.ps1              # install + replace the read-only inventory with the toggle version
#   powershell -ExecutionPolicy Bypass -File .\install.ps1 -KeepOriginal # install but keep the original read-only inventory (HTTP API only)
param(
  [string]$DshHome = "",
  [switch]$KeepOriginal
)

$ErrorActionPreference = "Stop"

if (-not $DshHome) {
  $DshHome = if ($env:DSH_HOME) { $env:DSH_HOME } else { Join-Path $HOME ".dsh" }
}
$profileDir = Join-Path $DshHome "profiles\web"
if (-not (Test-Path $profileDir)) {
  throw "DSH web profile directory not found: $profileDir (if your profile is not named 'web', install manually per the repository README)"
}

# 1) Copy the plugin package into profiles\web\node_modules\
$target = Join-Path $profileDir "node_modules\dsh-profile-plugin-switch"
New-Item -ItemType Directory -Path (Split-Path $target -Parent) -Force | Out-Null
Copy-Item (Join-Path $PSScriptRoot "dsh-profile-plugin-switch") $target -Recurse -Force
Write-Host "[1/2] package copied to: $target"

# 2) Update cordis.patch.yml
$patch = Join-Path $profileDir "cordis.patch.yml"
if (-not (Test-Path $patch)) {
  throw "config file not found: $patch"
}
$content = [System.IO.File]::ReadAllText($patch)
$add = New-Object System.Collections.Generic.List[string]

if ($content -notmatch "id:\s*plugin-switch") {
  $add.Add("- insert:`r`n    - id: plugin-switch`r`n      name: dsh-profile-plugin-switch")
}
if (-not $KeepOriginal) {
  if ($content -notmatch "id:\s*ui-settings-plugin-inventory") {
    $add.Add("- id: ui-settings-plugin-inventory`r`n  disabled: true")
  }
  if ($content -notmatch "id:\s*plugin-inventory") {
    $add.Add("- id: plugin-inventory`r`n  disabled: true")
  }
}

if ($add.Count -gt 0) {
  $out = $content.TrimEnd() + "`r`n`r`n" + ($add -join "`r`n`r`n") + "`r`n"
  [System.IO.File]::WriteAllText($patch, $out, (New-Object System.Text.UTF8Encoding($false)))
  Write-Host "[2/2] cordis.patch.yml updated"
} else {
  Write-Host "[2/2] cordis.patch.yml already up to date"
}

Write-Host ""
Write-Host "Done. Next steps:"
Write-Host "  1. Restart dsh web (close the launcher window and run it again)"
Write-Host "  2. Hard-refresh the GUI page (Ctrl+Shift+R)"
if (-not $KeepOriginal) {
  Write-Host "  3. Settings -> Plugins -> Plugin list now shows the toggle switches"
}

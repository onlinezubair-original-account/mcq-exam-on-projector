#requires -Version 7.0
$ErrorActionPreference = 'Stop'
$ProjectDir = 'D:\Exam App V2'
if (-not (Test-Path -LiteralPath $ProjectDir)) { throw "Project folder not found: $ProjectDir" }
Set-Location -LiteralPath $ProjectDir
$script:Summary = [System.Collections.Generic.List[string]]::new()
$script:Status  = 'FAILED'
$script:StageId = 'UNSET'
function Add-Summary([string]$m) { $script:Summary.Add($m) }
function Write-Section([string]$t) { Write-Host "`n=== $t ===" -ForegroundColor Cyan }
function Assert-Tool([string]$n) { if (-not (Get-Command $n -ErrorAction SilentlyContinue)) { throw "Missing prerequisite: $n" } }
function Backup-IfExists([string]$p) {
  if (Test-Path -LiteralPath $p) { $b = "$p.bak-$(Get-Date -Format yyyyMMdd-HHmmss)"; Copy-Item -LiteralPath $p -Destination $b -Force; Add-Summary "BACKUP: $b" }
}
function Write-File([string]$path, [string]$content) {
  $full = if ([IO.Path]::IsPathRooted($path)) { $path } else { Join-Path (Get-Location).Path $path }
  $dir = Split-Path -Parent $full; if ($dir -and -not (Test-Path -LiteralPath $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
  if (Test-Path -LiteralPath $full) {
    if ((Get-Content -LiteralPath $full -Raw) -ceq $content) { Add-Summary "UNCHANGED: $path"; return }
    Backup-IfExists $full
  }
  [IO.File]::WriteAllText($full, $content, [Text.UTF8Encoding]::new($false)); Add-Summary "WROTE: $path"
}
function Invoke-Step([string]$label, [scriptblock]$sb) {
  Write-Section $label; $global:LASTEXITCODE = 0; & $sb
  if ($LASTEXITCODE -ne 0) { throw "$label failed (exit code $LASTEXITCODE)" }
}
function Save-Commit([string]$msg) {
  if ((Get-Command git -ErrorAction SilentlyContinue) -and (Test-Path .git)) {
    git add -A | Out-Null
    if (git status --porcelain) { git commit -q -m $msg; Add-Summary "COMMIT: $msg" } else { Add-Summary 'COMMIT: nothing to commit' }
  }
}
function Write-AiSummary {
  $lines = @("STAGE: $script:StageId", "STATUS: $script:Status") + $script:Summary
  Write-Host "`n----- AI FEEDBACK SUMMARY -----" -ForegroundColor Green
  foreach ($l in $lines) { Write-Host $l -ForegroundColor Green }
  Write-Host '----- END SUMMARY -----' -ForegroundColor Green
  try {
    $err = ($script:Summary | Where-Object { $_ -like 'ERROR:*' } | Select-Object -First 1); if (-not $err) { $err = 'None' }
    $changed = ($script:Summary | Where-Object { $_ -match '^(WROTE|COMMIT|INSTALLED|TESTS)' }) -join '; '; if (-not $changed) { $changed = 'no changes' }
    Add-Content -LiteralPath 'automation-log.md' -Value @("- $(Get-Date -Format 's')", "  - $script:StageId", "  - $script:Status", "  - $changed", "  - $err")
    Set-Clipboard -Value ($lines -join "`n")
  } catch { Write-Host "(log/clipboard step skipped: $($_.Exception.Message))" -ForegroundColor Yellow }
}

try {
  $script:StageId = 'P0.1 baseline snapshot'
  Assert-Tool node; Assert-Tool npm
  Add-Summary "NODE: $(node -v)  NPM: $(npm -v)"
  $pkg = Get-Content package.json -Raw | ConvertFrom-Json
  Add-Summary "PKG: $($pkg.name) next=$($pkg.dependencies.next) react=$($pkg.dependencies.react) zustand=$($pkg.dependencies.zustand)"
  Add-Summary "SCRIPTS: $(($pkg.scripts.PSObject.Properties | ForEach-Object { $_.Name }) -join ', ')"
  Add-Summary "GIT: $(if (Test-Path .git) { 'present, branch ' + (git branch --show-current) + ', remote ' + ((git remote) -join ',') } else { 'NOT a repository' })"
  $src = Get-ChildItem -Recurse -File -Include *.ts,*.tsx -ErrorAction SilentlyContinue | Where-Object { $_.FullName -notmatch 'node_modules|[\\/]\.next[\\/]|[\\/]out[\\/]' }
  $tests = $src | Where-Object Name -match '\.test\.tsx?$'
  Add-Summary "TEST FILES ON DISK: $($tests.Count)"
  Add-Summary "VITEST INCLUDE: $((Select-String -Path vitest.config.ts -Pattern 'include' -ErrorAction SilentlyContinue).Line.Trim())"
  $live = $src | Where-Object { $_.Name -notmatch '\.test\.' }
  $wire = $live | Select-String -Pattern 'loadLastSettings\(|checkAutosave\(' | Where-Object { $_.Path -notmatch 'persistence\.ts$' }
  Add-Summary "GAP1 recovery call sites outside persistence.ts: $(@($wire).Count)  (0 = gap confirmed)"
  $pKey  = [bool](Select-String -Path hooks/useKeyboardShortcuts.ts -Pattern "KeyP|'p'|'P'" -Quiet -ErrorAction SilentlyContinue)
  $btnDis = [bool](Select-String -Path components/screens/SlideshowScreen/Bottombar.tsx -Pattern 'disabled' -Quiet -ErrorAction SilentlyContinue)
  Add-Summary "GAP2 'P' key bound: $pKey  (False = gap confirmed)"
  Add-Summary "GAP3 Bottombar contains 'disabled': $btnDis  (True = check the print button)"
  $script:Status = 'SUCCESS'
} catch {
  Add-Summary "ERROR: $($_.Exception.Message)"
} finally {
  Write-AiSummary
}
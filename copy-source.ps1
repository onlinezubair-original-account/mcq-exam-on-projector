# --- PREAMBLE ---
$ErrorActionPreference = 'Stop'
$script:Summary = [System.Collections.Generic.List[string]]::new()
$script:Status  = 'FAILED'
function Add-Summary([string]$m) { $script:Summary.Add($m) }
function Write-AiSummary {
  $lines = @("STAGE: $script:StageId", "STATUS: $script:Status") + $script:Summary
  Write-Host "`n----- AI FEEDBACK SUMMARY -----" -ForegroundColor Green
  foreach ($l in $lines) { Write-Host $l -ForegroundColor Green }
  Write-Host '----- END SUMMARY -----' -ForegroundColor Green
  try {
     Set-Clipboard -Value ($lines -join "`n")
  } catch { }
}
try {
  $Source = 'D:\Exam taking and OMR sheet design\Projector base exam\mcq-projector'
  $Target = 'D:\Exam App V2'
  $script:StageId = 'Copy source project'
  
  $Excludes = @('node_modules', '.next', 'out', 'automation-log.md')
  
  if (-not (Test-Path -LiteralPath $Source)) { throw "Source not found: $Source" }
  
  # Copy items from source to target, excluding specified directories/files
  Get-ChildItem -LiteralPath $Source -Force | Where-Object { $Excludes -notcontains $_.Name } | ForEach-Object {
    $dest = Join-Path $Target $_.Name
    if ($_.PSIsContainer) {
      if (-not (Test-Path -LiteralPath $dest)) { New-Item -ItemType Directory -Path $dest -Force | Out-Null }
      Copy-Item -LiteralPath $_.FullName -Destination $dest -Recurse -Force
    } else {
      Copy-Item -LiteralPath $_.FullName -Destination $dest -Force
    }
  }
  
  $script:Status = 'SUCCESS'
  Add-Summary "COPIED: Source code from $Source to $Target (excluding node_modules, .next, out, automation-log.md)"
} catch {
  Add-Summary "ERROR: $($_.Exception.Message)"
  $script:Status = 'FAILED'
} finally {
  Write-AiSummary
}
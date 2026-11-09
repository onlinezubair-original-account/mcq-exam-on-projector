#requires -Version 7.0
$ErrorActionPreference = 'Stop'
$ProjectDir = 'D:\Exam App V2'
Set-Location -LiteralPath $ProjectDir
$script:Summary = [System.Collections.Generic.List[string]]::new()
$script:Status  = 'FAILED'
$script:StageId = 'P0.2 Safety net'
function Add-Summary([string]$m) { $script:Summary.Add($m) }
function Write-AiSummary {
  $lines = @("STAGE: $script:StageId", "STATUS: $script:Status") + $script:Summary
  Write-Host "`n----- AI FEEDBACK SUMMARY -----" -ForegroundColor Green
  foreach ($l in $lines) { Write-Host $l -ForegroundColor Green }
  Write-Host '----- END SUMMARY -----' -ForegroundColor Green
  try { Set-Clipboard -Value ($lines -join "`n") } catch { }
}

try {
  # 1. Ensure .gitignore
  $ignore = @('node_modules', '.next', 'out', 'dist', 'coverage', 'test-results', 'playwright-report', '*.bak-*', '.env', '.env.*', '!.env.example', 'automation-log.md', '.vitest-result.json', 'banks/', '*.exam.json', '*.package.json')
  $currentIgnore = if (Test-Path .gitignore) { Get-Content .gitignore } else { @() }
  $newIgnore = ($currentIgnore + $ignore) | Select-Object -Unique
  [System.IO.File]::WriteAllLines('.gitignore', $newIgnore)
  Add-Summary "WROTE: .gitignore updated"

  # 2. Ensure .gitattributes
  [System.IO.File]::WriteAllLines('.gitattributes', '* text=auto')
  Add-Summary "WROTE: .gitattributes"

  # 3. Commit
  if (Test-Path .git) {
    git add -A
    if (git status --porcelain) {
      git commit -m "chore: snapshot before v4 work"
      git tag baseline-v8-parity
      Add-Summary "COMMIT: snapshot"
      Add-Summary "TAG: baseline-v8-parity"
    } else {
      Add-Summary "COMMIT: nothing to commit"
    }
  }

  $script:Status = 'SUCCESS'
} catch {
  Add-Summary "ERROR: $($_.Exception.Message)"
} finally {
  Write-AiSummary
}
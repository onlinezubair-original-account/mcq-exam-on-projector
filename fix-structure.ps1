# --- PREAMBLE ---
try {
  $Target = 'D:\Exam App V2'
  $script:StageId = 'Fix nested structure'
  $script:Summary = [System.Collections.Generic.List[string]]::new()
  $script:Status = 'FAILED'
  $script:Summary.Clear()
  
  Set-Location -LiteralPath $Target
  
  $Folders = @('app', 'components', 'hooks', 'lib', 'public', 'store', 'types', '.git', '.automation-backups')
  foreach ($f in $Folders) {
    $outer = Join-Path $Target $f
    $nested = Join-Path $outer $f
    if (Test-Path -LiteralPath $nested) {
      $temp = Join-Path $Target "$f-temp"
      Move-Item -LiteralPath $nested -Destination $temp
      Remove-Item -LiteralPath $outer -Recurse -Force
      Move-Item -LiteralPath $temp -Destination $outer
      $script:Summary.Add("FIXED: nested ${f}\${f} -> ${f}")
    }
  }

  # verify flat structure
  $checks = @('app\layout.tsx','store\examStore.ts','lib\parser.ts','lib\zip.ts','components\ExamApp.tsx')
  $ok = $true
  foreach ($c in $checks) {
    $p = Join-Path $Target $c
    $exists = Test-Path -LiteralPath $p
    if (-not $exists) { $ok = $false }
    $script:Summary.Add("CHECK $c : $exists")
  }
  if (-not $ok) { throw 'Marker check failed after flatten' }
  
  $script:Status = 'SUCCESS'
} catch {
  $script:Summary.Add("ERROR: $($_.Exception.Message)")
  $script:Status = 'FAILED'
}
$lines = @("STAGE: $script:StageId", "STATUS: $script:Status") + @($script:Summary)
Write-Host "`n----- AI FEEDBACK SUMMARY (copy-paste to chat) -----" -ForegroundColor Green
foreach ($l in $lines) { Write-Host $l -ForegroundColor Green }
Write-Host '----- END SUMMARY -----' -ForegroundColor Green
try { Set-Clipboard -Value ($lines -join "`n") } catch { }
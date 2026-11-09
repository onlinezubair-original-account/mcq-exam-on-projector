# --- PREAMBLE ---   (inspect scripts use the preamble but do NOT call Write-AiSummary, because that would overwrite the clipboard)
try {
  $script:StageId = 'discover source project'
  $output = @()
  $output += "Search started at $(Get-Date -Format s)"
  $candidates = @()

  # Walk known sources: D:\ and C:\Users\*
  $paths = @('D:\', 'C:\Users')
  $paths | ForEach-Object {
    $root = $_
    $output += "Scanning $root..."
    $folders = Get-ChildItem -Path $root -Directory -ErrorAction SilentlyContinue | Where-Object { $_.Name -like "*mcq*" -or $_.Name -like "*exam*" -or $_.Name -like "*projector*" }
    $folders | ForEach-Object {
      $dir = $_.FullName
      $output += "  Checking $dir"
      $output += "    package.json: $(Test-Path (Join-Path $dir package.json))"
      if (Test-Path (Join-Path $dir package.json)) {
        $pkg = Get-Content (Join-Path $dir package.json) -Raw | ConvertFrom-Json
        $hasNext = $pkg.dependencies.next
        $output += "    has next dep: $hasNext"
        if ($hasNext) {
          # Check all markers
          $markerPath = Join-Path $dir "app\layout.tsx"
          $storePath = Join-Path $dir "store\examStore.ts"
          $parserPath = Join-Path $dir "lib\parser.ts"
          $zipPath = Join-Path $dir "lib\zip.ts"
          $componentsPath = Join-Path $dir "components\ExamApp.tsx"
          $foundAll = $hasNext -and (Test-Path $markerPath) -and (Test-Path $storePath) -and (Test-Path $parserPath) -and (Test-Path $zipPath) -and (Test-Path $componentsPath)
          $output += "    markers: app\\layout=$([IO.Path]::Exists($markerPath)), store\\examStore=$([IO.Path]::Exists($storePath)), lib\\parser=$([IO.Path]::Exists($parserPath)), lib\\zip=$([IO.Path]::Exists($zipPath)), components\\ExamApp=$([IO.Path]::Exists($componentsPath))"
          $output += "    ALL MARKERS: $foundAll"
          if ($foundAll) { $candidates += $dir }
        }
      }
    }
  }

  $output += ""
  if ($candidates.Count -eq 0) {
    $output += "NO CANDIDATES FOUND. Search completed; the source Next.js app is missing."
    $script:Status = 'FAILED'
  } else {
    $output += "Candidates: $($candidates -join ', ')"
    if ($candidates.Count -eq 1) {
      $output += "Exactly one source qualifies. Ready for copy script."
    } else {
      $output += "Multiple candidates; ask user to choose one."
    }
    $script:Status = 'SUCCESS'
  }

  $output += "Search finished at $(Get-Date -Format s)"
  $output | Out-File -FilePath "D:\Exam App V2\search.txt" -Encoding utf8 -Append
  $script:Summary = $output
} catch {
  Add-Content -Path "D:\Exam App V2\search.txt" -Value "ERROR: $($_.Exception.Message)"
  $script:Status = 'FAILED'
  $script:Summary = @("ERROR: $($_.Exception.Message)")
}
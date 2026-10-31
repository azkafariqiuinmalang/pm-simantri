[CmdletBinding()]
param([switch]$Apply)

$ErrorActionPreference = 'Stop'
$repo = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..')).TrimEnd('\')
$expectedRepo = 'D:\SEMESTER 5\PROJECT MANEJEMEN\PM (SIMANTRI)'
if ($repo -ne $expectedRepo) { throw 'Cleanup is restricted to the named PM clone.' }
if (-not (Test-Path -LiteralPath (Join-Path $repo 'PROJECT_CONTEXT.md'))) { throw 'Missing PM context.' }

# Reproducible output only. Never target the application's root node_modules or .git.
$generated = @(
  '.next',
  'remotion-video\node_modules', 'remotion-video\build', 'remotion-video\out',
  'scratch\price-evaluation-deps', 'tsconfig.tsbuildinfo'
)
# Preserve recoverability for old source, assets and previous uncommitted edits.
$recycle = @(
  'remotion-video', 'scratch', 'ml',
  'docs\api', 'docs\architecture', 'docs\design', 'docs\product',
  'docs\database\archive', 'docs\database\simantri_schema_v4.sql',
  'PROGRESS_REPORT.md', 'QUERY_GUIDELINES.md',
  'src\SIMANTRI_Market_Insight_Scrapper_Implementation.md',
  'src\components\landing\PlatformVideoDemo.tsx',
  'src\components\ui\TiltCard.tsx', 'src\app\dunia-brambang\experience.tsx',
  'public\UIUX BARU', 'public\media', 'public\video_landing_page.mp4',
  'public\file.svg', 'public\globe.svg', 'public\next.svg', 'public\vercel.svg', 'public\window.svg'
)

function Assert-Target([string]$relative) {
  $full = [IO.Path]::GetFullPath((Join-Path $repo $relative))
  if (-not $full.StartsWith($repo + '\', [StringComparison]::OrdinalIgnoreCase)) { throw "Outside PM clone: $relative" }
  if ($relative -match '^([.]git|node_modules|[.]agents)(\\|$)' -or $relative -in @('.env.local', 'PRD.md')) { throw "Protected: $relative" }
  $cursor = $full
  while ($cursor -ne $repo) {
    if (Test-Path -LiteralPath $cursor) {
      $item = Get-Item -LiteralPath $cursor -Force
      if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw "Linked target is not allowed: $relative" }
    }
    $cursor = [IO.Path]::GetDirectoryName($cursor)
  }
  if (Test-Path -LiteralPath $full -PathType Container) {
    if (@(Get-ChildItem -LiteralPath $full -Recurse -Force -Attributes ReparsePoint).Count) { throw "Linked descendant: $relative" }
    if (@(Get-ChildItem -LiteralPath $full -Recurse -Force -Filter '.git').Count) { throw "Nested repository: $relative" }
  }
  return $full
}

# Validate every exact absolute target before performing any deletion.
$all = @($generated) + @($recycle)
foreach ($relative in $all) { $null = Assert-Target $relative }
if ($Apply -and @(Get-Process -Name node -ErrorAction SilentlyContinue).Count) {
  throw 'Node is running. Stop only the PM server explicitly before removing generated build output.'
}

$topTargets = $all | Where-Object {
  $candidate = $_
  -not ($all | Where-Object { $_ -ne $candidate -and $candidate.StartsWith($_ + '\', [StringComparison]::OrdinalIgnoreCase) })
}
$inventory = @(foreach ($relative in $topTargets) {
  $full = Assert-Target $relative
  if (Test-Path -LiteralPath $full) {
    $files = @(if (Test-Path -LiteralPath $full -PathType Container) { Get-ChildItem -LiteralPath $full -File -Recurse -Force } else { Get-Item -LiteralPath $full -Force })
    [pscustomobject]@{ Path=$relative; Files=$files.Count; Bytes=[long](($files | Measure-Object Length -Sum).Sum); Mode= $(if ($generated -contains $relative) {'Regenerable output: permanent'} else {'Recycle Bin; nested generated output: permanent'}) }
  }
})
$before = Get-ChildItem -LiteralPath $repo -File -Recurse -Force | Measure-Object Length -Sum
$originalEnvHash = (Get-FileHash -LiteralPath 'D:\SIMANTRI (Sistem Informasi)\.env.local' -Algorithm SHA256).Hash
$preserve = @('src\app\api\chat\route.ts','src\app\api\market\sync-pihps\route.ts','src\lib\market\pihps.ts',
  'src\app\api\diseases\route.ts','src\components\diseases\DiseaseCatalogue.tsx','src\app\admin\penyakit\page.tsx',
  'public\dunia-brambang.html','public\dunia-brambang-audio.js','.env.local','PRD.md','data\pm-diseases.json','docs\database\simantri_pm_schema.sql')
$preserve += @(Get-ChildItem -LiteralPath (Join-Path $repo 'knowledge_base') -File -Recurse | ForEach-Object { $_.FullName.Substring($repo.Length+1) })
$hashes = @{}
foreach ($relative in $preserve) { $hashes[$relative] = (Get-FileHash -LiteralPath (Join-Path $repo $relative) -Algorithm SHA256).Hash }
$actions = [Collections.Generic.List[object]]::new()
if ($Apply) {
  foreach ($relative in $generated) {
    $full = Assert-Target $relative
    if (Test-Path -LiteralPath $full) {
      Remove-Item -LiteralPath $full -Recurse -Force
      $actions.Add([pscustomobject]@{Path=$relative;Action='Removed permanently (regenerable)'})
    }
  }
  foreach ($relative in $recycle) {
    $full = Assert-Target $relative
    if (Test-Path -LiteralPath $full -PathType Container) {
      [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteDirectory($full, [Microsoft.VisualBasic.FileIO.UIOption]::OnlyErrorDialogs, [Microsoft.VisualBasic.FileIO.RecycleOption]::SendToRecycleBin, [Microsoft.VisualBasic.FileIO.UICancelOption]::ThrowException)
      $actions.Add([pscustomobject]@{Path=$relative;Action='Moved to Recycle Bin'})
    } elseif (Test-Path -LiteralPath $full) {
      [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteFile($full, [Microsoft.VisualBasic.FileIO.UIOption]::OnlyErrorDialogs, [Microsoft.VisualBasic.FileIO.RecycleOption]::SendToRecycleBin, [Microsoft.VisualBasic.FileIO.UICancelOption]::ThrowException)
      $actions.Add([pscustomobject]@{Path=$relative;Action='Moved to Recycle Bin'})
    }
  }
  foreach ($relative in $preserve) {
    if ((Get-FileHash -LiteralPath (Join-Path $repo $relative) -Algorithm SHA256).Hash -ne $hashes[$relative]) { throw "Protected file changed: $relative" }
  }
  if ((Get-FileHash -LiteralPath 'D:\SIMANTRI (Sistem Informasi)\.env.local' -Algorithm SHA256).Hash -ne $originalEnvHash) { throw 'Competition configuration changed unexpectedly.' }
}
$after = Get-ChildItem -LiteralPath $repo -File -Recurse -Force | Measure-Object Length -Sum
[pscustomobject]@{
  Root=$repo; Applied=[bool]$Apply; BeforeBytes=[long]$before.Sum; BeforeFiles=$before.Count;
  AfterBytes=[long]$after.Sum; AfterFiles=$after.Count; RemovedBytes=[long]($before.Sum-$after.Sum);
  ProtectedFilesChecked=$preserve.Count; OriginalEnvUnchanged=$true; Inventory=$inventory; Actions=@($actions.ToArray())
} | ConvertTo-Json -Depth 6

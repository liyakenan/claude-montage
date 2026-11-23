# Claude Montage - installer for Windows. Safe to run again: it only adds what is missing.
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$Repo = 'https://github.com/liyakenan/claude-montage'
$Dir = Join-Path $HOME 'claude-montage'
$Tmp = Join-Path $env:TEMP ('montage-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Force -Path $Dir, $Tmp | Out-Null

Write-Host "Claude Montage - installing into $Dir"
Write-Host "This takes 5-15 minutes depending on the internet speed. Keep the computer awake."

try {
  if (-not (Test-Path (Join-Path $Dir '.node\node.exe'))) {
    Write-Host ""
    Write-Host "[0/5] Downloading Node.js (the engine that runs the tools)..."
    $NodeUrl = 'https://nodejs.org/dist/latest-v22.x'
    $Sums = (Invoke-WebRequest -UseBasicParsing "$NodeUrl/SHASUMS256.txt").Content
    if ($Sums -is [byte[]]) { $Sums = [Text.Encoding]::ASCII.GetString($Sums) }
    $Line = ($Sums -split "`n" | Where-Object { $_ -match 'win-x64\.zip\s*$' } | Select-Object -First 1).Trim()
    $Sum, $File = $Line -split '\s+'
    $Zip = Join-Path $Tmp 'node.zip'
    Invoke-WebRequest -UseBasicParsing "$NodeUrl/$File" -OutFile $Zip
    if ((Get-FileHash $Zip -Algorithm SHA256).Hash.ToLower() -ne $Sum.ToLower()) {
      throw 'The Node.js download is damaged. Run the installer again.'
    }
    Expand-Archive -Path $Zip -DestinationPath (Join-Path $Tmp 'node') -Force
    $Inner = Get-ChildItem (Join-Path $Tmp 'node') -Directory | Select-Object -First 1
    $NodeDir = Join-Path $Dir '.node'
    if (Test-Path $NodeDir) { Remove-Item $NodeDir -Recurse -Force }
    Move-Item $Inner.FullName $NodeDir
  }

  $KitZip = Join-Path $Tmp 'kit.zip'
  Invoke-WebRequest -UseBasicParsing "$Repo/archive/refs/heads/main.zip" -OutFile $KitZip
  $KitTmp = Join-Path $Tmp 'kit'
  Expand-Archive -Path $KitZip -DestinationPath $KitTmp -Force
  $KitInner = Get-ChildItem $KitTmp -Directory | Select-Object -First 1
  Copy-Item -Path (Join-Path $KitInner.FullName '*') -Destination $Dir -Recurse -Force

  $env:PATH = (Join-Path $Dir '.node') + ';' + $env:PATH
  & (Join-Path $Dir '.node\node.exe') (Join-Path $Dir 'tools\setup.mjs')
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}
catch {
  Write-Host "INSTALL FAILED: $($_.Exception.Message)"
  exit 1
}
finally {
  Remove-Item $Tmp -Recurse -Force -ErrorAction SilentlyContinue
}

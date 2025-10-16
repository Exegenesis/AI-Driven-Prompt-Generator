param()
$BinDir = Join-Path $PSScriptRoot 'bin'
if (-not (Test-Path $BinDir)) { New-Item -ItemType Directory -Path $BinDir | Out-Null }

$arch = (Get-CimInstance Win32_Processor).AddressWidth
if ($arch -eq 64) { $archTag = 'x64' } else { $archTag = 'x86' }

$tag = 'v8.7.0'
$file = "gitleaks_${tag}_windows_${archTag}.zip"
$url = "https://github.com/zricethezav/gitleaks/releases/download/${tag}/${file}"

Write-Host "Downloading $url"
$tmp = Join-Path $env:TEMP $file
Invoke-WebRequest -Uri $url -OutFile $tmp
Expand-Archive -Path $tmp -DestinationPath $BinDir -Force
Remove-Item $tmp
Write-Host "Downloaded gitleaks to $BinDir"

param(
  [Parameter(Mandatory = $true)]
  [string]$ScriptPath
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$transcriptsDir = Join-Path $root "transcripts"
if (!(Test-Path $transcriptsDir)) {
  New-Item -ItemType Directory -Path $transcriptsDir | Out-Null
}

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$transcriptFile = Join-Path $transcriptsDir "transcript_$timestamp.txt"

Start-Transcript -Path $transcriptFile -Force | Out-Null
try {
  & $ScriptPath
} finally {
  Stop-Transcript | Out-Null
}

Write-Output "Transcript: $transcriptFile"

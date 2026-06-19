$ErrorActionPreference = "Stop"

$api = "http://159.194.225.55:8080/api/index.php"
$utf8 = [System.Text.Encoding]::UTF8
$cp1251 = [System.Text.Encoding]::GetEncoding(1251)
$bad = [regex]'[РС][\u0400-\u045F]'

function Repair-String([string]$value) {
  if (-not $bad.IsMatch($value)) { return $value }
  return $utf8.GetString($cp1251.GetBytes($value))
}

function Repair-Object($obj) {
  if ($null -eq $obj) { return $null }
  if ($obj -is [string]) { return Repair-String $obj }
  if ($obj -is [System.Collections.IEnumerable] -and -not ($obj -is [System.Collections.IDictionary]) -and -not ($obj -is [string])) {
    $arr = @()
    foreach ($item in $obj) { $arr += Repair-Object $item }
    return $arr
  }
  if ($obj -is [pscustomobject]) {
    foreach ($p in $obj.PSObject.Properties) { $p.Value = Repair-Object $p.Value }
    return $obj
  }
  return $obj
}

$boot = Invoke-RestMethod -Uri "${api}?action=bootstrap"
foreach ($m in $boot.models) {
  $pageRaw = Invoke-RestMethod -Uri "${api}?action=get_page&model_id=$($m.id)"
  if (-not $pageRaw.ok -or -not $pageRaw.page_json) { continue }
  $page = $pageRaw.page_json | ConvertFrom-Json
  $fixed = Repair-Object $page
  $json = $fixed | ConvertTo-Json -Depth 80 -Compress
  Invoke-RestMethod -Uri "${api}?action=save_page" -Method Post -Body @{ model_id = $m.id; page_json = $json } | Out-Null
}

Invoke-RestMethod -Uri "${api}?action=get_page&model_id=3" | ConvertTo-Json -Depth 20


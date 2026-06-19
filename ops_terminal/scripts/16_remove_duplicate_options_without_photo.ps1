$ErrorActionPreference = 'Stop'

$api = 'http://159.194.225.55:8080/api/index.php'

function Normalize-OptionName([string]$name) {
  if ($null -eq $name) { $name = '' }
  $s = $name.ToLowerInvariant()
  $s = $s -replace '[,–—-]', ' '
  $s = $s -replace '\s+', ' '
  $s.Trim()
}

$boot = Invoke-RestMethod "${api}?action=bootstrap"
$options = @($boot.options)

$toDelete = New-Object System.Collections.Generic.List[object]

foreach ($group in ($options | Group-Object group_id)) {
  $withPhoto = @($group.Group | Where-Object { $_.image_url })
  $withoutPhoto = @($group.Group | Where-Object { -not $_.image_url })

  foreach ($empty in $withoutPhoto) {
    $emptyNorm = Normalize-OptionName $empty.name
    $match = $withPhoto | Where-Object {
      $photoNorm = Normalize-OptionName $_.name
      $photoNorm -eq $emptyNorm -or
      $photoNorm.Contains($emptyNorm) -or
      $emptyNorm.Contains($photoNorm)
    } | Select-Object -First 1

    if ($match) {
      $toDelete.Add([pscustomobject]@{
        id = $empty.id
        group = $empty.group_name
        name = $empty.name
        duplicateOf = $match.name
      })
    }
  }
}

# Known old door duplicates differ only by old short naming and have no images.
$knownDuplicateIds = @(29, 30, 31, 32)
foreach ($id in $knownDuplicateIds) {
  $opt = $options | Where-Object { [int]$_.id -eq $id } | Select-Object -First 1
  if ($opt -and -not $opt.image_url -and -not ($toDelete | Where-Object { [int]$_.id -eq $id })) {
    $toDelete.Add([pscustomobject]@{
      id = $opt.id
      group = $opt.group_name
      name = $opt.name
      duplicateOf = 'new card with photo in same group'
    })
  }
}

if ($toDelete.Count -eq 0) {
  Write-Output 'duplicates without photo: none'
  exit 0
}

Write-Output 'Deleting duplicates without photo:'
$toDelete | Sort-Object id | Format-Table -AutoSize | Out-String | Write-Output

foreach ($item in ($toDelete | Sort-Object id)) {
  Invoke-RestMethod -Uri "${api}?action=delete_option" -Method Post -Body @{ id = $item.id } | Out-Null
}

$after = Invoke-RestMethod "${api}?action=bootstrap"
$remaining = @($after.options | Where-Object { $knownDuplicateIds -contains [int]$_.id })
Write-Output ('deleted count: ' + $toDelete.Count)
Write-Output ('remaining known duplicate ids: ' + $remaining.Count)

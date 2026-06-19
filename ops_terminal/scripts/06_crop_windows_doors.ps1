$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

$root = "d:\project\bathhouse"
$src = Join-Path $root "public\infix\photo_2026-06-09_08-45-52.jpg"
$outDir = Join-Path $root "public\infix\windows_doors"
$phpOutDir = Join-Path $root "php_hosting\public\infix\windows_doors"

New-Item -ItemType Directory -Force -Path $outDir, $phpOutDir | Out-Null

$img = [System.Drawing.Image]::FromFile($src)
try {
  $items = @(
    @{ Name = "window_pvh_1200x800.jpg"; X = 296; Y = 0; W = 263; H = 250 },
    @{ Name = "door_pvh_1700x800.jpg"; X = 570; Y = 0; W = 292; H = 250 },
    @{ Name = "fortochka_300x400.jpg"; X = 867; Y = 0; W = 249; H = 250 }
  )

  foreach ($item in $items) {
    $bmp = New-Object System.Drawing.Bitmap($item.W, $item.H)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    try {
      $g.DrawImage($img, 0, 0, (New-Object System.Drawing.Rectangle($item.X, $item.Y, $item.W, $item.H)), [System.Drawing.GraphicsUnit]::Pixel)
      $target = Join-Path $outDir $item.Name
      $phpTarget = Join-Path $phpOutDir $item.Name
      $bmp.Save($target, [System.Drawing.Imaging.ImageFormat]::Jpeg)
      Copy-Item -Force $target $phpTarget
      Write-Host "created $target"
    } finally {
      $g.Dispose()
      $bmp.Dispose()
    }
  }
} finally {
  $img.Dispose()
}

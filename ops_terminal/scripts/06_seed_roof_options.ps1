$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

$api = "http://159.194.225.55:8080/api/index.php"
$source = "d:\project\bathhouse\public\infix\photo_2026-06-08_15-12-13.jpg"
$outDir = "d:\project\bathhouse\ops_terminal\tmp\roof_options"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$variants = @(
  @{ Name = "DOCKE Соната коричневый"; Slug = "sonata-brown"; X = 18;  Y = 243; W = 263; H = 335; Color = "коричневый" },
  @{ Name = "DOCKE Соната серый"; Slug = "sonata-gray"; X = 305; Y = 243; W = 263; H = 335; Color = "серый" },
  @{ Name = "DOCKE Соната темно-зеленый"; Slug = "sonata-dark-green"; X = 591; Y = 243; W = 263; H = 335; Color = "темно-зеленый" },
  @{ Name = "DOCKE Соната красный"; Slug = "sonata-red"; X = 878; Y = 243; W = 263; H = 335; Color = "красный" }
)

$src = [System.Drawing.Bitmap]::FromFile($source)
try {
  foreach ($v in $variants) {
    $target = Join-Path $outDir ("roof-" + $v.Slug + ".jpg")
    $rect = New-Object System.Drawing.Rectangle($v.X, $v.Y, $v.W, $v.H)
    $crop = New-Object System.Drawing.Bitmap($v.W, $v.H)
    $gfx = [System.Drawing.Graphics]::FromImage($crop)
    try {
      $gfx.DrawImage($src, 0, 0, $rect, [System.Drawing.GraphicsUnit]::Pixel)
      $crop.Save($target, [System.Drawing.Imaging.ImageFormat]::Jpeg)
    } finally {
      $gfx.Dispose()
      $crop.Dispose()
    }
    $v.Path = $target
  }
} finally {
  $src.Dispose()
}

$bootstrap = Invoke-RestMethod -Uri "${api}?action=bootstrap"
$existing = @($bootstrap.options) | Where-Object { $names = $variants.Name; $names -contains $_.name }
foreach ($item in $existing) {
  Invoke-RestMethod -Uri "${api}?action=delete_option" -Method Post -Body @{ id = $item.id } | Out-Null
}

foreach ($v in $variants) {
  $uploadRaw = & curl.exe -s -F "file=@$($v.Path)" "${api}?action=upload_image"
  $upload = $uploadRaw | ConvertFrom-Json
  if (-not $upload.ok) { throw "Upload failed for $($v.Name): $uploadRaw" }

  $features = @(
    "Серия: SONATA",
    "Форма нарезки: мозаика",
    "Гарантия производителя: 20 лет",
    "Цвет: $($v.Color)"
  ) | ConvertTo-Json -Compress

  $body = @{
    group_id = 1
    name = $v.Name
    price = "0"
    image_url = $upload.url
    description = "Гибкая черепица DOCKE SONATA, цвет: $($v.Color)."
    features = $features
  }
  Invoke-RestMethod -Uri "${api}?action=create_option" -Method Post -Body $body | Out-Null
}

Invoke-RestMethod -Uri "${api}?action=bootstrap" | ConvertTo-Json -Depth 6



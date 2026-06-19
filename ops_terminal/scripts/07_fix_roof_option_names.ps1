$ErrorActionPreference = "Stop"

$api = "http://159.194.225.55:8080/api/index.php"

$items = @(
  @{ Id = 2; Name = "DOCKE Соната коричневый"; Color = "коричневый"; Image = "/uploads/img_20260608_123814_13730dde.jpg" },
  @{ Id = 3; Name = "DOCKE Соната серый"; Color = "серый"; Image = "/uploads/img_20260608_123815_91ea5a4c.jpg" },
  @{ Id = 4; Name = "DOCKE Соната темно-зеленый"; Color = "темно-зеленый"; Image = "/uploads/img_20260608_123816_dd95ca70.jpg" },
  @{ Id = 5; Name = "DOCKE Соната красный"; Color = "красный"; Image = "/uploads/img_20260608_123817_164f4825.jpg" }
)

foreach ($it in $items) {
  $features = @(
    "Серия: SONATA",
    "Форма нарезки: мозаика",
    "Гарантия производителя: 20 лет",
    "Цвет: $($it.Color)"
  ) | ConvertTo-Json -Compress

  Invoke-RestMethod -Uri "${api}?action=update_option" -Method Post -Body @{
    id = $it.Id
    group_id = 1
    name = $it.Name
    price = "0"
    image_url = $it.Image
    description = "Гибкая черепица DOCKE SONATA, цвет: $($it.Color)."
    features = $features
  } | Out-Null
}

Invoke-RestMethod -Uri "${api}?action=bootstrap" | ConvertTo-Json -Depth 5


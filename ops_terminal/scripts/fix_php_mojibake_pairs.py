from pathlib import Path

FILES = [
    Path("php_hosting/public/index.php"),
    Path("prompt_instruction.txt"),
]

alphabet = (
    "".join(chr(c) for c in range(0x0400, 0x0500))
    + "₽°№←↑→↓✓✎×🗑📁"
)

mapping = {}
for ch in alphabet:
    try:
        bad = ch.encode("utf-8").decode("cp1251")
    except UnicodeError:
        bad = "".join(
            bytes([b]).decode("cp1251") if b not in (0x98,) else chr(b)
            for b in ch.encode("utf-8")
        )
    if bad != ch:
        mapping[bad] = ch

items = sorted(mapping.items(), key=lambda kv: len(kv[0]), reverse=True)

for path in FILES:
    if not path.exists():
        continue
    text = path.read_text(encoding="utf-8")
    original = text
    for _ in range(3):
        before = text
        for bad, good in items:
            text = text.replace(bad, good)
        if text == before:
            break
    path.write_text(text, encoding="utf-8")
    print(f"{path}: {text != original}")

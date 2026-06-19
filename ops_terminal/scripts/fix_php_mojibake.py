import re
from pathlib import Path

FILES = [
    Path("php_hosting/public/index.php"),
]

RUN = re.compile(r"[\u0400-\u045f\u0490\u0491\u201a-\u203a\u20ac]+")
BAD_MARKS = ("\u0420", "\u0421", "\u0432", "\u0440\u045f")


def suspicious(text: str) -> bool:
    return any(mark in text for mark in BAD_MARKS)


def fix_run(text: str) -> str:
    if not suspicious(text):
        return text
    try:
        fixed = text.encode("cp1251").decode("utf-8")
    except UnicodeError:
        return text
    if "\u0420" in fixed or "\u0421" in fixed:
        return text
    return fixed


for path in FILES:
    original = path.read_text(encoding="utf-8")
    fixed = RUN.sub(lambda m: fix_run(m.group(0)), original)
    path.write_text(fixed, encoding="utf-8")
    print(f"{path}: {original != fixed}")

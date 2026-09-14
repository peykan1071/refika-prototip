import json
import re
import urllib.request
from html import unescape
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
BASE = "https://school-education.ec.europa.eu/en/connect/schools-organisations"
URLS = [
    f"{BASE}?name=Erzurum&sort_by=title",
    *[f"{BASE}?name=Erzurum&sort_by=title&exposed_form_display=1&page=%2C%2C%2C{page}" for page in range(1, 4)],
]

records = []
for url in URLS:
    request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    html = urllib.request.urlopen(request, timeout=30).read().decode("utf-8")
    pattern = re.compile(
        r'<a[^>]+href="(?P<href>/en/connect/schools-organisations/[^"?#]+)"[^>]*>(?P<name>.*?)</a>',
        re.I | re.S,
    )
    for match in pattern.finditer(html):
        name = re.sub(r"<[^>]+>", " ", match.group("name"))
        name = re.sub(r"\s+", " ", unescape(name)).strip()
        if not name:
            continue
        records.append({"name": name, "href": "https://school-education.ec.europa.eu" + match.group("href")})

unique = list({item["href"]: item for item in records}.values())
(ROOT / "data" / "esep-erzurum-search-2026-09-13.json").write_text(
    json.dumps(unique, ensure_ascii=False, indent=2), encoding="utf-8"
)
print(json.dumps({"records": len(unique)}, ensure_ascii=False))

import csv
import json
import re
import urllib.parse
import urllib.request
import time
from html import unescape
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
BASE = "https://school-education.ec.europa.eu/en/connect/schools-organisations"


def clean(value):
    return re.sub(r"\s+", " ", (value or "")).strip()


lines = (ROOT / "data" / "yegitek-quality-labels-2023-2025.tsv").read_text(encoding="utf-8-sig").splitlines()
header_index = next(i for i, line in enumerate(lines) if line.startswith("Seç\tID\t"))
rows = csv.DictReader(lines[header_index:], delimiter="\t")
schools = sorted({clean(row.get("Okul Adı")) for row in rows if clean(row.get("Yıl")) in {"2023", "2024", "2025"} and clean(row.get("Okul Adı"))})
output_path = ROOT / "data" / "esep-yegitek-school-searches-2026-09-13.json"
previous = {item["query"]: item for item in json.loads(output_path.read_text(encoding="utf-8"))} if output_path.exists() else {}


def search(school):
    url = BASE + "?" + urllib.parse.urlencode({"name": school, "sort_by": "title"})
    request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    for attempt in range(4):
        try:
            html = urllib.request.urlopen(request, timeout=30).read().decode("utf-8")
            break
        except Exception as error:
            if "429" not in str(error) or attempt == 3:
                raise
            time.sleep(2 ** attempt)
    pattern = re.compile(r'<a[^>]+href="(?P<href>/en/connect/schools-organisations/[^"?#]+)"[^>]*>(?P<name>.*?)</a>', re.I | re.S)
    found = []
    for match in pattern.finditer(html):
        name = clean(unescape(re.sub(r"<[^>]+>", " ", match.group("name"))))
        if name:
            found.append({"name": name, "href": "https://school-education.ec.europa.eu" + match.group("href")})
    return {"query": school, "results": list({item["href"]: item for item in found}.values())}


output = [item for item in previous.values() if "error" not in item]
pending = [school for school in schools if school not in previous or not previous[school].get("results")]
for school in pending[:40]:
    try:
        output.append(search(school))
    except Exception as error:
        output.append({"query": school, "results": [], "error": str(error)})
    output.sort(key=lambda item: item["query"])
    output_path.write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding="utf-8")
    time.sleep(0.8)

output.sort(key=lambda item: item["query"])
output_path.write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding="utf-8")
print(json.dumps({"queries": len(output), "with_results": sum(bool(item["results"]) for item in output), "errors": sum("error" in item for item in output)}, ensure_ascii=False))

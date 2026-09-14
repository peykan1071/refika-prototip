import csv
import json
import re
from collections import OrderedDict
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "data" / "yegitek-quality-labels-2023-2025.tsv"
OUTPUT = ROOT / "lib" / "quality-label-seed.js"


def clean(value):
    return re.sub(r"\s+", " ", (value or "")).strip()


def key(value):
    # Türkçe büyük/küçük I farklarını aynı kişiyi ayırmayacak biçimde eşleştir.
    return clean(value).translate(str.maketrans({"I": "i", "İ": "i", "ı": "i"})).casefold()


lines = SOURCE.read_text(encoding="utf-8-sig").splitlines()
header_index = next(i for i, line in enumerate(lines) if line.startswith("Seç\tID\t"))
rows = csv.DictReader(lines[header_index:], delimiter="\t")
people = OrderedDict()

for row in rows:
    try:
        year = int(clean(row.get("Yıl")))
    except (TypeError, ValueError):
        continue
    if year not in (2023, 2024, 2025):
        continue

    name = clean(row.get("Öğretmen Adı Soyadı"))
    if not name:
        continue
    record_key = (year, key(name))
    if record_key not in people:
        people[record_key] = {
            "id": f"yegitek-{year}-{len(people) + 1:04d}",
            "year": year,
            "name": name,
            "school": [],
            "district": [],
            "projectCount": 0,
            "national": 0,
            "european": 0,
            "source": "YEĞİTEK Kalite Etiketi Sorgulama",
        }

    item = people[record_key]
    school = clean(row.get("Okul Adı"))
    district = clean(row.get("İlçe"))
    project = clean(row.get("Proje Adı"))
    label = key(row.get("Kalite Etiketi"))
    if school and school not in item["school"]:
        item["school"].append(school)
    if district and district not in item["district"]:
        item["district"].append(district)
    if project:
        item["projectCount"] += 1
    if "ulusal" in label:
        item["national"] += 1
    if "avrupa" in label:
        item["european"] += 1

result = []
for item in people.values():
    item["school"] = " / ".join(item["school"])
    item["district"] = " / ".join(item["district"])
    item["project"] = f'{item.pop("projectCount")} proje kaydı · YEĞİTEK'
    result.append(item)

result.sort(key=lambda item: (item["year"], key(item["name"])))
payload = json.dumps(result, ensure_ascii=False, separators=(",", ":"))
OUTPUT.write_text(
    "// YEĞİTEK Kalite Etiketi Sorgulama listesinden 13.09.2026 tarihinde alınmıştır.\n"
    f"export const qualityLabelSeed = {payload};\n",
    encoding="utf-8",
)
print(json.dumps({
    "people": len(result),
    "by_year": {year: sum(1 for item in result if item["year"] == year) for year in (2023, 2024, 2025)},
    "national": {year: sum(item["national"] for item in result if item["year"] == year) for year in (2023, 2024, 2025)},
    "european": {year: sum(item["european"] for item in result if item["year"] == year) for year in (2023, 2024, 2025)},
}, ensure_ascii=False))

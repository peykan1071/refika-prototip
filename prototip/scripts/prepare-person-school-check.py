import csv
import json
from pathlib import Path

root = Path(__file__).resolve().parents[1]
lines = (root / "data" / "yegitek-quality-labels-2023-2025.tsv").read_text(encoding="utf-8-sig").splitlines()
header = next(i for i, line in enumerate(lines) if line.startswith("Seç\tID\t"))
rows = list(csv.DictReader(lines[header:], delimiter="\t"))
comparison = json.loads((root / "data" / "yegitek-esep-comparison.json").read_text(encoding="utf-8"))
schools = {item["yegitek_school"] for item in comparison if item["status"] == "ESEP'te bulunamadı"}
output = {
    school: sorted({row["Öğretmen Adı Soyadı"].strip() for row in rows if row.get("Okul Adı", "").strip() == school})
    for school in sorted(schools)
}
(root / "data" / "person-school-check-targets.json").write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding="utf-8")
print(json.dumps({"schools": len(output), "teachers": sum(len(value) for value in output.values()), "detail": output}, ensure_ascii=False))

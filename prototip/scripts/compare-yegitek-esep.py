import csv
import json
import re
import unicodedata
from difflib import SequenceMatcher
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def clean(value):
    return re.sub(r"\s+", " ", (value or "")).strip()


def normalize(value):
    text = clean(value).translate(str.maketrans({"I": "i", "İ": "i", "ı": "i"})).casefold()
    text = re.sub(r"\([^)]*\)", " ", text)
    text = unicodedata.normalize("NFKD", text)
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    text = re.sub(r"\b(?:erzurum|merkez|yakutiye|palandoken|aziziye)\b", " ", text)
    text = re.sub(r"\b\d{5,}\b", " ", text)
    return re.sub(r"[^a-z0-9]+", " ", text).strip()


def similarity(left, right):
    a, b = normalize(left), normalize(right)
    if not a or not b:
        return 0.0
    if a == b:
        return 1.0
    seq = SequenceMatcher(None, a, b).ratio()
    ta, tb = set(a.split()), set(b.split())
    jac = len(ta & tb) / len(ta | tb)
    containment = len(ta & tb) / min(len(ta), len(tb))
    return max(seq, 0.55 * jac + 0.45 * containment)


GENERIC = {
    "okulu", "ilkokulu", "ortaokulu", "anaokulu", "lisesi", "anadolu", "imam", "hatip",
    "mesleki", "teknik", "ozel", "koleji", "fen", "bilim", "sanat", "merkezi", "cok",
    "programli", "yatili", "bolge", "toki", "sehit", "kiz", "erkek",
}


def core_tokens(value):
    return {token for token in normalize(value).split() if token not in GENERIC}


lines = (ROOT / "data" / "yegitek-quality-labels-2023-2025.tsv").read_text(encoding="utf-8-sig").splitlines()
header_index = next(i for i, line in enumerate(lines) if line.startswith("Seç\tID\t"))
rows = csv.DictReader(lines[header_index:], delimiter="\t")
yegitek = {}
for row in rows:
    school = clean(row.get("Okul Adı"))
    year = clean(row.get("Yıl"))
    if school and year in {"2023", "2024", "2025"}:
        item = yegitek.setdefault(normalize(school), {"school": school, "years": set()})
        item["years"].add(int(year))

searches = json.loads((ROOT / "data" / "esep-yegitek-school-searches-2026-09-13.json").read_text(encoding="utf-8-sig"))
bulk_esep = json.loads((ROOT / "data" / "esep-erzurum-search-2026-09-13.json").read_text(encoding="utf-8-sig"))
search_by_normalized = {}
for search in searches:
    bucket = search_by_normalized.setdefault(normalize(search["query"]), {"results": [], "errors": 0, "completed": 0})
    bucket["results"].extend(search.get("results", []))
    bucket["errors"] += int("error" in search)
    bucket["completed"] += int("error" not in search)

results = []
for item in yegitek.values():
    search = search_by_normalized.get(normalize(item["school"]), {"results": [], "errors": 1, "completed": 0})
    specific_candidates = list({candidate["href"]: candidate for candidate in search["results"]}.values())
    candidates = list({candidate["href"]: candidate for candidate in [*specific_candidates, *bulk_esep]}.values())
    ranked = sorted(((similarity(item["school"], candidate["name"]), candidate) for candidate in candidates), reverse=True, key=lambda x: x[0])
    score, candidate = ranked[0] if ranked else (0.0, {"name": "", "href": ""})
    source_core = core_tokens(item["school"])
    candidate_core = core_tokens(candidate["name"])
    core_overlap = len(source_core & candidate_core) / len(source_core | candidate_core) if source_core | candidate_core else 0
    exact = normalize(item["school"]) == normalize(candidate["name"])
    core_exact = bool(source_core) and source_core == candidate_core
    if exact or core_exact or (score >= 0.92 and core_overlap >= 0.67):
        status = "ESEP'te bulundu"
    elif specific_candidates:
        status = "Elle kontrol"
    elif search["errors"] and not search["completed"]:
        status = "Sorgu tamamlanmadı"
    else:
        status = "ESEP'te bulunamadı"
    results.append({
        "yegitek_school": item["school"],
        "years": sorted(item["years"]),
        "status": status,
        "esep_school": candidate["name"],
        "esep_url": candidate["href"],
        "score": round(score, 3),
        "core_overlap": round(core_overlap, 3),
    })

results.sort(key=lambda x: (x["status"], x["yegitek_school"]))
(ROOT / "data" / "yegitek-esep-comparison.json").write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")

statuses = ("ESEP'te bulundu", "Elle kontrol", "ESEP'te bulunamadı", "Sorgu tamamlanmadı")
counts = {status: sum(1 for x in results if x["status"] == status) for status in statuses}
print(json.dumps({"yegitek_unique_schools": len(results), "counts": counts}, ensure_ascii=False))
for status in ("Elle kontrol", "ESEP'te bulunamadı", "Sorgu tamamlanmadı"):
    print("\n" + status)
    for item in [x for x in results if x["status"] == status]:
        print(f'{item["score"]:.3f}\t{item["yegitek_school"]}\t{item["esep_school"]}')

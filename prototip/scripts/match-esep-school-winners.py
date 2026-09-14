import json
import re
import time
import urllib.parse
import urllib.request
import sys
from difflib import SequenceMatcher
from html import unescape
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
comparison = json.loads((ROOT / "data" / "yegitek-esep-comparison.json").read_text(encoding="utf-8"))
PERIOD = sys.argv[1] if len(sys.argv) > 1 else "2026-2027"
START_PAGE = int(sys.argv[2]) if len(sys.argv) > 2 else 51
END_PAGE = int(sys.argv[3]) if len(sys.argv) > 3 else 113


def clean_html(value):
    return re.sub(r"\s+", " ", unescape(re.sub(r"<[^>]+>", " ", value))).strip()


def normalize(value):
    value = value.translate(str.maketrans({"I": "i", "İ": "i", "ı": "i"})).casefold()
    value = re.sub(r"\([^)]*\)", " ", value)
    value = re.sub(r"\b(erzurum|türkiye|turkiye)\b", " ", value)
    return re.sub(r"[^a-z0-9çğıöşü]+", " ", value).strip()


def source_schools():
    names = []
    if isinstance(comparison, list):
        rows = comparison
    else:
        rows = comparison.get("schools") or comparison.get("results") or comparison.get("rows") or []
    for row in rows:
        for key in ("school", "school_name", "name", "yegitek_school"):
            if row.get(key):
                names.append(row[key])
                break
    if names:
        return sorted(set(names))
    targets = json.loads((ROOT / "data" / "person-school-check-targets.json").read_text(encoding="utf-8"))
    return sorted(targets)


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    for attempt in range(7):
        try:
            return urllib.request.urlopen(req, timeout=35).read().decode("utf-8")
        except Exception as exc:
            if "429" not in str(exc) or attempt == 6:
                raise
            time.sleep(4 + attempt * 4)


local = source_schools()
local_norm = [(name, normalize(name)) for name in local]
all_rows = []
base = "https://school-education.ec.europa.eu/en/etwinning/labels/etwinning-school-label/winners-list"
for page in range(START_PAGE, END_PAGE + 1):
    url = base + "?" + urllib.parse.urlencode({"period": PERIOD, "page": page})
    html = fetch(url)
    for body in re.findall(r"<tr[^>]*>(.*?)</tr>", html, re.I | re.S):
        cells = re.findall(r"<td[^>]*>(.*?)</td>", body, re.I | re.S)
        if len(cells) < 3 or clean_html(cells[0]) != "Türkiye":
            continue
        name = clean_html(cells[1])
        hrefs = re.findall(r'href="([^"]+)"', cells[1], re.I)
        all_rows.append({"name": name, "href": hrefs[0] if hrefs else "", "principal": clean_html(cells[2])})
    time.sleep(0.35)

matches = []
for winner in all_rows:
    wn = normalize(winner["name"])
    ranked = sorted(((SequenceMatcher(None, wn, ln).ratio(), name) for name, ln in local_norm), reverse=True)
    score, local_name = ranked[0]
    if score >= 0.84:
        matches.append({**winner, "local_name": local_name, "score": round(score, 3)})

result = {"period": PERIOD, "turkiye_winners": len(all_rows), "local_school_count": len(local), "winners": all_rows, "matches": matches}
(ROOT / "data" / f"esep-school-winners-{PERIOD}-match.json").write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
print(json.dumps({"turkiye_winners": len(all_rows), "local_school_count": len(local), "matches": len(matches)}, ensure_ascii=True))

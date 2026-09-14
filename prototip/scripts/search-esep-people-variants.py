import json
import re
import time
import urllib.parse
import urllib.request
from html import unescape
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = json.loads((ROOT / "data" / "esep-person-school-check.json").read_text(encoding="utf-8"))
OUTPUT = ROOT / "data" / "esep-person-school-variant-check.json"


def clean(value):
    return re.sub(r"\s+", " ", (value or "")).strip()


def normalize(value):
    value = clean(value).translate(str.maketrans({"I": "i", "İ": "i", "ı": "i"})).casefold()
    return re.sub(r"[^a-z0-9çğıöşü ]", "", value)


def rows_from(html):
    rows = []
    for body in re.findall(r"<tr[^>]*>(.*?)</tr>", html, re.I | re.S):
        cells = re.findall(r"<td[^>]*>(.*?)</td>", body, re.I | re.S)
        if len(cells) < 3:
            continue
        texts = [clean(unescape(re.sub(r"<[^>]+>", " ", cell))) for cell in cells]
        links = re.findall(r'href="([^"]+)"', body, re.I)
        if texts[0]:
            rows.append({"name": texts[0], "organisation": texts[1], "registered": texts[2], "links": links})
    return rows


def fetch(name):
    url = "https://school-education.ec.europa.eu/en/connect/people?" + urllib.parse.urlencode(
        {"name": name, "categorized_user_validation_status": "All"}
    )
    request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    for attempt in range(6):
        try:
            html = urllib.request.urlopen(request, timeout=30).read().decode("utf-8")
            return url, rows_from(html)
        except Exception as error:
            if "429" not in str(error) or attempt == 5:
                raise
            time.sleep(5 + attempt * 5)


output = []
for item in SOURCE:
    target = normalize(item["teacher"])
    exact = [row for row in item.get("results", []) if normalize(row["name"]) == target]
    query = None
    rows = item.get("results", [])
    error = None
    if not exact:
        query = clean(item["teacher"]).split()[-1]
        try:
            url, rows = fetch(query)
            exact = [row for row in rows if normalize(row["name"]) == target]
        except Exception as exc:
            url, error = None, str(exc)
        time.sleep(2.0)
    output.append({
        "teacher": item["teacher"],
        "schools": sorted(set(item["schools"])),
        "variant_query": query,
        "variant_url": url if query else None,
        "exact_matches": exact,
        "returned_rows": len(rows),
        "error": error,
    })
    OUTPUT.write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding="utf-8")

print(json.dumps({"teachers": len(output), "exact_found": sum(bool(x["exact_matches"]) for x in output), "errors": sum(bool(x["error"]) for x in output)}, ensure_ascii=False))

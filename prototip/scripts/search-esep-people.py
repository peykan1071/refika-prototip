import json
import re
import time
import urllib.parse
import urllib.request
from html import unescape
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
TARGETS = json.loads((ROOT / "data" / "person-school-check-targets.json").read_text(encoding="utf-8"))
OUTPUT = ROOT / "data" / "esep-person-school-check.json"


def clean(value):
    return re.sub(r"\s+", " ", (value or "")).strip()


def normalize(value):
    return clean(value).translate(str.maketrans({"I": "i", "İ": "i", "ı": "i"})).casefold()


queries = {}
for school, teachers in TARGETS.items():
    for teacher in teachers:
        queries.setdefault(normalize(teacher), {"teacher": teacher, "schools": []})["schools"].append(school)


def fetch(item):
    params = urllib.parse.urlencode({"name": item["teacher"], "categorized_user_validation_status": "All"})
    url = "https://school-education.ec.europa.eu/en/connect/people?" + params
    request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    for attempt in range(5):
        try:
            html = urllib.request.urlopen(request, timeout=30).read().decode("utf-8")
            break
        except Exception as error:
            if "429" not in str(error) or attempt == 4:
                raise
            time.sleep(3 + attempt * 3)

    rows = []
    for body in re.findall(r"<tr[^>]*>(.*?)</tr>", html, re.I | re.S):
        cells = re.findall(r"<td[^>]*>(.*?)</td>", body, re.I | re.S)
        if len(cells) < 3:
            continue
        texts = [clean(unescape(re.sub(r"<[^>]+>", " ", cell))) for cell in cells]
        links = re.findall(r'href="([^"]+)"', body, re.I)
        if texts[0]:
            rows.append({"name": texts[0], "organisation": texts[1], "registered": texts[2], "links": links})
    return {**item, "query_url": url, "results": rows}


output = []
for item in queries.values():
    try:
        output.append(fetch(item))
    except Exception as error:
        output.append({**item, "results": [], "error": str(error)})
    OUTPUT.write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding="utf-8")
    time.sleep(1.2)

print(json.dumps({"teachers": len(output), "found": sum(bool(item["results"]) for item in output), "errors": sum("error" in item for item in output)}, ensure_ascii=False))

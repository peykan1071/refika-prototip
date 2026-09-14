import json
import re
import urllib.request
from html import unescape

schools = [
    ("Erzurum Özel Eğitim Meslek Lisesi", "https://school-education.ec.europa.eu/en/connect/schools-organisations/erzurum-ozel-egitim-meslek-lisesi"),
    ("Erzurum Anadolu Lisesi", "https://school-education.ec.europa.eu/en/connect/schools-organisations/erzurum-anadolu-lisesi"),
    ("Erzurum Şenkaya Yedinisan İlkokulu", "https://school-education.ec.europa.eu/en/connect/schools-organisations/erzurum-senkaya-yedinisan-ilkokulu-0"),
    ("Özel Güneş Ortaokulu", "https://school-education.ec.europa.eu/en/connect/schools-organisations/ozel-gunes-ortaokulu"),
    ("Yahya Kemal Anaokulu", "https://school-education.ec.europa.eu/en/connect/schools-organisations/yahya-kemal-anaokulu-1"),
]

out = []
for name, url in schools:
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    html = urllib.request.urlopen(req, timeout=30).read().decode("utf-8")
    text = unescape(re.sub(r"<[^>]+>", " ", html))
    text = re.sub(r"\s+", " ", text).strip()
    snippets = [m.group(0) for m in re.finditer(r".{0,100}eTwinning School.{0,180}", text, re.I)]
    ids = re.findall(r"(?:ID|identifier)\s*[:#]?\s*(\d{3,})", text, re.I)
    out.append({"name": name, "url": url, "snippets": snippets[:8], "ids": list(dict.fromkeys(ids))[:8]})

print(json.dumps(out, ensure_ascii=False, indent=2))

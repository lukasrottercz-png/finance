#!/usr/bin/env python3
"""
Stáhne stav zařízení z tvého Shelly Cloud účtu a zapíše shelly.json
vedle nástěnky (nastenka.html ho pak čte).

Potřebuje dvě proměnné prostředí:
  SHELLY_AUTH_KEY  - autorizační cloud klíč (Shelly app -> Nastavení účtu -> Domov -> Cloudový klíč)
  SHELLY_SERVER    - adresa serveru bez https:// (např. shelly-103-eu.shelly.cloud)

Zařízení jsou napevno vyjmenovaná v DEVICES níže (ID, český název, druh) -
takhle žádné se neztratí kvůli nějakému stropu na počet položek a ke
každému druhu se čte přesně to pole, které v reálné odpovědi vážně existuje
(ověřeno na skutečných datech z tohoto účtu, ne odhadem):

  switch  - relé/zásuvka s měřením (Plus 1PM, Plus/Gen3 Plug S)
            -> switch:0.apower (W) - jen aktuální příkon
            (switch:0.aenergy.total je kumulativní součet od nasazení
            zařízení, ne za nějaké aktuální období, proto se nepoužívá;
            jejich "temperature" pole je teplota vlastní elektroniky, ne
            okolí, proto se taky schválně nepoužívá - bylo by to zavádějící)
  flood   - Shelly Flood, čidlo na baterii
            -> tmp.tC (°C), bat.value (%)
  ht      - Shelly Plus H&T
            -> temperature:0.tC (°C), humidity:0.rh (%)

Pokud přibude další zařízení, stačí ho přidat do DEVICES.
"""

import json
import os
import sys
import urllib.parse
import urllib.request
from datetime import datetime, timezone

AUTH_KEY = os.environ.get("SHELLY_AUTH_KEY", "").strip()
SERVER = os.environ.get("SHELLY_SERVER", "").strip().replace("https://", "").replace("http://", "")

if not AUTH_KEY or not SERVER:
    print("Chybí SHELLY_AUTH_KEY nebo SHELLY_SERVER (nastav je jako GitHub secrets repozitáře).")
    sys.exit(1)

# id zařízení -> (český název, druh)
DEVICES = {
    "612b9d":       ("Kuchyň",  "flood"),   # čidlo úniku vody
    "441793a60d5c": ("Žebřík",  "switch"),  # topný žebřík
    "80646fd6abd4": ("TV",      "switch"),  # zásuvka obývací pokoj
    "b48a0a1bc100": ("Router",  "switch"),  # zásuvka obývací pokoj
    "28372f2f2eac": ("Pokojík", "switch"),  # zásuvka
    "80646fcbd588": ("Obývák",  "ht"),      # teplota a vlhkost
}

url = "https://" + SERVER + "/device/all_status?" + urllib.parse.urlencode({
    "show_info": "true",
    "no_shared": "true",
    "auth_key": AUTH_KEY,
})

try:
    with urllib.request.urlopen(url, timeout=20) as resp:
        raw = resp.read().decode("utf-8")
except Exception as e:
    print("Chyba při volání Shelly Cloud API:", e)
    sys.exit(1)

print("Syrová odpověď Shelly Cloud (pro ladění, zkráceno na 8000 znaků):")
print(raw[:8000])

try:
    data = json.loads(raw)
except Exception as e:
    print("Odpověď není platný JSON:", e)
    sys.exit(1)

if not data.get("isok", True):
    print("Shelly Cloud vrátilo chybu:", data)
    sys.exit(1)

devices = ((data.get("data") or {}).get("devices_status")) or {}


def num(v, nd=1):
    return f"{v:.{nd}f}"


items = []

for dev_id, (label, kind) in DEVICES.items():
    dev = devices.get(dev_id)
    if not isinstance(dev, dict):
        print(f"Zařízení {dev_id} ({label}) teď není v odpovědi - přeskočeno.")
        continue

    if kind == "switch":
        # jen aktuální příkon - kumulativní energie od nasazení zařízení
        # (aenergy.total) nemá pro tenhle přehled vypovídací hodnotu
        sw = dev.get("switch:0") or {}
        apower = sw.get("apower")
        if isinstance(apower, (int, float)):
            items.append({"label": label + " příkon", "value": num(apower, 0), "unit": "W"})

    elif kind == "flood":
        tmp = (dev.get("tmp") or {}).get("tC")
        bat = (dev.get("bat") or {}).get("value")
        if isinstance(tmp, (int, float)):
            items.append({"label": label + " teplota", "value": num(tmp, 1), "unit": "°C"})
        if isinstance(bat, (int, float)):
            items.append({"label": label + " baterie", "value": num(bat, 0), "unit": "%"})

    elif kind == "ht":
        tmp = (dev.get("temperature:0") or {}).get("tC")
        hum = (dev.get("humidity:0") or {}).get("rh")
        if isinstance(tmp, (int, float)):
            items.append({"label": label + " teplota", "value": num(tmp, 1), "unit": "°C"})
        if isinstance(hum, (int, float)):
            items.append({"label": label + " vlhkost", "value": num(hum, 0), "unit": "%"})

out = {
    "updated": datetime.now(timezone.utc).isoformat(timespec="seconds"),
    "items": items,
}

with open("shelly.json", "w", encoding="utf-8") as f:
    json.dump(out, f, ensure_ascii=False, indent=2)
    f.write("\n")

print("Zapsáno shelly.json:")
print(json.dumps(out, ensure_ascii=False, indent=2))

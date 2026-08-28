#!/usr/bin/env python3
"""
Stáhne stav zařízení z tvého Shelly Cloud účtu a zapíše shelly.json
vedle nástěnky (nastenka.html ho pak čte).

Potřebuje dvě proměnné prostředí:
  SHELLY_AUTH_KEY  - autorizační cloud klíč (Shelly app -> Nastavení účtu -> Autorizace cloud klíč)
  SHELLY_SERVER    - adresa serveru bez https:// (tamtéž, např. shelly-103-eu.shelly.cloud)

Je to prvotní verze parseru: Shelly nemá jednotný formát mezi generacemi
zařízení (Gen1 / Gen2 / Gen3), takže skript prochází celou odpověď a hledá
známé názvy polí (teplota, vlhkost, výkon, energie) kdekoliv ve stromu.
Pokud se štítky nebo hodnoty nezobrazují přesně podle očekávání, zkontroluj
"Syrová odpověď Shelly Cloud" v logu tohoto Action běhu a uprav METRICS níže.
"""

import json
import os
import sys
import urllib.parse
import urllib.request
from datetime import datetime, timezone

MAX_ITEMS = 6  # kolik položek se maximálně zapíše do shelly.json

AUTH_KEY = os.environ.get("SHELLY_AUTH_KEY", "").strip()
SERVER = os.environ.get("SHELLY_SERVER", "").strip().replace("https://", "").replace("http://", "")

if not AUTH_KEY or not SERVER:
    print("Chybí SHELLY_AUTH_KEY nebo SHELLY_SERVER (nastav je jako GitHub secrets repozitáře).")
    sys.exit(1)

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

print("Syrová odpověď Shelly Cloud (pro ladění, zkráceno na 4000 znaků):")
print(raw[:4000])

try:
    data = json.loads(raw)
except Exception as e:
    print("Odpověď není platný JSON:", e)
    sys.exit(1)

if not data.get("isok", True):
    print("Shelly Cloud vrátilo chybu:", data)
    sys.exit(1)

# název pole -> (české slovo, jednotka, počet desetinných míst)
METRICS = {
    "tC": ("teplota", "°C", 1),
    "temperature": ("teplota", "°C", 1),
    "ext_temperature": ("teplota", "°C", 1),
    "rh": ("vlhkost", "%", 0),
    "humidity": ("vlhkost", "%", 0),
    "ext_humidity": ("vlhkost", "%", 0),
    "apower": ("výkon", "W", 0),
    "power": ("výkon", "W", 0),
}
ENERGY_KEYS = ("total", "total_act_energy")  # uvnitř aenergy/energy bloku, ve Wh

items = []
seen = set()


def add_item(label, value, unit):
    key = (label, unit)
    if key in seen:
        return
    seen.add(key)
    items.append({"label": label, "value": value, "unit": unit})


def device_label(dev_id, node):
    info = node.get("info") if isinstance(node, dict) else None
    if isinstance(info, dict) and info.get("name"):
        return info["name"]
    return dev_id


def walk(node, label):
    if isinstance(node, dict):
        for k, v in node.items():
            if k in ("aenergy", "energy") and isinstance(v, dict):
                for ek in ENERGY_KEYS:
                    val = v.get(ek)
                    if isinstance(val, (int, float)):
                        add_item((label + " energie").strip(), f"{val / 1000:.1f}", "kWh")
                        break
                continue
            if k in METRICS and isinstance(v, (int, float)):
                suffix, unit, nd = METRICS[k]
                add_item((label + " " + suffix).strip(), f"{v:.{nd}f}", unit)
                continue
            walk(v, label)
    elif isinstance(node, list):
        for v in node:
            walk(v, label)


devices = None
payload = data.get("data")
if isinstance(payload, dict):
    devices = payload.get("devices_status") or payload.get("device_status")

if isinstance(devices, dict):
    for dev_id, dev in devices.items():
        if not isinstance(dev, dict):
            continue
        walk(dev, device_label(dev_id, dev))
elif isinstance(payload, dict):
    # odpověď obsahovala rovnou jedno zařízení
    walk(payload, "zařízení")
else:
    print("Neočekávaný tvar odpovědi, shelly.json bude prázdný.")

items = items[:MAX_ITEMS]

out = {
    "updated": datetime.now(timezone.utc).isoformat(timespec="seconds"),
    "items": items,
}

with open("shelly.json", "w", encoding="utf-8") as f:
    json.dump(out, f, ensure_ascii=False, indent=2)
    f.write("\n")

print("Zapsáno shelly.json:")
print(json.dumps(out, ensure_ascii=False, indent=2))

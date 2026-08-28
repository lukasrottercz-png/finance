#!/usr/bin/env python3
"""
Stáhne stav zařízení z tvého Shelly Cloud účtu a zapíše shelly.json
vedle nástěnky (nastenka.html ho pak čte).

Potřebuje dvě proměnné prostředí:
  SHELLY_AUTH_KEY  - autorizační cloud klíč (Shelly app -> Nastavení účtu -> Domov -> Cloudový klíč)
  SHELLY_SERVER    - adresa serveru bez https:// (např. shelly-103-eu.shelly.cloud)

Zařízení jsou napevno vyjmenovaná v DEVICES níže (ID, název místnosti, druh) -
takhle žádné se neztratí kvůli nějakému stropu na počet položek a ke
každému druhu se čte přesně to pole, které v reálné odpovědi vážně existuje
(ověřeno na skutečných datech z tohoto účtu, ne odhadem). Název je vždy
místnost (Koupelna, Kuchyň, Obývák), ne označení konkrétního přístroje -
na nástěnce se pak nemíchá "co to je" s "kde to je".

Nástěnka se aktualizuje jednou za 10 minut, takže tu má smysl mít jen
hodnoty, které se za tu dobu buď mění pomalu (teplota, vlhkost), nebo jsou
binární stav, kde je zajímavé i to, jak to bylo před chvílí (teče/neteče,
topí/netopí) - ne syrová čísla jako okamžitý příkon zásuvek, co je skoro
pořád stejný a nic neřekne.

  flood   - Shelly Flood, čidlo úniku vody (koupelnu má na starosti "heater",
            tohle je kuchyň)
            -> "flood" (bool, detekován únik) - hlavní hodnota, se
               zvýrazněním (alert: true), když je True
            -> bat.value (%) - stav baterie toho čidla, připojený jako
               vedlejší údaj na stejný řádek (pole "sub"), ať se název
               místnosti nepíše na nástěnce dvakrát pod sebou
  heater  - spínač topení s měřením (u nás žebřík v koupelně, Plus 1PM)
            -> switch:0.apower (W) se převádí na stav "topí"/"vypnuto"
               (zvýrazněné, když topí) - samotné watty nikoho nezajímají,
               zajímá "je zapnuté, nebo ne"
  ht      - Shelly Plus H&T (u nás obývák)
            -> temperature:0.tC (°C) jako hlavní hodnota, humidity:0.rh (%)
               připojená jako vedlejší údaj na stejný řádek (pole "sub"),
               ze stejného důvodu jako u flood

Položka v shelly.json může mít "alert": true - nástěnka ji pak zobrazí
zvýrazněnou barvou, větším písmem a oranžovou tečkou před textem (čistě
CSS, viz nastenka.html, .house-alert), a posune ji na první místo
v panelu. Volitelné pole "sub" je drobný dovětek na stejném řádku
(baterie, vlhkost).

Pokud přibude další zařízení, stačí ho přidat do DEVICES (případně přidat
nový druh podobně jako "heater"/"flood" výše).
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

# id zařízení -> (místnost, druh) - pořadí je zároveň výchozí pořadí na
# nástěnce (aktivní alert se pak přesune na první místo)
DEVICES = {
    "441793a60d5c": ("Koupelna", "heater"),  # topný žebřík
    "612b9d":       ("Kuchyň",   "flood"),   # čidlo úniku vody
    "80646fcbd588": ("Obývák",   "ht"),      # teplota a vlhkost
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

    if kind == "flood":
        # hlavní hodnota je binární stav úniku, ne teplota čidla (ta se
        # za 10 minut skoro nezmění a nikoho nezajímá); baterie jde jako
        # vedlejší dovětek na stejný řádek, ať se "Kuchyň" nepíše 2x
        is_flood = dev.get("flood")
        bat = (dev.get("bat") or {}).get("value")
        if isinstance(is_flood, bool):
            item = {"label": label, "value": "ÚNIK VODY!" if is_flood else "OK",
                     "unit": "", "alert": is_flood}
            if isinstance(bat, (int, float)):
                item["sub"] = "baterie " + num(bat, 0) + " %"
            items.append(item)

    elif kind == "heater":
        # samotné watty nikoho nezajímají, zajímá jestli topí, nebo ne
        sw = dev.get("switch:0") or {}
        apower = sw.get("apower")
        if isinstance(apower, (int, float)):
            is_on = apower > 0
            items.append({"label": label, "value": "topí" if is_on else "vypnuto",
                           "unit": "", "alert": is_on})

    elif kind == "ht":
        # teplota a vlhkost na jeden řádek, ať se název místnosti nepíše
        # dvakrát pod sebou
        tmp = (dev.get("temperature:0") or {}).get("tC")
        hum = (dev.get("humidity:0") or {}).get("rh")
        if isinstance(tmp, (int, float)):
            item = {"label": label, "value": num(tmp, 1), "unit": "°C"}
            if isinstance(hum, (int, float)):
                item["sub"] = num(hum, 0) + " % vlhkost"
            items.append(item)

out = {
    "updated": datetime.now(timezone.utc).isoformat(timespec="seconds"),
    "items": items,
}

with open("shelly.json", "w", encoding="utf-8") as f:
    json.dump(out, f, ensure_ascii=False, indent=2)
    f.write("\n")

print("Zapsáno shelly.json:")
print(json.dumps(out, ensure_ascii=False, indent=2))

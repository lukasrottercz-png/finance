# Osobní finance & produktivita — dokumentace projektu

*Aktualizováno: 2026-06-30*

Sada propojených webových appek (každá jeden samostatný HTML soubor) pro správu financí, výdajů, úkolů a poznámek. Data se sdílejí přes **Google Drive** jako JSON soubory (dříve GitHub — viz historie níže).

## Soubory v projektu

| Soubor | Účel | Nasazení |
|---|---|---|
| `finance_tracker.html` | Hlavní app — přehled majetku, dashboard, investice | `github.io/finance/` |
| `vydaje_lukas.html` | Mobilní appka pro zadávání výdajů a trvalých plateb + **denní rozpočet** | `github.io/finance/` |
| `ukoly.html` | Správa úkolů a sledovaných událostí | `github.io/finance/` |
| `poznamky.html` | Poznámky + **rychlá poznámka** | `github.io/finance/` |
| `dashboard.html` | **Denní dashboard** — brífink, úkoly, události, připnuté poznámky (bez financí) | `github.io/finance/` |
| `inventar.html` | **Inventář věcí** — focení + AI rozpoznání (nářadí, vybavení), kategorizace, umístění | `github.io/finance/` |
| `migrace.html` | **Jednorázový** nástroj: zkopíruje data z GitHubu na Drive (po dokončení lze smazat) | `github.io/finance/` |
| `nastenka.html` | **Nástěnka** — LCD-styl displej pro tablet/obrazovku na zdi: hodiny, počasí (Open-Meteo), 3 vlastní dlaždice z `data.json` | `github.io/finance/` |

> **Pozn. k appce Výdaje:** dřív byla hostovaná na samostatném repu `vydaje` (z doby, kdy si tam ukládala data jako JSON). Po přechodu úložiště na Google Drive ztratil ten split smysl, takže je teď **hostovaná spolu s ostatními na repu `finance`** (`github.io/finance/vydaje_lukas.html`). Repo `vydaje` zůstává už jen jako **historický archiv** starých JSON záloh (Pages se z něj nepoužívají). Pozor: změnila se URL — zkratku appky Výdaje na ploše iPhonu je třeba přidat znovu na novou adresu.

> **Hosting ≠ úložiště:** GitHub Pages slouží už jen jako hosting HTML souborů. Veškerá data se čtou a zapisují na Google Drive.

---

## Úložiště dat — Google Drive (OAuth 2.0)

Appky se přihlašují přes **Google Identity Services** (token model, čistě v prohlížeči, bez backendu) a ukládají JSON soubory na Disk uživatele.

- **Client ID:** `549502284523-okg9u0p3almkgr1q2to17phr9fks270e.apps.googleusercontent.com`
- **Scope:** `https://www.googleapis.com/auth/drive.file` — appka vidí **jen soubory, které sama vytvořila**, ne celý Disk. Není to „citlivý" scope, takže projekt nepotřebuje ověření Googlem a zůstává ve stavu *Testing* s vlastním účtem jako *test user*.
- **Společné Client ID:** všech šest appek používá totéž Client ID, takže pod `drive.file` vidí navzájem své soubory (Finance/Dashboard čtou soubory Výdajů a Úkolů atd.).
- **Konzole (jednorázové nastavení):** Authorized JavaScript origin `https://lukasrottercz-png.github.io`; povolené *Google Drive API*; scope `drive.file`; účet přidaný jako test user.

| Soubor na Disku | Co obsahuje | Kdo zapisuje | Kdo čte |
|---|---|---|---|
| `finance_data.json` | Periods (snímky majetku) | `finance_tracker.html` | finance_tracker, **vydaje_lukas** (mzda pro rozpočet) |
| `vydaje_data.json` | Záznamy výdajů | `vydaje_lukas.html` | vydaje_lukas, finance_tracker |
| `trvale_data.json` | Trvalé platby | `vydaje_lukas.html` | vydaje_lukas, finance_tracker |
| `prijmy_data.json` | Průběžně zadávané příjmy (hlavní mzda, brigáda, pronájem...) | `vydaje_lukas.html` (tab Příjmy) | vydaje_lukas, **finance_tracker** (předvyplnění při sestavení období) |
| `vydaje_config.json` | Nastavení rozpočtu (očekávaná výplata, cíl úspor) | `vydaje_lukas.html` | vydaje_lukas |
| `investice_data.json` | Investiční transakce a aktuální hodnoty | `finance_tracker.html` | finance_tracker |
| `ukoly_data.json` | Úkoly + sledované události | `ukoly.html` | ukoly, **dashboard**, **poznamky** (export úkolů) |
| `poznamky_data.json` | Poznámky | `poznamky.html` | poznamky, **dashboard** |
| `dashboard_ai_log.json` | **Historie denních AI brífinků (14 dní)** | `dashboard.html` | dashboard |
| `inventar_data.json` | **Inventář věcí** (název, kategorie, popis, tagy, počet, umístění, náhled) | `inventar.html` | inventar |

### Mechanika přihlášení a synchronizace

- **Token model:** po přihlášení appka dostane access token platný ~1 hodinu. Čistě prohlížečový tok nedává refresh token.
- **Perzistence tokenu (auto-sync):** token i čas platnosti se ukládají do `localStorage` (`g_access_token`, `g_token_expiry`). Při znovuotevření appky **do hodiny** se obsah synchronizuje sám, bez klepnutí. Po vypršení si appka řekne o nový potichu na pozadí (v Chrome projde bez interakce).
- **Příznak připojení:** `google_connected` v `localStorage`. Funkce `ghToken()` v kódu zůstala jako indikátor „je připojeno?" (kvůli zpětné kompatibilitě se zbytkem kódu).
- **Cache ID souborů:** ID nalezeného souboru na Disku se cachuje (`drive_id_<název>`, u Poznámek `drive_file_id_poz`, u Inventáře `drive_file_id_inv`), aby se nemusel hledat při každém zápisu.
- **Indikátor ↻** v záhlaví: zelená = připojeno/synchronizováno, ⚠ oranžová = jen lokálně (nepřihlášeno), ⚠ červená = chyba. Klepnutí spustí ruční sync (nebo přihlášení, pokud nepřipojeno).
- **Odznak `DRIVE`** v záhlaví každé appky = vizuální potvrzení, že jde o verzi ukládající na Disk.
- **Prohlížeč:** doporučený **Chrome** (desktop i mobil). Safari je na OAuth popup / cross-site cookies přísný a může přihlášení blokovat nebo shodit kartu.

### Model slučování vs. přepis

- **Poznámky** používají **merge podle `updatedAt`** (novější vyhrává; při shodě má přednost smazaný záznam) — kvůli konzistenci mezi zařízeními. Proto **všechny časové značky v Poznámkách jsou plný ISO timestamp** (`2026-06-04T11:45:23.456Z`), ne jen datum — jinak by stejnodenní změny mohly „přebít" jedna druhou. `fmtDate` zvládá obě varianty (kvůli starším datům).
- **Inventář** používá taky **merge podle `id` + `updatedAt`** (novější vyhrává), z téhož důvodu — věci se přidávají/editují z víc zařízení. Všechny časové značky jsou plný ISO timestamp.
- **Ostatní appky** (Finance, Výdaje, Úkoly) používají model **„načti → nahraď lokál" / „ulož → přepiš soubor"** (last-write-wins). Pro jednoho uživatele to stačí.

### Historie & záloha (GitHub)

Data byla původně v repu `lukasrottercz-png/finance` (token v `localStorage` jako `gh_token`). Po migraci na Drive:

- GitHub data **zůstávají nedotčená** jako historická záloha (appky na ně už nepíšou).
- `migrace.html` byl jednorázový nástroj pro přesun všech souborů z GitHubu na Disk; hledá v obou repech (`finance` i `vydaje`).

> Pozn.: Dřívější „Import z GitHubu" v `poznamky.html` byl odstraněn (i s celým sync modalem) — viz „Synchronizace v Poznámkách" níže.

---

## Datové struktury

### Period (jeden snímek majetku) — `finance_data.json`
```json
{
  "date": "2026-06-01",
  "eur_kurz": 25.3,
  "mzda": 104787,
  "prijmy": [ { "label": "Hlavní mzda", "castka": 89787 }, { "label": "Brigáda", "castka": 15000 } ],
  "data": { "rb_bezny": 15000, "rb_hypoteka": 3200000, "air_bezny": 50000 },
  "events": [ { "cat": "Mimořádná splátka", "amount": 50000, "desc": "..." } ],
  "note": "Volná poznámka k období"
}
```
Klíč pro každou buňku: `{banka}_{produkt}`, např. `rb_bezny`, `air_sporici1`.

`prijmy` je rozpad příjmů za dané období (více zdrojů — hlavní mzda, brigáda, pronájem apod.). V prvním kroku wizardu ve `finance_tracker.html` se buď předvyplní ze záznamů zadaných průběžně ve `vydaje_lukas.html` (viz `prijmy_data.json` níže), nebo je uživatel doplní/upraví ručně. `mzda` zůstává jako **součet `prijmy`** — je to pole, které dál čte `vydaje_lukas.html` pro rozpočet (viz níže), takže se nepřejmenovává. Pokud `prijmy` chybí (starší data), `mzda` se bere jako jediný zdroj „Hlavní mzda".

### Výdaj — `vydaje_data.json`
```json
{
  "id": "1748765432000",
  "amount": 350,
  "catKey": "stravovani",
  "subcat": "Restaurace",
  "note": "Oběd s kolegou",
  "date": "2026-06-01",
  "shared": false,
  "mimoradny": false,
  "rodinny": false
}
```
- `shared: true` → výdaj sdílený s Jitkou, dělí se 50/50 (růžový štítek 👫 Jitka & Lukáš).
- `mimoradny: true` → **mimořádný / jednorázový výdaj** (např. motorka). Fialový štítek ⭐. **Nezapočítává se do denního rozpočtu ani míry úspor** — projeví se jen v čistém jmění, až peníze reálně odejdou. Starší záznamy bez těchto polí se berou jako `false`.
- `rodinny: true` → **rodinný výdaj, který Lukáš nese sám** (nájem, energie, děti…), oranžový přepínač „Rodinný výdaj". Vstupuje do rodinného přehledu ve vyúčtování a v PDF reportu. **Nezávislý na `shared`**, ale v *výpočtech má `shared` přednost* (sdílené je z podstaty rodinné — viz níže). Lze přepnout i **inline tlačítkem 👪** přímo v seznamu výdajů, bez otevírání záznamu (`toggleRodinnyInline`).
- **Kategorie `vyrovnani` („🤝 Vyrovnání Jitka"):** vyrovnání/refundace mezi Lukášem a Jitkou (např. doplatek za nákup, který zaplatila druhá strana). **Není to běžná spotřeba, ale převod mezi lidmi** — vede se ve vlastní kategorii, aby nezkresloval spotřební kategorie (např. Potraviny).
- ⚠️ **Pozor — kategorie jsou definované na dvou místech:** plný seznam (ikona + název + podkategorie) je v `vydaje_lukas.html` (`CATS`), ale `finance_tracker.html` má **vlastní zjednodušenou kopii** map `CAT_ICONS` a `CAT_LABELS` pro svůj přehled „Výdaje tento měsíc". Při přidání nové kategorie je nutné ji doplnit **i tam**, jinak finance tracker ukáže fallback „❓" a holý klíč.
- **CSV export/import** nese sloupce `sdileno_jitka`, `vyuctovano` a `rodinny` (ano/ne).

### Trvalá platba — `trvale_data.json`
```json
{ "nazev": "Záloha byt", "kat": "Bydlení", "castka": 4422, "od": "2024-01-01", "do": "", "rodinne": false }
```
Platba je aktivní pokud `od <= dnes <= do` (prázdné `do` = bez konce).
- `rodinne: true` → **rodinná trvalá platba** (nájem, energie, jesle…), přepínač „Rodinná platba" + odznak 👪 v seznamu. Je čistě **informativní pro rozpočet** (jako každá trvalá platba se jen odečítá od mzdy), ale navíc se **započítává do rodinného podílu** ve vyúčtování a v PDF reportu. Aktivita v konkrétním měsíci se počítá překryvem `od`/`do` s daným měsícem (`trvalaActiveInMonth`).

### Příjem — `prijmy_data.json`
```json
{ "id": "1757236800000", "date": "2026-09-05", "label": "Hlavní mzda", "castka": 85000 }
```
Průběžný seznam příjmů zadávaný v `vydaje_lukas.html` (tab „💰 Příjmy" — protože tam se pracuje nejvíc a příjmy chodí v jiný čas než sestavení měsíčního období). Plochý seznam bez rozlišení typu — hlavní mzda i vedlejší příjmy (brigáda, pronájem…) se zapisují stejně, jen s jiným `label`. Hard delete (žádný tombstone — stejný last-write-wins model jako u trvalých plateb).

`finance_tracker.html` čte tento soubor jen při **zakládání nového období** (`startWiz`): pokud pro daný wizard ještě nemá `prijmy` (nové období bez ručně zadaných řádků), zkusí najít záznamy se stejným rokem-měsícem a předvyplní jimi krok „Příjmy" — uživatel je tam může dál upravit/přidat/smazat, součet se ukládá jako `mzda` do periody (viz Period výše). Existující uložené období se nikdy nepřepíše automaticky.

### Investice — `investice_data.json`
```json
{
  "transe": [ { "datum": "2025-01-15", "nazev": "Nákup ETF", "castka": 10000, "etf": [] } ],
  "aktualni": [ { "datum": "2026-06-01", "hodnota": 125000 } ]
}
```

### Úkoly + události — `ukoly_data.json`
```json
{
  "ukoly":  [ { "id": "...", "name": "...", "date": "2026-06-10", "note": "", "done": false, "repeat": "", "tags": [], "completedAt": "", "waiting": false } ],
  "events": [ { "id": "...", "name": "Daň z příjmu", "date": "2026-06-15", "note": "", "cat": "finance", "repeat": "" } ]
}
```
- `repeat`: `""` | `weekly` | `monthly` | `quarterly` | `yearly`. Události mají kategorie (`insurance`, `work`, `lease`, `finance`, `anniv`, `other`).
- **`waiting: true`** → úkol „čeká se na někoho" (viz níže). Starší úkoly bez pole = `false`.

### Poznámka — `poznamky_data.json`
```json
{ "id": "...", "title": "...", "content": "Markdown text", "type": "volna", "tags": ["rychlá"], "pinned": false, "deleted": false, "createdAt": "2026-06-01T08:30:00.000Z", "updatedAt": "2026-06-02T14:05:11.250Z" }
```
- `type`: `schuze` | `napad` | `rozhodnuti` | `volna`. V `content` se podporuje markdown vč. odškrtávacích úkolů `- [ ]` / `- [x]`.
- `deleted: true` = soft-delete (kvůli šíření mazání přes merge). `createdAt`/`updatedAt` jsou **plný ISO timestamp**.

### AI brífink — `dashboard_ai_log.json`
```json
[ { "date": "2026-06-02", "text": "ploché znění pro kontinuitu", "data": { "uvod": "...", "body": [ {"emoji":"🔴","text":"..."} ], "zaver": "..." } } ]
```
Pole posledních ~14 brífinků. `data` = strukturovaný obsah pro vykreslení, `text` = ploché znění (kontinuita + fallback).

### Položka inventáře — `inventar_data.json`
```json
{ "id": "i...", "name": "Aku vrtačka Bosch", "desc": "modrá, 18V, s baterií", "category": "Elektronářadí", "tags": ["vrtačka","aku","bosch"], "qty": 1, "location": "dílna, dolní police", "thumb": "data:image/jpeg;base64,...", "createdAt": "2026-06-15T...", "updatedAt": "2026-06-15T..." }
```
- `thumb` = zmenšený náhled **160 px / JPEG ~0.6 přímo v JSON** (base64). Při ~200 položkách je soubor řádově 5–8 MB — drží se v jednom souboru záměrně (žádné extra obrázkové soubory v rootu Disku).
- `location` = volné textové umístění, vyplňuje se ručně po rozpoznání (AI ho negeneruje).
- `qty` = počet kusů (AI odhadne z fotky, default 1).
- Časové značky jsou plný ISO timestamp (kvůli merge).

---

## Úkoly — stav „čeká se na někoho" (ukoly.html)

Úkol, který nevisí na uživateli (čeká se na reakci někoho jiného), lze označit příznakem `waiting`:

- Přepíná se přes **··· menu** úkolu: „⏳ Čeká na někoho" / „↩︎ Vrátit mezi moje".
- Zůstává mezi **otevřenými** úkoly, ale **propadne na konec** seznamu pod aktivní úkoly.
- **Neztrácí termín, ale není urgentní** — žádná červená, žádné počítání „prošlo Xd".
- Vizuálně odlišený: **modrý levý okraj + jemné modré podbarvení**, odznak „⏳ čeká", a skupina je oddělená nadpisem **„⏳ ČEKÁ SE NA OSTATNÍ"**.
- Lze ho normálně odškrtnout jako hotový.

Řazení v seznamu: nehotové (ne-čekající) podle termínu → nehotové čekající → hotové.

---

## Denní rozpočet (vydaje_lukas.html)

Banner nahoře v záložce Přehled: **„Můžeš dnes ještě utratit X Kč"** + progress bar.

Počítá se přes **míru úspor** (`vyd_savings_rate`, výchozí 30 %, nastavitelná klepnutím na „cíl úspor ✎"):
```
cíl úspor      = mzda × (míra úspor / 100)
limit          = mzda − trvalé platby (aktivní) − cíl úspor
běžné výdaje   = Σ výdajů tohoto měsíce, kde NENÍ mimořádný
zbývá do konce = limit − běžné výdaje
denní rozpočet = zbývá do konce / zbývající dny v měsíci (vč. dneška)
dnes ještě     = denní rozpočet − dnešní běžné výdaje
```
Mzda se bere z `finance_data.json` (perioda aktuálního měsíce, čtená z Disku; lokálně cachovaná v `lk_finance_cache`). Pokud pro aktuální měsíc skutečná mzda chybí (typicky před výplatou v polovině měsíce), použije se **fixní očekávaná výplata** (`vyd_expected_mzda`, nastavitelná klepnutím na „očekávaná výplata ✎" / „odhad výplaty ✎"). Banner pak ukazuje značku **odhad**. Jakmile se zadá skutečná mzda pro daný měsíc, automaticky přebije očekávanou (`currentMzda()` vrací reálnou přednostně — žádné dvojí započtení). **Mimořádné výdaje jsou z výpočtu vyloučené.**

Očekávaná výplata i cíl úspor se **synchronizují napříč zařízeními** přes `vydaje_config.json` (sloučení podle `updatedAt`, novější vyhrává; lokálně cachované v `vyd_expected_mzda`, `vyd_savings_rate`, čas v `vyd_cfg_updated`). Config se načítá při startu i ručním syncu a ukládá při každé změně. Pokud zápis na Disk selže nebo je zařízení offline, změna se označí `vyd_cfg_dirty=1` a **donahraje se při příštím syncu** (load zároveň znovu založí chybějící soubor) — nikdy neuvízne jen lokálně.

---

## Přehled po kategoriích (vydaje_lukas.html — záložka Kategorie)

Rozpad výdajů po kategoriích a podkategoriích s podílem v %.

- **Přepínač měsíců:** v záhlaví šipky **‹ ›** + název měsíce a součet za daný měsíc. Listuje mezi měsíci, ve kterých jsou data (rozsah `min`–`max` z `vydaje_data.json`); na krajích se příslušná šipka zašedne, prázdné budoucí měsíce nejdou. Měsíc bez výdajů ukáže hlášku „Žádné výdaje v tomto měsíci". Při otevření záložky se vždy resetuje na aktuální měsíc (`katMonth`). Měsíční klíče se počítají ručně přes UTC-bezpečné `Date(rok, měsíc, 1)` (nikoli parsováním stringu), aby seděly přechody přes rok.
- **Filtr „⭐ Skrýt mimořádné":** pill pod přepínačem, který se zobrazí **jen v měsících, kde nějaká mimořádná položka je**. Po zapnutí (`katSkipMim`) vyřadí ⭐ položky z rozpadu i z měsíčního součtu — užitečné, když jednorázový nákup (auto, motorka) převálcuje běžnou spotřebu. Volba je sticky napříč listováním měsíců. *(Pozn.: štítek ⭐ ovlivňuje denní rozpočet vždy; tady jde navíc o volitelné skrytí v přehledu Kategorie.)*
- Klepnutí na kategorii rozbalí/sbalí podkategorie.

---

## Vyúčtování a rodinné výdaje (vydaje_lukas.html — záložka Jitka & Lukáš)

Záložka **👫 Jitka & Lukáš** (dříve „Jitka") řeší měsíční vyrovnání sdílených výdajů a navíc zobrazuje rodinné náklady, které nese Lukáš sám.

### Vyrovnání sdílených výdajů
- Sdílené výdaje (`shared: true`) se dělí **50/50**. Za měsíc se sečtou, polovinu dluží Jitka.
- **Nákupy Jitky** se zadávají jako jedno číslo za měsíc (`jitkaClaims[YYYY-MM]`, localStorage `vyd_jitka_claims`) — to, co Jitka koupila a z čeho Lukáš nese půlku.
- **Net vyrovnání** = (sdílené ÷ 2) − (nákupy Jitky ÷ 2). Kladné = Jitka platí Lukášovi, záporné = Lukáš platí Jitce.
- Měsíc lze označit jako **vyúčtovaný** (`jitkaSettled` na položkách); vyúčtované měsíce se sbalí.

### Rodinné výdaje, které nese Lukáš (informativní blok)
Pod vyrovnáním každého měsíce se vypíše souhrn rodinných nákladů, které Lukáš nese **sám** (nedělí se) — počítá je helper **`famForMonth(m)`**:
- zaznamenané výdaje `rodinny && !shared` za daný měsíc, **plus**
- aktivní **rodinné trvalé platby** (`rodinne: true`) pro daný měsíc (`trvalaActiveInMonth`).
- **Nevstupuje do vyrovnání** — je to jen kontext (kolik Lukáš dává do rodiny nad rámec sdílených výdajů).

### PDF report (`printMonth`) — „Vyúčtování — Lukáš & Jitka"
Tlačítko 🖨 u měsíce otevře tiskovou stránku → Uložit jako PDF. Obsahuje tabulku sdílených výdajů, souhrn vyrovnání, sekci rodinných výdajů a blok **„Podíl na celkových nákladech"**:
- **Celkové rodinné náklady** = sdílené (`S`) + nákupy Jitky (`J`) + rodinné, co nese Lukáš (`R`).
- **Jitka nese** = `S/2 + J/2`.   **Lukáš nese** = `S/2 + J/2 + R`.
- Procenta: Jitčino zaokrouhleno, Lukášovo dopočítáno (součet vždy 100 %).
- ⚠️ **Podíl zahrnuje i nákupy Jitky (`J`)** — bez nich by Jitčin podíl vyšel nesmyslně nízký (počítal by jen půlku sdílených). `R` zahrnuje i rodinné trvalé platby.
- **Názvosloví reportu je ve 3. osobě se jmény a v přítomném čase** („Lukáš platí Jitce", „Jitka dluží Lukášovi", „Rodinné výdaje, které nese Lukáš") — určeno ke sdílení s Jitkou. Appka na obrazovce zůstává v „ty" (osobní UI).
- **Stránkování:** `@media print` + třída `.keep-together` drží sekce „Rodinné výdaje" a „Podíl" vcelku (nerozseknou se přes stránku); řádky tabulek se nedělí. *(Limit: extrémně dlouhá tabulka rodinných položek se na jednu stránku nevejde a zalomí se i tak.)*

> **Pozn. — odebraná záložka „Rodina":** krátce existovala samostatná záložka s celkovým souhrnem rodinných výdajů napříč měsíci, ale ukázala se jako redundantní (totéž řeší report + měsíční vyúčtování) a byla odebrána. Výpočtové helpery `famForMonth`/`trvalaActiveInMonth` zůstaly — kdyby bylo v budoucnu potřeba **agregace přes delší období pro plánování**, je na čem stavět.

---

## Nástěnka (nastenka.html)

Samostatná appka pro tablet/obrazovku pověšenou na zdi — hodiny (LCD segmentový styl), počasí z **Open-Meteo** (bez API klíče) a max. **3 vlastní dlaždice** čtené z veřejného `data.json` vedle appky. Na rozdíl od ostatních appek **nepoužívá Google Drive ani přihlášení** — čte čistý veřejný soubor přes `fetch()`, protože běží na zařízení bez OAuth.

**Zdroj dat pro dlaždice:** appka `vydaje_lukas.html` počítá a zapisuje `data.json` do stejného repa (GitHub Pages), přes GitHub Contents API — všechny tři z `budgetInfo()` / `savingsRate`, žádná data z jiné appky:
```
Dnes můžeš utratit ← budgetInfo().dnesZbyva   (denní rozpočet — jen když je nastavená mzda)
Tempo rozpočtu     ← budgetInfo()             (mesicSpentPct, paceDiff — jen když je nastavená mzda)
Míra úspor         ← savingsRate              (vyd_savings_rate)
```
- **Kdy se zapisuje:** automaticky při každém otevření `vydaje_lukas.html` (`startupSync()`) i po každé relevantní změně (`ghSave()` po uložení výdaje, `ghSaveCfg()` po změně cíle úspor/mzdy) → `syncNastenkaTiles()`, throttlováno na **30 minut / jen při změně hodnot**, aby se zbytečně nezaplňovala historie commitů a nenarazilo na GitHub API rate limit.
- **Autorizace zápisu:** fine-grained GitHub PAT (repo `lukasrottercz-png/finance`, právo **Contents: Read and write**), zadává se přes ikonu **📺** v navbaru `vydaje_lukas.html` a ukládá se do `gh_pages_token`. Prázdná hodnota vypíná zápis (appka se ho ani nepokusí zavolat).
- Zápis je **read-modify-write** přes GitHub Contents API (GET pro `sha` → PUT s novým obsahem) — bezpečné i kdyby `data.json` ještě neexistoval (404 → vytvoří se).
- `data.json` neobsahuje nic citlivého — jen zaokrouhlené hodnoty a krátké popisky, veřejně čitelné jako součást GitHub Pages.

---

## Denní dashboard (dashboard.html)

Sjednocuje denně relevantní věci na jednom místě. **Záměrně neobsahuje žádné finance** (otevírá se i v práci) — finanční JSONy ani nestahuje.

- **☀️ Brífink na dnešek** — AI shrnutí přes úkoly, události, připnuté poznámky a nesplněné `- [ ]` úkoly uvnitř poznámek. Strukturované (JSON → řádky s ikonou + box „Dnes se zaměř na"). Generuje se automaticky jednou denně a **navazuje na předchozí brífink** (`dashboard_ai_log.json`). Vyžaduje `anthropic_api_key` (zadaný v ⚙️ nastavení).
- **Úkoly** — jen po termínu / dnes / do 7 dní.
- **Nejbližší události** — odpočet ke třem nejbližším.
- **📌 Připnuté poznámky** — náhled + proklik do appky.
- **Lokální cache (`dash_cache`):** dashboard si poslední data drží lokálně, takže po startu ukáže obsah okamžitě a na pozadí ho obnoví z Disku (dřív po startu probleskoval prázdný).

Model: `claude-sonnet-4-5`, klíč `anthropic_api_key` (uložený jen lokálně v daném prohlížeči — na jiném zařízení je nutné zadat znovu). Jediný soubor, který dashboard **zapisuje**, je `dashboard_ai_log.json` — a to jen při generování brífinku.

---

## Inventář (inventar.html)

Appka pro soupis vlastních věcí (hlavně nářadí a vybavení) s AI rozpoznáním z fotek. Záměr: nafotit věci jednu po druhé, nechat AI je rozpoznat a kategorizovat, a teprve nad hotovým datasetem sjednotit kategorie.

**Fáze 1 — sběr.** Tlačítko 📸 Nafotit / nahrát → nahraje se celá dávka fotek najednou (`<input type="file" multiple accept="image/*">`). Doporučený postup: nafotit věci **nativním foťákem iPhonu** (stativ, jen cvakat, měnit předměty — nulové tagování), pak dávku nahrát do appky. Web appka **nepřistupuje ke kameře přímo** (Safari by uspal stránku / shodil token při delším focení na stativu).

- Každá fotka se zmenší na **dvě verze**: 640 px / JPEG ~0.7 jde do Claude vision na rozpoznání (čte i drobnější texty a značky), 160 px / JPEG ~0.6 se uloží jako archivní náhled.
- Fronta se zpracovává **sériově** (jedna po druhé) s viditelným progresem („17/50 hotovo"). Sériově kvůli rate limitu API a bezpečnému ukládání.
- **Žádný mezizápis na Drive během fronty** — vše se drží v paměti + `inv_data_cache` v localStorage. Teprve tlačítko **Uložit X věcí** udělá **jeden** zápis na Drive. Důvod: přepisovat mnohamegový JSON 200× po jedné položce je zbytečné a riskantní.
- Každá rozpoznaná položka vrací JSON `{name, desc, category, tags, qty}`. Při nerozpoznání `name = "Nerozpoznáno"`.

**Fáze 2 — sjednocení kategorií.** Tlačítko 🗂 Kategorie → ✨ Navrhnout sjednocení pošle Claude seznam názvů + aktuálních kategorií (jen text, jedno volání), ten vrátí `{"mapping": {"stará":"nová"}}`. Návrh ukáže, co se s čím sloučí; po potvrzení se kategorie přemapují. Emergentní taxonomie nad hotovým datasetem, bez druhého kola focení.

**Detail položky** (klepnutí na kartu): název, popis, kategorie (našeptávač z existujících přes `datalist`), umístění, počet kusů, tagy. Editace i smazání. Změna se uloží lokálně a hned dorovná na Drive.

- **AI model:** `claude-sonnet-4-5`, klíč `anthropic_api_key` (sdílený s Dashboardem/Poznámkami, jen lokálně v prohlížeči). Při prvním nahrání fotek bez klíče appka vyzve k jeho vložení. Rozpoznání = **jedno volání na fotku** (200 věcí = 200 volání, řádově jednotky až nízké desítky Kč díky zmenšenému náhledu).
- **Synchronizace:** ↻ v záhlaví stejně jako ostatní appky (zelená = synchronizováno, oranžová ⚠ = jen lokálně, červená ⚠ = chyba). Merge podle `id` + `updatedAt`.

---

## Rychlá poznámka (poznamky.html)

- **Pole nahoře v seznamu poznámek** — napiš a Uložit. Nadpis se odvodí z prvního řádku, štítek `rychlá`, typ Volná. Cmd/Ctrl+Enter uloží.
- **Autosave konceptu** — rozepsaný text přežije zavření appky (`lk_poz_quick_draft`).
- **Režim `poznamky.html?quick`** — celoobrazovkový zápis, schová hledání/filtry/seznam.
- **Export úkolů do Úkolů:** u poznámky s `- [ ]` úkoly tlačítko „Přidat do Úkolů →" zapíše vybrané úkoly do `ukoly_data.json` **na Disku** (funguje díky sdílenému Client ID).
- **Zkratka na ploše:** otevři `poznamky.html?quick` → Sdílet → Přidat na plochu (v Chrome kvůli OAuth).

---

## Autosave a obnova v editoru (poznamky.html)

Plný editor poznámky má **pravý autosave**, ne jen koncept:

- Při psaní se každé 2 s rozepsaná poznámka zapíše **rovnou do seznamu i lokálně** (`lk_poz`), na Disk se dorovná ~4 s po dopsání (throttle, ať psaní neblokuje síť). Indikátor „Uloženo" tedy znamená skutečně uloženo.
- **Zavření editoru** (✕, tlačítko „Hotovo" i ťuknutí mimo okno) uloží poslední stav. Zahodit poznámku jde výhradně přes **Smazat**. Tím odpadla původní past, kdy ťuknutí mimo okno smazalo nedokončený koncept a poznámka se ztratila.
- **Nová poznámka:** první autosave ji založí a přidělí `id`, další ticky už jen aktualizují tutéž (žádné duplikáty).
- **Pojistka — recovery koncept:** každé psaní navíc okamžitě zapíše `poz_draft` do `localStorage` (pro úzké okno než stihne autosave poprvé tiknout). Po commitu se `poz_draft` maže. Pokud se přesto najde osiřelý koncept (např. po pádu appky), při startu se nahoře v seznamu ukáže **oranžový banner** s náhledem a volbou „Obnovit do editoru" / „Zahodit".

## Synchronizace v Poznámkách (poznamky.html)

Sjednoceno s ostatními appkami — **bez modálního okna**:

- Klepnutí na **↻** v záhlaví: když nejsi přihlášený, spustí přihlášení Googlem; jinak rovnou synchronizuje (toast „Synchronizováno ✓"). Šipka po úspěšném syncu **zezelená** (stejně jako Finance/Výdaje/Úkoly/Dashboard).
- Odstraněn dřívější sync modal i s tlačítky Odhlásit a „Import z GitHubu" (token zůstává v `localStorage`; zneplatnit ho lze v Google účtu → Zabezpečení → aplikace třetích stran).

---

## Navigace mezi appkami

- **Klik na název/logo v záhlaví = návrat na Dashboard** (domovská strana). Každá appka má tooltip „Zpět na hlavní stranu".
- Dashboard odkazuje na všechny ostatní appky ikonami v záhlaví (💰 Finance, 🧾 Výdaje, 📋 Úkoly, 📝 Poznámky).
- Ostatní appky se prolinkují navzájem v záhlaví.
- ⚠️ **Inventář (📦) je zatím v navigaci jen jednosměrně:** sám odkazuje na ostatní appky, ale ostatní appky (ani Dashboard) na něj zatím **neodkazují** — odkaz 📦 do jejich hlaviček se doplní, až bude appka ověřená.

---

## Výpočty — finance_tracker.html

### Celkem finance / Bez hypotéky
```
Celkem       = Σ(CZK účty) + Σ(EUR účty × eur_kurz)   [kromě hypotéky]
Bez hypotéky = Celkem − zůstatek hypotéky
```
Bez hypotéky je informativní — co by zbylo po okamžitém splacení.

### Příjem vs. výdaje (dashboard sekce ve finance trackeru)
```
Utraceno   = Výdaje (appka, aktuální měsíc) + Trvalé platby (aktivní)
Zbývá      = Čistá mzda − Utraceno      [jen pokud mzda zadána pro tento měsíc]
Míra úspor = Zbývá / Mzda × 100 %
```
Výdaje a trvalé platby se čtou z Disku (`vydaje_data.json`, `trvale_data.json`).

### Investice
```
Investováno = Σ transakcí (castka)
Zisk        = poslední aktualni.hodnota − Investováno
```

---

## Banky a produkty (finance_tracker.html)

**Banky:** Raiffeisenbank, Moneta, ČS, KB, AirBank, mBank, Roger aukce, Ronda invest

**Produkty na banku:** Běžný účet, Spořící 1, Spořící 2, Termínovaný, EUR účet (zadává se v EUR), Penzijní spoření, Stavebko Daník, Hypotéka (kladné číslo = zůstatek dluhu).

---

## Workflow

1. **Každý měsíc** zadat nové období v `finance_tracker.html` (zůstatky + příjmy + kurz EUR).
2. **Průběžně** zadávat výdaje v `vydaje_lukas.html`; mimořádné nákupy označit ⭐, rodinné (co nese Lukáš sám) označit 👪 (inline v seznamu nebo přepínačem).
3. **Denně** mrknout na `dashboard.html` (brífink + úkoly) a na denní rozpočet v appce Výdaje.
4. Trvalé platby zadat jednou; zůstávají aktivní, dokud se nenastaví `do`.
5. Úkoly, které visí na někom jiném, označit „⏳ Čeká na někoho", ať nestraší mezi urgentními.

---

## Lokální úložiště (localStorage)

| Klíč | Obsah |
|---|---|
| `google_connected` | Příznak „přihlášeno k Drive" |
| `g_access_token` | Uložený Google access token (pro auto-sync do ~1 h) |
| `g_token_expiry` | Čas vypršení tokenu (ms) |
| `drive_id_<název>` | Cache ID souboru na Disku (Finance/Výdaje/Úkoly/Dashboard) |
| `drive_file_id_poz` | Cache ID `poznamky_data.json` (Poznámky) |
| `drive_file_id_inv` | Cache ID `inventar_data.json` (Inventář) |
| `anthropic_api_key` | API klíč pro AI brífink (dashboard) + rozpoznání fotek (inventář) |
| `lk_finance` | Záloha periods (finance_tracker) |
| `lk_finance_cache` | Cache periods pro výpočet rozpočtu (vydaje_lukas) |
| `lk_inv` | Záloha investic (finance_tracker) |
| `lk_trvale` | Záloha trvalých plateb |
| `lk_prijmy` | Záloha průběžně zadaných příjmů |
| `lkv3` | Záloha výdajů |
| `vyd_jitka_claims` | Nákupy Jitky po měsících (`{ "YYYY-MM": částka }`) pro vyrovnání na záložce Jitka & Lukáš |
| `lk_poz` | Záloha poznámek |
| `lk_poz_quick_draft` | Rozepsaný koncept **rychlé** poznámky (pole nahoře) |
| `poz_draft` | Recovery koncept **editoru** — okamžitá pojistka, maže se po commitu (viz Autosave a obnova) |
| `poz_layout` | Rozložení seznamu poznámek (`list` / `compact`) |
| `vyd_savings_rate` | Míra úspor v % pro denní rozpočet (výchozí 30) |
| `vyd_expected_mzda` | Fixní očekávaná výplata jako záloha, dokud není zadaná skutečná mzda měsíce |
| `vyd_cfg_updated` | Časová známka nastavení rozpočtu pro merge s `vydaje_config.json` (novější vyhrává) |
| `vyd_cfg_dirty` | Příznak, že změna nastavení ještě nebyla potvrzena na Disk (retry při příštím syncu) |
| `custom_subs_<kat>` | Vlastní podkategorie výdajů (odvozené i ze synced dat kvůli iOS) |
| `dash_cache` | Cache úkolů/událostí/poznámek pro okamžité zobrazení dashboardu |
| `inv_data_cache` | Cache/záloha inventáře (Inventář) — drží data i frontu mezi syncy |
| `gh_pages_token` | Fine-grained GitHub PAT (vydaje_lukas) pro zápis `data.json` na GitHub Pages, čte Nástěnka |
| `nastenka_last_payload` | Poslední odeslaný obsah `data.json` (vydaje_lukas) — pro throttling zápisu (nezapisovat beze změny) |
| `nastenka_last_sync` | Čas posledního zápisu `data.json` (ms, vydaje_lukas) — throttling na 30 min |

Data se primárně ukládají na **Google Drive**; localStorage slouží jako záloha, cache a držitel přihlašovacího tokenu. *(Pozn.: klíče `gh_token` a `gh_sha_*` z GitHub éry už se nepoužívají — `gh_pages_token` výše je nový, samostatný účel: zápis veřejného `data.json` pro Nástěnku, ne úložiště appek.)*

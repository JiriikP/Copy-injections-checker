# 🛡️ Copy Injection Checker

Rozšíření do prohlížeče (Firefox / Chromium), které detekuje, vizuálně odhaluje a odstraňuje skryté texty na webových stránkách – tzv. **Copy Injections** (zneužívané pro **AI Prompt Injection** při kopírování textu do LLM).

## ✨ Hlavní funkce

- **Detekce 9 kategorií skrývání textu:** Od základních CSS triků až po pokročilé obfuskace (3D rotace, překrytí v CSS Grid, sub-pixelová průhlednost nebo barvy téměř shodné s pozadím).
- **Vizuální demaskování jedním kliknutím:** Nalezené skryté prvky natvrdo zviditelní přímo na stránce (červený text na žlutém pozadí), kde je lze kliknutím okamžitě smazat – nebo je nastaví k automatickému odstranění.
- **Přehledný popup s navigací:** Zobrazuje seznam zachycených injekcí s barevnými odznáčky (`1`–`9`), popiskem konkrétní techniky a tlačítkem **`↗`** pro plynulé odskrolování přímo na daný prvek.
- **Flexibilní správa webů:** Globální vypínač, přepínač pro konkrétní doménu i režim **allowlistu** (*Defaultně vypnout na nových stránkách*).
- **Chytré filtrování:** Ignoruje prvky, které prohlížeč při výběru myší nebo `Ctrl+C` fyzicky nekopíruje (`display: none`, `visibility: hidden`, položky v `<select>`, zavřené `<details>` nebo `user-select: none`), čímž eliminuje falešné poplachy.

## 🔍 Přehled detekovaných technik (Odznáčky 1–9)

| ID | Technika | Popis metody |
| :-: | :--- | :--- |
| **1** | **Záporný `z-index`** | Text je propadlý pod vrstvou pozadí (`z-index: -1`). |
| **2** | **Odsunutí mimo obrazovku** | Extrémní `left`/`top`, `margin-left`, `text-indent: -9999px`, `translateX` nebo ořez rodičem s `overflow: hidden`. |
| **3** | **Extrémní ořez** | Oříznutí vykreslované plochy pomocí `clip: rect(...)` nebo `clip-path`. |
| **4** | **Splývání barev** | Shodná barva textu a pozadí (např. bílá na bílé) i téměř neviditelné rozdíly v RGB odstínu. |
| **5** | **Transformace na nulu** | Zmenšení přes `transform: scale(0)` nebo otočení hranou k uživateli (`rotateY(90deg)`). |
| **6** | **Průhlednost a filtry** | `opacity: 0`, hodnoty těsně nad nulou (`0.001`), nízký alfa kanál v `rgba()` nebo `filter: opacity(0)`. |
| **7** | **Nulová velikost boxu** | Nastavení `width: 0` a `height: 0` v kombinaci s `overflow: hidden`. |
| **8** | **Nulové / mikro písmo** | Velikost písma menší než `3px` (včetně `font-size: 0px`). |
| **9** | **Překrytí jiným prvkem** | Zakrytí textu neprůhlednou vrstvou s vyšším `z-index` nebo vrstvením v `CSS Grid` (ověřováno raycastingem i kolizí sourozenců). |

## 🧪 Testovací stránka

Součástí repozitáře je interaktivní testovací sada pokrývající všech 9 kategorií:
- **Živá ukázka (GitHub Pages):** [JiriikP.github.io/Copy-injections-checker](https://JiriikP.github.io/Copy-injections-checker/)

## 🚀 Instalace

### Mozilla Firefox (ze souboru `.xpi`)
Automatické přidání:
[https://addons.mozilla.org/firefox/downloads/file/5295407/563c9c1993134955bb5f-2.3.xpi](https://addons.mozilla.org/firefox/downloads/file/5295407/563c9c1993134955bb5f-2.3.xpi)

Pokud nefuguje:
1. Stáhni balíček rozšíření (`.xpi`) ze sekce **Releases** (nebo přímo z tohoto repozitáře).
2. Otevři ve Firefoxu správce doplňků zadáním `about:addons` do adresního řádku (nebo stiskni `Ctrl + Shift + A`).
3. Klikni na ikonu ozubeného kola (⚙️) v pravém horním rohu a vyber **Instalovat doplněk ze souboru…** (*Install Add-on From File…*).
4. Vyber stažený soubor `.xpi` a potvrď instalaci.  
*(Tip: Stažený soubor `.xpi` lze také jednoduše přetáhnout myší přímo do okna Firefoxu.)*

### Google Chrome / Microsoft Edge / Brave (z archivu `.zip`)
1. Stáhni archiv rozšíření (`.zip`) ze sekce **Releases** a rozbal jej do libovolné složky.
2. Otevři v prohlížeči stránku `chrome://extensions/`.
3. V pravém horním rohu zapni **Režim pro vývojáře** (*Developer mode*).
4. Klikni na **Načíst rozbalené** (*Load unpacked*) a vyber rozbalenou složku s rozšířením.

# 🛡️ Copy Injection Checker

Rozšíření do prohlížeče (Firefox / Chromium), které detekuje, vizuálně odhaluje a odstraňuje skryté texty na webových stránkách – tzv. **Copy Injections** (zneužívané pro **AI Prompt Injection** při kopírování textu do LLM).

## ✨ Hlavní funkce

* **Detekce 9 kategorií skrývání textu:** Od základních CSS triků až po pokročilé obfuskace (3D rotace, překrytí v CSS Grid, sub-pixelová průhlednost nebo barvy téměř shodné s pozadím).
* **Vizuální demaskování jedním kliknutím:** Nalezené skryté prvky natvrdo zviditelní přímo na stránce (červený text na žlutém pozadí), kde je lze kliknutím okamžitě smazat – nebo je nastaví k automatickému odstranění.
* **Přehledný popup s navigací:** Zobrazuje seznam zachycených injekcí s barevnými odznáčky (`1`–`9`), popiskem konkrétní techniky a tlačítkem **`↗`** pro plynulé odskrolování přímo na daný prvek.
* **Flexibilní správa webů:** Globální vypínač, přepínač pro konkrétní doménu i režim **allowlistu** (*Defaultně vypnout na nových stránkách*).
* **Chytré filtrování:** Ignoruje prvky, které prohlížeč při výběru myší nebo `Ctrl+C` fyzicky nekopíruje (`display: none`, `visibility: hidden`, položky v `<select>`, zavřené `<details>` nebo `user-select: none`), čímž eliminuje falešné poplachy.

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
* **Živá ukázka (GitHub Pages):** `https://jiriikp.github.io/copy-injections-checker/`

## 🚀 Instalace (Vývojářský režim)

### Mozilla Firefox
1. Stáhni nebo naklonuj tento repozitář.
2. Otevři v prohlížeči adresu `about:debugging#/runtime/this-firefox`.
3. Klikni na **Načíst dočasný doplněk…** (*Load Temporary Add-on…*).
4. Vyber soubor `manifest.json` ze složky projektu.

### Google Chrome / Microsoft Edge / Brave
1. Otevři v prohlížeči adresu `chrome://extensions/`.
2. V pravém horním rohu zapni **Režim pro vývojáře** (*Developer mode*).
3. Klikni na **Načíst rozbalené** (*Load unpacked*) a vyber složku s projektem.

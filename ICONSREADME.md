# Ikony pro Android APK

Tento adresář obsahuje nastavení ikon pro aplikaci **Společné Nález**.

---

## 📁 Soubory ikon

| Soubor | Rozlišení | Účel |
|--------|-----------|-------|
| `public/icon.svg` | Vektorové | Zdrojová ikona (původní) |
| `public/icon-192.png` | 192×192 | PWA ikona (střední) |
| `public/icon-512.png` | 512×512 | PWA ikona (velká) |
| `public/icon-maskable-512.png` | 512×512 | PWA ikona (maskovatelná) |
| `android/ic_launcher.png` | 512×512 | Android launcher ikona |
| `android/ic_launcher_round.png` | 512×512 | Android kruhová ikona |

---

## 🎨 Generování ikon z SVG

### Metoda 1: Použít generátor (doporučeno)
Spusťte skript pro automatické vygenerování všech ikon z `icon.svg`:

```bash
cd C:\Users\Administrator\Develop\appkanase
node generate-icons.js
```

**Požadavky:**
- Node.js nainstalováno
- `sharp` knihovna (již součástí projektu - `npm install`)

**Výstup:**
- Všechny ikony budou vygenerovány ve složkách `public/` a `android/`

---

### Metoda 2: Ruční vytvoření

Pokud nemáte `icon.svg`, můžete vytvořit ikony ručně:

#### Požadované velikosti:
- **192×192** - Standardní PWA ikona
- **512×512** - Velká PWA ikona
- **512×512** - Maskovatelná ikona (pro adaptivní ikony Android)

#### Formát:
- **PNG** s průhledným pozadím
- **Čtvercový tvar** (1:1 poměr stran)

#### Doporučené nástroje:
- [Figma](https://figma.com) (zdarma)
- [GIMP](https://gimp.org) (zdarma)
- [Adobe Illustrator](https://adobe.com/illustrator)
- [Online PNG converter](https://svg2png.com)

---

## 📋 Požadavky na ikony pro Android

### 1. Standardní ikona (ic_launcher.png)
- **Velikost:** 512×512 pixelů
- **Formát:** PNG
- **Pozadí:** Průhledné nebo bílé
- **Tvar:** Libovolný (bude zobrazován v čtverci)

### 2. Maskovatelná ikona (ic_launcher_round.png)
- **Velikost:** 512×512 pixelů
- **Formát:** PNG
- **Pozadí:** Průhledné
- **Tvar:** **Důležité:** Obsah musí být zcela uvnitř kruhu (použije se maska)
- **Doporučení:** Umístěte hlavní prvek do středu kruhu o průměru ~400px

### 3. PWA ikony
- **icon-192.png:** 192×192 - Pro mobilní prohlížeče
- **icon-512.png:** 512×512 - Pro desktop PWA
- **icon-maskable-512.png:** 512×512 - Pro maskovatelné ikony

---

## 🔧 Aktualizace manifestů

Po vytvoření ikon je třeba aktualizovat manifesty:

### 1. `public/manifest.json`
Ujistěte se, že obsahuje:
```json
"icons": [
  {
    "src": "/icon-192.png",
    "sizes": "192x192",
    "type": "image/png",
    "purpose": "any"
  },
  {
    "src": "/icon-512.png",
    "sizes": "512x512",
    "type": "image/png",
    "purpose": "any"
  },
  {
    "src": "/icon-maskable-512.png",
    "sizes": "512x512",
    "type": "image/png",
    "purpose": "maskable"
  }
]
```

### 2. `twa-manifest.json`
Nastavte cesty k ikonám:
```json
{
  "iconUrl": "/icon-512.png",
  "maskableIconUrl": "/icon-maskable-512.png",
  "iconDirectory": "public"
}
```

---

## 🎯 Doporučení pro ikony

### 1. Design
- **Barvy:** Použijte témové barvy aplikace (`#0B0E14` - tmavě šedá)
- **Styl:** Jednoduchý, čitelný i v malé velikosti
- **Prvky:** Symbol hledání, kamery, nebo památky (v souladu s účel aplikace)

### 2. Testování
- Zobrazte ikonu v malé velikosti (48×48) - musí být stále rozpoznatelná
- Ověřte maskovatelnost: Ikona by měla vypadat dobře i v kruhovém tvaru

### 3. Nástroje pro testování
- [Maskable.app](https://maskable.app/) - Testování maskovatelných ikon
- [Android Asset Studio](https://romannurik.github.io/AndroidAssetStudio/) - Generování ikon

---

## ✅ Příklady ikon

### Doporučená struktura ikony:
```
████████████████
████████████████
█████    ██████
█████    ██████
█████    ██████
████████████████
████████████████
```
- **Tvar:** Kruh nebo štítek
- **Obsah:** Kamera, vyhledávací symbol, nebo stylizovaný "N" (Nálezy)
- **Barva:** Bílá nebo světlá na tmavém pozadí

---

## 📊 Souhrn kroků

1. **Vytvořte ikonu** v `public/icon.svg` (vektorové)
2. **Spusťte generátor:** `node generate-icons.js`
3. **Zkontrolujte** vygenerované PNG soubory
4. **Sestavte APK:** `bubblewrap init && bubblewrap build`
5. **Nainstalujte APK** a ověřte vzhled ikony

---

## 💡 Rychlé řešení

Pokud nechcete vytvářet vlastní ikony, můžete použít **placeholder ikony**:

1. Stáhněte sekci ikon z [Android Asset Studio](https://romannurik.github.io/AndroidAssetStudio/icons-launcher.html)
2. Vyberte ikonu (např. "Camera" nebo "Search")
3. Nastavte barvy podle tématu aplikace
4. Stáhněte ZIP a extrahujte do `public/` a `android/`

---

## 🎨 Inspirace

- **Fotografie:** Ikona fotoaparátu s GPS šipkou
- **Hledání:** Lupu s hvězdičkou
- **Kolekce:** Truhlu s pokladem
- **AI:** Robota s fotoaparátem
- **Minimalistické:** Jednoduchý symbol "N" v kruhu

**Důležité:** Ikona by měla být **jednoduchá, čitelná a rozpoznatelná** ve všech velikostech!

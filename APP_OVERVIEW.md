# Technický a funkční přehled aplikace Společné Nálezy

## 1. Účel aplikace
Aplikace "Společné Nálezy" slouží k evidenci, správě a oceňování nalezených předmětů (např. starožitnosti, běžné zboží) pomocí AI analýzy založené na modelu Gemini. Umožňuje uživateli vyfotografovat předmět, nechat jej analyzovat a uložit do databáze spolu s odhadnutou cenou a historií.

## 2. Architektura a technologie
Aplikace je postavena na platformě Android s využitím moderních technologií:
- **Jazyk:** Kotlin
- **UI Framework:** Jetpack Compose (deklarativní UI)
- **Architektura:** MVVM (Model-View-ViewModel) pro oddělení logiky od zobrazení.
- **Databáze:** Room (lokální persistence dat).
- **Asynchronní operace:** Kotlin Coroutines & Flow pro reaktivní aktualizace dat.
- **AI Integrace:** Google Generative AI SDK (model Gemini) pro analýzu obrázků a odhad cen.
- **Design:** Vlastní "Dark Tech" designový systém (implementován v Jetpack Compose).

## 3. Klíčové komponenty a funkce
- **InventoryScreen:** Hlavní obrazovka se seznamem nalezených předmětů.
- **CameraScreen:** Modul pro pořízení fotografií předmětů.
- **ItemDetailScreen:** Detail předmětu, kde probíhá AI analýza.
- **SettingsScreen:** Nastavení aplikace, včetně správy API klíče.
- **AiAnalysisRepository:** Vrstva pro komunikaci s AI, obsahuje prompt a logiku parsování JSON odpovědi.

## 4. Designový systém ("Dark Tech")
Design využívá tmavou paletu s fialovými a tyrkysovými akcenty:
- **Barvy:** Definované v `AppColors` (pozadí `0xFF0B0E14`, povrch `0xFF131A2A`).
- **Komponenty:**
    - `TechCard`: Tmavá karta s jemným ohraničením.
    - `PillBadge`: Odznak pro zobrazení stavu (SUCCESS, skóre).

## 5. Provozní poznámky
- API klíč pro Gemini je vyžadován a načítá se ze souboru `local.properties` (klíč `GEMINI_API_KEY`).
- Aplikace vyžaduje oprávnění ke kameře a úložišti.
- Data jsou trvale uložena v lokální databázi.

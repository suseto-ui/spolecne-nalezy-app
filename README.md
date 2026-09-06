# Společné Nálezy (React + Express Port)

Společná aplikace pro evidenci, správu, GPS lokalizaci a AI oceňování nalezených předmětů a starožitností pomocí Gemini AI pro manželský pár.

## Klíčové funkce (Přenesené z původní aplikace)

- **Fotoaparát s GPS & Reshoot detaily:** Pořizování fotografií přímo v prohlížeči (nebo výběr souboru), automatické odečítání přesných GPS souřadnic včetně nadmořské výšky a přesnosti, možnost pořízení sekundární detailní fotografie (punc, štítek, signatura).
- **Gemini AI Analýza & Oceňování:** Integrace s `@google/genai` (Gemini 2.5 Flash) na serverové straně s automatickou detekcí chybějících detailů (`NEEDS_MORE_INFO`), odhadem ceny v CZK a doporučením aukčních odkazů.
- **Katalog & Inventář:** Zobrazení mřížky nebo seznamu nálezů, filtrování dle stavu (`ACTIVE`, `ACQUIRED`, `ARCHIVED`), fulltextové vyhledávání a statistika celkové hodnoty.
- **Interaktivní mapa (Leaflet Dark Tech):** Zobrazení GPS bodů nálezů s barevným odlišením autorů (Manžel - azurová, Manželka - oranžová), vysouvací detail položky s přímou změnou stavu a odkazem na navigaci v Google Mapách.
- **Synchronizace & Konflikty:** Správa synchronizace s Google Drive strukturou, Last-Write-Wins strategie s časovým razítkem a kompletní auditní historií (`ItemLogEntry`).
- **Předvolby Promptů:** Správa uživatelských šablon a systémových instrukcí pro Gemini AI.

## Spuštění & Sestavení

```bash
# Vývojový režim (Express + Vite na portu 3000)
npm run dev

# Produkční sestavení
npm run build

# Spuštění produkčního serveru
npm start
```

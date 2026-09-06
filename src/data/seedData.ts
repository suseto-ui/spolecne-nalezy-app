import { ItemEntity, PromptPresetEntity, UserSettings } from "../types";

// Clean vector-based placeholder images for demo items
export const DEMO_CHAIR_IMG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300' fill='%23131A2A'%3E%3Crect width='400' height='300' fill='%23131A2A'/%3E%3Cpath d='M140 90h120v70H140z' fill='%237C5CFC' fill-opacity='0.4' stroke='%237C5CFC' stroke-width='4' rx='8'/%3E%3Cpath d='M120 160h160v40H120z' fill='%2300F2FE' fill-opacity='0.3' stroke='%2300F2FE' stroke-width='4' rx='6'/%3E%3Cpath d='M130 200l-15 70M270 200l15 70M150 200l-8 70M250 200l8 70' stroke='%238A99AD' stroke-width='6' stroke-linecap='round'/%3E%3Ctext x='200' y='50' fill='%23FFFFFF' font-family='sans-serif' font-size='16' font-weight='bold' text-anchor='middle'%3EHistorick%C3%A9 K%C5%99eslo z 60. let%3C/text%3E%3C/svg%3E";

export const DEMO_VASE_IMG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300' fill='%23131A2A'%3E%3Crect width='400' height='300' fill='%23131A2A'/%3E%3Cpath d='M170 70h60v20c0 20-35 40-35 80 0 35 25 50 25 50h-40s25-15 25-50c0-40-35-60-35-80V70z' fill='%2300F2FE' fill-opacity='0.3' stroke='%2300F2FE' stroke-width='4'/%3E%3Cellipse cx='200' cy='220' rx='50' ry='15' fill='%237C5CFC' fill-opacity='0.4' stroke='%237C5CFC' stroke-width='3'/%3E%3Ctext x='200' y='45' fill='%23FFFFFF' font-family='sans-serif' font-size='16' font-weight='bold' text-anchor='middle'%3EPorcel%C3%A1nov%C3%A1 v%C3%A1za%3C/text%3E%3C/svg%3E";

export const INITIAL_DEMO_ITEMS: ItemEntity[] = [
  {
    id: "demo-chair",
    timestamp: Date.now() - 3600000 * 24 * 2,
    author: "Husband",
    imageLocalPath: DEMO_CHAIR_IMG,
    secondaryImageLocalPath: null,
    extraImagePathsJson: "[]",
    title: "Křeslo z 60. let",
    description: "Předmět s opraveným dřevěným rámem a dobře zachovaným čalouněním v bruselském stylu.",
    category: "Nábytek",
    itemStatus: "ACTIVE",
    estimatedPriceCzk: "4 800 Kč",
    numericPriceCzk: 4800,
    webReferencesJson: JSON.stringify(["https://aukro.cz/kreslo-60-leta", "https://bazos.cz/nabytek-retro"]),
    latitude: 50.0755,
    longitude: 14.4378,
    altitude: 230,
    gpsAccuracy: 8,
    googleMapsUrl: "https://www.google.com/maps/search/?api=1&query=50.0755,14.4378",
    isUserSaved: true,
    syncStatus: "SYNCED",
    lastModifiedTimestamp: Date.now() - 3600000 * 24 * 2,
  },
  {
    id: "demo-vase",
    timestamp: Date.now() - 3600000 * 12,
    author: "Wife",
    imageLocalPath: DEMO_VASE_IMG,
    secondaryImageLocalPath: null,
    extraImagePathsJson: "[]",
    title: "Porcelánová váza",
    description: "Váza s jemnou ruční výzdobou a zlacením, vhodná pro dekoraci nebo sběratelství.",
    category: "Starožitnosti",
    itemStatus: "ACTIVE",
    estimatedPriceCzk: "3 200 Kč",
    numericPriceCzk: 3200,
    webReferencesJson: JSON.stringify(["https://aukro.cz/porcelanova-vaza-starozitnost"]),
    latitude: 50.0875,
    longitude: 14.4208,
    altitude: 210,
    gpsAccuracy: 6,
    googleMapsUrl: "https://www.google.com/maps/search/?api=1&query=50.0875,14.4208",
    isUserSaved: true,
    syncStatus: "PENDING_UPLOAD",
    lastModifiedTimestamp: Date.now() - 3600000 * 12,
  },
];

export const INITIAL_PROMPT_PRESETS: PromptPresetEntity[] = [
  {
    id: "preset-odhad-ceny",
    title: "Odhad ceny",
    promptText: "Odhadni tržní cenu tohoto předmětu.",
    isDefault: true,
    lastUsedTimestamp: Date.now(),
  },
  {
    id: "preset-starozitnosti",
    title: "Starožitnosti & Původ",
    promptText: "Urči materiál, stáří, manufakturu nebo značku a odhadovanou sběratelskou hodnotu.",
    isDefault: false,
    lastUsedTimestamp: Date.now() - 100000,
  },
  {
    id: "preset-bezne-zbozi",
    title: "Běžné zboží a elektro",
    promptText: "Najdi maloobchodní cenu v ČR pro toto spotřební zboží a porovnej ceny.",
    isDefault: false,
    lastUsedTimestamp: Date.now() - 200000,
  }
];

export const DEFAULT_USER_SETTINGS: UserSettings = {
  husbandEmail: "primary-user@spolecne.cz",
  wifeEmail: "secondary-user@spolecne.cz",
  currentUserEmail: "primary-user@spolecne.cz",
  currentAuthor: "Husband",
  googleAccountName: "Společný uživatel",
  googleDriveSyncEnabled: true,
  autoSyncEnabled: false,
  localStorageEnabled: true,
};

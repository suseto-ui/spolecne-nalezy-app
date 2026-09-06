import { ItemEntity, ItemLogEntry, PromptPresetEntity, UserSettings, ItemStatusType, SavedAnalysisEntity, AiAnalysisResult } from "../types";
import { INITIAL_DEMO_ITEMS, INITIAL_PROMPT_PRESETS, DEFAULT_USER_SETTINGS } from "../data/seedData";

const STORAGE_KEY_ITEMS = "spolecne_nalezy_items";
const STORAGE_KEY_LOGS = "spolecne_nalezy_logs";
const STORAGE_KEY_PRESETS = "spolecne_nalezy_presets";
const STORAGE_KEY_SETTINGS = "spolecne_nalezy_settings";
const STORAGE_KEY_SHARED_MANIFESTS = "spolecne_nalezy_drive_manifests";
const STORAGE_KEY_ANALYSES = "spolecne_nalezy_analyses_history";

export class StorageService {
  // Items
  static getItems(): ItemEntity[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY_ITEMS);
      if (!data) {
        localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(INITIAL_DEMO_ITEMS));
        return INITIAL_DEMO_ITEMS;
      }
      return JSON.parse(data);
    } catch {
      return INITIAL_DEMO_ITEMS;
    }
  }

  static getItemById(id: string): ItemEntity | undefined {
    return this.getItems().find((item) => item.id === id);
  }

  static saveItem(item: ItemEntity, author: string, changeDescription: string): void {
    const items = this.getItems();
    const existingIndex = items.findIndex((i) => i.id === item.id);
    const now = Date.now();

    const updatedItem = {
      ...item,
      lastModifiedTimestamp: now,
      syncStatus: "PENDING_UPLOAD" as const,
    };

    if (existingIndex >= 0) {
      items[existingIndex] = updatedItem;
    } else {
      items.unshift(updatedItem);
    }

    localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(items));
    this.addLog(item.id, changeDescription, author);
  }

  static updateItemStatus(itemId: string, newStatus: ItemStatusType, author: string): ItemEntity | undefined {
    const items = this.getItems();
    const index = items.findIndex((i) => i.id === itemId);
    if (index === -1) return undefined;

    const item = items[index];
    const updated = {
      ...item,
      itemStatus: newStatus,
      lastModifiedTimestamp: Date.now(),
      syncStatus: "PENDING_UPLOAD" as const,
    };
    items[index] = updated;
    localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(items));
    this.addLog(itemId, `Stav změněn na: ${newStatus}`, author);
    return updated;
  }

  static deleteItem(id: string): void {
    const items = this.getItems().filter((item) => item.id !== id);
    localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(items));
  }

  // Logs
  static getLogsForItem(itemId: string): ItemLogEntry[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY_LOGS);
      const allLogs: ItemLogEntry[] = data ? JSON.parse(data) : [];
      return allLogs
        .filter((log) => log.itemId === itemId)
        .sort((a, b) => b.timestamp - a.timestamp);
    } catch {
      return [];
    }
  }

  static addLog(itemId: string, changeDescription: string, author: string): void {
    try {
      const data = localStorage.getItem(STORAGE_KEY_LOGS);
      const allLogs: ItemLogEntry[] = data ? JSON.parse(data) : [];
      const newLog: ItemLogEntry = {
        id: "log-" + Math.random().toString(36).substring(2, 9),
        itemId,
        timestamp: Date.now(),
        changeDescription,
        author,
      };
      allLogs.push(newLog);
      localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(allLogs));
    } catch (e) {
      console.error("Failed to add log", e);
    }
  }

  // Presets
  static getPresets(): PromptPresetEntity[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY_PRESETS);
      if (!data) {
        localStorage.setItem(STORAGE_KEY_PRESETS, JSON.stringify(INITIAL_PROMPT_PRESETS));
        return INITIAL_PROMPT_PRESETS;
      }
      return JSON.parse(data);
    } catch {
      return INITIAL_PROMPT_PRESETS;
    }
  }

  static savePreset(title: string, promptText: string, presetId?: string | null, isDefault = false): PromptPresetEntity {
    const presets = this.getPresets();
    const now = Date.now();

    if (isDefault) {
      presets.forEach((p) => (p.isDefault = false));
    }

    if (presetId) {
      const idx = presets.findIndex((p) => p.id === presetId);
      if (idx >= 0) {
        presets[idx] = {
          ...presets[idx],
          title: title.trim(),
          promptText: promptText.trim(),
          isDefault,
          lastUsedTimestamp: now,
        };
        localStorage.setItem(STORAGE_KEY_PRESETS, JSON.stringify(presets));
        return presets[idx];
      }
    }

    const newPreset: PromptPresetEntity = {
      id: "preset-" + Math.random().toString(36).substring(2, 9),
      title: title.trim(),
      promptText: promptText.trim(),
      isDefault: isDefault || presets.length === 0,
      lastUsedTimestamp: now,
    };
    presets.push(newPreset);
    localStorage.setItem(STORAGE_KEY_PRESETS, JSON.stringify(presets));
    return newPreset;
  }

  static deletePreset(presetId: string): void {
    let presets = this.getPresets().filter((p) => p.id !== presetId);
    if (presets.length > 0 && !presets.some((p) => p.isDefault)) {
      presets[0].isDefault = true;
    }
    localStorage.setItem(STORAGE_KEY_PRESETS, JSON.stringify(presets));
  }

  // User Settings
  static getSettings(): UserSettings {
    try {
      const data = localStorage.getItem(STORAGE_KEY_SETTINGS);
      if (!data) {
        localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(DEFAULT_USER_SETTINGS));
        return DEFAULT_USER_SETTINGS;
      }
      return { ...DEFAULT_USER_SETTINGS, ...JSON.parse(data) };
    } catch {
      return DEFAULT_USER_SETTINGS;
    }
  }

  static saveSettings(settings: Partial<UserSettings>): UserSettings {
    const current = this.getSettings();
    const updated = { ...current, ...settings };
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(updated));
    return updated;
  }

  // Sync with Google Drive / Partner Simulation (matches Kotlin SyncRepository Last-Write-Wins)
  static performManualSync(currentAuthor: string): {
    success: boolean;
    message: string;
    uploadedCount: number;
    downloadedCount: number;
    conflictCount: number;
  } {
    try {
      const items = this.getItems();
      let sharedManifests: Record<string, ItemEntity> = {};
      try {
        const raw = localStorage.getItem(STORAGE_KEY_SHARED_MANIFESTS);
        if (raw) sharedManifests = JSON.parse(raw);
      } catch {}

      // 1. Upload local items that are PENDING_UPLOAD or ERROR
      let uploadedCount = 0;
      items.forEach((item) => {
        if (item.syncStatus === "PENDING_UPLOAD" || item.syncStatus === "ERROR") {
          sharedManifests[item.id] = { ...item, syncStatus: "SYNCED" };
          item.syncStatus = "SYNCED";
          uploadedCount++;
        }
      });

      // 2. Download / Merge manifests from partner with Last-Write-Wins conflict resolution
      let downloadedCount = 0;
      let conflictCount = 0;

      Object.values(sharedManifests).forEach((remoteItem) => {
        const localIndex = items.findIndex((i) => i.id === remoteItem.id);
        if (localIndex === -1) {
          // New remote item
          items.push({ ...remoteItem, syncStatus: "SYNCED" });
          StorageService.addLog(
            remoteItem.id,
            `Synchronizován nový nález od partnera (${remoteItem.author})`,
            currentAuthor
          );
          downloadedCount++;
        } else {
          const localItem = items[localIndex];
          if (remoteItem.lastModifiedTimestamp > localItem.lastModifiedTimestamp) {
            // Remote is newer
            items[localIndex] = { ...remoteItem, syncStatus: "SYNCED" };
            StorageService.addLog(
              remoteItem.id,
              `Konflikt vyřešen: Převzata novější verze od partnera`,
              currentAuthor
            );
            conflictCount++;
          } else if (remoteItem.lastModifiedTimestamp < localItem.lastModifiedTimestamp) {
            // Local is newer
            items[localIndex].syncStatus = "PENDING_UPLOAD";
            sharedManifests[localItem.id] = { ...localItem, syncStatus: "SYNCED" };
            StorageService.addLog(
              remoteItem.id,
              `Konflikt vyřešen: Zachována lokální verze`,
              currentAuthor
            );
            conflictCount++;
          }
        }
      });

      localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(items));
      localStorage.setItem(STORAGE_KEY_SHARED_MANIFESTS, JSON.stringify(sharedManifests));

      return {
        success: true,
        message: `Synchronizace dokončena. Odesláno: ${uploadedCount}, Staženo: ${downloadedCount}, Vyřešených konfliktů: ${conflictCount}`,
        uploadedCount,
        downloadedCount,
        conflictCount,
      };
    } catch (e: any) {
      return {
        success: false,
        message: `Chyba při synchronizaci: ${e?.message || "Neznámá chyba"}`,
        uploadedCount: 0,
        downloadedCount: 0,
        conflictCount: 0,
      };
    }
  }

  // AI Analysis History - Save every single analysis run automatically
  static saveAnalysisRun(itemId: string, promptText: string, result: AiAnalysisResult): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_ANALYSES);
      const history: SavedAnalysisEntity[] = raw ? JSON.parse(raw) : [];
      const newEntry: SavedAnalysisEntity = {
        id: "analysis-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7),
        itemId,
        timestamp: Date.now(),
        promptText,
        result,
      };
      history.unshift(newEntry);
      localStorage.setItem(STORAGE_KEY_ANALYSES, JSON.stringify(history));

      // Also add a log entry for auditing
      this.addLog(
        itemId,
        `AI analýza automaticky zaznamenána: "${result.title}" s odhadem ${result.estimatedPriceCzk}`,
        "Systém"
      );
    } catch (e) {
      console.error("Failed to save analysis run locally", e);
    }
  }

  static getAnalysisHistory(itemId: string): SavedAnalysisEntity[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_ANALYSES);
      const history: SavedAnalysisEntity[] = raw ? JSON.parse(raw) : [];
      return history.filter((h) => h.itemId === itemId);
    } catch {
      return [];
    }
  }

  static clearAllData(): void {
    localStorage.removeItem(STORAGE_KEY_ITEMS);
    localStorage.removeItem(STORAGE_KEY_LOGS);
    localStorage.removeItem(STORAGE_KEY_PRESETS);
    localStorage.removeItem(STORAGE_KEY_SETTINGS);
    localStorage.removeItem(STORAGE_KEY_SHARED_MANIFESTS);
    localStorage.removeItem(STORAGE_KEY_ANALYSES);
  }
}

export type ItemStatusType = "ACTIVE" | "ACQUIRED" | "ARCHIVED";
export type SyncStatusType = "PENDING_UPLOAD" | "SYNCED" | "ERROR";
export type AuthorType = "Husband" | "Wife";

export interface ItemEntity {
  id: string;
  timestamp: number;
  author: string; // "Husband" | "Wife" | custom name
  imageLocalPath?: string | null;
  secondaryImageLocalPath?: string | null;
  extraImagePathsJson: string; // JSON array of string paths
  imageDriveId?: string | null;
  secondaryImageDriveId?: string | null;
  title: string;
  description: string;
  category: string;
  itemStatus: ItemStatusType;
  estimatedPriceCzk: string;
  numericPriceCzk: number;
  webReferencesJson: string; // JSON array of URL strings
  latitude?: number | null;
  longitude?: number | null;
  altitude?: number | null;
  gpsAccuracy?: number | null;
  googleMapsUrl: string;
  isUserSaved: boolean;
  syncStatus: SyncStatusType;
  lastModifiedTimestamp: number;
}

export interface ItemLogEntry {
  id: string;
  itemId: string;
  timestamp: number;
  changeDescription: string;
  author: string;
}

export interface PromptPresetEntity {
  id: string;
  title: string;
  promptText: string;
  isDefault: boolean;
  lastUsedTimestamp: number;
}

export interface AiAnalysisResult {
  status: "SUCCESS" | "NEEDS_MORE_INFO";
  title: string;
  description: string;
  category: string;
  estimatedPriceCzk: string;
  numericPrice: number;
  webReferences: string[];
  followUpPrompt: string;
  reasoning: string;
}

export interface SavedAnalysisEntity {
  id: string;
  itemId: string;
  timestamp: number;
  promptText: string;
  result: AiAnalysisResult;
}

export interface UserSettings {
  husbandEmail: string;
  wifeEmail: string;
  currentUserEmail: string;
  currentAuthor: string;
  googleAccountName: string;
  googleDriveSyncEnabled: boolean;
  autoSyncEnabled: boolean;
  localStorageEnabled: boolean;
}

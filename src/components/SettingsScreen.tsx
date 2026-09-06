import React, { useState, useEffect } from "react";
import {
  User,
  RefreshCw,
  FolderSync,
  HardDrive,
  Sparkles,
  Shield,
  Trash2,
  Check,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Edit2,
} from "lucide-react";
import { AppHeader } from "./common/AppHeader";
import { TechCard } from "./common/TechCard";
import { UserSettings, PromptPresetEntity } from "../types";
import { StorageService } from "../services/storage";

interface SettingsScreenProps {
  settings: UserSettings;
  onUpdateSettings: (newSettings: UserSettings) => void;
  onRefreshAllData: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  settings,
  onUpdateSettings,
  onRefreshAllData,
}) => {
  const [formData, setFormData] = useState<UserSettings>(settings);
  const [presets, setPresets] = useState<PromptPresetEntity[]>([]);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // New preset state
  const [newTitle, setNewTitle] = useState<string>("");
  const [newPromptText, setNewPromptText] = useState<string>("");
  const [showAddPreset, setShowAddPreset] = useState<boolean>(false);

  useEffect(() => {
    setFormData(settings);
    setPresets(StorageService.getPresets());
  }, [settings]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleSaveProfile = () => {
    const updated = StorageService.saveSettings(formData);
    onUpdateSettings(updated);
    showToast("Profil a nastavení uloženy");
  };

  const handleAuthorChange = (author: "Husband" | "Wife") => {
    const updated = StorageService.saveSettings({
      ...formData,
      currentAuthor: author,
      currentUserEmail: author === "Husband" ? formData.husbandEmail : formData.wifeEmail,
    });
    setFormData(updated);
    onUpdateSettings(updated);
    showToast(`Přepnuto na: ${author === "Husband" ? "Manžel" : "Manželka"}`);
  };

  const handleToggle = (key: keyof UserSettings) => {
    const newVal = !formData[key];
    const updated = StorageService.saveSettings({
      ...formData,
      [key]: newVal,
    });
    setFormData(updated);
    onUpdateSettings(updated);
  };

  const handleManualSync = () => {
    setIsSyncing(true);
    setSyncResult(null);

    setTimeout(() => {
      const result = StorageService.performManualSync(formData.currentAuthor);
      setIsSyncing(false);
      setSyncResult(result.message);
      onRefreshAllData();
      showToast("Synchronizace dokončena");
    }, 1200);
  };

  const handleAddPreset = () => {
    if (!newTitle.trim() || !newPromptText.trim()) return;
    StorageService.savePreset(newTitle, newPromptText);
    setPresets(StorageService.getPresets());
    setNewTitle("");
    setNewPromptText("");
    setShowAddPreset(false);
    showToast("Předvolba přidána");
  };

  const handleDeletePreset = (id: string) => {
    StorageService.deletePreset(id);
    setPresets(StorageService.getPresets());
    showToast("Předvolba smazána");
  };

  const handleSetDefaultPreset = (preset: PromptPresetEntity) => {
    StorageService.savePreset(preset.title, preset.promptText, preset.id, true);
    setPresets(StorageService.getPresets());
    showToast(`"${preset.title}" nastavena jako výchozí`);
  };

  const handleResetData = () => {
    if (window.confirm("Opravdu chcete obnovit počáteční demo data? Tato akce smaže lokálně vytvořené položky.")) {
      StorageService.clearAllData();
      onRefreshAllData();
      showToast("Data obnovena do výchozího stavu");
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0E14] pb-28 text-white">
      <AppHeader
        title="Nastavení & Sync"
        userName={formData.googleAccountName || formData.currentAuthor}
        subtitle="Správa účtů, Google Drive a předvoleb"
      />

      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-emerald-500 text-black text-xs font-bold rounded-full shadow-lg flex items-center gap-1.5 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* User Identity & Profile Section */}
        <section className="bg-[#131A2A] rounded-2xl border border-[#7C5CFC]/20 p-5 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
            <User className="w-4 h-4 text-[#00F2FE]" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#8A99AD]">
              Uživatelský profil & Autor nálezů
            </h3>
          </div>

          <div>
            <label className="text-xs font-medium text-[#8A99AD] block mb-2">
              Aktivní partner (autor nových záznamů)
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleAuthorChange("Husband")}
                className={`py-3 px-4 rounded-xl border flex items-center justify-center gap-2 font-bold text-xs transition-all ${
                  formData.currentAuthor === "Husband"
                    ? "bg-[#00F2FE]/20 border-[#00F2FE] text-[#00F2FE] shadow-[0_0_15px_rgba(0,242,254,0.25)]"
                    : "bg-[#0B0E14] border-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                <span>Manžel (M)</span>
                {formData.currentAuthor === "Husband" && <Check className="w-4 h-4" />}
              </button>

              <button
                type="button"
                onClick={() => handleAuthorChange("Wife")}
                className={`py-3 px-4 rounded-xl border flex items-center justify-center gap-2 font-bold text-xs transition-all ${
                  formData.currentAuthor === "Wife"
                    ? "bg-[#FF9100]/20 border-[#FF9100] text-[#FFB74D] shadow-[0_0_15px_rgba(255,145,0,0.25)]"
                    : "bg-[#0B0E14] border-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                <span>Manželka (Ž)</span>
                {formData.currentAuthor === "Wife" && <Check className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-medium text-[#8A99AD]">Zobrazované jméno</label>
              <input
                type="text"
                value={formData.googleAccountName}
                onChange={(e) => setFormData({ ...formData, googleAccountName: e.target.value })}
                className="w-full px-3 py-2 bg-[#0B0E14] border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-[#7C5CFC]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-[#8A99AD]">E-mail Manžela</label>
              <input
                type="email"
                value={formData.husbandEmail}
                onChange={(e) => setFormData({ ...formData, husbandEmail: e.target.value })}
                className="w-full px-3 py-2 bg-[#0B0E14] border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-[#7C5CFC]"
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-medium text-[#8A99AD]">E-mail Manželky</label>
              <input
                type="email"
                value={formData.wifeEmail}
                onChange={(e) => setFormData({ ...formData, wifeEmail: e.target.value })}
                className="w-full px-3 py-2 bg-[#0B0E14] border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-[#7C5CFC]"
              />
            </div>
          </div>

          <button
            onClick={handleSaveProfile}
            className="w-full py-2.5 bg-[#182232] border border-[#7C5CFC]/30 hover:border-[#7C5CFC]/60 text-white rounded-xl text-xs font-bold transition-colors"
          >
            Uložit změny profilu
          </button>
        </section>

        {/* Sync Section (Google Drive / Shared folder / Conflict resolution) */}
        <section className="bg-[#131A2A] rounded-2xl border border-[#7C5CFC]/20 p-5 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
            <RefreshCw className="w-4 h-4 text-[#7C5CFC]" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#8A99AD]">
              Synchronizace & Google Drive
            </h3>
          </div>

          <p className="text-xs text-slate-400">
            Aplikace využívá strategii <strong className="text-white">Last-Write-Wins</strong> s automatickým logováním
            konfliktů pro hladké sdílení dat a fotografií mezi manželi.
          </p>

          <div className="space-y-3 pt-1">
            {/* Google Drive sync toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#0B0E14] border border-slate-800">
              <div className="flex items-center gap-3">
                <FolderSync className="w-4 h-4 text-[#00F2FE]" />
                <div>
                  <span className="text-xs font-bold text-white block">Google Drive synchronizace</span>
                  <span className="text-[11px] text-[#8A99AD]">Složka AplikaceNalezy_Shared</span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={formData.googleDriveSyncEnabled}
                onChange={() => handleToggle("googleDriveSyncEnabled")}
                className="w-4 h-4 accent-[#00F2FE] cursor-pointer"
              />
            </div>

            {/* Auto sync toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#0B0E14] border border-slate-800">
              <div className="flex items-center gap-3">
                <RefreshCw className="w-4 h-4 text-[#7C5CFC]" />
                <div>
                  <span className="text-xs font-bold text-white block">Automatická synchronizace</span>
                  <span className="text-[11px] text-[#8A99AD]">Při pořízení nového snímku nebo změně</span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={formData.autoSyncEnabled}
                onChange={() => handleToggle("autoSyncEnabled")}
                className="w-4 h-4 accent-[#7C5CFC] cursor-pointer"
              />
            </div>

            {/* Local storage toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#0B0E14] border border-slate-800">
              <div className="flex items-center gap-3">
                <HardDrive className="w-4 h-4 text-emerald-400" />
                <div>
                  <span className="text-xs font-bold text-white block">Lokální offline úložiště</span>
                  <span className="text-[11px] text-[#8A99AD]">Rychlé načítání a práce bez internetu</span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={formData.localStorageEnabled}
                onChange={() => handleToggle("localStorageEnabled")}
                className="w-4 h-4 accent-emerald-500 cursor-pointer"
              />
            </div>
          </div>

          <button
            onClick={handleManualSync}
            disabled={isSyncing}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-[#7C5CFC] to-[#00F2FE] text-white text-xs font-bold flex items-center justify-center gap-2 hover:brightness-110 shadow-[0_0_20px_rgba(124,92,252,0.3)] disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 text-white ${isSyncing ? "animate-spin" : ""}`} />
            <span>{isSyncing ? "Synchronizuji data a manifesty..." : "Spustit manuální synchronizaci"}</span>
          </button>

          {syncResult && (
            <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-xs text-emerald-300">
              {syncResult}
            </div>
          )}
        </section>

        {/* AI Prompt Presets Management */}
        <section className="bg-[#131A2A] rounded-2xl border border-[#7C5CFC]/20 p-5 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#00F2FE]" />
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#8A99AD]">
                Předvolby promptů pro Gemini AI
              </h3>
            </div>
            <button
              onClick={() => setShowAddPreset(!showAddPreset)}
              className="text-xs text-[#00F2FE] hover:underline flex items-center gap-1 font-semibold"
            >
              <Plus className="w-3.5 h-3.5" />
              Nová předvolba
            </button>
          </div>

          {showAddPreset && (
            <div className="p-4 bg-[#0B0E14] rounded-xl border border-[#7C5CFC]/40 space-y-3">
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Název předvolby (např. Numismatika & Mince)..."
                className="w-full px-3 py-2 bg-[#131A2A] border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-[#00F2FE]"
              />
              <textarea
                value={newPromptText}
                onChange={(e) => setNewPromptText(e.target.value)}
                rows={2}
                placeholder="Instrukce pro Gemini model..."
                className="w-full px-3 py-2 bg-[#131A2A] border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-[#00F2FE] resize-none"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowAddPreset(false)}
                  className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-xs"
                >
                  Zrušit
                </button>
                <button
                  onClick={handleAddPreset}
                  className="px-4 py-1.5 bg-[#00F2FE] text-[#0B0E14] font-bold rounded-lg text-xs hover:brightness-110"
                >
                  Přidat předvolbu
                </button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {presets.map((p) => (
              <div
                key={p.id}
                className="p-3 bg-[#0B0E14] rounded-xl border border-slate-800/80 flex items-start justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-white">{p.title}</h4>
                    {p.isDefault && (
                      <span className="px-1.5 py-0.5 rounded bg-[#7C5CFC]/20 text-[#A58FFF] text-[9px] font-semibold border border-[#7C5CFC]/30">
                        Výchozí
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">{p.promptText}</p>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {!p.isDefault && (
                    <button
                      onClick={() => handleSetDefaultPreset(p)}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 rounded"
                      title="Nastavit jako výchozí"
                    >
                      Výchozí
                    </button>
                  )}
                  <button
                    onClick={() => handleDeletePreset(p.id)}
                    className="p-1.5 text-slate-500 hover:text-red-400 rounded"
                    title="Smazat"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Danger Zone: Reset local database */}
        <section className="bg-red-500/5 rounded-2xl border border-red-500/20 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-red-400">
              Správa databáze
            </h3>
          </div>

          <p className="text-xs text-slate-400">
            Pokud potřebujete obnovit původní vzorové položky (křeslo, váza) a vymazat lokální mezipaměť:
          </p>

          <button
            onClick={handleResetData}
            className="px-4 py-2 bg-red-500/15 border border-red-500/40 text-red-300 hover:bg-red-500/25 rounded-xl text-xs font-semibold transition-colors"
          >
            Obnovit výchozí demo data
          </button>
        </section>
      </main>
    </div>
  );
};

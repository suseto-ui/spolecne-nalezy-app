import React, { useState, useEffect } from "react";
import {
  ArrowLeft,
  Save,
  Trash2,
  Sparkles,
  MapPin,
  ExternalLink,
  Camera,
  History,
  CheckCircle2,
  Clock,
  User,
  Plus,
  Compass,
  Share2,
  FileText,
} from "lucide-react";
import { ItemEntity, ItemStatusType, UserSettings, ItemLogEntry, AiAnalysisResult, SavedAnalysisEntity } from "../types";
import { StorageService } from "../services/storage";
import { PdfGeneratorService } from "../utils/pdfGenerator";
import { PillBadge } from "./common/PillBadge";
import { AiAnalysisDialog } from "./AiAnalysisDialog";

interface ItemDetailScreenProps {
  itemId: string;
  settings: UserSettings;
  onNavigateBack: () => void;
  onRequestReshoot: (itemId: string) => void;
}

export const ItemDetailScreen: React.FC<ItemDetailScreenProps> = ({
  itemId,
  settings,
  onNavigateBack,
  onRequestReshoot,
}) => {
  const [item, setItem] = useState<ItemEntity | null>(null);
  const [logs, setLogs] = useState<ItemLogEntry[]>([]);
  const [analysisHistory, setAnalysisHistory] = useState<SavedAnalysisEntity[]>([]);
  const [isAiDialogOpen, setIsAiDialogOpen] = useState<boolean>(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState<string>("");
  const [category, setCategory] = useState<string>("");
  const [estimatedPriceCzk, setEstimatedPriceCzk] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [status, setStatus] = useState<ItemStatusType>("ACTIVE");

  useEffect(() => {
    const loadedItem = StorageService.getItemById(itemId);
    if (loadedItem) {
      setItem(loadedItem);
      setTitle(loadedItem.title);
      setCategory(loadedItem.category);
      setEstimatedPriceCzk(loadedItem.estimatedPriceCzk);
      setDescription(loadedItem.description);
      setStatus(loadedItem.itemStatus);
      setLogs(StorageService.getLogsForItem(itemId));
      setAnalysisHistory(StorageService.getAnalysisHistory(itemId));
    }
  }, [itemId]);

  if (!item) {
    return (
      <div className="min-h-screen bg-[#0B0E14] flex flex-col items-center justify-center p-6 text-center">
        <p className="text-slate-400 mb-4">Položka nebyla nalezena</p>
        <button
          onClick={onNavigateBack}
          className="px-4 py-2 bg-[#7C5CFC] text-white rounded-xl text-sm"
        >
          Zpět do katalogu
        </button>
      </div>
    );
  }

  const handleSave = () => {
    // Parse numeric price if possible
    const cleaned = estimatedPriceCzk.replace(/[^0-9]/g, "");
    const numeric = cleaned ? parseInt(cleaned, 10) : item.numericPriceCzk;

    const updated: ItemEntity = {
      ...item,
      title: title.trim() || item.title,
      category: category.trim() || item.category,
      estimatedPriceCzk: estimatedPriceCzk.trim() || item.estimatedPriceCzk,
      numericPriceCzk: numeric,
      description: description.trim(),
      itemStatus: status,
      isUserSaved: true,
      lastModifiedTimestamp: Date.now(),
      syncStatus: "PENDING_UPLOAD",
    };

    StorageService.saveItem(
      updated,
      settings.currentAuthor,
      "Uloženy úpravy detailu položky"
    );
    setItem(updated);
    setLogs(StorageService.getLogsForItem(itemId));

    setSaveToast("Změny úspěšně uloženy");
    setTimeout(() => setSaveToast(null), 2500);
  };

  const handleDelete = () => {
    if (window.confirm("Opravdu chcete tuto položku smazat z katalogu?")) {
      StorageService.deleteItem(item.id);
      onNavigateBack();
    }
  };

  const handleDownloadPdf = async () => {
    if (!item) return;
    try {
      setSaveToast("Generuji PDF protokol o nálezu...");
      await PdfGeneratorService.downloadSingleItemReport(item, logs);
      setSaveToast("PDF protokol úspěšně stažen!");
      setTimeout(() => setSaveToast(null), 2500);
    } catch (err) {
      console.error("Chyba při generování PDF:", err);
      setSaveToast("Nepodařilo se vygenerovat PDF.");
      setTimeout(() => setSaveToast(null), 2500);
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: `Nález: ${title || "Bez názvu"}`,
      text: `Aplikace Společné Nálezy: Podívej se na můj nález!
Název: ${title || "Neznámý předmět"}
Kategorie: ${category || "Nespecifikováno"}
Odhadovaná cena: ${estimatedPriceCzk || "Nenaceněno"}
Popis: ${description || "Bez popisu"}
Lokace: ${item.latitude && item.longitude ? `${item.latitude}, ${item.longitude}` : "Nezaměřeno"}
Odkaz na Google Mapy: ${item.googleMapsUrl || "Není k dispozici"}`,
      url: window.location.origin,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        setSaveToast("Nález byl úspěšně sdílen!");
        setTimeout(() => setSaveToast(null), 2500);
      } catch (err: any) {
        if (err.name !== "AbortError") {
          console.error("Chyba při sdílení:", err);
          fallbackShareToClipboard(shareData.text);
        }
      }
    } else {
      fallbackShareToClipboard(shareData.text);
    }
  };

  const fallbackShareToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(
      () => {
        setSaveToast("Informace zkopírovány do schránky pro sdílení!");
        setTimeout(() => setSaveToast(null), 3000);
      },
      (err) => {
        console.error("Nepodařilo se kopírovat do schránky:", err);
      }
    );
  };

  const handleRestoreAnalysis = (historical: SavedAnalysisEntity) => {
    const res = historical.result;
    setTitle(res.title);
    setCategory(res.category);
    setEstimatedPriceCzk(res.estimatedPriceCzk);
    if (res.description) {
      setDescription(res.description);
    }

    const updated: ItemEntity = {
      ...item,
      title: res.title,
      category: res.category,
      estimatedPriceCzk: res.estimatedPriceCzk,
      numericPriceCzk: res.numericPrice,
      description: res.description || item.description,
      webReferencesJson: JSON.stringify(res.webReferences || []),
      lastModifiedTimestamp: Date.now(),
      syncStatus: "PENDING_UPLOAD",
    };

    StorageService.saveItem(
      updated,
      settings.currentAuthor,
      `Obnoveno dřívější AI ocenění "${res.title}"`
    );
    setItem(updated);
    setLogs(StorageService.getLogsForItem(itemId));
    setAnalysisHistory(StorageService.getAnalysisHistory(itemId));
    setSaveToast(`Obnoveno ocenění ze dne ${new Date(historical.timestamp).toLocaleDateString("cs-CZ")}!`);
    setTimeout(() => setSaveToast(null), 2500);
  };

  const handleApplyAiResult = (result: AiAnalysisResult) => {
    setTitle(result.title);
    setCategory(result.category);
    setEstimatedPriceCzk(result.estimatedPriceCzk);
    if (result.description) {
      setDescription(result.description);
    }

    const updated: ItemEntity = {
      ...item,
      title: result.title,
      category: result.category,
      estimatedPriceCzk: result.estimatedPriceCzk,
      numericPriceCzk: result.numericPrice,
      description: result.description || item.description,
      webReferencesJson: JSON.stringify(result.webReferences || []),
      lastModifiedTimestamp: Date.now(),
      syncStatus: "PENDING_UPLOAD",
    };

    StorageService.saveItem(
      updated,
      settings.currentAuthor,
      "Aplikovány výsledky Gemini AI analýzy"
    );
    setItem(updated);
    setLogs(StorageService.getLogsForItem(itemId));
    setAnalysisHistory(StorageService.getAnalysisHistory(itemId));

    setSaveToast("AI analýza aplikována!");
    setTimeout(() => setSaveToast(null), 2500);
  };

  const webReferences: string[] = (() => {
    try {
      return JSON.parse(item.webReferencesJson || "[]");
    } catch {
      return [];
    }
  })();

  const extraPhotos: string[] = (() => {
    try {
      return JSON.parse(item.extraImagePathsJson || "[]");
    } catch {
      return [];
    }
  })();

  return (
    <div className="min-h-screen bg-[#0B0E14] pb-24 text-white">
      {/* Top Bar */}
      <header className="sticky top-0 z-30 bg-[#0B0E14]/90 backdrop-blur-md border-b border-[#7C5CFC]/20 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button
            onClick={onNavigateBack}
            className="flex items-center gap-1.5 text-xs text-[#8A99AD] hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Katalog</span>
          </button>

          <h2 className="text-sm font-bold text-white truncate max-w-[200px] text-center">
            {title || "Detail nálezu"}
          </h2>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPdf}
              className="p-2 rounded-xl text-[#A58FFF] hover:bg-[#7C5CFC]/10 transition-colors"
              title="Stáhnout PDF protokol"
            >
              <FileText className="w-4 h-4" />
            </button>

            <button
              onClick={handleShare}
              className="p-2 rounded-xl text-[#00F2FE] hover:bg-[#00F2FE]/10 transition-colors"
              title="Sdílet nález"
            >
              <Share2 className="w-4 h-4" />
            </button>

            <button
              onClick={handleDelete}
              className="p-2 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors"
              title="Smazat nález"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#7C5CFC] to-[#00F2FE] text-white text-xs font-bold hover:brightness-110 active:scale-95 transition-all shadow-[0_0_12px_rgba(124,92,252,0.3)]"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Uložit</span>
            </button>
          </div>
        </div>
      </header>

      {/* Toast */}
      {saveToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-emerald-500 text-black text-xs font-bold rounded-full shadow-lg flex items-center gap-1.5 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4" />
          <span>{saveToast}</span>
        </div>
      )}

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Photo Gallery Strip */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#8A99AD]">
              Fotografie nálezu
            </span>
            <button
              onClick={() => onRequestReshoot(item.id)}
              className="text-xs text-[#00F2FE] hover:underline flex items-center gap-1"
            >
              <Camera className="w-3.5 h-3.5" />
              Vyfotit další snímek (detail/punc)
            </button>
          </div>

          <div className="flex items-center gap-3 overflow-x-auto pb-2">
            {/* Primary Photo */}
            <div className="relative w-44 h-44 rounded-2xl overflow-hidden bg-[#131A2A] border-2 border-[#7C5CFC]/50 flex-shrink-0 shadow-lg">
              {item.imageLocalPath ? (
                <img
                  src={item.imageLocalPath}
                  alt="Primární snímek"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-slate-500">
                  Bez fotky
                </div>
              )}
              <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full bg-black/70 text-[10px] font-mono text-[#00F2FE] border border-[#00F2FE]/30">
                Hlavní foto
              </span>
            </div>

            {/* Secondary Photo */}
            {item.secondaryImageLocalPath ? (
              <div className="relative w-44 h-44 rounded-2xl overflow-hidden bg-[#131A2A] border-2 border-[#00F2FE]/50 flex-shrink-0 shadow-lg">
                <img
                  src={item.secondaryImageLocalPath}
                  alt="Doplňkový detail"
                  className="w-full h-full object-cover"
                />
                <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full bg-black/70 text-[10px] font-mono text-[#00F2FE] border border-[#00F2FE]/30">
                  Detail / Punc
                </span>
              </div>
            ) : (
              <button
                onClick={() => onRequestReshoot(item.id)}
                className="w-44 h-44 rounded-2xl border-2 border-dashed border-[#7C5CFC]/40 hover:border-[#00F2FE] bg-[#131A2A]/40 flex flex-col items-center justify-center gap-2 text-[#8A99AD] hover:text-[#00F2FE] transition-colors flex-shrink-0"
              >
                <div className="w-10 h-10 rounded-full bg-[#7C5CFC]/15 flex items-center justify-center">
                  <Plus className="w-5 h-5 text-[#00F2FE]" />
                </div>
                <span className="text-xs font-semibold">Přidat 2. snímek</span>
                <span className="text-[10px] text-slate-400">Punc, značka, štítek</span>
              </button>
            )}

            {/* Extra photos */}
            {extraPhotos.map((photo, i) => (
              <div
                key={i}
                className="relative w-44 h-44 rounded-2xl overflow-hidden bg-[#131A2A] border border-slate-700 flex-shrink-0"
              >
                <img src={photo} alt={`Extra ${i + 1}`} className="w-full h-full object-cover" />
                <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full bg-black/70 text-[10px] font-mono text-slate-300">
                  Foto {i + 3}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* AI Action Card */}
        <div className="p-5 rounded-2xl bg-gradient-to-r from-[#182232] via-[#131A2A] to-[#182232] border border-[#7C5CFC]/40 shadow-[0_0_25px_rgba(124,92,252,0.15)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#7C5CFC] to-[#00F2FE] p-[1.5px] flex items-center justify-center">
              <div className="w-full h-full bg-[#131A2A] rounded-[14px] flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-[#00F2FE]" />
              </div>
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Gemini AI Analýza & Ocenění
                {item.secondaryImageLocalPath && (
                  <span className="text-[10px] font-normal px-2 py-0.5 rounded bg-[#00F2FE]/15 text-[#00F2FE]">
                    2 fotografie k dispozici
                  </span>
                )}
              </h3>
              <p className="text-xs text-[#8A99AD]">
                Aktuální odhad: <span className="font-mono font-bold text-[#00F2FE]">{estimatedPriceCzk}</span>
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsAiDialogOpen(true)}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#7C5CFC] to-[#00F2FE] text-white text-xs font-bold hover:brightness-110 active:scale-95 transition-all shadow-[0_0_15px_rgba(124,92,252,0.3)] flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-[#00F2FE]" />
            Otevřít AI analýzu
          </button>
        </div>

        {/* Core Attributes Form */}
        <section className="bg-[#131A2A] rounded-2xl border border-[#7C5CFC]/20 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#8A99AD]">
              Základní údaje
            </span>
            <div className="flex items-center gap-2">
              <PillBadge
                label={item.author === "Husband" ? "Manžel" : item.author === "Wife" ? "Manželka" : item.author}
                variant={item.author === "Husband" ? "cyan" : "orange"}
              />
              <PillBadge
                label={item.syncStatus === "SYNCED" ? "Synchronizováno" : "Čeká na synchronizaci"}
                variant={item.syncStatus === "SYNCED" ? "success" : "neutral"}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Title */}
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-medium text-[#8A99AD]">Název položky</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 bg-[#0B0E14] border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-[#7C5CFC]"
              />
            </div>

            {/* Category */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-[#8A99AD]">Kategorie</label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Starožitnosti, Nábytek..."
                className="w-full px-3 py-2 bg-[#0B0E14] border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-[#7C5CFC]"
              />
            </div>

            {/* Estimated Price */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-[#8A99AD]">Odhadovaná tržní cena</label>
              <input
                type="text"
                value={estimatedPriceCzk}
                onChange={(e) => setEstimatedPriceCzk(e.target.value)}
                placeholder="např. 3 500 Kč"
                className="w-full px-3 py-2 bg-[#0B0E14] border border-slate-800 rounded-xl text-sm text-[#00F2FE] font-mono font-bold focus:outline-none focus:border-[#00F2FE]"
              />
            </div>

            {/* Status Switcher */}
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-medium text-[#8A99AD]">Stav položky v evidenci</label>
              <div className="grid grid-cols-3 gap-2">
                {(["ACTIVE", "ACQUIRED", "ARCHIVED"] as ItemStatusType[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatus(s)}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                      status === s
                        ? s === "ACTIVE"
                          ? "bg-emerald-500/20 border-emerald-500 text-emerald-300"
                          : s === "ACQUIRED"
                          ? "bg-[#00F2FE]/20 border-[#00F2FE] text-[#00F2FE]"
                          : "bg-slate-700 border-slate-500 text-slate-200"
                        : "bg-[#0B0E14] border-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    {s === "ACTIVE" ? "Aktivní" : s === "ACQUIRED" ? "Získáno" : "Archivováno"}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-medium text-[#8A99AD]">Popis, původ a poznámky</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Podrobnější záznam o stavu, materiálu a umístění..."
                className="w-full px-3 py-2 bg-[#0B0E14] border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-[#7C5CFC] resize-none"
              />
            </div>
          </div>
        </section>

        {/* GPS Location & Map link */}
        <section className="bg-[#131A2A] rounded-2xl border border-[#7C5CFC]/20 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#00F2FE]/15 border border-[#00F2FE]/30 flex items-center justify-center text-[#00F2FE] flex-shrink-0 mt-0.5">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Lokalita nálezu (GPS)</h4>
              {item.latitude && item.longitude ? (
                <p className="text-xs text-[#8A99AD] font-mono mt-0.5">
                  {item.latitude.toFixed(5)}°N, {item.longitude.toFixed(5)}°E
                  {item.altitude && ` • ${Math.round(item.altitude)} m n.m.`}
                  {item.gpsAccuracy && ` (přesnost ±${Math.round(item.gpsAccuracy)}m)`}
                </p>
              ) : (
                <p className="text-xs text-slate-500 mt-0.5">Souřadnice nebyly zaznamenány</p>
              )}
            </div>
          </div>

          {item.latitude && item.longitude ? (
            <div className="flex flex-wrap items-center gap-2">
              <a
                href={item.googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${item.latitude},${item.longitude}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#182232] border border-[#7C5CFC]/30 text-xs font-semibold text-[#00F2FE] hover:bg-[#1E2B3E] transition-colors"
                title="Otevřít v aplikaci Google Mapy"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Google Mapy</span>
              </a>
              <a
                href={`https://mapy.cz/zakladni?x=${item.longitude}&y=${item.latitude}&z=17&source=coor&id=${item.longitude}%2C${item.latitude}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-900/40 border border-emerald-500/40 text-xs font-semibold text-emerald-300 hover:bg-emerald-800/50 transition-colors"
                title="Otevřít v aplikaci Mapy.cz"
              >
                <Compass className="w-3.5 h-3.5 text-emerald-400" />
                <span>Mapy.cz</span>
              </a>
            </div>
          ) : null}
        </section>

        {/* Web references if any */}
        {webReferences.length > 0 && (
          <section className="bg-[#131A2A] rounded-2xl border border-[#7C5CFC]/20 p-5 space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#8A99AD]">
              Srovnávací aukce & odkazy
            </span>
            <div className="flex flex-wrap gap-2">
              {webReferences.map((ref, idx) => (
                <a
                  key={idx}
                  href={ref}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0B0E14] border border-slate-800 text-xs text-[#00F2FE] hover:border-[#00F2FE]"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span className="truncate max-w-[240px]">{ref}</span>
                </a>
              ))}
            </div>
          </section>
        )}

        {/* AI Analysis History - Every analysis is automatically saved locally */}
        <section className="bg-[#131A2A] rounded-2xl border border-[#7C5CFC]/20 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#00F2FE]" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#8A99AD]">
                Automatická historie AI analýz & ocenění
              </h4>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-[#00F2FE]/10 border border-[#00F2FE]/30 text-[10px] font-semibold text-[#00F2FE]">
              Uloženo automaticky
            </span>
          </div>

          <p className="text-xs text-[#8A99AD] leading-relaxed">
            Každé dotázání na Gemini AI a ocenění je automaticky uloženo do lokální paměti vašeho zařízení. Můžete se tak kdykoliv vrátit k předchozím odhadům.
          </p>

          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
            {analysisHistory.length > 0 ? (
              analysisHistory.map((hist) => (
                <div
                  key={hist.id}
                  className="p-3.5 rounded-xl bg-[#0B0E14] border border-[#7C5CFC]/15 hover:border-[#7C5CFC]/40 transition-all space-y-2 text-xs"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-bold text-slate-100">{hist.result.title}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        Kategorie: <span className="text-slate-300 font-medium">{hist.result.category}</span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="font-mono font-extrabold text-[#00F2FE] text-sm">
                        {hist.result.estimatedPriceCzk}
                      </div>
                      <div className="text-[9px] text-slate-500 mt-0.5">
                        {new Date(hist.timestamp).toLocaleDateString("cs-CZ")} v {new Date(hist.timestamp).toLocaleTimeString("cs-CZ", { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>

                  {hist.promptText && (
                    <div className="text-[11px] text-[#A58FFF] bg-[#131A2A]/40 px-2 py-1.5 rounded-lg border border-slate-800 font-mono">
                      <span className="text-[9px] uppercase text-slate-500 block mb-0.5">Použitá instrukce:</span>
                      "{hist.promptText}"
                    </div>
                  )}

                  {hist.result.description && (
                    <div className="text-[11px] text-slate-400 leading-relaxed bg-black/20 p-2 rounded-lg border border-slate-900">
                      {hist.result.description}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
                    <span className="text-[10px] italic text-slate-500">
                      Důvod: "{hist.result.reasoning || "Neuveden"}"
                    </span>
                    <button
                      onClick={() => handleRestoreAnalysis(hist)}
                      className="px-2.5 py-1 rounded bg-[#7C5CFC]/20 hover:bg-[#7C5CFC] border border-[#7C5CFC]/50 text-white hover:text-white text-[10px] font-bold transition-all active:scale-95"
                    >
                      Aplikovat tento odhad
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 italic">Zatím nebyly spuštěny žádné AI analýzy pro tento nález.</p>
            )}
          </div>
        </section>

        {/* History / Audit Log */}
        <section className="bg-[#131A2A] rounded-2xl border border-[#7C5CFC]/20 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-[#A58FFF]" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#8A99AD]">
              Historie změn & Synchronizační audit
            </h4>
          </div>

          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {logs.length > 0 ? (
              logs.map((log) => (
                <div
                  key={log.id}
                  className="p-2.5 rounded-xl bg-[#0B0E14] border border-slate-800/80 flex items-start justify-between text-xs gap-3"
                >
                  <div className="space-y-0.5">
                    <p className="text-slate-200">{log.changeDescription}</p>
                    <div className="flex items-center gap-2 text-[10px] text-slate-500">
                      <span className="flex items-center gap-1">
                        <User className="w-2.5 h-2.5" />
                        {log.author}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {new Date(log.timestamp).toLocaleString("cs-CZ")}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500">Zatím žádné zaznamenané změny.</p>
            )}
          </div>
        </section>
      </main>

      {/* AI Analysis Dialog */}
      <AiAnalysisDialog
        item={item}
        isOpen={isAiDialogOpen}
        onClose={() => setIsAiDialogOpen(false)}
        onApplyResult={handleApplyAiResult}
        onRequestReshoot={onRequestReshoot}
      />
    </div>
  );
};

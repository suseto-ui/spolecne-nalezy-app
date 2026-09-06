import React, { useState, useEffect } from "react";
import {
  Sparkles,
  X,
  Camera,
  AlertTriangle,
  Check,
  ExternalLink,
  Plus,
  Trash2,
  HelpCircle,
} from "lucide-react";
import { ItemEntity, PromptPresetEntity, AiAnalysisResult } from "../types";
import { StorageService } from "../services/storage";
import { analyzeItem } from "../services/aiAnalysis";

interface AiAnalysisDialogProps {
  item: ItemEntity;
  isOpen: boolean;
  onClose: () => void;
  onApplyResult: (result: AiAnalysisResult) => void;
  onRequestReshoot: (itemId: string) => void;
}

export const AiAnalysisDialog: React.FC<AiAnalysisDialogProps> = ({
  item,
  isOpen,
  onClose,
  onApplyResult,
  onRequestReshoot,
}) => {
  const [presets, setPresets] = useState<PromptPresetEntity[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string>("");
  const [customPrompt, setCustomPrompt] = useState<string>("Odhadni tržní cenu tohoto předmětu.");
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<AiAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // New preset creation modal/input
  const [showNewPresetInput, setShowNewPresetInput] = useState<boolean>(false);
  const [newPresetTitle, setNewPresetTitle] = useState<string>("");

  useEffect(() => {
    if (isOpen) {
      const storedPresets = StorageService.getPresets();
      setPresets(storedPresets);
      const defaultPreset = storedPresets.find((p) => p.isDefault) || storedPresets[0];
      if (defaultPreset) {
        setSelectedPresetId(defaultPreset.id);
        setCustomPrompt(defaultPreset.promptText);
      }
      setAnalysisResult(null);
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelectPreset = (presetId: string) => {
    setSelectedPresetId(presetId);
    const found = presets.find((p) => p.id === presetId);
    if (found) {
      setCustomPrompt(found.promptText);
    }
  };

  const handleSaveAsPreset = () => {
    if (!newPresetTitle.trim()) return;
    const created = StorageService.savePreset(newPresetTitle, customPrompt);
    const updated = StorageService.getPresets();
    setPresets(updated);
    setSelectedPresetId(created.id);
    setShowNewPresetInput(false);
    setNewPresetTitle("");
  };

  const handleDeletePreset = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    StorageService.deletePreset(id);
    const updated = StorageService.getPresets();
    setPresets(updated);
    if (selectedPresetId === id) {
      const fallback = updated[0];
      if (fallback) {
        setSelectedPresetId(fallback.id);
        setCustomPrompt(fallback.promptText);
      }
    }
  };

  const runAnalysis = async () => {
    setIsAnalyzing(true);
    setError(null);

    try {
      const result = await analyzeItem(
        item.imageLocalPath,
        item.secondaryImageLocalPath,
        customPrompt
      );
      setAnalysisResult(result);

      // Save every single analysis run automatically in history
      StorageService.saveAnalysisRun(item.id, customPrompt, result);
    } catch (err: any) {
      console.error("AI Analysis error:", err);
      setError(err?.message || "Nepodařilo se dokončit analýzu");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-[#131A2A] border border-[#7C5CFC]/40 rounded-3xl p-6 shadow-[0_10px_40px_rgba(0,0,0,0.6)] my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#7C5CFC]/20">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#7C5CFC]/20 border border-[#7C5CFC]/40 flex items-center justify-center text-[#00F2FE]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Gemini AI Analýza</h2>
              <p className="text-xs text-[#8A99AD]">Identifikace a tržní ocenění předmětu</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Photos Preview */}
        <div className="mt-4 flex items-center gap-3 p-3 bg-[#0B0E14] rounded-2xl border border-slate-800">
          <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-slate-900 border border-[#7C5CFC]/30 flex-shrink-0">
            {item.imageLocalPath ? (
              <img
                src={item.imageLocalPath}
                alt="Primární foto"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs text-slate-500">
                Bez fota
              </div>
            )}
            <span className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/70 rounded text-[9px] font-mono text-[#00F2FE]">
              Foto 1
            </span>
          </div>

          {item.secondaryImageLocalPath ? (
            <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-slate-900 border border-[#00F2FE]/40 flex-shrink-0">
              <img
                src={item.secondaryImageLocalPath}
                alt="Doplňkové foto"
                className="w-full h-full object-cover"
              />
              <span className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/70 rounded text-[9px] font-mono text-[#00F2FE]">
                Detail 2
              </span>
            </div>
          ) : (
            <button
              onClick={() => {
                onClose();
                onRequestReshoot(item.id);
              }}
              className="w-20 h-20 rounded-xl border border-dashed border-[#7C5CFC]/40 hover:border-[#00F2FE] bg-[#131A2A]/50 flex flex-col items-center justify-center gap-1 text-[#8A99AD] hover:text-[#00F2FE] transition-colors flex-shrink-0"
              title="Vyfotit doplňkový snímek (značka, punc, detail)"
            >
              <Camera className="w-5 h-5" />
              <span className="text-[10px] text-center leading-tight">Přidat detail</span>
            </button>
          )}

          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-white truncate">{item.title}</h4>
            <p className="text-xs text-[#8A99AD] truncate">{item.category} • {item.estimatedPriceCzk}</p>
            {item.secondaryImageLocalPath && (
              <span className="inline-block mt-1 text-[11px] text-emerald-400 font-medium">
                ✓ Připraveno 2-fázové multi-foto hodnocení
              </span>
            )}
          </div>
        </div>

        {/* Prompt Presets & Custom Prompt */}
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-[#8A99AD] uppercase tracking-wider">
              Předvolba dotazu pro AI
            </label>
            <button
              onClick={() => setShowNewPresetInput(!showNewPresetInput)}
              className="text-xs text-[#00F2FE] hover:underline flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              Uložit aktuální prompt
            </button>
          </div>

          {showNewPresetInput && (
            <div className="p-3 bg-[#182232] rounded-xl border border-[#00F2FE]/30 flex gap-2 items-center">
              <input
                type="text"
                value={newPresetTitle}
                onChange={(e) => setNewPresetTitle(e.target.value)}
                placeholder="Název nové předvolby..."
                className="flex-1 px-3 py-1.5 bg-[#0B0E14] border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-[#00F2FE]"
              />
              <button
                onClick={handleSaveAsPreset}
                className="px-3 py-1.5 bg-[#00F2FE] text-[#0B0E14] rounded-lg text-xs font-bold hover:brightness-110"
              >
                Uložit
              </button>
            </div>
          )}

          {/* Preset buttons */}
          <div className="flex flex-wrap gap-2">
            {presets.map((p) => (
              <button
                key={p.id}
                onClick={() => handleSelectPreset(p.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                  selectedPresetId === p.id
                    ? "bg-[#7C5CFC]/20 border-[#7C5CFC] text-white shadow-[0_0_12px_rgba(124,92,252,0.3)]"
                    : "bg-[#0B0E14] border-slate-800 text-[#8A99AD] hover:border-slate-700 hover:text-white"
                }`}
              >
                <span>{p.title}</span>
                {!p.isDefault && (
                  <span
                    onClick={(e) => handleDeletePreset(p.id, e)}
                    className="hover:text-red-400 p-0.5 rounded ml-1"
                    title="Smazat předvolbu"
                  >
                    <Trash2 className="w-3 h-3" />
                  </span>
                )}
              </button>
            ))}
          </div>

          <div>
            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              rows={3}
              placeholder="Zadejte specifický dotaz nebo instrukci pro Gemini AI..."
              className="w-full px-3 py-2 bg-[#0B0E14] border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-[#7C5CFC] resize-none"
            />
          </div>
        </div>

        {/* Action button */}
        <div className="mt-4">
          <button
            onClick={runAnalysis}
            disabled={isAnalyzing}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-[#7C5CFC] to-[#00F2FE] text-white text-sm font-bold flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(124,92,252,0.3)] hover:brightness-110 disabled:opacity-50 transition-all"
          >
            {isAnalyzing ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Gemini 2.5 Flash vyhodnocuje předmět...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-[#00F2FE]" />
                <span>Spustit AI Analýzu & Ocenění</span>
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Results section */}
        {analysisResult && (
          <div className="mt-5 space-y-4 pt-4 border-t border-[#7C5CFC]/20 animate-fadeIn">
            {/* Needs more info warning banner */}
            {analysisResult.status === "NEEDS_MORE_INFO" && (
              <div className="p-4 bg-amber-500/15 border border-amber-500/40 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-amber-500/20 rounded-xl text-amber-400 mt-0.5">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-amber-300">
                      Vyžadován doplňkový snímek (značka / punc)
                    </h4>
                    <p className="text-xs text-amber-200/80 mt-0.5">
                      {analysisResult.followUpPrompt ||
                        "Pro přesný odhad vyfoťte spodní stranu, výrobní punc nebo podpis autora."}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    onClose();
                    onRequestReshoot(item.id);
                  }}
                  className="px-4 py-2 bg-amber-500 text-black text-xs font-bold rounded-xl hover:brightness-110 flex items-center gap-2 flex-shrink-0 whitespace-nowrap shadow-[0_0_15px_rgba(245,158,11,0.3)]"
                >
                  <Camera className="w-4 h-4" />
                  Vyfotit doplňkový detail
                </button>
              </div>
            )}

            {/* AI Estimation Card */}
            <div className="p-4 bg-gradient-to-br from-[#182232] to-[#131A2A] rounded-2xl border border-[#7C5CFC]/40 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] uppercase font-mono tracking-wider text-[#A58FFF]">
                    Detekovaný název
                  </span>
                  <h3 className="text-base font-bold text-white">{analysisResult.title}</h3>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-mono tracking-wider text-[#00F2FE]">
                    Odhad tržní ceny
                  </span>
                  <div className="text-lg font-extrabold text-[#00F2FE] font-mono">
                    {analysisResult.estimatedPriceCzk}
                  </div>
                </div>
              </div>

              <div>
                <span className="text-[10px] uppercase font-mono tracking-wider text-[#8A99AD]">
                  Kategorie:
                </span>{" "}
                <span className="text-xs font-semibold text-slate-200">{analysisResult.category}</span>
              </div>

              {analysisResult.description && (
                <div>
                  <span className="text-[10px] uppercase font-mono tracking-wider text-[#8A99AD] block mb-1">
                    Popis artefaktu
                  </span>
                  <p className="text-xs text-slate-300 leading-relaxed bg-[#0B0E14] p-3 rounded-xl border border-slate-800">
                    {analysisResult.description}
                  </p>
                </div>
              )}

              {analysisResult.reasoning && (
                <div>
                  <span className="text-[10px] uppercase font-mono tracking-wider text-[#8A99AD] block mb-1">
                    Zdůvodnění AI
                  </span>
                  <p className="text-xs text-slate-400 italic">
                    "{analysisResult.reasoning}"
                  </p>
                </div>
              )}

              {analysisResult.webReferences && analysisResult.webReferences.length > 0 && (
                <div className="pt-2 border-t border-slate-800">
                  <span className="text-[10px] uppercase font-mono tracking-wider text-[#8A99AD] block mb-1">
                    Srovnávací reference
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {analysisResult.webReferences.map((url, idx) => (
                      <a
                        key={idx}
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-[#00F2FE] hover:underline"
                      >
                        <ExternalLink className="w-3 h-3" />
                        {url.replace(/^https?:\/\//, "").slice(0, 30)}...
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Apply button */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  onApplyResult(analysisResult);
                  onClose();
                }}
                className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-teal-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:brightness-110 shadow-[0_0_20px_rgba(16,185,129,0.3)]"
              >
                <Check className="w-4 h-4" />
                Použít výsledky AI na položku
              </button>
              <button
                onClick={onClose}
                className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Zavřít
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

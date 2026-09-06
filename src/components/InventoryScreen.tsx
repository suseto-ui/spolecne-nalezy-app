import React, { useState } from "react";
import {
  Search,
  Plus,
  LayoutGrid,
  List as ListIcon,
  MapPin,
  Sparkles,
  Camera,
  X,
  ChevronRight,
  TrendingUp,
  Smartphone,
  Download,
  FileText,
} from "lucide-react";
import { AppHeader } from "./common/AppHeader";
import { TechCard } from "./common/TechCard";
import { PillBadge } from "./common/PillBadge";
import { MobileDeployExportModal } from "./MobileDeployExportModal";
import { ItemEntity, ItemStatusType, UserSettings } from "../types";
import { PdfGeneratorService } from "../utils/pdfGenerator";

interface InventoryScreenProps {
  items: ItemEntity[];
  settings: UserSettings;
  onSelectItem: (id: string) => void;
  onAddNew: () => void;
  onNavigateSettings: () => void;
}

// Text highlight helper for real-time search match visualization
const HighlightMatch: React.FC<{ text: string; query: string }> = ({ text, query }) => {
  if (!query || !query.trim()) return <>{text}</>;
  const trimmed = query.trim();
  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === trimmed.toLowerCase() ? (
          <mark
            key={i}
            className="bg-[#7C5CFC]/40 text-[#00F2FE] px-0.5 rounded font-semibold"
          >
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
};

export const InventoryScreen: React.FC<InventoryScreenProps> = ({
  items,
  settings,
  onSelectItem,
  onAddNew,
  onNavigateSettings,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<ItemStatusType | "ALL">("ALL");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isDeployModalOpen, setIsDeployModalOpen] = useState<boolean>(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [pdfToast, setPdfToast] = useState<string | null>(null);

  const handleDownloadCatalog = async () => {
    try {
      setIsGeneratingPdf(true);
      setPdfToast("Připravuji PDF katalog všech nálezů...");
      await PdfGeneratorService.downloadInventoryReport(filteredItems);
      setPdfToast("PDF katalog úspěšně stažen!");
      setTimeout(() => setPdfToast(null), 3000);
    } catch (err) {
      console.error("Chyba při exportu PDF:", err);
      setPdfToast("Chyba: Nepodařilo se vygenerovat PDF.");
      setTimeout(() => setPdfToast(null), 3000);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Real-time filtering based on item title or description fields
  const query = searchQuery.trim().toLowerCase();
  const filteredItems = items.filter((item) => {
    const matchesSearch =
      !query ||
      item.title.toLowerCase().includes(query) ||
      (item.description && item.description.toLowerCase().includes(query));

    const matchesStatus = statusFilter === "ALL" || item.itemStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Calculate total price
  const totalValue = filteredItems.reduce((acc, curr) => acc + (curr.numericPriceCzk || 0), 0);

  return (
    <div className="min-h-screen bg-[#0B0E14] pb-28 text-white">
      <AppHeader
        title="Katalog nálezů"
        userName={settings.googleAccountName || settings.currentAuthor}
        onProfileClick={onNavigateSettings}
        onDeployMobileClick={() => setIsDeployModalOpen(true)}
        subtitle={`${filteredItems.length} z ${items.length} položek`}
      />

      <main className="max-w-5xl mx-auto px-4 py-5 space-y-5">
        {/* PDF Toast Notification */}
        {pdfToast && (
          <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-[#7C5CFC] border border-[#00F2FE]/40 text-white text-xs font-bold rounded-full shadow-[0_0_15px_rgba(124,92,252,0.5)] flex items-center gap-1.5 animate-fadeIn">
            <div className="w-1.5 h-1.5 rounded-full bg-[#00F2FE] animate-ping" />
            <span>{pdfToast}</span>
          </div>
        )}

        {/* Metric summary banner */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 rounded-2xl bg-[#131A2A] border border-[#7C5CFC]/20 flex items-center justify-between">
            <div>
              <span className="text-xs text-[#8A99AD] font-medium block">Položky v seznamu</span>
              <span className="text-2xl font-bold font-mono text-white">{filteredItems.length}</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#7C5CFC]/15 flex items-center justify-center text-[#A58FFF]">
              <Sparkles className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#131A2A] border border-[#00F2FE]/20 flex items-center justify-between">
            <div>
              <span className="text-xs text-[#8A99AD] font-medium block">Celková hodnota</span>
              <span className="text-xl sm:text-2xl font-bold font-mono text-[#00F2FE] truncate">
                {totalValue.toLocaleString("cs-CZ")} Kč
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-[#00F2FE]/15 flex items-center justify-center text-[#00F2FE]">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Mobile Deploy & APK Export banner */}
        <div className="p-3 sm:p-4 rounded-2xl bg-gradient-to-r from-[#131A2A] to-[#1A1F35] border border-[#00F2FE]/25 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#00F2FE]/15 border border-[#00F2FE]/30 flex items-center justify-center text-[#00F2FE] flex-shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                Nasadit na mobil & Exportovat instalační balíček
              </h4>
              <p className="text-[11px] text-[#8A99AD]">
                QR kód pro rychlou instalaci PWA nebo export projektu pro sestavení Android APK s Gemini API
              </p>
            </div>
          </div>
          <button
            id="btn-inventory-deploy-mobile"
            onClick={() => setIsDeployModalOpen(true)}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-gradient-to-r from-[#7C5CFC] to-[#00F2FE] text-white text-xs font-bold hover:brightness-110 shadow-[0_0_15px_rgba(124,92,252,0.35)] flex items-center justify-center gap-2 whitespace-nowrap transition-transform active:scale-95"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Otevřít instalaci / Export</span>
          </button>
        </div>

        {/* PDF Export Banner */}
        <div className="p-3 sm:p-4 rounded-2xl bg-gradient-to-r from-[#131A2A] to-[#1A1F35] border border-[#7C5CFC]/25 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#7C5CFC]/15 border border-[#7C5CFC]/30 flex items-center justify-center text-[#A58FFF] flex-shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                Generovat PDF report / katalog
              </h4>
              <p className="text-[11px] text-[#8A99AD]">
                Vytvořte a stáhněte si přehledný tištěný katalog s náhledy, cenami a detaily všech {filteredItems.length} aktuálně vyfiltrovaných položek.
              </p>
            </div>
          </div>
          <button
            id="btn-inventory-download-pdf"
            onClick={handleDownloadCatalog}
            disabled={isGeneratingPdf}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-[#7C5CFC] hover:bg-[#8A6FFF] text-white text-xs font-bold shadow-md flex items-center justify-center gap-2 whitespace-nowrap transition-transform active:scale-95 disabled:opacity-50"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>{isGeneratingPdf ? "Generování..." : "Stáhnout PDF katalog"}</span>
          </button>
        </div>

        {/* Search & Filter Controls */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            {/* Real-time Text Search Bar */}
            <div id="inventory-search-bar" className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8A99AD]" />
              <input
                id="inventory-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Hledat podle názvu nebo popisu předmětu..."
                className="w-full pl-10 pr-10 py-2.5 bg-[#131A2A] border border-[#7C5CFC]/25 focus:border-[#00F2FE] focus:ring-1 focus:ring-[#00F2FE]/40 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none transition-all shadow-inner"
              />
              {searchQuery && (
                <button
                  id="inventory-search-clear-btn"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white transition-colors"
                  title="Vymazat hledání"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* View Mode Toggle */}
            <div className="flex bg-[#131A2A] border border-[#7C5CFC]/20 rounded-xl p-1">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-lg text-xs transition-colors ${
                  viewMode === "grid" ? "bg-[#7C5CFC]/30 text-white" : "text-slate-400 hover:text-white"
                }`}
                title="Mřížka"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-1.5 rounded-lg text-xs transition-colors ${
                  viewMode === "list" ? "bg-[#7C5CFC]/30 text-white" : "text-slate-400 hover:text-white"
                }`}
                title="Seznam"
              >
                <ListIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Real-time search feedback indicator badge */}
          {query && (
            <div
              id="inventory-search-feedback"
              className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-[#7C5CFC]/15 border border-[#7C5CFC]/30 text-xs"
            >
              <div className="flex items-center gap-2 text-[#A58FFF] truncate">
                <Search className="w-3.5 h-3.5 text-[#00F2FE] flex-shrink-0" />
                <span className="truncate">
                  Filtr názvu a popisu: <strong className="text-[#00F2FE]">„{searchQuery.trim()}“</strong>
                </span>
              </div>
              <div className="flex items-center gap-2.5 flex-shrink-0">
                <span className="text-xs font-mono text-slate-300">
                  {filteredItems.length} {filteredItems.length === 1 ? "nález" : filteredItems.length < 5 ? "nálezy" : "nálezů"}
                </span>
                <button
                  onClick={() => setSearchQuery("")}
                  className="px-2 py-0.5 rounded-md bg-[#7C5CFC]/25 hover:bg-[#7C5CFC]/40 text-[#00F2FE] text-[11px] font-medium transition-colors"
                >
                  Zrušit
                </button>
              </div>
            </div>
          )}

          {/* Status Filter Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {[
              { id: "ALL", label: "Všechny" },
              { id: "ACTIVE", label: "Aktivní" },
              { id: "ACQUIRED", label: "Získáno" },
              { id: "ARCHIVED", label: "Archivováno" },
            ].map((chip) => (
              <button
                key={chip.id}
                onClick={() => setStatusFilter(chip.id as any)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border ${
                  statusFilter === chip.id
                    ? "bg-[#7C5CFC] border-[#7C5CFC] text-white shadow-[0_0_12px_rgba(124,92,252,0.4)]"
                    : "bg-[#131A2A] border-[#7C5CFC]/20 text-[#8A99AD] hover:border-[#7C5CFC]/50 hover:text-white"
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        {/* Item List / Grid */}
        {filteredItems.length === 0 ? (
          <div className="p-12 text-center bg-[#131A2A]/50 rounded-3xl border border-dashed border-[#7C5CFC]/30 my-6">
            <div className="w-16 h-16 rounded-2xl bg-[#7C5CFC]/15 flex items-center justify-center text-[#A58FFF] mx-auto mb-4">
              {query ? <Search className="w-8 h-8 text-[#00F2FE]" /> : <Camera className="w-8 h-8" />}
            </div>
            <h3 className="text-base font-bold text-white mb-1">
              {query
                ? `Žádné nálezy neodpovídají hledání „${searchQuery}“`
                : "Žádné nálezy neodpovídají vybranému filtru"}
            </h3>
            <p className="text-xs text-[#8A99AD] max-w-sm mx-auto mb-6">
              {query
                ? "Výraz nebyl nalezen v názvu ani v podrobném popisu žádného z evidovaných předmětů."
                : "Zkuste změnit filtr stavu nebo vyfoťte nový předmět do společného katalogu."}
            </p>
            {query ? (
              <button
                id="empty-clear-search-btn"
                onClick={() => setSearchQuery("")}
                className="px-5 py-2.5 rounded-xl bg-[#131A2A] border border-[#7C5CFC]/40 text-white text-xs font-bold hover:bg-[#1D263B] shadow-md inline-flex items-center gap-2"
              >
                <X className="w-4 h-4 text-[#00F2FE]" />
                Vymazat vyhledávání
              </button>
            ) : (
              <button
                onClick={onAddNew}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#7C5CFC] to-[#00F2FE] text-white text-xs font-bold hover:brightness-110 shadow-md inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Zaznamenat nový předmět
              </button>
            )}
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {filteredItems.map((item) => (
              <TechCard
                key={item.id}
                onClick={() => onSelectItem(item.id)}
                className="overflow-hidden flex flex-col justify-between group"
              >
                {/* Photo Header */}
                <div className="relative h-44 w-full bg-slate-900 overflow-hidden">
                  {item.imageLocalPath ? (
                    <img
                      src={item.imageLocalPath}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-slate-500">
                      Bez náhledu
                    </div>
                  )}

                  {/* Multi-photo indicator */}
                  {item.secondaryImageLocalPath && (
                    <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-black/75 backdrop-blur-md text-[10px] font-mono text-[#00F2FE] border border-[#00F2FE]/40">
                      2 fotky (detail)
                    </span>
                  )}

                  {/* Author badge */}
                  <div className="absolute top-2.5 left-2.5">
                    <PillBadge
                      label={item.author === "Husband" ? "Manžel" : item.author === "Wife" ? "Manželka" : item.author}
                      variant={item.author === "Husband" ? "cyan" : "orange"}
                    />
                  </div>

                  {/* GPS pill */}
                  {item.latitude && item.longitude && (
                    <div className="absolute bottom-2.5 left-2.5 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-sm text-[10px] font-mono text-slate-300 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-[#00F2FE]" />
                      <span>GPS</span>
                    </div>
                  )}
                </div>

                {/* Card Content */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-2">
                  <div>
                    <div className="flex items-center justify-between text-[11px] text-[#8A99AD] mb-1">
                      <span>{item.category || "Nezatříděno"}</span>
                      <span>{new Date(item.timestamp).toLocaleDateString("cs-CZ")}</span>
                    </div>

                    <h3 className="text-sm font-bold text-white group-hover:text-[#00F2FE] transition-colors line-clamp-1">
                      <HighlightMatch text={item.title} query={searchQuery} />
                    </h3>

                    <p className="text-xs text-[#8A99AD] line-clamp-2 mt-1">
                      <HighlightMatch text={item.description || "Bez podrobného popisu."} query={searchQuery} />
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-[#8A99AD] block">Odhad ceny:</span>
                      <span className="text-sm font-bold font-mono text-[#00F2FE]">
                        {item.estimatedPriceCzk}
                      </span>
                    </div>

                    <PillBadge
                      label={item.itemStatus === "ACTIVE" ? "Aktivní" : item.itemStatus === "ACQUIRED" ? "Získáno" : "Archiv"}
                      variant={item.itemStatus === "ACTIVE" ? "success" : item.itemStatus === "ACQUIRED" ? "cyan" : "neutral"}
                    />
                  </div>
                </div>
              </TechCard>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredItems.map((item) => (
              <TechCard
                key={item.id}
                onClick={() => onSelectItem(item.id)}
                className="p-3 flex items-center gap-3.5 hover:border-[#7C5CFC]/50 group"
              >
                <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-slate-900 flex-shrink-0">
                  {item.imageLocalPath ? (
                    <img
                      src={item.imageLocalPath}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-500">
                      Bez fota
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h4 className="text-xs font-bold text-white group-hover:text-[#00F2FE] transition-colors truncate">
                      <HighlightMatch text={item.title} query={searchQuery} />
                    </h4>
                    <PillBadge
                      label={item.author === "Husband" ? "M" : "Ž"}
                      variant={item.author === "Husband" ? "cyan" : "orange"}
                      className="px-1.5 text-[9px]"
                    />
                  </div>

                  <p className="text-[11px] text-[#8A99AD] truncate">
                    <HighlightMatch text={item.description || item.category} query={searchQuery} />
                  </p>

                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs font-mono font-bold text-[#00F2FE]">
                      {item.estimatedPriceCzk}
                    </span>
                    <PillBadge
                      label={item.itemStatus === "ACTIVE" ? "Aktivní" : item.itemStatus === "ACQUIRED" ? "Získáno" : "Archiv"}
                      variant={item.itemStatus === "ACTIVE" ? "success" : item.itemStatus === "ACQUIRED" ? "cyan" : "neutral"}
                      className="text-[9px] py-0"
                    />
                  </div>
                </div>

                <ChevronRight className="w-4 h-4 text-[#8A99AD] group-hover:text-[#00F2FE] group-hover:translate-x-0.5 transition-all" />
              </TechCard>
            ))}
          </div>
        )}
      </main>

      {/* Floating Action Button for Camera */}
      <button
        onClick={onAddNew}
        className="fixed bottom-20 right-5 z-40 px-5 py-3 rounded-full bg-gradient-to-r from-[#7C5CFC] to-[#00F2FE] text-white text-xs font-bold shadow-[0_0_25px_rgba(124,92,252,0.45)] hover:brightness-110 active:scale-95 transition-all flex items-center gap-2"
        title="Přidat nový nález"
      >
        <Plus className="w-4 h-4" />
        <span>Nový nález</span>
      </button>

      {/* Mobile Deploy & APK Export Dialog */}
      <MobileDeployExportModal
        isOpen={isDeployModalOpen}
        onClose={() => setIsDeployModalOpen(false)}
      />
    </div>
  );
};

import React from "react";
import {
  Package,
  Camera,
  MapPin,
  RefreshCw,
  ArrowRight,
  TrendingUp,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { AppHeader } from "./common/AppHeader";
import { TechCard } from "./common/TechCard";
import { ItemEntity, UserSettings } from "../types";

interface LandingScreenProps {
  items: ItemEntity[];
  settings: UserSettings;
  onNavigate: (screen: "inventory" | "camera" | "map" | "settings") => void;
}

export const LandingScreen: React.FC<LandingScreenProps> = ({
  items,
  settings,
  onNavigate,
}) => {
  const activeCount = items.filter((i) => i.itemStatus === "ACTIVE").length;
  const acquiredCount = items.filter((i) => i.itemStatus === "ACQUIRED").length;
  const totalValue = items.reduce((acc, curr) => acc + (curr.numericPriceCzk || 0), 0);

  return (
    <div className="min-h-screen bg-[#0B0E14] pb-24">
      <AppHeader
        title="Společné nálezy"
        userName={settings.googleAccountName || settings.currentAuthor}
        onProfileClick={() => onNavigate("settings")}
        subtitle="Inventář nálezů a AI oceňování"
      />

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Welcome Banner */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#131A2A] via-[#182232] to-[#131A2A] border border-[#7C5CFC]/30 p-6 md:p-8 shadow-[0_8px_30px_rgba(0,0,0,0.3)]">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-[#7C5CFC]/20 via-[#00F2FE]/10 to-transparent rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#7C5CFC]/20 border border-[#7C5CFC]/40 text-[#A58FFF] text-xs font-semibold uppercase tracking-wider mb-4">
              <Sparkles className="w-3.5 h-3.5 text-[#00F2FE]" />
              Gemini AI • Multi-foto Analýza
            </div>

            <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight mb-3">
              Společná evidence & ocenění nálezů
            </h2>

            <p className="text-sm text-[#8A99AD] leading-relaxed mb-6">
              Zaznamenávejte zajímavé předměty s přesnou GPS polohou, fotografiemi a okamžitým
              odhadem tržní ceny v CZK s podporou Gemini 2.5 Flash.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => onNavigate("camera")}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#7C5CFC] to-[#00F2FE] text-white text-sm font-bold shadow-[0_0_20px_rgba(124,92,252,0.4)] hover:brightness-110 active:scale-95 transition-all"
              >
                <Camera className="w-4 h-4" />
                Nový záznam
              </button>

              <button
                onClick={() => onNavigate("inventory")}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#182232] border border-[#7C5CFC]/30 hover:border-[#7C5CFC]/60 text-white text-sm font-semibold hover:bg-[#1E2B3E] transition-all"
              >
                Otevřít katalog
                <ArrowRight className="w-4 h-4 text-[#00F2FE]" />
              </button>
            </div>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-[#131A2A] rounded-2xl border border-[#7C5CFC]/20 p-4">
            <span className="text-xs text-[#8A99AD] font-medium block mb-1">Všechny položky</span>
            <span className="text-2xl font-bold text-white font-mono">{items.length}</span>
          </div>

          <div className="bg-[#131A2A] rounded-2xl border border-emerald-500/20 p-4">
            <span className="text-xs text-emerald-400 font-medium block mb-1">Aktivní k řešení</span>
            <span className="text-2xl font-bold text-emerald-300 font-mono">{activeCount}</span>
          </div>

          <div className="bg-[#131A2A] rounded-2xl border border-[#00F2FE]/20 p-4">
            <span className="text-xs text-[#00F2FE] font-medium block mb-1">Získáno / Koupě</span>
            <span className="text-2xl font-bold text-cyan-200 font-mono">{acquiredCount}</span>
          </div>

          <div className="bg-[#131A2A] rounded-2xl border border-[#7C5CFC]/20 p-4">
            <span className="text-xs text-[#A58FFF] font-medium block mb-1">Odhad hodnoty</span>
            <span className="text-xl font-bold text-white font-mono truncate">
              {totalValue.toLocaleString("cs-CZ")} Kč
            </span>
          </div>
        </div>

        {/* Quick Access Tiles */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TechCard
            onClick={() => onNavigate("inventory")}
            className="p-5 flex items-start justify-between group hover:border-[#7C5CFC]/60 transition-all"
          >
            <div className="space-y-1">
              <div className="w-10 h-10 rounded-xl bg-[#7C5CFC]/15 border border-[#7C5CFC]/30 flex items-center justify-center text-[#A58FFF] mb-3 group-hover:scale-105 transition-transform">
                <Package className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white group-hover:text-[#00F2FE] transition-colors">
                Katalog nálezů
              </h3>
              <p className="text-xs text-[#8A99AD]">
                Prohlížejte a filtrujte nalezené položky, spravujte stavy a cenové odhady.
              </p>
            </div>
            <ArrowRight className="w-5 h-5 text-[#8A99AD] group-hover:text-[#00F2FE] group-hover:translate-x-1 transition-all mt-2" />
          </TechCard>

          <TechCard
            onClick={() => onNavigate("camera")}
            className="p-5 flex items-start justify-between group hover:border-[#00F2FE]/60 transition-all"
          >
            <div className="space-y-1">
              <div className="w-10 h-10 rounded-xl bg-[#00F2FE]/15 border border-[#00F2FE]/30 flex items-center justify-center text-[#00F2FE] mb-3 group-hover:scale-105 transition-transform">
                <Camera className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white group-hover:text-[#00F2FE] transition-colors">
                Fotoaparát & GPS
              </h3>
              <p className="text-xs text-[#8A99AD]">
                Rychle vyfoťte předmět, získejte GPS souřadnice a spusťte okamžitou AI analýzu.
              </p>
            </div>
            <ArrowRight className="w-5 h-5 text-[#8A99AD] group-hover:text-[#00F2FE] group-hover:translate-x-1 transition-all mt-2" />
          </TechCard>

          <TechCard
            onClick={() => onNavigate("map")}
            className="p-5 flex items-start justify-between group hover:border-[#7C5CFC]/60 transition-all"
          >
            <div className="space-y-1">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#7C5CFC]/20 to-[#00F2FE]/20 border border-[#7C5CFC]/30 flex items-center justify-center text-[#00F2FE] mb-3 group-hover:scale-105 transition-transform">
                <MapPin className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white group-hover:text-[#00F2FE] transition-colors">
                Mapa nálezů
              </h3>
              <p className="text-xs text-[#8A99AD]">
                Interaktivní mapa s barevně rozlišenými body podle autora (Manžel / Manželka).
              </p>
            </div>
            <ArrowRight className="w-5 h-5 text-[#8A99AD] group-hover:text-[#00F2FE] group-hover:translate-x-1 transition-all mt-2" />
          </TechCard>

          <TechCard
            onClick={() => onNavigate("settings")}
            className="p-5 flex items-start justify-between group hover:border-[#7C5CFC]/60 transition-all"
          >
            <div className="space-y-1">
              <div className="w-10 h-10 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-300 mb-3 group-hover:scale-105 transition-transform">
                <RefreshCw className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white group-hover:text-[#00F2FE] transition-colors">
                Synchronizace & Nastavení
              </h3>
              <p className="text-xs text-[#8A99AD]">
                Správa profilů, Google Drive složky, řešení konfliktů verzí a předvoleb promptů.
              </p>
            </div>
            <ArrowRight className="w-5 h-5 text-[#8A99AD] group-hover:text-[#00F2FE] group-hover:translate-x-1 transition-all mt-2" />
          </TechCard>
        </div>
      </main>
    </div>
  );
};

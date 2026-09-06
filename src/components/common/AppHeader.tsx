import React from "react";
import { User, Sparkles, Smartphone } from "lucide-react";

interface AppHeaderProps {
  title: string;
  userName?: string;
  onProfileClick?: () => void;
  onDeployMobileClick?: () => void;
  subtitle?: string;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  title,
  userName = "Uživatel",
  onProfileClick,
  onDeployMobileClick,
  subtitle,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-[#0B0E14]/90 backdrop-blur-md border-b border-[#7C5CFC]/20 px-4 py-3">
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#7C5CFC] to-[#00F2FE] p-[1.5px] flex items-center justify-center shadow-[0_0_12px_rgba(124,92,252,0.3)]">
            <div className="w-full h-full bg-[#131A2A] rounded-[10px] flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-[#00F2FE]" />
            </div>
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              {title}
            </h1>
            {subtitle && (
              <p className="text-xs text-[#8A99AD]">{subtitle}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onDeployMobileClick && (
            <button
              id="header-deploy-mobile-btn"
              onClick={onDeployMobileClick}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#131A2A] border border-[#00F2FE]/30 hover:border-[#00F2FE] transition-colors text-xs text-[#00F2FE] hover:shadow-[0_0_12px_rgba(0,242,254,0.3)]"
              title="Nasadit do mobilu a exportovat instalační aplikaci"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden sm:inline font-semibold">Nasadit do mobilu</span>
            </button>
          )}

          {onProfileClick && (
            <button
              onClick={onProfileClick}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#131A2A] border border-[#7C5CFC]/20 hover:border-[#7C5CFC]/50 transition-colors text-xs text-[#8A99AD] hover:text-white"
              title="Nastavení uživatele"
            >
              <div className="w-5 h-5 rounded-full bg-[#7C5CFC]/20 flex items-center justify-center text-[#7C5CFC]">
                <User className="w-3 h-3" />
              </div>
              <span className="font-medium max-w-[120px] truncate">{userName}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};


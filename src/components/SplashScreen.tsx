import React, { useEffect } from "react";
import { Sparkles, Compass, Camera, RefreshCw } from "lucide-react";

interface SplashScreenProps {
  onFinish: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onFinish();
    }, 2200);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div
      onClick={onFinish}
      className="fixed inset-0 z-50 bg-[#0B0E14] flex flex-col items-center justify-center p-6 cursor-pointer select-none"
    >
      <div className="relative mb-8">
        {/* Glow effect */}
        <div className="absolute -inset-4 bg-gradient-to-r from-[#7C5CFC]/40 to-[#00F2FE]/40 rounded-full blur-2xl opacity-75 animate-pulse" />

        <div className="relative w-28 h-28 rounded-3xl bg-[#131A2A] border-2 border-[#7C5CFC]/60 flex items-center justify-center shadow-[0_0_40px_rgba(124,92,252,0.35)]">
          <Sparkles className="w-14 h-14 text-[#00F2FE]" />
        </div>
      </div>

      <h1 className="text-3xl font-extrabold text-white tracking-wider mb-2 text-center bg-gradient-to-r from-white via-slate-100 to-[#8A99AD] bg-clip-text text-transparent">
        Společné nálezy
      </h1>

      <p className="text-sm text-[#8A99AD] tracking-widest uppercase mb-10 text-center font-medium">
        GPS • Fotografie • Inventář • Sync
      </p>

      {/* Feature icons */}
      <div className="flex items-center gap-6 mb-12 text-[#8A99AD]/70">
        <div className="flex flex-col items-center gap-1">
          <Camera className="w-5 h-5 text-[#7C5CFC]" />
          <span className="text-[10px] uppercase font-mono tracking-wider">Foto</span>
        </div>
        <div className="w-1 h-1 rounded-full bg-slate-700" />
        <div className="flex flex-col items-center gap-1">
          <Compass className="w-5 h-5 text-[#00F2FE]" />
          <span className="text-[10px] uppercase font-mono tracking-wider">GPS</span>
        </div>
        <div className="w-1 h-1 rounded-full bg-slate-700" />
        <div className="flex flex-col items-center gap-1">
          <RefreshCw className="w-5 h-5 text-[#A58FFF]" />
          <span className="text-[10px] uppercase font-mono tracking-wider">Drive</span>
        </div>
      </div>

      <div className="w-36 h-1 bg-slate-800 rounded-full overflow-hidden">
        <div className="w-full h-full bg-gradient-to-r from-[#7C5CFC] to-[#00F2FE] animate-[pulse_1.5s_ease-in-out_infinite]" />
      </div>

      <span className="text-xs text-slate-500 mt-4">Klepnutím pokračovat</span>
    </div>
  );
};

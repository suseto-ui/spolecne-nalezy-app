import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Camera,
  Upload,
  RotateCcw,
  Sparkles,
  MapPin,
  Zap,
  ZapOff,
  ArrowLeft,
  Check,
  AlertTriangle,
  X,
  Plus,
  Smartphone,
  Image as ImageIcon,
  SwitchCamera,
  Info,
} from "lucide-react";
import { AppHeader } from "./common/AppHeader";
import { ItemEntity, UserSettings, AiAnalysisResult } from "../types";
import { StorageService } from "../services/storage";

interface CameraScreenProps {
  settings: UserSettings;
  reshootForItemId?: string | null;
  onNavigateBack: () => void;
  onItemCaptured: (itemId: string) => void;
  onSecondaryCaptured?: (path: string) => void;
}

// Client-side image scaling to prevent localStorage quotas exceeding on 12-48MP mobile photos
async function scaleAndCompressImage(fileOrDataUrl: File | string, maxDimension = 1280, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(typeof fileOrDataUrl === "string" ? fileOrDataUrl : URL.createObjectURL(fileOrDataUrl));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = reject;

    if (typeof fileOrDataUrl === "string") {
      img.src = fileOrDataUrl;
    } else {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          img.src = reader.result;
        }
      };
      reader.readAsDataURL(fileOrDataUrl);
    }
  });
}

export const CameraScreen: React.FC<CameraScreenProps> = ({
  settings,
  reshootForItemId,
  onNavigateBack,
  onItemCaptured,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Hidden inputs for direct device invocation
  const nativeCameraInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);

  const [streamActive, setStreamActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [flashMode, setFlashMode] = useState<"OFF" | "AUTO" | "ON">("OFF");
  const [isInitializing, setIsInitializing] = useState<boolean>(true);

  // GPS state
  const [gpsLocation, setGpsLocation] = useState<{
    latitude: number;
    longitude: number;
    altitude: number | null;
    accuracy: number | null;
  } | null>(null);
  const [gpsStatus, setGpsStatus] = useState<string>("Zjišťování GPS...");

  // Captured photos in current session
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([]);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState<boolean>(false);

  // Overlay state for new item refinement
  const [showRefinementOverlay, setShowRefinementOverlay] = useState<boolean>(false);
  const [capturedItemId, setCapturedItemId] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState<string>("Odhadni tržní cenu tohoto předmětu.");
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [aiResult, setAiResult] = useState<AiAnalysisResult | null>(null);

  // Request GPS coordinates
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setGpsLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            altitude: position.coords.altitude,
            accuracy: position.coords.accuracy,
          });
          setGpsStatus(`GPS: ${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)} (±${Math.round(position.coords.accuracy)}m)`);
        },
        (error) => {
          console.warn("GPS error:", error);
          setGpsLocation({
            latitude: 50.0755,
            longitude: 14.4378,
            altitude: 220,
            accuracy: 10,
          });
          setGpsStatus("GPS: 50.0755, 14.4378 (Výchozí Praha)");
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setGpsStatus("GPS není k dispozici");
    }
  }, []);

  // Initialize camera stream
  const startCamera = useCallback(async () => {
    setIsInitializing(true);
    setCameraError(null);

    // Stop any existing stream
    if (videoRef.current && videoRef.current.srcObject) {
      const existing = videoRef.current.srcObject as MediaStream;
      existing.getTracks().forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }

    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error("Webový stream kamery není tímto prohlížečem podporován.");
      }

      let stream: MediaStream;
      try {
        // Attempt with ideal constraints
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });
      } catch (e1) {
        console.warn("Retrying getUserMedia with basic constraints", e1);
        // Fallback constraint
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        videoRef.current.muted = true;
        await videoRef.current.play().catch((playErr) => console.warn("Video play error:", playErr));
        setStreamActive(true);
        setCameraError(null);
      }
    } catch (err: any) {
      console.warn("Camera getUserMedia not supported or permission denied", err);
      setStreamActive(false);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setCameraError("Přístup ke kameře byl v prohlížeči zablokován. Použijte prosím přímé tlačítko 'Spustit fotoaparát v mobilu' níže.");
      } else {
        setCameraError("Živý stream není v tomto okně dostupný. Klepněte níže na 'Spustit fotoaparát v mobilu'.");
      }
    } finally {
      setIsInitializing(false);
    }
  }, [facingMode]);

  useEffect(() => {
    startCamera();

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [startCamera]);

  // Handle capture from live video stream
  const capturePhoto = () => {
    if (streamActive && videoRef.current && canvasRef.current) {
      setIsProcessingPhoto(true);
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;

      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        handlePhotoCaptured(dataUrl);
      }
      setIsProcessingPhoto(false);
    } else {
      // Direct mobile device camera trigger via HTML5 capture="environment"
      nativeCameraInputRef.current?.click();
    }
  };

  // Handle file from native camera or gallery
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsProcessingPhoto(true);
      try {
        const compressed = await scaleAndCompressImage(file, 1400, 0.82);
        handlePhotoCaptured(compressed);
      } catch (err) {
        console.error("Image processing error", err);
      } finally {
        setIsProcessingPhoto(false);
        // Reset file input so same image can be re-selected if needed
        e.target.value = "";
      }
    }
  };

  const handlePhotoCaptured = (photoDataUrl: string) => {
    // If this is a secondary reshoot for an existing item
    if (reshootForItemId) {
      const existing = StorageService.getItemById(reshootForItemId);
      if (existing) {
        const updated: ItemEntity = {
          ...existing,
          secondaryImageLocalPath: photoDataUrl,
          lastModifiedTimestamp: Date.now(),
          syncStatus: "PENDING_UPLOAD",
        };
        StorageService.saveItem(
          updated,
          settings.currentAuthor,
          "Přidán doplňkový snímek (detail/značka)"
        );
        onItemCaptured(existing.id);
        return;
      }
    }

    // New Item Flow
    const newPhotos = [...capturedPhotos, photoDataUrl];
    setCapturedPhotos(newPhotos);

    // Create item entity draft
    const newItemId = capturedItemId || "item-" + Math.random().toString(36).substring(2, 9);
    setCapturedItemId(newItemId);

    const lat = gpsLocation?.latitude ?? 50.0755;
    const lng = gpsLocation?.longitude ?? 14.4378;

    const draftItem: ItemEntity = {
      id: newItemId,
      timestamp: Date.now(),
      author: settings.currentAuthor,
      imageLocalPath: newPhotos[0],
      secondaryImageLocalPath: newPhotos[1] || null,
      extraImagePathsJson: JSON.stringify(newPhotos.slice(2)),
      title: "Nový nález " + new Date().toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" }),
      description: "Zaznamenáno fotoaparátem s GPS.",
      category: "Nezatříděno",
      itemStatus: "ACTIVE",
      estimatedPriceCzk: "Zjišťuje se...",
      numericPriceCzk: 0,
      webReferencesJson: "[]",
      latitude: lat,
      longitude: lng,
      altitude: gpsLocation?.altitude ?? null,
      gpsAccuracy: gpsLocation?.accuracy ?? null,
      googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
      isUserSaved: true,
      syncStatus: "PENDING_UPLOAD",
      lastModifiedTimestamp: Date.now(),
    };

    StorageService.saveItem(draftItem, settings.currentAuthor, "Zaznamenán nový nález fotoaparátem");
    setShowRefinementOverlay(true);
  };

  const handleRunAiAnalysis = async () => {
    if (capturedPhotos.length === 0) return;
    setIsAnalyzing(true);

    try {
      const response = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image1: capturedPhotos[0],
          image2: capturedPhotos[1] || null,
          promptText: customPrompt,
        }),
      });

      const result: AiAnalysisResult = await response.json();
      setAiResult(result);

      // Apply to stored item
      if (capturedItemId) {
        const item = StorageService.getItemById(capturedItemId);
        if (item) {
          const updated: ItemEntity = {
            ...item,
            title: result.title || item.title,
            description: result.description || item.description,
            category: result.category || item.category,
            estimatedPriceCzk: result.estimatedPriceCzk || item.estimatedPriceCzk,
            numericPriceCzk: result.numericPrice || item.numericPriceCzk,
            webReferencesJson: JSON.stringify(result.webReferences || []),
          };
          StorageService.saveItem(updated, settings.currentAuthor, "Aplikovány výsledky Gemini AI analýzy");
        }
      }
    } catch (err) {
      console.error("Analysis failed", err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFinishSave = () => {
    if (capturedItemId) {
      onItemCaptured(capturedItemId);
    } else {
      onNavigateBack();
    }
  };

  const handleCancelAndDiscard = () => {
    if (capturedItemId) {
      StorageService.deleteItem(capturedItemId);
    }
    setCapturedPhotos([]);
    setCapturedItemId(null);
    setShowRefinementOverlay(false);
    setAiResult(null);
  };

  return (
    <div className="fixed inset-0 z-40 bg-[#0B0E14] flex flex-col">
      <AppHeader
        title={reshootForItemId ? "Detailní doplňkové foto" : "Nový záznam nálezu"}
        userName={settings.googleAccountName || settings.currentAuthor}
        onProfileClick={onNavigateBack}
        subtitle={reshootForItemId ? "Snímek bude přiřazen k vybranému předmětu" : "Fotoaparát s automatickou GPS lokalizací"}
      />

      <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
        {/* Hidden canvas for taking snapshot */}
        <canvas ref={canvasRef} className="hidden" />

        {/* 1. Direct Native Mobile Camera Invocation (Standard HTML5 capture="environment") */}
        <input
          id="native-mobile-camera-input"
          type="file"
          ref={nativeCameraInputRef}
          onChange={handleFileUpload}
          accept="image/*"
          capture="environment"
          className="hidden"
        />

        {/* 2. Photo Gallery / File Picker */}
        <input
          id="gallery-file-input"
          type="file"
          ref={galleryInputRef}
          onChange={handleFileUpload}
          accept="image/*"
          className="hidden"
        />

        {/* Video feed or fallback upload view */}
        {streamActive ? (
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto space-y-4">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-[#7C5CFC]/25 to-[#00F2FE]/25 border border-[#00F2FE]/40 flex items-center justify-center text-[#00F2FE] shadow-[0_0_35px_rgba(0,242,254,0.3)]">
              <Camera className="w-10 h-10" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-white mb-1">Fotoaparát zařízení</h3>
              <p className="text-xs text-[#8A99AD] leading-relaxed">
                {cameraError || "V mobilním prohlížeči spustíte fotoaparát přímo kliknutím na tlačítko níže."}
              </p>
            </div>

            {/* High-priority mobile invocation button */}
            <button
              id="btn-launch-mobile-camera"
              onClick={() => nativeCameraInputRef.current?.click()}
              className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#7C5CFC] to-[#00F2FE] text-white text-sm font-bold shadow-[0_0_25px_rgba(124,92,252,0.45)] hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2.5"
            >
              <Smartphone className="w-5 h-5 text-[#00F2FE]" />
              <span>Vyfotit fotoaparátem v mobilu</span>
            </button>

            {/* Gallery and stream retry buttons */}
            <div className="grid grid-cols-2 gap-2 w-full">
              <button
                id="btn-open-gallery"
                onClick={() => galleryInputRef.current?.click()}
                className="py-2.5 px-4 rounded-xl bg-[#131A2A] border border-[#7C5CFC]/30 text-white text-xs font-semibold hover:bg-[#1C253B] transition-colors flex items-center justify-center gap-2"
              >
                <ImageIcon className="w-4 h-4 text-[#A58FFF]" />
                <span>Vybrat z galerie</span>
              </button>

              <button
                id="btn-retry-stream"
                onClick={() => startCamera()}
                disabled={isInitializing}
                className="py-2.5 px-4 rounded-xl bg-[#131A2A] border border-[#00F2FE]/30 text-white text-xs font-semibold hover:bg-[#1C253B] transition-colors flex items-center justify-center gap-2"
              >
                <RotateCcw className={`w-4 h-4 text-[#00F2FE] ${isInitializing ? "animate-spin" : ""}`} />
                <span>Zkusit živý náhled</span>
              </button>
            </div>

            <div className="p-3 rounded-xl bg-[#131A2A]/70 border border-slate-800 text-[11px] text-[#8A99AD] flex items-start gap-2 text-left">
              <Info className="w-4 h-4 text-[#00F2FE] flex-shrink-0 mt-0.5" />
              <span>
                <strong>Tip pro mobil:</strong> Tlačítko <em>„Vyfotit fotoaparátem v mobilu“</em> vyvolá nativní fotoaparát systému (Android i iOS) se všemi objektivy, bleskem a maximálním rozlišením.
              </span>
            </div>
          </div>
        )}

        {/* Top HUD: GPS Pill & Flash toggle & Back button */}
        <div className="absolute top-4 inset-x-4 flex items-center justify-between pointer-events-none z-20">
          <button
            onClick={onNavigateBack}
            className="p-2.5 rounded-full bg-black/70 backdrop-blur-md border border-white/20 text-white hover:bg-black/90 pointer-events-auto transition-colors"
            title="Zpět"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* GPS indicator pill */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/70 backdrop-blur-md border border-[#00F2FE]/40 text-xs text-white font-mono pointer-events-auto shadow-md">
            <MapPin className="w-3.5 h-3.5 text-[#00F2FE] animate-pulse" />
            <span className="truncate max-w-[210px]">{gpsStatus}</span>
          </div>

          {/* Facing mode / Flash toggle */}
          <div className="flex items-center gap-2 pointer-events-auto">
            {streamActive && (
              <button
                onClick={() => setFacingMode((prev) => (prev === "environment" ? "user" : "environment"))}
                className="p-2.5 rounded-full bg-black/70 backdrop-blur-md border border-white/20 text-white hover:bg-black/90 transition-colors"
                title="Přepnout přední/zadní kameru"
              >
                <SwitchCamera className="w-4 h-4 text-[#00F2FE]" />
              </button>
            )}

            <button
              onClick={() => {
                setFlashMode((prev) => (prev === "OFF" ? "AUTO" : prev === "AUTO" ? "ON" : "OFF"));
              }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-black/70 backdrop-blur-md border border-white/20 text-xs font-mono text-white hover:bg-black/90 transition-colors"
            >
              {flashMode === "OFF" ? (
                <ZapOff className="w-3.5 h-3.5 text-slate-400" />
              ) : (
                <Zap className="w-3.5 h-3.5 text-amber-400" />
              )}
              <span>{flashMode}</span>
            </button>
          </div>
        </div>

        {/* Bottom Shutter & Controls */}
        <div className="absolute bottom-6 inset-x-0 flex items-center justify-around px-8 z-20">
          {/* Gallery / File Picker */}
          <button
            id="shutter-gallery-btn"
            onClick={() => galleryInputRef.current?.click()}
            className="p-3.5 rounded-full bg-black/70 backdrop-blur-md border border-white/20 text-white hover:bg-black/90 transition-colors shadow-md"
            title="Nahrát z galerie"
          >
            <Upload className="w-5 h-5 text-[#8A99AD]" />
          </button>

          {/* Main Shutter Button */}
          <button
            id="shutter-main-btn"
            onClick={capturePhoto}
            disabled={isProcessingPhoto}
            className="w-20 h-20 rounded-full border-4 border-white/40 p-1 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-[0_0_30px_rgba(124,92,252,0.5)]"
            title={streamActive ? "Vyfotit snímek" : "Spustit fotoaparát"}
          >
            <div className="w-full h-full rounded-full bg-gradient-to-tr from-[#7C5CFC] to-[#00F2FE] flex items-center justify-center">
              {isProcessingPhoto ? (
                <div className="w-6 h-6 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <Camera className="w-8 h-8 text-white" />
              )}
            </div>
          </button>

          {/* Secondary photo indicator / slot */}
          <div
            onClick={() => {
              if (capturedPhotos.length > 0) setShowRefinementOverlay(true);
            }}
            className="w-12 h-12 rounded-xl bg-black/70 backdrop-blur-md border border-white/20 overflow-hidden flex items-center justify-center text-xs text-[#8A99AD] cursor-pointer shadow-md"
            title={capturedPhotos.length > 0 ? "Zobrazit nafocené snímky" : "Zatím žádné foto"}
          >
            {capturedPhotos.length > 0 ? (
              <img src={capturedPhotos[0]} alt="Náhled" className="w-full h-full object-cover" />
            ) : (
              <span className="font-mono text-[10px]">0/2</span>
            )}
          </div>
        </div>

        {/* AI Confirmation Overlay */}
        {showRefinementOverlay && (
          <div className="absolute inset-0 z-50 bg-[#0B0E14]/95 backdrop-blur-md p-6 overflow-y-auto flex flex-col justify-between">
            <div className="max-w-md mx-auto w-full space-y-4 pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[#00F2FE]" />
                  <h3 className="text-base font-bold text-white">Položka připravena k analýze</h3>
                </div>
                <button
                  onClick={handleCancelAndDiscard}
                  className="p-1 rounded-full text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Photo preview strip */}
              <div className="flex items-center justify-center gap-3 py-2">
                {capturedPhotos.map((path, idx) => (
                  <div
                    key={idx}
                    className="relative w-24 h-24 rounded-2xl overflow-hidden border-2 border-[#7C5CFC]/50 shadow-md flex-shrink-0"
                  >
                    <img src={path} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                    <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/70 text-[10px] font-mono text-[#00F2FE]">
                      {idx === 0 ? "Foto 1" : idx === 1 ? "Detail 2" : `Foto ${idx + 1}`}
                    </span>
                  </div>
                ))}

                {capturedPhotos.length < 3 && (
                  <button
                    onClick={() => {
                      setShowRefinementOverlay(false);
                      nativeCameraInputRef.current?.click();
                    }}
                    className="w-24 h-24 rounded-2xl border-2 border-dashed border-[#7C5CFC]/40 hover:border-[#00F2FE] bg-[#131A2A]/60 flex flex-col items-center justify-center gap-1 text-[#8A99AD] hover:text-[#00F2FE] transition-colors flex-shrink-0"
                    title="Přidat další doplňkovou fotografii předmětu"
                  >
                    <Plus className="w-6 h-6" />
                    <span className="text-[10px] font-medium">Další foto</span>
                  </button>
                )}
              </div>

              {/* Custom prompt input */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#8A99AD]">
                  Zpřesnit zadání pro AI (nepovinné)
                </label>
                <textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  rows={2}
                  placeholder="Např. Urči cenu v supermarketu / odhadni stáří starožitnosti..."
                  className="w-full px-3 py-2 bg-[#131A2A] border border-[#7C5CFC]/30 rounded-xl text-xs text-white focus:outline-none focus:border-[#00F2FE] resize-none"
                />
              </div>

              {/* AI Result Card */}
              {isAnalyzing ? (
                <div className="p-6 bg-[#131A2A] rounded-2xl border border-[#7C5CFC]/30 flex flex-col items-center justify-center gap-3">
                  <div className="w-8 h-8 border-2 border-[#00F2FE]/30 border-t-[#00F2FE] rounded-full animate-spin" />
                  <span className="text-xs text-slate-300">
                    Gemini AI vyhodnocuje {capturedPhotos.length} {capturedPhotos.length === 1 ? "fotku" : "fotky"}...
                  </span>
                </div>
              ) : aiResult ? (
                <div className="p-4 bg-[#131A2A] rounded-2xl border border-[#00F2FE]/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#A58FFF]">AI Odhad:</span>
                    <span className="text-sm font-bold text-[#00F2FE] font-mono">
                      {aiResult.estimatedPriceCzk}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-white">{aiResult.title}</h4>
                  <p className="text-xs text-slate-300">{aiResult.description}</p>

                  {aiResult.status === "NEEDS_MORE_INFO" && (
                    <div className="p-2.5 bg-amber-500/15 border border-amber-500/30 rounded-xl text-xs text-amber-300 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>{aiResult.followUpPrompt || "AI potřebuje detailnější snímek."}</span>
                    </div>
                  )}
                </div>
              ) : null}

              {/* Actions */}
              <div className="space-y-2 pt-2">
                {aiResult ? (
                  <div className="flex gap-2">
                    <button
                      onClick={handleFinishSave}
                      className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 text-white text-xs font-bold flex items-center justify-center gap-2 hover:brightness-110 shadow-md"
                    >
                      <Check className="w-4 h-4" />
                      Uložit do katalogu
                    </button>
                    <button
                      onClick={handleRunAiAnalysis}
                      className="px-4 py-3 rounded-xl bg-slate-800 text-slate-200 text-xs font-semibold hover:bg-slate-700"
                    >
                      Zkusit znovu
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleRunAiAnalysis}
                    disabled={isAnalyzing}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-[#7C5CFC] to-[#00F2FE] text-white text-xs font-bold flex items-center justify-center gap-2 hover:brightness-110 shadow-[0_0_20px_rgba(124,92,252,0.4)]"
                  >
                    <Sparkles className="w-4 h-4 text-[#00F2FE]" />
                    Spustit AI Analýzu
                  </button>
                )}

                <button
                  onClick={handleFinishSave}
                  className="w-full py-2.5 text-xs text-[#8A99AD] hover:text-white transition-colors"
                >
                  Uložit do katalogu bez AI
                </button>

                <button
                  onClick={handleCancelAndDiscard}
                  className="w-full py-1 text-xs text-red-400 hover:text-red-300 transition-colors"
                >
                  Zrušit a smazat snímky
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

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
  Layers,
  Edit3,
  Coins,
  CheckCircle2,
} from "lucide-react";
import { AppHeader } from "./common/AppHeader";
import { ItemEntity, UserSettings, AiAnalysisResult } from "../types";
import { StorageService } from "../services/storage";
import { analyzeItem } from "../services/aiAnalysis";

interface CameraScreenProps {
  settings: UserSettings;
  reshootForItemId?: string | null;
  onNavigateBack: () => void;
  onItemCaptured: (itemId: string) => void;
  onSecondaryCaptured?: (path: string) => void;
}

// Available categories for the item dropdown
const ITEM_CATEGORIES = [
  "Starožitnosti & Sbírky",
  "Mince a medaile",
  "Hodiny a hodinky",
  "Porcelán a keramika",
  "Sklo a krystaly",
  "Šperky a drahé kovy",
  "Militarie a odznaky",
  "Retro technika & Nářadí",
  "Umění a obrazy",
  "Starožitný nábytek",
  "Běžné zboží & Potraviny",
  "Ostatní nálezy",
];

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

  // Hidden inputs for fallback device invocation
  const nativeCameraInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);

  // Camera stream state
  const [streamActive, setStreamActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [flashMode, setFlashMode] = useState<"OFF" | "AUTO" | "ON">("OFF");
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [shutterFlash, setShutterFlash] = useState<boolean>(false);

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

  // Form fields ("kolonky") for item identification and details
  const [showRefinementOverlay, setShowRefinementOverlay] = useState<boolean>(false);
  const [capturedItemId, setCapturedItemId] = useState<string | null>(null);
  const [itemTitle, setItemTitle] = useState<string>("");
  const [itemCategory, setItemCategory] = useState<string>("Starožitnosti & Sbírky");
  const [itemEstimatedPrice, setItemEstimatedPrice] = useState<string>("");
  const [itemDescription, setItemDescription] = useState<string>("");
  const [customPrompt, setCustomPrompt] = useState<string>("Identifikuj tento nalezený předmět, urči materiál, stáří a odhadní cenu.");
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [aiResult, setAiResult] = useState<AiAnalysisResult | null>(null);
  const [aiAutoFilled, setAiAutoFilled] = useState<boolean>(false);

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
          setGpsStatus("GPS: 50.0755, 14.4378 (Výchozí)");
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

      let stream: MediaStream | null = null;
      try {
        // Attempt with ideal constraints for rear/front camera
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

      if (stream && videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        videoRef.current.playsInline = true;
        videoRef.current.muted = true;
        videoRef.current.autoplay = true;
        await videoRef.current.play().catch((playErr) => console.warn("Video play error:", playErr));
        setStreamActive(true);
        setCameraError(null);
      }
    } catch (err: any) {
      console.warn("Camera getUserMedia not supported or permission denied", err);
      setStreamActive(false);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setCameraError("Přístup ke kameře byl v prohlížeči zakázán. Můžete použít systémový fotoaparát kliknutím níže.");
      } else {
        setCameraError("Živý hledáček se nepodařilo spustit. Můžete vyfotit snímek systémovým fotoaparátem níže.");
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
      // Shutter flash effect
      setShutterFlash(true);
      setTimeout(() => setShutterFlash(false), 120);

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
      // If live stream failed to start, use HTML5 native system camera
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

    const newItemId = capturedItemId || "item-" + Math.random().toString(36).substring(2, 9);
    setCapturedItemId(newItemId);

    const lat = gpsLocation?.latitude ?? 50.0755;
    const lng = gpsLocation?.longitude ?? 14.4378;

    // Initial default values in form fields ("kolonky")
    const defaultTitle = "Nález " + new Date().toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" });
    setItemTitle(defaultTitle);
    setItemCategory("Starožitnosti & Sbírky");
    setItemEstimatedPrice("Zjišťuje se...");
    setItemDescription("Zaznamenáno fotoaparátem s GPS. Spusťte AI analýzu pro automatické určení a ocenění.");
    setAiAutoFilled(false);

    const draftItem: ItemEntity = {
      id: newItemId,
      timestamp: Date.now(),
      author: settings.currentAuthor,
      imageLocalPath: newPhotos[0],
      secondaryImageLocalPath: newPhotos[1] || null,
      extraImagePathsJson: JSON.stringify(newPhotos.slice(2)),
      title: defaultTitle,
      description: "Zaznamenáno fotoaparátem s GPS.",
      category: "Starožitnosti & Sbírky",
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

    // Automatically trigger AI analysis to immediately populate form fields ("kolonky se vypíší samy")
    triggerAiAnalysis(newPhotos, customPrompt, newItemId);
  };

  // Run AI analysis and automatically fill in form fields ("kolonky")
  const triggerAiAnalysis = async (photos: string[], promptText: string, targetItemId: string) => {
    if (photos.length === 0) return;
    setIsAnalyzing(true);

    try {
      const result = await analyzeItem(
        photos[0],
        photos[1] || null,
        promptText
      );
      setAiResult(result);

      // Save every single analysis run automatically in history
      StorageService.saveAnalysisRun(targetItemId, promptText, result);

      // AUTOMATICALLY FILL THE FORM FIELDS ("kolonky")
      if (result.title) setItemTitle(result.title);
      if (result.category) setItemCategory(result.category);
      if (result.estimatedPriceCzk) setItemEstimatedPrice(result.estimatedPriceCzk);
      if (result.description) setItemDescription(result.description);
      setAiAutoFilled(true);

      // Update draft in storage
      const item = StorageService.getItemById(targetItemId);
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
    } catch (err) {
      console.error("AI Analysis error", err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleManualRunAi = () => {
    if (capturedPhotos.length > 0 && capturedItemId) {
      triggerAiAnalysis(capturedPhotos, customPrompt, capturedItemId);
    }
  };

  const handleFinishSave = () => {
    if (capturedItemId) {
      // Save all current values from form fields into storage
      const existing = StorageService.getItemById(capturedItemId);
      if (existing) {
        const finalItem: ItemEntity = {
          ...existing,
          title: itemTitle.trim() || "Nalezený předmět",
          category: itemCategory,
          estimatedPriceCzk: itemEstimatedPrice.trim() || (aiResult?.estimatedPriceCzk || "Nezadáno"),
          numericPriceCzk: aiResult?.numericPrice || 0,
          description: itemDescription.trim(),
          webReferencesJson: JSON.stringify(aiResult?.webReferences || []),
          lastModifiedTimestamp: Date.now(),
          syncStatus: "PENDING_UPLOAD",
        };
        StorageService.saveItem(finalItem, settings.currentAuthor, "Uložen a zaevidován nález");
      }
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
    setAiAutoFilled(false);
  };

  return (
    <div className="fixed inset-0 z-40 bg-[#0B0E14] flex flex-col">
      <AppHeader
        title={reshootForItemId ? "Detailní doplňkové foto" : "Hledáček fotoaparátu"}
        userName={settings.googleAccountName || settings.currentAuthor}
        onProfileClick={onNavigateBack}
        subtitle={reshootForItemId ? "Snímek bude přiřazen k vybranému předmětu" : "Živý náhled s GPS zaměřením a AI analýzou"}
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

        {/* LIVE VIDEO FEED: ALWAYS IN THE DOM TO PREVENT NULL REFS */}
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
            streamActive ? "opacity-100 z-10" : "opacity-0 pointer-events-none"
          }`}
        />

        {/* Shutter White Flash effect on photo snap */}
        {shutterFlash && (
          <div className="absolute inset-0 bg-white z-30 animate-ping pointer-events-none" />
        )}

        {/* Viewfinder Reticle Overlay when stream is live */}
        {streamActive && (
          <div className="absolute inset-0 z-15 pointer-events-none flex items-center justify-center">
            {/* Center targeting reticle */}
            <div className="relative w-64 h-64 border border-white/20 rounded-2xl flex items-center justify-center">
              <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-[#00F2FE] rounded-tl-lg" />
              <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-[#00F2FE] rounded-tr-lg" />
              <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-[#00F2FE] rounded-bl-lg" />
              <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-[#00F2FE] rounded-br-lg" />
              <div className="w-2 h-2 rounded-full bg-[#00F2FE]/60 animate-ping" />
            </div>
          </div>
        )}

        {/* Loading / Initializing viewfinder state */}
        {isInitializing && !streamActive && (
          <div className="relative z-10 flex flex-col items-center justify-center p-6 text-center space-y-4">
            <div className="relative w-20 h-20 rounded-full border-2 border-[#7C5CFC]/40 flex items-center justify-center">
              <div className="absolute inset-0 border-2 border-t-[#00F2FE] rounded-full animate-spin" />
              <Camera className="w-8 h-8 text-[#00F2FE] animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white mb-1">Spouštění fotoaparátu...</h3>
              <p className="text-xs text-[#8A99AD]">Inicializace živého hledáčku a zaměřování GPS</p>
            </div>
          </div>
        )}

        {/* Fallback view ONLY when live camera could not start */}
        {!isInitializing && !streamActive && (
          <div className="relative z-10 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto space-y-4">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-[#7C5CFC]/25 to-[#00F2FE]/25 border border-[#00F2FE]/40 flex items-center justify-center text-[#00F2FE] shadow-[0_0_35px_rgba(0,242,254,0.3)]">
              <Camera className="w-10 h-10" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-white mb-1">Fotoaparát zařízení</h3>
              <p className="text-xs text-[#8A99AD] leading-relaxed">
                {cameraError || "Živý náhled není v tomto okně dostupný. Klepněte níže na vyfocení systémovým fotoaparátem."}
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
                Pokud byl přístup ke kameře zamítnut, povolte kameru v adresním řádku prohlížeče nebo použijte systémový fotoaparát.
              </span>
            </div>
          </div>
        )}

        {/* Top HUD: GPS Pill & Flash toggle & Back button */}
        <div className="absolute top-4 inset-x-4 flex items-center justify-between pointer-events-none z-20">
          <button
            onClick={onNavigateBack}
            className="p-2.5 rounded-full bg-black/70 backdrop-blur-md border border-white/20 text-white hover:bg-black/90 pointer-events-auto transition-colors shadow-lg"
            title="Zpět"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* GPS indicator pill */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/70 backdrop-blur-md border border-[#00F2FE]/40 text-xs text-white font-mono pointer-events-auto shadow-md">
            <MapPin className="w-3.5 h-3.5 text-[#00F2FE] animate-pulse" />
            <span className="truncate max-w-[200px]">{gpsStatus}</span>
          </div>

          {/* Facing mode / Flash toggle */}
          <div className="flex items-center gap-2 pointer-events-auto">
            {streamActive && (
              <button
                onClick={() => setFacingMode((prev) => (prev === "environment" ? "user" : "environment"))}
                className="p-2.5 rounded-full bg-black/70 backdrop-blur-md border border-white/20 text-white hover:bg-black/90 transition-colors shadow-lg"
                title="Přepnout přední/zadní kameru"
              >
                <SwitchCamera className="w-4 h-4 text-[#00F2FE]" />
              </button>
            )}

            <button
              onClick={() => {
                setFlashMode((prev) => (prev === "OFF" ? "AUTO" : prev === "AUTO" ? "ON" : "OFF"));
              }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-black/70 backdrop-blur-md border border-white/20 text-xs font-mono text-white hover:bg-black/90 transition-colors shadow-lg"
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

        {/* Bottom Shutter & Controls (rendered over the live stream) */}
        <div className="absolute bottom-6 inset-x-0 flex items-center justify-around px-8 z-20">
          {/* Gallery / File Picker */}
          <button
            id="shutter-gallery-btn"
            onClick={() => galleryInputRef.current?.click()}
            className="p-3.5 rounded-full bg-black/70 backdrop-blur-md border border-white/20 text-white hover:bg-black/90 transition-colors shadow-md active:scale-95"
            title="Nahrát z galerie"
          >
            <Upload className="w-5 h-5 text-[#8A99AD]" />
          </button>

          {/* Main Shutter Button */}
          <button
            id="shutter-main-btn"
            onClick={capturePhoto}
            disabled={isProcessingPhoto}
            className="w-20 h-20 rounded-full border-4 border-white/40 p-1 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-[0_0_30px_rgba(124,92,252,0.6)]"
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

          {/* Secondary photo thumbnail / Counter */}
          <div
            onClick={() => {
              if (capturedPhotos.length > 0) setShowRefinementOverlay(true);
            }}
            className="w-12 h-12 rounded-xl bg-black/70 backdrop-blur-md border border-white/20 overflow-hidden flex items-center justify-center text-xs text-[#8A99AD] cursor-pointer shadow-md"
            title={capturedPhotos.length > 0 ? "Zobrazit nafocené snímky a kolonky" : "Zatím žádné foto"}
          >
            {capturedPhotos.length > 0 ? (
              <img src={capturedPhotos[0]} alt="Náhled" className="w-full h-full object-cover" />
            ) : (
              <span className="font-mono text-[10px]">0/2</span>
            )}
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* ITEM FORM OVERLAY WITH EDITABLE FORM FIELDS ("KOLONKY")       */}
        {/* ------------------------------------------------------------- */}
        {showRefinementOverlay && (
          <div className="absolute inset-0 z-50 bg-[#0B0E14]/98 backdrop-blur-lg p-4 md:p-6 overflow-y-auto flex flex-col">
            <div className="max-w-lg mx-auto w-full space-y-4 py-2">
              
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[#00F2FE]" />
                  <h3 className="text-base font-bold text-white">Identifikace & Zaevidování nálezu</h3>
                </div>
                <button
                  onClick={handleCancelAndDiscard}
                  className="p-1.5 rounded-full text-slate-400 hover:text-white bg-slate-800/60"
                  title="Zavřít a zahodit"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Photo Preview Strip */}
              <div className="flex items-center gap-3 py-1 overflow-x-auto">
                {capturedPhotos.map((path, idx) => (
                  <div
                    key={idx}
                    className="relative w-20 h-20 rounded-2xl overflow-hidden border-2 border-[#7C5CFC]/50 shadow-md flex-shrink-0"
                  >
                    <img src={path} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                    <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/80 text-[9px] font-mono text-[#00F2FE]">
                      {idx === 0 ? "Hlavní foto" : `Detail ${idx}`}
                    </span>
                  </div>
                ))}

                {capturedPhotos.length < 3 && (
                  <button
                    onClick={() => {
                      setShowRefinementOverlay(false);
                      nativeCameraInputRef.current?.click();
                    }}
                    className="w-20 h-20 rounded-2xl border-2 border-dashed border-[#7C5CFC]/40 hover:border-[#00F2FE] bg-[#131A2A]/60 flex flex-col items-center justify-center gap-1 text-[#8A99AD] hover:text-[#00F2FE] transition-colors flex-shrink-0"
                    title="Vyfotit doplňkový detail (značka / punc)"
                  >
                    <Plus className="w-5 h-5" />
                    <span className="text-[10px] font-medium">+ Detail</span>
                  </button>
                )}
              </div>

              {/* AI Status Banner */}
              {isAnalyzing ? (
                <div className="p-3.5 bg-[#131A2A] border border-[#00F2FE]/40 rounded-xl flex items-center gap-3">
                  <div className="w-5 h-5 border-2 border-[#00F2FE]/30 border-t-[#00F2FE] rounded-full animate-spin flex-shrink-0" />
                  <div className="text-xs">
                    <span className="font-bold text-white block">Gemini AI analyzuje předmět...</span>
                    <span className="text-[#8A99AD]">Rozpoznávám objekt, materiál a vyplňuji kolonky.</span>
                  </div>
                </div>
              ) : aiAutoFilled ? (
                <div className="p-3 bg-emerald-500/15 border border-emerald-500/40 rounded-xl flex items-start gap-2.5 text-emerald-300 text-xs">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-400" />
                  <div>
                    <strong className="block text-white font-semibold">AI úspěšně vyplnila kolonky!</strong>
                    <span>Objekt a odhadované parametry byly zapsány. Níže můžete údaje upravit nebo rovnou uložit.</span>
                  </div>
                </div>
              ) : null}

              {/* NEEDS_MORE_INFO Banner */}
              {aiResult?.status === "NEEDS_MORE_INFO" && (
                <div className="p-3 bg-amber-500/15 border border-amber-500/30 rounded-xl text-xs text-amber-300 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-400" />
                  <div>
                    <strong className="block font-semibold">Doporučení AI:</strong>
                    <span>{aiResult.followUpPrompt || "Vyfoťte doplňkový detail výrobního puncu nebo spodní strany."}</span>
                  </div>
                </div>
              )}

              {/* ========================================================= */}
              {/* THE FORM FIELDS ("KOLONKY") WHICH ARE POPULATED BY THE AI */}
              {/* ========================================================= */}
              <div className="space-y-3.5 bg-[#131A2A]/80 p-4 rounded-2xl border border-slate-800 shadow-inner">
                
                {/* 1. KOLONKA: NÁZEV / CO TO JE ZA OBJEKT */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#00F2FE] flex items-center gap-1.5">
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Co to je za objekt (Název předmětu):</span>
                  </label>
                  <input
                    id="field-item-title"
                    type="text"
                    value={itemTitle}
                    onChange={(e) => setItemTitle(e.target.value)}
                    placeholder="Např. Stříbrná kapesní cibule Doxa..."
                    className="w-full px-3.5 py-2.5 bg-[#0B0E14] border border-[#7C5CFC]/40 rounded-xl text-sm font-semibold text-white focus:outline-none focus:border-[#00F2FE] transition-colors"
                  />
                </div>

                {/* 2. KOLONKA: KATEGORIE */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[#8A99AD] flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-[#A58FFF]" />
                      <span>Kategorie:</span>
                    </label>
                    <select
                      id="field-item-category"
                      value={itemCategory}
                      onChange={(e) => setItemCategory(e.target.value)}
                      className="w-full px-3 py-2.5 bg-[#0B0E14] border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-[#00F2FE] transition-colors"
                    >
                      {ITEM_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat} className="bg-[#131A2A] text-white">
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 3. KOLONKA: ODHADOVANÁ CENA */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-[#8A99AD] flex items-center gap-1.5">
                      <Coins className="w-3.5 h-3.5 text-amber-400" />
                      <span>Odhadovaná cena:</span>
                    </label>
                    <input
                      id="field-item-price"
                      type="text"
                      value={itemEstimatedPrice}
                      onChange={(e) => setItemEstimatedPrice(e.target.value)}
                      placeholder="Např. 1 500 - 3 200 Kč"
                      className="w-full px-3 py-2.5 bg-[#0B0E14] border border-slate-700 rounded-xl text-xs font-mono text-[#00F2FE] focus:outline-none focus:border-[#00F2FE] transition-colors"
                    />
                  </div>
                </div>

                {/* 4. KOLONKA: POPIS A PŮVOD (POPISEK) */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#8A99AD] flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-[#00F2FE]" />
                    <span>Popisek předmětu (materiál, odhadované stáří a stav):</span>
                  </label>
                  <textarea
                    id="field-item-description"
                    value={itemDescription}
                    onChange={(e) => setItemDescription(e.target.value)}
                    rows={4}
                    placeholder="Podrobný popis předmětu, styl, materiál, zachovalost a sběratelský význam..."
                    className="w-full px-3 py-2.5 bg-[#0B0E14] border border-slate-700 rounded-xl text-xs text-slate-200 leading-relaxed focus:outline-none focus:border-[#00F2FE] resize-none transition-colors"
                  />
                </div>

                {/* AI Reasoning notes if available */}
                {aiResult?.reasoning && (
                  <div className="p-2.5 rounded-lg bg-black/40 border border-slate-800 text-[11px] text-slate-400">
                    <span className="text-[#A58FFF] font-semibold block mb-0.5">Zdůvodnění AI:</span>
                    <span className="italic">{aiResult.reasoning}</span>
                  </div>
                )}
              </div>

              {/* Custom Prompt for Re-analysis */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-[#8A99AD]">
                  Zadání / Dotaz pro AI (pokud chcete zpřesnit výsledek):
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder="Např. Odhadni stáří podle rytiny / urči cenu na Aukru..."
                    className="flex-1 px-3 py-2 bg-[#131A2A] border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-[#7C5CFC]"
                  />
                  <button
                    onClick={handleManualRunAi}
                    disabled={isAnalyzing}
                    className="px-3 py-2 rounded-xl bg-[#7C5CFC]/20 hover:bg-[#7C5CFC]/40 text-[#00F2FE] text-xs font-semibold flex items-center gap-1.5 border border-[#7C5CFC]/40 transition-colors whitespace-nowrap"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Znovu analyzovat</span>
                  </button>
                </div>
              </div>

              {/* Actions: Save to Catalog vs Cancel */}
              <div className="space-y-2 pt-2">
                <button
                  id="btn-save-to-catalog"
                  onClick={handleFinishSave}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-sm font-bold flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all active:scale-98"
                >
                  <Check className="w-4 h-4" />
                  <span>Uložit do katalogu nálezů</span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      setShowRefinementOverlay(false);
                      setCapturedPhotos([]);
                    }}
                    className="py-2.5 px-4 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Vyfotit znovu</span>
                  </button>

                  <button
                    onClick={handleCancelAndDiscard}
                    className="py-2.5 px-4 rounded-xl bg-red-950/40 border border-red-900/50 text-red-300 text-xs font-semibold hover:bg-red-900/40 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Zahodit záznam</span>
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
};

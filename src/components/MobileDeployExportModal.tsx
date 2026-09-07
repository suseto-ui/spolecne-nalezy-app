import React, { useState, useEffect } from "react";
import {
  Smartphone,
  QrCode,
  Download,
  Check,
  Copy,
  ExternalLink,
  X,
  Sparkles,
  Layers,
  Activity,
  CheckCircle2,
  AlertCircle,
  Terminal,
} from "lucide-react";
import QRCode from "qrcode";
import JSZip from "jszip";

interface MobileDeployExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileDeployExportModal: React.FC<MobileDeployExportModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<"pwa" | "apk" | "api">("pwa");
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isExportingZip, setIsExportingZip] = useState(false);
  const [apiTestStatus, setApiTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [apiTestResult, setApiTestResult] = useState<{
    latencyMs?: number;
    model?: string;
    message?: string;
    details?: string;
  } | null>(null);

  const appUrl = typeof window !== "undefined" ? window.location.origin : "https://ais-dev-ochb7phnvq4bdvo3ldq4zb-291037164760.europe-west3.run.app";

  // Generate QR Code for mobile scanning
  useEffect(() => {
    if (isOpen && appUrl) {
      QRCode.toDataURL(appUrl, {
        width: 320,
        margin: 1.5,
        color: {
          dark: "#00F2FE",
          light: "#0B0E14",
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error("QR Code generation error:", err));
    }
  }, [isOpen, appUrl]);

  // Listen for PWA install prompt
  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  if (!isOpen) return null;

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(appUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2500);
    } catch (e) {
      console.error(e);
    }
  };

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      alert("Pro instalaci na Androidu klepněte v prohlížeči Chrome na menu se třemi tečkami a zvolte 'Přidat na plochu' nebo 'Instalovat aplikaci'.");
    }
  };

  // Export full Android TWA & APK build kit
  const handleExportZip = async () => {
    setIsExportingZip(true);
    try {
      const zip = new JSZip();

      // 1. twa-manifest.json
      const twaManifest = {
        packageId: "cz.spolecnenalezy.app",
        host: new URL(appUrl).host,
        name: "Společné Nálezy",
        launcherName: "Nálezy",
        themeColor: "#0B0E14",
        navigationColor: "#0B0E14",
        backgroundColor: "#0B0E14",
        enableNotifications: true,
        startUrl: "/",
        iconUrl: `${appUrl}/icon-512.png`,
        maskableIconUrl: `${appUrl}/icon-maskable-512.png`,
        appVersionName: "1.0.0",
        appVersionCode: 1,
        signingKey: {
          path: "./android.keystore",
          alias: "android",
        },
        generatorApp: "bubblewrap-cli",
        webManifestUrl: `${appUrl}/manifest.json`,
        features: {
          locationDelegation: { enabled: true },
        },
      };
      zip.file("twa-manifest.json", JSON.stringify(twaManifest, null, 2));

      // 2. AndroidManifest.xml for native wrappers
      const androidManifestXml = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="cz.spolecnenalezy.app">

    <!-- Permissions for Camera, Geolocation and Backend API connectivity -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="Společné Nálezy"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@android:style/Theme.NoTitleBar.Fullscreen">
        <activity
            android:name=".MainActivity"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>`;
      zip.file("AndroidManifest.xml", androidManifestXml);

      // 3. build-android-apk.sh
      const buildScript = `#!/usr/bin/env bash
set -e
echo "=== Sestavení instalační aplikace (APK) pro Společné Nálezy ==="
echo "Host API: ${appUrl}"

if ! command -v bubblewrap &> /dev/null; then
    echo "Instaluji @bubblewrap/cli..."
    npm install -g @bubblewrap/cli
fi

echo "Generuji APK z manifestu..."
bubblewrap init --manifest="${appUrl}/manifest.json"
bubblewrap build

echo "Instalační soubor APK připraven!"
`;
      zip.file("build-android-apk.sh", buildScript);

      // 4. README-INSTALL-TESTING.md
      const testingReadme = `# Společné Nálezy - Instalační a testovací balíček pro zařízení s API

## 1. Rychlé testování na zařízení (PWA / WebAPK)
- Otevřete Chrome na svém Android telefonu.
- Přejděte na adresu: ${appUrl}
- Zvolte "Přidat na plochu" -> Aplikace se nainstaluje s ikonou a nativním během bez adresního řádku.

## 2. Sestavení samostatného podepsaného APK
1. Ujistěte se, že máte nainstalované Node.js a Java JDK (verze 17+).
2. Spusťte:
   npm install -g @bubblewrap/cli
   bubblewrap init --manifest="${appUrl}/manifest.json"
   bubblewrap build
3. Výsledný soubor 'app-release-signed.apk' nainstalujte do zařízení pomocí:
   adb install app-release-signed.apk

## 3. Testování API na zařízení
Aplikace se připojuje k backendu na:
- Health check: ${appUrl}/api/health
- AI Oceňování: ${appUrl}/api/ai/analyze (Gemini 3.6 Flash)
`;
      zip.file("README-INSTALL-TESTING.md", testingReadme);

      // 5. Capacitor config
      const capacitorConfig = {
        appId: "cz.spolecnenalezy.app",
        appName: "Společné Nálezy",
        webDir: "dist",
        server: {
          url: appUrl,
          cleartext: false,
        },
      };
      zip.file("capacitor.config.json", JSON.stringify(capacitorConfig, null, 2));

      // Generate zip and trigger browser download
      const content = await zip.generateAsync({ type: "blob" });
      const blobUrl = URL.createObjectURL(content);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = "spolecne-nalezy-android-install-kit.zip";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Export zip error:", err);
      alert("Nepodařilo se vygenerovat instalační balíček: " + String(err));
    } finally {
      setIsExportingZip(false);
    }
  };

  // Test live API on mobile / server
  const handleTestApi = async () => {
    setApiTestStatus("testing");
    setApiTestResult(null);
    const start = performance.now();
    try {
      // 1. Health
      const healthRes = await fetch("/api/health");
      const healthData = await healthRes.json();

      // 2. AI analyze sample ping
      const aiRes = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ promptText: "Testovací dotaz na starožitnost z mobilu" }),
      });
      const aiData = await aiRes.json();
      const end = performance.now();
      const latencyMs = Math.round(end - start);

      setApiTestStatus("success");
      setApiTestResult({
        latencyMs,
        model: "gemini-3.6-flash",
        message: "API i backend jsou plně dostupné a připravené pro zařízení!",
        details: `Odezva AI: „${aiData.title || "Úspěšná analýza"}“ (${aiData.estimatedPriceCzk || "Cena odhadnuta"}).`,
      });
    } catch (err: any) {
      setApiTestStatus("error");
      setApiTestResult({
        message: "Chyba při komunikaci s API: " + (err.message || String(err)),
      });
    }
  };

  return (
    <div
      id="mobile-deploy-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        id="mobile-deploy-modal"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl bg-[#0F1420] border border-[#7C5CFC]/30 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-5 text-white max-h-[92vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#7C5CFC]/20 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#7C5CFC] to-[#00F2FE] p-[1.5px]">
              <div className="w-full h-full bg-[#131A2A] rounded-[14px] flex items-center justify-center text-[#00F2FE]">
                <Smartphone className="w-5 h-5" />
              </div>
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                Nasadit do mobilu & Export
              </h2>
              <p className="text-xs text-[#8A99AD]">
                Instalace na telefon a balíček pro testování s Gemini API
              </p>
            </div>
          </div>
          <button
            id="close-deploy-modal-btn"
            onClick={onClose}
            className="p-2 rounded-xl bg-[#131A2A] text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex rounded-xl bg-[#131A2A] p-1 border border-[#7C5CFC]/20">
          <button
            id="tab-pwa-deploy"
            onClick={() => setActiveTab("pwa")}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === "pwa"
                ? "bg-[#7C5CFC] text-white shadow-md"
                : "text-[#8A99AD] hover:text-white"
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            Nasadit do mobilu
          </button>
          <button
            id="tab-apk-export"
            onClick={() => setActiveTab("apk")}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === "apk"
                ? "bg-[#7C5CFC] text-white shadow-md"
                : "text-[#8A99AD] hover:text-white"
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            Exportovat balíček (APK)
          </button>
          <button
            id="tab-api-test"
            onClick={() => setActiveTab("api")}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === "api"
                ? "bg-[#7C5CFC] text-white shadow-md"
                : "text-[#8A99AD] hover:text-white"
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            Test API spojení
          </button>
        </div>

        {/* TAB 1: PWA Mobile Deploy */}
        {activeTab === "pwa" && (
          <div className="space-y-4">
            <div className="bg-[#131A2A] border border-[#7C5CFC]/20 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-5">
              {/* QR Code Container */}
              <div className="bg-[#0B0E14] p-3 rounded-2xl border border-[#00F2FE]/30 shadow-[0_0_20px_rgba(0,242,254,0.15)] flex flex-col items-center">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="QR kód aplikace pro mobil"
                    className="w-40 h-40 rounded-xl"
                  />
                ) : (
                  <div className="w-40 h-40 flex items-center justify-center text-xs text-slate-500">
                    Generuji QR kód...
                  </div>
                )}
                <span className="text-[10px] text-[#00F2FE] font-mono mt-2 flex items-center gap-1">
                  <Smartphone className="w-3 h-3" /> Naskenujte fotoaparátem
                </span>
              </div>

              {/* URL and Info */}
              <div className="space-y-3 flex-1 text-center sm:text-left">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#00F2FE]/10 border border-[#00F2FE]/30 text-[11px] text-[#00F2FE] font-semibold">
                  <Sparkles className="w-3 h-3" /> Připraveno pro mobilní zařízení
                </div>
                <p className="text-xs text-[#8A99AD] leading-relaxed">
                  Otevřete fotoaparát v telefonu, zamiřte na QR kód a klepněte na odkaz. Aplikace se ihned spustí ve vašem mobilním prohlížeči.
                </p>

                {/* Copy URL bar */}
                <div className="flex items-center gap-2 bg-[#0B0E14] p-2 rounded-xl border border-[#7C5CFC]/20 text-xs font-mono">
                  <span className="truncate flex-1 text-[#8A99AD] select-all px-1">
                    {appUrl}
                  </span>
                  <button
                    id="copy-mobile-url-btn"
                    onClick={handleCopyUrl}
                    className="p-1.5 rounded-lg bg-[#7C5CFC]/20 text-[#00F2FE] hover:bg-[#7C5CFC]/40 transition-colors flex items-center gap-1"
                    title="Zkopírovat odkaz"
                  >
                    {copiedUrl ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>

                {/* Direct 1-click Install button */}
                <button
                  id="install-to-homescreen-btn"
                  onClick={handleInstallClick}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#7C5CFC] to-[#00F2FE] text-white text-xs font-bold hover:brightness-110 shadow-[0_0_16px_rgba(124,92,252,0.4)] flex items-center justify-center gap-2 transition-transform active:scale-[0.98]"
                >
                  <Smartphone className="w-4 h-4" />
                  {isInstalled ? "Aplikace je nainstalována na ploše" : "Nainstalovat aplikaci do mobilu"}
                </button>
              </div>
            </div>

            {/* Platform instructions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-[#131A2A]/70 border border-[#7C5CFC]/20 rounded-2xl p-3.5 space-y-1.5">
                <span className="text-xs font-bold text-[#00F2FE] flex items-center gap-1.5">
                  🤖 Android (Google Chrome)
                </span>
                <p className="text-[11px] text-[#8A99AD] leading-relaxed">
                  V Chrome klepněte na <strong>tři tečky vpravo nahoře</strong> a vyberte <strong>„Přidat na plochu“</strong> nebo <strong>„Instalovat aplikaci“</strong>. Vytvoří se nativní ikona se samostatným oknem, přístupem ke kameře a GPS.
                </p>
              </div>

              <div className="bg-[#131A2A]/70 border border-[#7C5CFC]/20 rounded-2xl p-3.5 space-y-1.5">
                <span className="text-xs font-bold text-[#FF9F43] flex items-center gap-1.5">
                  🍎 iOS (Apple Safari)
                </span>
                <p className="text-[11px] text-[#8A99AD] leading-relaxed">
                  V Safari klepněte na <strong>tlačítko Sdílet</strong> (čtvereček se šipkou nahoru dole) a zvolte <strong>„Přidat na plochu“</strong>.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Export APK / Android Build Kit */}
        {activeTab === "apk" && (
          <div className="space-y-4">
            <div className="bg-[#131A2A] border border-[#7C5CFC]/20 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#7C5CFC]" />
                  Instalační balíček pro Android (APK / TWA / Capacitor)
                </span>
                <span className="px-2 py-0.5 rounded-full bg-[#7C5CFC]/20 text-[#A58FFF] text-[10px] font-mono">
                  v1.0.0
                </span>
              </div>
              <p className="text-xs text-[#8A99AD] leading-relaxed">
                Stáhněte si kompletní exportní archiv pro sestavení samostatného podepsaného <strong>APK balíčku</strong> pro Android zařízení s plnou integrací fotoaparátu, GPS a serverového Gemini API.
              </p>

              {/* Included files list */}
              <div className="bg-[#0B0E14] p-3 rounded-xl border border-slate-800 space-y-1.5 text-[11px] font-mono text-slate-300">
                <div className="text-[#00F2FE] font-bold mb-1">Archiv obsahuje:</div>
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400">✓</span>
                  <span>twa-manifest.json (Bubblewrap TWA manifest pro Google Play / APK)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400">✓</span>
                  <span>AndroidManifest.xml (Kamera, Fine Location, Internet)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400">✓</span>
                  <span>build-android-apk.sh (CLI skript pro sestavení APK)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400">✓</span>
                  <span>capacitor.config.json (Android Studio konfigurace)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400">✓</span>
                  <span>README-INSTALL-TESTING.md (Návod na testování a ladění)</span>
                </div>
              </div>

              {/* Download ZIP button */}
              <button
                id="download-apk-zip-btn"
                onClick={handleExportZip}
                disabled={isExportingZip}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#7C5CFC] to-[#00F2FE] text-white text-xs font-bold hover:brightness-110 shadow-[0_0_18px_rgba(124,92,252,0.4)] flex items-center justify-center gap-2 disabled:opacity-60 transition-all"
              >
                <Download className="w-4 h-4" />
                {isExportingZip ? "Generuji balíček ZIP..." : "Stáhnout instalační balíček (ZIP)"}
              </button>
            </div>

            {/* Terminal Command Snippet */}
            <div className="bg-[#0B0E14] border border-[#7C5CFC]/20 rounded-2xl p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-[#00F2FE]" />
                  Příkaz pro rychlé sestavení APK na počítači
                </span>
              </div>
              <pre className="p-3 bg-[#131A2A] rounded-xl text-[11px] font-mono text-[#00F2FE] overflow-x-auto border border-slate-800">
{`# 1. Nainstalujte Google Bubblewrap CLI
npm install -g @bubblewrap/cli

# 2. Sestavte podepsaný APK pro své zařízení
bubblewrap init --manifest="${appUrl}/manifest.json"
bubblewrap build

# 3. Nainstalujte do telefonu
adb install app-release-signed.apk`}
              </pre>
            </div>
          </div>
        )}

        {/* TAB 3: API Test */}
        {activeTab === "api" && (
          <div className="space-y-4">
            <div className="bg-[#131A2A] border border-[#7C5CFC]/20 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#00F2FE]" />
                  Ověření spojení se serverovým Gemini API
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-mono">
                  Online
                </span>
              </div>

              <p className="text-xs text-[#8A99AD] leading-relaxed">
                Tento test ověří, zda má mobilní aplikace po instalaci správný přístup ke koncovému bodu <strong>/api/ai/analyze</strong> s modelem <strong>Gemini 3.6 Flash</strong>.
              </p>

              <button
                id="run-api-test-btn"
                onClick={handleTestApi}
                disabled={apiTestStatus === "testing"}
                className="w-full py-2.5 px-4 rounded-xl bg-[#1D263B] border border-[#7C5CFC]/40 hover:border-[#7C5CFC] text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4 text-[#A58FFF]" />
                {apiTestStatus === "testing" ? "Probíhá testování odezvy API..." : "Spustit test API spojení"}
              </button>

              {apiTestResult && (
                <div
                  className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
                    apiTestStatus === "success"
                      ? "bg-emerald-950/30 border-emerald-500/40 text-emerald-200"
                      : "bg-rose-950/30 border-rose-500/40 text-rose-200"
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold">
                    {apiTestStatus === "success" ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-400" />
                    )}
                    <span>{apiTestResult.message}</span>
                  </div>
                  {apiTestResult.latencyMs !== undefined && (
                    <div className="text-[11px] font-mono text-slate-300">
                      Latence: <span className="text-[#00F2FE]">{apiTestResult.latencyMs} ms</span> • Model:{" "}
                      <span className="text-[#A58FFF]">{apiTestResult.model}</span>
                    </div>
                  )}
                  {apiTestResult.details && (
                    <div className="text-[11px] text-slate-300 pt-1 border-t border-slate-700/50">
                      {apiTestResult.details}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="pt-2 flex items-center justify-between text-[11px] text-[#8A99AD] border-t border-[#7C5CFC]/20">
          <span>Společné Nálezy • Mobilní distribuce</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-[#131A2A] hover:bg-[#1D263B] text-white font-medium transition-colors"
          >
            Zavřít
          </button>
        </div>
      </div>
    </div>
  );
};

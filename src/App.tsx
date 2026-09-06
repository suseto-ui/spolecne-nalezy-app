import React, { useState, useEffect } from "react";
import {
  Home,
  Package,
  Camera,
  MapPin,
  Settings as SettingsIcon,
} from "lucide-react";
import { ItemEntity, UserSettings } from "./types";
import { StorageService } from "./services/storage";
import { SplashScreen } from "./components/SplashScreen";
import { LandingScreen } from "./components/LandingScreen";
import { InventoryScreen } from "./components/InventoryScreen";
import { CameraScreen } from "./components/CameraScreen";
import { ItemDetailScreen } from "./components/ItemDetailScreen";
import { SharedMapScreen } from "./components/SharedMapScreen";
import { SettingsScreen } from "./components/SettingsScreen";

type ScreenType = "splash" | "landing" | "inventory" | "camera" | "map" | "settings" | "detail";

export function App() {
  const [currentScreen, setCurrentScreen] = useState<ScreenType>("splash");
  const [items, setItems] = useState<ItemEntity[]>([]);
  const [settings, setSettings] = useState<UserSettings>(StorageService.getSettings());
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [reshootForItemId, setReshootForItemId] = useState<string | null>(null);

  // Refresh items from local storage
  const reloadData = () => {
    setItems(StorageService.getItems());
    setSettings(StorageService.getSettings());
  };

  useEffect(() => {
    reloadData();
  }, []);

  const handleSelectItem = (id: string) => {
    setSelectedItemId(id);
    setCurrentScreen("detail");
  };

  const handleStartReshoot = (itemId: string) => {
    setReshootForItemId(itemId);
    setCurrentScreen("camera");
  };

  const handleItemCaptured = (itemId: string) => {
    reloadData();
    setReshootForItemId(null);
    setSelectedItemId(itemId);
    setCurrentScreen("detail");
  };

  return (
    <div className="relative min-h-screen bg-[#0B0E14] text-white select-none">
      {/* Screens */}
      {currentScreen === "splash" && (
        <SplashScreen onFinish={() => setCurrentScreen("landing")} />
      )}

      {currentScreen === "landing" && (
        <LandingScreen
          items={items}
          settings={settings}
          onNavigate={(scr) => setCurrentScreen(scr)}
        />
      )}

      {currentScreen === "inventory" && (
        <InventoryScreen
          items={items}
          settings={settings}
          onSelectItem={handleSelectItem}
          onAddNew={() => {
            setReshootForItemId(null);
            setCurrentScreen("camera");
          }}
          onNavigateSettings={() => setCurrentScreen("settings")}
        />
      )}

      {currentScreen === "camera" && (
        <CameraScreen
          settings={settings}
          reshootForItemId={reshootForItemId}
          onNavigateBack={() => {
            if (reshootForItemId) {
              setCurrentScreen("detail");
              setReshootForItemId(null);
            } else {
              setCurrentScreen("inventory");
            }
          }}
          onItemCaptured={handleItemCaptured}
        />
      )}

      {currentScreen === "detail" && selectedItemId && (
        <ItemDetailScreen
          itemId={selectedItemId}
          settings={settings}
          onNavigateBack={() => {
            reloadData();
            setCurrentScreen("inventory");
          }}
          onRequestReshoot={handleStartReshoot}
        />
      )}

      {currentScreen === "map" && (
        <SharedMapScreen
          items={items}
          settings={settings}
          onSelectItem={handleSelectItem}
          onNavigateSettings={() => setCurrentScreen("settings")}
          onRefreshItems={reloadData}
        />
      )}

      {currentScreen === "settings" && (
        <SettingsScreen
          settings={settings}
          onUpdateSettings={(updated) => setSettings(updated)}
          onRefreshAllData={reloadData}
        />
      )}

      {/* Persistent Bottom Navigation Bar (hidden on Splash and Camera screens) */}
      {currentScreen !== "splash" && currentScreen !== "camera" && (
        <nav className="fixed bottom-0 inset-x-0 z-30 bg-[#0B0E14]/90 backdrop-blur-md border-t border-[#7C5CFC]/20 px-2 py-2">
          <div className="max-w-md mx-auto flex items-center justify-around">
            <button
              onClick={() => setCurrentScreen("landing")}
              className={`flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all ${
                currentScreen === "landing"
                  ? "text-[#00F2FE]"
                  : "text-[#8A99AD] hover:text-white"
              }`}
            >
              <Home className="w-5 h-5" />
              <span className="text-[10px] font-medium">Domů</span>
            </button>

            <button
              onClick={() => setCurrentScreen("inventory")}
              className={`flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all ${
                currentScreen === "inventory" || currentScreen === "detail"
                  ? "text-[#7C5CFC]"
                  : "text-[#8A99AD] hover:text-white"
              }`}
            >
              <Package className="w-5 h-5" />
              <span className="text-[10px] font-medium">Katalog</span>
            </button>

            {/* Central Camera Shutter Nav Item */}
            <button
              onClick={() => {
                setReshootForItemId(null);
                setCurrentScreen("camera");
              }}
              className="relative -top-3 p-3 rounded-full bg-gradient-to-tr from-[#7C5CFC] to-[#00F2FE] text-white shadow-[0_0_20px_rgba(124,92,252,0.5)] hover:scale-105 active:scale-95 transition-transform"
              title="Fotoaparát & Nový nález"
            >
              <Camera className="w-6 h-6" />
            </button>

            <button
              onClick={() => setCurrentScreen("map")}
              className={`flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all ${
                currentScreen === "map"
                  ? "text-[#00F2FE]"
                  : "text-[#8A99AD] hover:text-white"
              }`}
            >
              <MapPin className="w-5 h-5" />
              <span className="text-[10px] font-medium">Mapa</span>
            </button>

            <button
              onClick={() => setCurrentScreen("settings")}
              className={`flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all ${
                currentScreen === "settings"
                  ? "text-[#7C5CFC]"
                  : "text-[#8A99AD] hover:text-white"
              }`}
            >
              <SettingsIcon className="w-5 h-5" />
              <span className="text-[10px] font-medium">Nastavení</span>
            </button>
          </div>
        </nav>
      )}
    </div>
  );
}
export default App;

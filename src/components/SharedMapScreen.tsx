import React, { useEffect, useRef, useState, useCallback } from "react";
import L from "leaflet";
import {
  MapPin,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  Layers,
  Filter,
  Navigation,
  Crosshair,
  Compass,
  Map as MapIcon,
  Maximize2,
  Share2,
} from "lucide-react";
import { AppHeader } from "./common/AppHeader";
import { PillBadge } from "./common/PillBadge";
import { ItemEntity, ItemStatusType, UserSettings } from "../types";
import { StorageService } from "../services/storage";

interface SharedMapScreenProps {
  items: ItemEntity[];
  settings: UserSettings;
  onSelectItem: (id: string) => void;
  onNavigateSettings: () => void;
  onRefreshItems: () => void;
}

type MapProviderType = "google_hybrid" | "google_road" | "osm" | "carto_dark";

interface MapLayerConfig {
  id: MapProviderType;
  name: string;
  badge: string;
  url: string;
  attribution: string;
  maxZoom: number;
  subdomains?: string;
}

const MAP_LAYERS: Record<MapProviderType, MapLayerConfig> = {
  google_hybrid: {
    id: "google_hybrid",
    name: "Google Satelit",
    badge: "Satelit + Cesty",
    url: "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
    attribution: "&copy; Google Maps",
    maxZoom: 20,
  },
  google_road: {
    id: "google_road",
    name: "Google Terén",
    badge: "Google Cesty",
    url: "https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}",
    attribution: "&copy; Google Maps",
    maxZoom: 20,
  },
  osm: {
    id: "osm",
    name: "OpenStreetMap",
    badge: "Klasická mapa",
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  },
  carto_dark: {
    id: "carto_dark",
    name: "Dark Tech",
    badge: "Tmavý styl",
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
    maxZoom: 19,
    subdomains: "abcd",
  },
};

export const SharedMapScreen: React.FC<SharedMapScreenProps> = ({
  items,
  settings,
  onSelectItem,
  onNavigateSettings,
  onRefreshItems,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const userLocationMarkerRef = useRef<L.Marker | null>(null);

  const [activeProvider, setActiveProvider] = useState<MapProviderType>("google_hybrid");
  const [showLayerMenu, setShowLayerMenu] = useState<boolean>(false);
  const [selectedItem, setSelectedItem] = useState<ItemEntity | null>(null);
  const [authorFilter, setAuthorFilter] = useState<"ALL" | "Husband" | "Wife">("ALL");
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const [userGpsPosition, setUserGpsPosition] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [clickedCoords, setClickedCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Filter items that have valid GPS coordinates
  const geoItems = items.filter(
    (i) =>
      typeof i.latitude === "number" &&
      typeof i.longitude === "number" &&
      !isNaN(i.latitude) &&
      !isNaN(i.longitude)
  );

  const filteredGeoItems = geoItems.filter((i) => {
    if (authorFilter === "ALL") return true;
    return i.author === authorFilter;
  });

  // Switch Tile Layer dynamically
  const switchTileLayer = useCallback((providerKey: MapProviderType) => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const config = MAP_LAYERS[providerKey];
    const newLayer = L.tileLayer(config.url, {
      attribution: config.attribution,
      maxZoom: config.maxZoom,
      subdomains: config.subdomains || "abc",
    });

    newLayer.addTo(map);
    tileLayerRef.current = newLayer;
    setActiveProvider(providerKey);
    setShowLayerMenu(false);
  }, []);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const defaultLat = geoItems[0]?.latitude || 50.0755;
      const defaultLng = geoItems[0]?.longitude || 14.4378;

      const map = L.map(mapContainerRef.current, {
        center: [defaultLat, defaultLng],
        zoom: 13,
        zoomControl: false,
      });

      // Default to Google Hybrid (Satellite + labels)
      const config = MAP_LAYERS[activeProvider];
      const initialTileLayer = L.tileLayer(config.url, {
        attribution: config.attribution,
        maxZoom: config.maxZoom,
        subdomains: config.subdomains || "abc",
      }).addTo(map);

      tileLayerRef.current = initialTileLayer;

      // Add zoom control to top-right
      L.control.zoom({ position: "topright" }).addTo(map);

      // Dedicated layer for item markers
      const markersLayer = L.layerGroup().addTo(map);
      markersLayerRef.current = markersLayer;

      // Handle click on map to inspect coordinates
      map.on("click", (e: L.LeafletMouseEvent) => {
        setClickedCoords({ lat: e.latlng.lat, lng: e.latlng.lng });
      });

      mapInstanceRef.current = map;

      // Force recalculation of container size after mounting to avoid Leaflet gray screen bug
      setTimeout(() => {
        map.invalidateSize();
      }, 200);
      setTimeout(() => {
        map.invalidateSize();
      }, 600);
    }

    // ResizeObserver ensures Leaflet updates whenever orientation or container size changes
    const resizeObserver = new ResizeObserver(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    });

    if (mapContainerRef.current) {
      resizeObserver.observe(mapContainerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Locate User GPS on map
  const handleFindMyLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolokace není v tomto prohlížeči podporována.");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setUserGpsPosition({ lat: latitude, lng: longitude, accuracy });
        setIsLocating(false);

        const map = mapInstanceRef.current;
        if (!map) return;

        // Remove previous location marker if any
        if (userLocationMarkerRef.current) {
          map.removeLayer(userLocationMarkerRef.current);
        }

        // Custom pulsing radar icon for user's location
        const userIcon = L.divIcon({
          className: "user-gps-pin",
          html: `
            <div style="position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;">
              <div style="position: absolute; inset: 0; border-radius: 50%; background: rgba(0, 242, 254, 0.4); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
              <div style="position: relative; width: 22px; height: 22px; background: #00F2FE; border: 3px solid #FFFFFF; border-radius: 50%; box-shadow: 0 0 15px #00F2FE;"></div>
            </div>
          `,
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        });

        const marker = L.marker([latitude, longitude], { icon: userIcon });
        marker.bindPopup(`<strong style="color:#0B0E14;">Vaše aktuální poloha</strong><br/><span style="color:#555; font-size:11px;">Přesnost: ±${Math.round(accuracy)}m</span>`);
        marker.addTo(map);
        userLocationMarkerRef.current = marker;

        map.flyTo([latitude, longitude], 16, { duration: 1.2 });
      },
      (err) => {
        console.warn("Geolocation error", err);
        setIsLocating(false);
        alert("Nepodařilo se načíst vaši přesnou GPS polohu. Zkontrolujte oprávnění v prohlížeči.");
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Center on all items
  const handleFitAllItems = () => {
    const map = mapInstanceRef.current;
    if (!map || filteredGeoItems.length === 0) return;

    const bounds = L.latLngBounds([]);
    filteredGeoItems.forEach((item) => {
      if (item.latitude != null && item.longitude != null) {
        bounds.extend([item.latitude, item.longitude]);
      }
    });
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
  };

  // Render markers whenever filtered items change
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();

    if (filteredGeoItems.length === 0) return;

    const bounds = L.latLngBounds([]);

    filteredGeoItems.forEach((item) => {
      if (item.latitude == null || item.longitude == null) return;

      const isHusband = item.author === "Husband";
      const markerColor = isHusband ? "#00F2FE" : "#FF9100";
      const pulseColor = isHusband ? "rgba(0, 242, 254, 0.4)" : "rgba(255, 145, 0, 0.4)";

      const customIcon = L.divIcon({
        className: "custom-map-pin",
        html: `
          <div style="
            position: relative;
            width: 36px;
            height: 36px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
          ">
            <div style="
              position: absolute;
              inset: 0;
              border-radius: 50%;
              background: ${pulseColor};
              animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;
            "></div>
            <div style="
              position: relative;
              width: 30px;
              height: 30px;
              background: #131A2A;
              border: 2px solid ${markerColor};
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 0 14px ${markerColor};
              color: ${markerColor};
              font-weight: 800;
              font-size: 12px;
            ">
              ${isHusband ? "M" : "Ž"}
            </div>
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      const marker = L.marker([item.latitude, item.longitude], { icon: customIcon });

      marker.on("click", () => {
        setSelectedItem(item);
        setClickedCoords(null);
        map.flyTo([item.latitude!, item.longitude!], Math.max(map.getZoom(), 15), { duration: 0.8 });
      });

      markersLayer.addLayer(marker);
      bounds.extend([item.latitude, item.longitude]);
    });

    if (filteredGeoItems.length > 0 && !selectedItem) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }
  }, [filteredGeoItems]);

  const handleStatusChange = (newStatus: ItemStatusType) => {
    if (!selectedItem) return;
    const updated = StorageService.updateItemStatus(selectedItem.id, newStatus, settings.currentAuthor);
    if (updated) {
      setSelectedItem(updated);
      onRefreshItems();
    }
  };

  const handleSync = () => {
    setIsSyncing(true);
    const result = StorageService.performManualSync(settings.currentAuthor);
    setSyncFeedback(result.message);
    onRefreshItems();
    setTimeout(() => {
      setIsSyncing(false);
      setTimeout(() => setSyncFeedback(null), 3000);
    }, 1000);
  };

  const focusItemOnMap = (item: ItemEntity) => {
    if (item.latitude != null && item.longitude != null) {
      setSelectedItem(item);
      setClickedCoords(null);
      mapInstanceRef.current?.flyTo([item.latitude, item.longitude], 17, { duration: 1 });
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0E14] flex flex-col text-white pb-20">
      <AppHeader
        title="Mapa nálezů s GPS"
        userName={settings.googleAccountName || settings.currentAuthor}
        onProfileClick={onNavigateSettings}
        subtitle={`${filteredGeoItems.length} zaznamenaných míst`}
      />

      {/* Control Bar: Filters, Layer Switcher, Sync */}
      <div className="bg-[#131A2A] border-b border-[#7C5CFC]/20 px-4 py-2 flex items-center justify-between gap-2 z-20 shadow-md">
        {/* Author filter pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <Filter className="w-3.5 h-3.5 text-[#8A99AD] flex-shrink-0" />
          {[
            { id: "ALL", label: "Všichni" },
            { id: "Husband", label: "Manžel (modrá)" },
            { id: "Wife", label: "Manželka (oranžová)" },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setAuthorFilter(f.id as any)}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all border ${
                authorFilter === f.id
                  ? "bg-[#7C5CFC] border-[#7C5CFC] text-white shadow-[0_0_10px_rgba(124,92,252,0.3)]"
                  : "bg-[#0B0E14] border-slate-800 text-[#8A99AD] hover:text-white"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Map Provider Selector & Sync */}
        <div className="flex items-center gap-2 flex-shrink-0 relative">
          <button
            id="btn-map-layer-switch"
            onClick={() => setShowLayerMenu(!showLayerMenu)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#182232] border border-[#00F2FE]/40 hover:border-[#00F2FE] rounded-xl text-xs font-semibold text-[#00F2FE] transition-colors"
            title="Změnit mapový podklad (Google Satelit, Terén, OSM, Dark)"
          >
            <Layers className="w-3.5 h-3.5 text-[#00F2FE]" />
            <span className="hidden sm:inline">{MAP_LAYERS[activeProvider].name}</span>
          </button>

          {/* Layer selection dropdown */}
          {showLayerMenu && (
            <div className="absolute top-10 right-0 z-50 w-56 bg-[#131A2A] border border-[#7C5CFC]/40 rounded-2xl p-2 shadow-[0_10px_30px_rgba(0,0,0,0.8)] backdrop-blur-md">
              <div className="text-[11px] font-bold text-[#8A99AD] px-2 py-1 mb-1 border-b border-slate-800">
                Výběr mapového podkladu
              </div>
              {(Object.keys(MAP_LAYERS) as MapProviderType[]).map((key) => {
                const layer = MAP_LAYERS[key];
                return (
                  <button
                    key={key}
                    onClick={() => switchTileLayer(key)}
                    className={`w-full text-left px-2.5 py-2 rounded-xl text-xs flex items-center justify-between transition-colors ${
                      activeProvider === key
                        ? "bg-[#7C5CFC]/30 text-white font-bold border border-[#7C5CFC]/50"
                        : "text-slate-300 hover:bg-[#1A2338] hover:text-white"
                    }`}
                  >
                    <span>{layer.name}</span>
                    <span className="text-[10px] text-[#00F2FE] font-mono">{layer.badge}</span>
                  </button>
                );
              })}
            </div>
          )}

          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#182232] border border-[#7C5CFC]/30 hover:border-[#7C5CFC]/60 rounded-xl text-xs font-semibold text-white hover:bg-[#1E2B3E] transition-all"
            title="Synchronizovat s Google Drive"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#00F2FE] ${isSyncing ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Sync</span>
          </button>
        </div>
      </div>

      {syncFeedback && (
        <div className="bg-[#00F2FE]/20 border-b border-[#00F2FE]/40 px-4 py-2 text-xs text-[#00F2FE] text-center font-medium">
          {syncFeedback}
        </div>
      )}

      {/* Main Map Canvas */}
      <div className="relative flex-1 w-full min-h-[460px] bg-[#0B0E14] overflow-hidden">
        <div ref={mapContainerRef} className="w-full h-full min-h-[460px]" />

        {/* Floating Quick Action Buttons on Map */}
        <div className="absolute top-4 left-4 z-[900] flex flex-col gap-2">
          {/* My GPS Location Button */}
          <button
            id="btn-my-location"
            onClick={handleFindMyLocation}
            disabled={isLocating}
            className="p-2.5 rounded-2xl bg-[#131A2A]/90 backdrop-blur-md border border-[#00F2FE]/40 text-[#00F2FE] hover:bg-[#1C253B] hover:scale-105 active:scale-95 transition-all shadow-[0_0_15px_rgba(0,242,254,0.35)] flex items-center justify-center"
            title="Zaměřit moji aktuální GPS polohu"
          >
            <Crosshair className={`w-5 h-5 ${isLocating ? "animate-spin" : ""}`} />
          </button>

          {/* Fit all items */}
          <button
            id="btn-fit-all"
            onClick={handleFitAllItems}
            className="p-2.5 rounded-2xl bg-[#131A2A]/90 backdrop-blur-md border border-[#7C5CFC]/40 text-white hover:bg-[#1C253B] hover:scale-105 active:scale-95 transition-all shadow-md flex items-center justify-center"
            title="Zobrazit všechny nálezy na mapě"
          >
            <Maximize2 className="w-5 h-5 text-[#A58FFF]" />
          </button>
        </div>

        {/* Map Provider indicator pill (bottom-left) */}
        <div className="absolute top-4 right-14 z-[900] px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/20 text-[10px] font-mono text-[#8A99AD] pointer-events-none">
          {MAP_LAYERS[activeProvider].name}
        </div>

        {/* Clicked Coords Inspection Floating Card */}
        {clickedCoords && !selectedItem && (
          <div className="absolute top-16 inset-x-4 max-w-sm mx-auto z-[990] bg-[#131A2A]/95 backdrop-blur-md rounded-2xl border border-[#00F2FE]/50 p-3 shadow-2xl">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <MapPin className="w-4 h-4 text-[#00F2FE]" />
                <span>Vybrané místo na mapě</span>
              </div>
              <button
                onClick={() => setClickedCoords(null)}
                className="text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>
            <p className="text-xs font-mono text-[#00F2FE] mb-2.5">
              GPS: {clickedCoords.lat.toFixed(5)}, {clickedCoords.lng.toFixed(5)}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${clickedCoords.lat},${clickedCoords.lng}`}
                target="_blank"
                rel="noreferrer"
                className="py-1.5 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-[11px] font-semibold text-white flex items-center justify-center gap-1.5"
              >
                <ExternalLink className="w-3 h-3 text-[#00F2FE]" />
                <span>Google Mapy</span>
              </a>
              <a
                href={`https://mapy.cz/zakladni?x=${clickedCoords.lng}&y=${clickedCoords.lat}&z=17&source=coor&id=${clickedCoords.lng}%2C${clickedCoords.lat}`}
                target="_blank"
                rel="noreferrer"
                className="py-1.5 px-2.5 rounded-xl bg-emerald-900/50 hover:bg-emerald-800/60 border border-emerald-500/40 text-[11px] font-semibold text-emerald-200 flex items-center justify-center gap-1.5"
              >
                <Compass className="w-3 h-3 text-emerald-400" />
                <span>Mapy.cz</span>
              </a>
            </div>
          </div>
        )}

        {/* Selected Item Detail Bottom Card */}
        {selectedItem && (
          <div className="absolute bottom-4 inset-x-4 max-w-lg mx-auto z-[1000] bg-[#131A2A]/95 backdrop-blur-md rounded-3xl border-2 border-[#7C5CFC]/50 p-4 shadow-[0_10px_35px_rgba(0,0,0,0.85)]">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-900 flex-shrink-0 border border-[#7C5CFC]/30">
                  {selectedItem.imageLocalPath ? (
                    <img
                      src={selectedItem.imageLocalPath}
                      alt={selectedItem.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-500">
                      Bez fota
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <PillBadge
                      label={selectedItem.author === "Husband" ? "Manžel" : "Manželka"}
                      variant={selectedItem.author === "Husband" ? "cyan" : "orange"}
                    />
                    <span className="text-[10px] font-mono text-[#8A99AD]">
                      {selectedItem.latitude?.toFixed(4)}°N, {selectedItem.longitude?.toFixed(4)}°E
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-white line-clamp-1">
                    {selectedItem.title}
                  </h3>

                  <p className="text-xs text-[#00F2FE] font-mono font-bold">
                    {selectedItem.estimatedPriceCzk}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedItem(null)}
                className="p-1 rounded-full text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Direct Links to Google Maps and Mapy.cz */}
            <div className="mt-3 pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${selectedItem.latitude},${selectedItem.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-[#00F2FE] text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-colors"
                  title="Otevřít v aplikaci Google Mapy"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Google Mapy</span>
                </a>

                <a
                  href={`https://mapy.cz/zakladni?x=${selectedItem.longitude}&y=${selectedItem.latitude}&z=17&source=coor&id=${selectedItem.longitude}%2C${selectedItem.latitude}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-emerald-900/50 hover:bg-emerald-800/60 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 border border-emerald-500/40 transition-colors"
                  title="Otevřít v české aplikaci Mapy.cz"
                >
                  <Compass className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Mapy.cz</span>
                </a>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onSelectItem(selectedItem.id)}
                  className="px-3.5 py-1.5 bg-gradient-to-r from-[#7C5CFC] to-[#00F2FE] text-white rounded-xl text-xs font-bold hover:brightness-110 flex items-center gap-1 shadow-md"
                >
                  <span>Detail</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Status change pills */}
            <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between">
              <span className="text-[10px] text-[#8A99AD]">Změnit stav:</span>
              <div className="flex gap-1">
                {(["ACTIVE", "ACQUIRED", "ARCHIVED"] as ItemStatusType[]).map((st) => (
                  <button
                    key={st}
                    onClick={() => handleStatusChange(st)}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold border transition-all ${
                      selectedItem.itemStatus === st
                        ? "bg-[#7C5CFC] border-[#7C5CFC] text-white"
                        : "bg-[#0B0E14] border-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    {st === "ACTIVE" ? "Aktivní" : st === "ACQUIRED" ? "Získáno" : "Archiv"}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Scrollable Tray of Geo-tagged items */}
      {filteredGeoItems.length > 0 && (
        <div className="bg-[#131A2A] border-t border-[#7C5CFC]/20 p-3">
          <div className="flex items-center justify-between text-xs text-[#8A99AD] mb-2 px-1">
            <span className="font-semibold text-white flex items-center gap-1.5">
              <MapIcon className="w-3.5 h-3.5 text-[#00F2FE]" />
              Nálezy na mapě ({filteredGeoItems.length})
            </span>
            <span className="text-[11px]">Klepnutím vycentrujete</span>
          </div>

          <div className="flex items-center gap-2.5 overflow-x-auto pb-1 scrollbar-none">
            {filteredGeoItems.map((item) => (
              <button
                key={item.id}
                onClick={() => focusItemOnMap(item)}
                className={`flex items-center gap-2 p-2 rounded-xl bg-[#0B0E14] border transition-all text-left flex-shrink-0 max-w-[200px] ${
                  selectedItem?.id === item.id
                    ? "border-[#00F2FE] shadow-[0_0_12px_rgba(0,242,254,0.3)]"
                    : "border-[#7C5CFC]/20 hover:border-[#7C5CFC]/50"
                }`}
              >
                <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-900 flex-shrink-0">
                  {item.imageLocalPath ? (
                    <img src={item.imageLocalPath} alt={item.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[9px] text-slate-500">
                      Foto
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <h5 className="text-xs font-bold text-white truncate">{item.title}</h5>
                  <p className="text-[10px] font-mono text-[#00F2FE] truncate">{item.estimatedPriceCzk}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

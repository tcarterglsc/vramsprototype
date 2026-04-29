import React, { useEffect, useRef, useState } from "react";
import Map from "@arcgis/core/Map";
import MapView from "@arcgis/core/views/MapView";
import FeatureLayer from "@arcgis/core/layers/FeatureLayer";
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer";
import Graphic from "@arcgis/core/Graphic";
import Expand from "@arcgis/core/widgets/Expand";
import Home from "@arcgis/core/widgets/Home";
import "@arcgis/map-components/components/arcgis-basemap-gallery";

import "./mapStyle.css";
import LoadingOverlay from "./LoadingOverlay";
import ArcgisInfoDrawer from "./ArcgisInfoDrawer";
import VramsLayersPanel from "./VramsLayersPanel";
import VehicleProfileModal from "./VehicleProfileModal";
import {
  vehicleMappings,
  vehicleTemplate,
  hqMappings,
  hqTemplate,
  STATUS_COLORS,
  STATUS_LABELS,
} from "./VramsMapDataMappings";
import { useGetVramsVehiclesQuery, useGetVramsDispatchTodayQuery } from "../VramsApi";
import type { Vehicle, Dispatch } from "../types/index";
import { useNavigate } from "react-router";

/* ── HQ location (Georgetown, Guyana) ─────────────────────────────── */
const HQ_LNG = -58.1551;
const HQ_LAT = 6.8013;

/** Stable pseudo-random coordinate seeded by vehicle id */
function seedCoord(id: number): [number, number] {
  const sin = (s: number) => { const x = Math.sin(s) * 10000; return x - Math.floor(x); };
  const lng = HQ_LNG + (sin(id * 13) * 0.14 - 0.07);
  const lat = HQ_LAT + (sin(id * 7)  * 0.10 - 0.05);
  return [lng, lat];
}

/* ── SVG pin icons ──────────────────────────────────────────────────── */

/**
 * Renders a colored location-pin SVG with a car icon inside.
 * Uses percent-encoding (not btoa) so all characters survive safely.
 */
function makeVehiclePin(color: string): string {
  // Inline SVG — car path from Material Icons "directions_car" (24×24 vb),
  // scaled/translated to fit inside the pin's white circle (cx=15, cy=13, r=7.5).
  const svg = [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 42" width="30" height="42">',
    '<ellipse cx="15" cy="40" rx="4" ry="1.5" fill="rgba(0,0,0,0.18)"/>',
    `<path fill="${color}" stroke="white" stroke-width="1.5" d="M15 1C8.4 1 3 6.4 3 13c0 9.8 12 27 12 27S27 22.8 27 13C27 6.4 21.6 1 15 1z"/>`,
    '<circle cx="15" cy="13" r="7.5" fill="white"/>',
    '<g transform="translate(8.6,6.6) scale(0.535)">',
    `<path fill="${color}" d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>`,
    '</g>',
    '</svg>',
  ].join('');
  // percent-encode → works in all browsers without btoa charset issues
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function makeHqPin(): string {
  const color = "#1e3a8a";
  const svg = [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 42" width="30" height="42">',
    '<ellipse cx="15" cy="40" rx="4" ry="1.5" fill="rgba(0,0,0,0.18)"/>',
    `<path fill="${color}" stroke="white" stroke-width="1.5" d="M15 1C8.4 1 3 6.4 3 13c0 9.8 12 27 12 27S27 22.8 27 13C27 6.4 21.6 1 15 1z"/>`,
    '<circle cx="15" cy="13" r="7.5" fill="white"/>',
    '<g transform="translate(8.6,6.6) scale(0.535)">',
    `<path fill="${color}" d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>`,
    '</g>',
    '</svg>',
  ].join('');
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/**
 * Larger glowing pin used to highlight the selected vehicle on the map.
 * Includes a transparent outer ring so it stands out from regular pins.
 */
function makeSelectionPin(color: string): string {
  const svg = [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 62" width="50" height="62">',
    // Outer glow rings
    `<circle cx="25" cy="22" r="22" fill="${color}" opacity="0.18"/>`,
    `<circle cx="25" cy="22" r="17" fill="${color}" opacity="0.14"/>`,
    // Drop shadow
    '<ellipse cx="25" cy="59" rx="7" ry="2.5" fill="rgba(0,0,0,0.2)"/>',
    // Pin body
    `<path fill="${color}" stroke="white" stroke-width="2" d="M25 4C16.2 4 9 11.2 9 20c0 12 16 38 16 38S41 32 41 20C41 11.2 33.8 4 25 4z"/>`,
    // White circle
    '<circle cx="25" cy="20" r="10" fill="white"/>',
    // Car icon (scaled larger to fit bigger circle)
    '<g transform="translate(13,13) scale(0.99)">',
    `<path fill="${color}" d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>`,
    '</g>',
    '</svg>',
  ].join('');
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** PictureMarkerSymbol for a given status.
 *  yoffset = half the pin height so the TIP (bottom) sits on the coordinate. */
function vehicleSymbol(color: string, large = false): any {
  return {
    type: "picture-marker",
    url: makeVehiclePin(color),
    width:   large ? "34px" : "28px",
    height:  large ? "48px" : "40px",
    yoffset: large ? "24px" : "20px",   // half height → tip on coordinate
  };
}

const hqSymbol: any = {
  type: "picture-marker",
  url: makeHqPin(),
  width:   "34px",
  height:  "48px",
  yoffset: "24px",
};

/* ── Helpers ────────────────────────────────────────────────────────── */

function toGeoJSON(
  vehicles: Vehicle[],
  dispatchMap: Record<number, Dispatch>
): any {
  return {
    type: "FeatureCollection",
    features: vehicles.map(v => {
      const [lng, lat] = seedCoord(v.id);
      const dispatch = dispatchMap[v.id];
      return {
        type: "Feature",
        geometry: { type: "Point", coordinates: [lng, lat] },
        properties: {
          id:           v.id,
          plate:        v.plate            ?? "",
          make:         v.make             ?? "",
          model:        v.model            ?? "",
          vehicle_type: v.vehicle_type     ?? "",
          status:       v.status           ?? "available",
          color:        v.color            ?? "N/A",
          year:         v.year             ?? 0,
          driver_name:  dispatch?.driver?.name         ?? "Unassigned",
          destination:  dispatch?.request?.destination ?? "N/A",
        },
      };
    }),
  };
}

function featuresToGraphics(geoJson: any): Graphic[] {
  return (geoJson?.features ?? []).map((f: any) =>
    new Graphic({
      geometry: {
        type: "point",
        longitude: f.geometry.coordinates[0],
        latitude:  f.geometry.coordinates[1],
      } as any,
      attributes: { id: f.properties.id, ...f.properties },
    })
  );
}

/* ══════════════════════════════════════════════════════════════════════
   VramsMap
══════════════════════════════════════════════════════════════════════ */
export default function VramsMap() {
  const navigate = useNavigate();
  const mapDivRef = useRef<HTMLDivElement>(null);

  const { data: vehiclesPage, isLoading: vehiclesLoading } = useGetVramsVehiclesQuery({});
  const { data: todayDispatches } = useGetVramsDispatchTodayQuery();
  const vehicles: Vehicle[] = vehiclesPage?.items ?? [];

  const dispatchMap: Record<number, Dispatch> = (todayDispatches ?? []).reduce(
    (acc: Record<number, Dispatch>, d: Dispatch) => {
      if (d.vehicle_id) acc[d.vehicle_id] = d;
      return acc;
    },
    {}
  );

  /* Layer visibility toggles */
  const [showAvailable,  setShowAvailable]  = useState(true);
  const [showDispatched, setShowDispatched] = useState(true);
  const [showInService,  setShowInService]  = useState(true);
  const [showOffline,    setShowOffline]    = useState(true);
  const [showHq,         setShowHq]         = useState(true);

  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [profileOpen,     setProfileOpen]     = useState(false);
  const [layerLoading,    setLayerLoading]    = useState(false);

  const mapRef  = useRef<Map | null>(null);
  const viewRef = useRef<MapView | null>(null);

  const availableLayerRef  = useRef<FeatureLayer | null>(null);
  const dispatchedLayerRef = useRef<FeatureLayer | null>(null);
  const inServiceLayerRef  = useRef<FeatureLayer | null>(null);
  const offlineLayerRef    = useRef<FeatureLayer | null>(null);
  const hqLayerRef         = useRef<FeatureLayer | null>(null);
  /** Highlighted selection pin – separate GraphicsLayer on top of all others */
  const selectionLayerRef  = useRef<GraphicsLayer | null>(null);

  const counts = {
    available:  vehicles.filter(v => v.status === "available").length,
    dispatched: vehicles.filter(v => v.status === "dispatched").length,
    in_service: vehicles.filter(v => v.status === "in_service").length,
    offline:    vehicles.filter(v => v.status === "out_of_service").length,
  };

  /* ── Init ArcGIS map ─────────────────────────────────────────────── */
  useEffect(() => {
    if (!mapDivRef.current) return;

    const map  = new Map({ basemap: "streets-navigation-vector" });
    const view = new MapView({
      container: mapDivRef.current,
      map,
      center: [HQ_LNG, HQ_LAT],
      zoom: 13,
      ui: { components: [] },   // clear ALL default widgets
    });

    /* Re-add zoom in the bottom-right corner */
    view.ui.add("zoom", "bottom-right");

    /* Home button to snap back to HQ */
    const home = new Home({ view });
    view.ui.add(home, "bottom-right");

    /* Basemap gallery as collapsible panel — bottom-right */
    const galleryContainer = document.createElement("div");
    galleryContainer.style.height = "320px";
    galleryContainer.style.width  = "240px";
    galleryContainer.style.overflowY = "auto";
    const galleryEl = document.createElement("arcgis-basemap-gallery") as any;
    galleryContainer.appendChild(galleryEl);
    customElements.whenDefined("arcgis-basemap-gallery").then(() => {
      galleryEl.view = view;
    });

    const bgExpand = new Expand({
      view,
      content: galleryContainer,
      expandIcon: "basemap",
      collapseIcon: "x",
      expanded: false,
      expandTooltip: "Switch Basemap",
    });
    view.ui.add(bgExpand, "bottom-right");

    /* Click → identify vehicle */
    view.on("click", async (event) => {
      const res = await view.hitTest(event);
      const hit = (res.results[0] as any)?.graphic?.attributes;
      if (hit?.plate) {
        const found = (mapRef.current as any)._vehicles?.find((v: Vehicle) => v.id === hit.id);
        if (found) { setSelectedVehicle(found); return; }
      }
      setSelectedVehicle(null);
    });

    mapRef.current  = map;
    viewRef.current = view;
    return () => { view.destroy(); };
  }, []);

  /* ── Drop / remove the selection-highlight pin whenever selectedVehicle changes ── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear previous selection pin
    if (selectionLayerRef.current) {
      map.remove(selectionLayerRef.current);
      selectionLayerRef.current = null;
    }

    if (!selectedVehicle) return;

    const [lng, lat] = seedCoord(selectedVehicle.id);
    const color = STATUS_COLORS[selectedVehicle.status] ?? "#9ca3af";

    const layer = new GraphicsLayer({
      title: "Selected Vehicle",
      graphics: [
        new Graphic({
          geometry: { type: "point", longitude: lng, latitude: lat } as any,
          symbol: {
            type: "picture-marker",
            url: makeSelectionPin(color),
            width:   "50px",
            height:  "62px",
            yoffset: "31px",   // half height — pin tip on the exact coordinate
          } as any,
        }),
      ],
    });

    selectionLayerRef.current = layer;
    map.add(layer);   // added on top of all feature layers

    // Fly the map to the selected vehicle
    viewRef.current?.goTo(
      { center: [lng, lat], zoom: 16 },
      { animate: true, duration: 600 }
    );
  }, [selectedVehicle]);

  /* ── Upsert a FeatureLayer ──────────────────────────────────────── */
  function syncLayer(
    layerRef: React.MutableRefObject<FeatureLayer | null>,
    graphics: Graphic[],
    show: boolean,
    title: string,
    symbol: any,
    mappings: any[],
    popupTpl: any
  ) {
    const map = mapRef.current;
    if (!map) return;
    if (layerRef.current) { map.remove(layerRef.current); layerRef.current = null; }
    if (!show || graphics.length === 0) return;

    const layer = new FeatureLayer({
      title,
      source: graphics,
      objectIdField: "id",
      fields: mappings,
      renderer: { type: "simple", symbol } as any,
      popupTemplate: popupTpl,
    });
    layerRef.current = layer;
    map.add(layer);
  }

  /* ── Re-sync layers when data / toggles change ───────────────────── */
  useEffect(() => {
    if (!mapRef.current || vehicles.length === 0) return;

    (mapRef.current as any)._vehicles = vehicles;

    const geoJson = toGeoJSON(vehicles, dispatchMap);
    const all     = featuresToGraphics(geoJson);
    const by      = (s: string) => all.filter(g => g.attributes.status === s);

    setLayerLoading(true);

    syncLayer(availableLayerRef,  by("available"),       showAvailable,  "Available",
      vehicleSymbol(STATUS_COLORS.available),       vehicleMappings, vehicleTemplate);

    syncLayer(dispatchedLayerRef, by("dispatched"),      showDispatched, "En Route",
      vehicleSymbol(STATUS_COLORS.dispatched, true), vehicleMappings, vehicleTemplate);

    syncLayer(inServiceLayerRef,  by("in_service"),      showInService,  "In Service",
      vehicleSymbol(STATUS_COLORS.in_service),       vehicleMappings, vehicleTemplate);

    syncLayer(offlineLayerRef,    by("out_of_service"),  showOffline,    "Offline",
      vehicleSymbol(STATUS_COLORS.out_of_service),   vehicleMappings, vehicleTemplate);

    syncLayer(hqLayerRef,
      [ new Graphic({
          geometry: { type: "point", longitude: HQ_LNG, latitude: HQ_LAT } as any,
          attributes: { id: 0, name: "Fleet HQ", type: "Base" },
        }) ],
      showHq, "Fleet HQ", hqSymbol, hqMappings, hqTemplate
    );

    setLayerLoading(false);
  }, [
    vehicles, todayDispatches,
    showAvailable, showDispatched, showInService, showOffline, showHq,
  ]);

  const selectedDispatch = selectedVehicle ? dispatchMap[selectedVehicle.id] : undefined;

  return (
    <div style={{ display: "flex", height: "calc(100vh - 64px)", width: "100%", background: "#f8fafc" }}>

      {/* ── Left sidebar ── */}
      <div style={{
        width: 300, flexShrink: 0, background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
        borderRight: "1px solid #dbe3ef",
        display: "flex", flexDirection: "column", overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{ padding: "20px 22px 14px", borderBottom: "1px solid #e2e8f0" }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#111827" }}>Fleet Map</h2>
          <p style={{ margin: "2px 0 0", fontSize: 13, color: "#6b7280" }}>
            Live vehicle positions &amp; status
          </p>
        </div>

        {/* Status quick-count pills */}
        <div style={{ padding: "10px 16px", borderBottom: "1px solid #f3f4f6", display: "flex", flexWrap: "wrap", gap: 6 }}>
          {[
            { label: "All",       count: vehicles.length,    bg: "#f3f4f6", fg: "#374151"  },
            { label: "Available", count: counts.available,   bg: "#dcfce7", fg: "#15803d"  },
            { label: "En Route",  count: counts.dispatched,  bg: "#dbeafe", fg: "#1d4ed8"  },
            { label: "Service",   count: counts.in_service,  bg: "#fef3c7", fg: "#b45309"  },
            { label: "Offline",   count: counts.offline,     bg: "#fee2e2", fg: "#b91c1c"  },
          ].map(p => (
            <span key={p.label} style={{
              padding: "3px 9px", borderRadius: 20, fontSize: 11, fontWeight: 700,
              background: p.bg, color: p.fg,
            }}>
              {p.label} {p.count}
            </span>
          ))}
        </div>

        {/* Vehicle list */}
        <div style={{ flex: 1, overflowY: "auto", padding: "4px 0" }}>
          {vehiclesLoading ? (
            <p style={{ padding: 24, textAlign: "center", color: "#9ca3af", fontSize: 13 }}>Loading vehicles…</p>
          ) : vehicles.length === 0 ? (
            <p style={{ padding: 24, textAlign: "center", color: "#9ca3af", fontSize: 13 }}>No vehicles found</p>
          ) : vehicles.map(v => {
            const color    = STATUS_COLORS[v.status] ?? "#9ca3af";
            const dispatch = dispatchMap[v.id];
            const selected = selectedVehicle?.id === v.id;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => setSelectedVehicle(v)}
                style={{
                  width: "100%", textAlign: "left", padding: "12px 20px",
                  border: "none", cursor: "pointer",
                  borderBottom: "1px solid #f3f4f6",
                  borderLeft: `4px solid ${selected ? color : "transparent"}`,
                  background: selected ? color + "0d" : "transparent",
                  transition: "background 0.15s",
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: color, flexShrink: 0, marginTop: 3 }} />
                    <div>
                      <p style={{ margin: 0, fontSize: 15, fontWeight: 700, fontFamily: "monospace", color: "#111827" }}>{v.plate}</p>
                      <p style={{ margin: "1px 0 0", fontSize: 12, color: "#6b7280" }}>{v.make} {v.model}</p>
                      {dispatch && (
                        <p style={{ margin: "2px 0 0", fontSize: 11, color: "#2563eb" }}>
                          → {dispatch.request?.destination ?? "En Route"}
                        </p>
                      )}
                    </div>
                  </div>
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 8,
                    background: color + "20", color, flexShrink: 0,
                  }}>
                    {STATUS_LABELS[v.status] ?? v.status}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Today's dispatches footer */}
        {(todayDispatches ?? []).length > 0 && (
          <div style={{ borderTop: "1px solid #e5e7eb", padding: "14px 20px", background: "#eff6ff" }}>
            <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 700, color: "#1d4ed8", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Today's Dispatches
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {(todayDispatches ?? []).slice(0, 3).map((d: Dispatch) => (
                <div key={d.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ fontWeight: 700, fontFamily: "monospace", color: "#1e3a8a" }}>{d.vehicle?.plate ?? "—"}</span>
                  <span style={{ color: "#6b7280", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 140 }}>
                    → {d.request?.destination ?? "—"}
                  </span>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => navigate("/apps/vrams/dispatch")}
              style={{
                marginTop: 10, width: "100%", padding: "8px 0",
                fontSize: 12, fontWeight: 700, color: "#2563eb",
                background: "#fff", border: "1px solid #bfdbfe",
                borderRadius: 8, cursor: "pointer",
              }}
            >
              View Dispatch Board →
            </button>
          </div>
        )}
      </div>

      {/* ── ArcGIS map ── */}
      <div style={{ flex: 1, position: "relative" }}>

        {/* Map canvas */}
        <div
          ref={mapDivRef}
          id="vrams-map"
          className="map-container"
          style={{ width: "100%", height: "100%" }}
        />

        {/* Fleet Layers panel — absolute overlay, top-right of map */}
        <div style={{ position: "absolute", top: 12, right: 12, zIndex: 1000 }}>
          <VramsLayersPanel
            showAvailable={showAvailable}   setShowAvailable={setShowAvailable}
            showDispatched={showDispatched} setShowDispatched={setShowDispatched}
            showInService={showInService}   setShowInService={setShowInService}
            showOffline={showOffline}       setShowOffline={setShowOffline}
            showHq={showHq}                 setShowHq={setShowHq}
            counts={counts}
          />
        </div>

        <LoadingOverlay layerLoading={layerLoading || vehiclesLoading} />

        {/* Selected vehicle info drawer
            stopPropagation on the wrapper prevents the ArcGIS map's native
            click handler from also firing and de-selecting while navigating. */}
        <ArcgisInfoDrawer showInfoDrawer={!!selectedVehicle} width="460px">
          {selectedVehicle && (
            <div
              style={{ fontFamily: "Arial, sans-serif" }}
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                {/* Coloured pin preview — uses the same encoding as the map markers */}
                <img
                  src={makeVehiclePin(STATUS_COLORS[selectedVehicle.status] ?? "#9ca3af")}
                  alt="pin"
                  style={{ width: 22, height: 32, objectFit: "contain" }}
                />
                <div style={{ textAlign: "left" }}>
                  <p style={{ margin: 0, fontSize: 20, fontWeight: 800, fontFamily: "monospace", color: "#111827" }}>
                    {selectedVehicle.plate}
                  </p>
                  <p style={{ margin: 0, fontSize: 13, color: "#6b7280" }}>
                    {selectedVehicle.make} {selectedVehicle.model} · {selectedVehicle.vehicle_type}
                  </p>
                </div>
                <span style={{
                  marginLeft: "auto",
                  padding: "4px 12px", borderRadius: 20,
                  background: (STATUS_COLORS[selectedVehicle.status] ?? "#9ca3af") + "22",
                  color: STATUS_COLORS[selectedVehicle.status] ?? "#9ca3af",
                  fontWeight: 700, fontSize: 12,
                }}>
                  ● {STATUS_LABELS[selectedVehicle.status] ?? selectedVehicle.status}
                </span>
              </div>

              {selectedDispatch && (
                <div style={{
                  fontSize: 13, color: "#374151", textAlign: "left",
                  marginBottom: 10, padding: "8px 12px",
                  background: "#f8fafc", borderRadius: 8,
                }}>
                  <strong>Driver:</strong> {selectedDispatch.driver?.name ?? "—"}<br />
                  <strong>Route:</strong> → {selectedDispatch.request?.destination ?? "—"}
                </div>
              )}

              <div style={{ display: "flex", gap: 8 }}>
                {/* Opens modal with vehicle details — stays on map */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setProfileOpen(true);
                  }}
                  style={{
                    flex: 1, padding: "9px 0",
                    background: "#2563eb", color: "#fff",
                    border: "none", borderRadius: 8,
                    fontWeight: 700, fontSize: 13, cursor: "pointer",
                  }}
                >
                  View Profile
                </button>
                {/* Opens dispatch board */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate("/apps/vrams/dispatch");
                  }}
                  style={{
                    flex: 1, padding: "9px 0",
                    background: "#f9fafb", color: "#374151",
                    border: "1px solid #d1d5db", borderRadius: 8,
                    fontWeight: 700, fontSize: 13, cursor: "pointer",
                  }}
                >
                  Dispatch
                </button>
                {/* Close drawer — stays on map */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedVehicle(null);
                  }}
                  style={{
                    padding: "9px 14px",
                    background: "#f9fafb", color: "#6b7280",
                    border: "1px solid #d1d5db", borderRadius: 8,
                    fontWeight: 700, fontSize: 13, cursor: "pointer",
                  }}
                >
                  ✕
                </button>
              </div>
            </div>
          )}
        </ArcgisInfoDrawer>
      </div>

      {/* ── Vehicle Profile Modal — opens when "View Profile" is clicked ── */}
      <VehicleProfileModal
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        vehicle={selectedVehicle}
        dispatch={selectedVehicle ? dispatchMap[selectedVehicle.id] : undefined}
      />
    </div>
  );
}

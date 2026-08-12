"use client";

import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Circle,
  Polyline,
  Marker,
  useMapEvents,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import { type MapProps, missionStyle } from "./types";

function ClickHandler({ onClick }: { onClick?: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onClick?.(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function FitBounds({
  fitTo,
  markers,
  area,
  polyline,
}: Pick<MapProps, "fitTo" | "markers" | "area" | "polyline">) {
  const map = useMap();
  useEffect(() => {
    try {
      if (fitTo === "area" && area) {
        const circle = L.circle([area.lat, area.lng], { radius: area.radius });
        map.fitBounds(circle.getBounds(), { padding: [40, 40] });
      } else if (fitTo === "polyline" && polyline && polyline.length > 1) {
        map.fitBounds(L.latLngBounds(polyline), { padding: [50, 50] });
      } else if (fitTo === "markers" && markers && markers.length > 0) {
        const bounds = L.latLngBounds(markers.map((m) => [m.lat, m.lng]));
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
      }
    } catch {
      /* noop */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitTo, JSON.stringify(markers?.map((m) => m.id)), JSON.stringify(area), polyline?.length]);
  return null;
}

function runnerIcon(heading = 0) {
  return L.divIcon({
    className: "rd-pin",
    html: `<div style="transform:translate(-50%,-50%)">
      <div style="position:relative;width:22px;height:22px">
        <div style="position:absolute;inset:0;border-radius:9999px;background:#10b981;opacity:.25;animation:pulse-ring 1.8s infinite"></div>
        <div style="position:absolute;inset:4px;border-radius:9999px;background:#10b981;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>
      </div></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

function pinIcon(color: string, emoji = "") {
  return L.divIcon({
    className: "rd-pin",
    html: `<div style="transform:translate(-50%,-100%)">
      <div style="width:26px;height:26px;border-radius:9999px 9999px 9999px 2px;transform:rotate(45deg);background:${color};border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center">
        <span style="transform:rotate(-45deg);font-size:12px">${emoji}</span>
      </div></div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 26],
  });
}

export default function LeafletMap({
  center,
  zoom = 15,
  markers = [],
  polyline,
  area,
  onClick,
  className,
  fitTo = null,
  interactive = true,
}: MapProps) {
  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={zoom}
      className={className}
      style={{ height: "100%", width: "100%" }}
      scrollWheelZoom={interactive}
      dragging={interactive}
      doubleClickZoom={interactive}
      zoomControl={interactive}
      attributionControl={false}
    >
      <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />

      {area && (
        <Circle
          center={[area.lat, area.lng]}
          radius={area.radius}
          pathOptions={{
            color: "#6366f1",
            fillColor: "#6366f1",
            fillOpacity: 0.08,
            weight: 1.5,
            dashArray: "6 6",
          }}
        />
      )}

      {polyline && polyline.length > 1 && (
        <>
          <Polyline
            positions={polyline}
            pathOptions={{ color: "#059669", weight: 5, opacity: 0.85 }}
          />
          <Polyline
            positions={polyline}
            pathOptions={{ color: "#fff", weight: 1.5, opacity: 0.5, dashArray: "1 10" }}
          />
        </>
      )}

      {markers.map((m) => {
        if (m.kind === "runner") {
          return (
            <Marker
              key={m.id}
              position={[m.lat, m.lng]}
              icon={runnerIcon(m.pulse ? 0 : 0)}
            />
          );
        }
        if (m.kind === "start") {
          return (
            <Marker key={m.id} position={[m.lat, m.lng]} icon={pinIcon("#0ea5e9", "🚩")} />
          );
        }
        if (m.kind === "submission") {
          return (
            <CircleMarker
              key={m.id}
              center={[m.lat, m.lng]}
              radius={7}
              pathOptions={{
                color: "#fff",
                weight: 2,
                fillColor: m.status === "APPROVED" ? "#10b981" : m.status === "REJECTED" ? "#f43f5e" : "#f59e0b",
                fillOpacity: 1,
              }}
              eventHandlers={{ click: () => m.onClick?.() }}
            />
          );
        }
        // mission
        const s = missionStyle(m.priority);
        const done = m.status && m.status !== "OPEN";
        return (
          <CircleMarker
            key={m.id}
            center={[m.lat, m.lng]}
            radius={s.radius}
            pathOptions={{
              color: "#fff",
              weight: 1.5,
              fillColor: done ? "#94a3b8" : s.color,
              fillOpacity: done ? 0.5 : 0.95,
            }}
            eventHandlers={{ click: () => m.onClick?.() }}
          />
        );
      })}

      {onClick && <ClickHandler onClick={onClick} />}
      <FitBounds fitTo={fitTo} markers={markers} area={area} polyline={polyline} />
    </MapContainer>
  );
}

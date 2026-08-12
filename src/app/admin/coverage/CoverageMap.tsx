"use client";

import { MapContainer, TileLayer, Rectangle } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { gridBounds } from "@/lib/engines/coverage";
import { stalenessColor, type CoverageCellView } from "./CoverageClient";

export default function CoverageMap({
  center,
  cells,
  onHover,
}: {
  center: { lat: number; lng: number };
  cells: CoverageCellView[];
  gridSizeM: number;
  onHover?: (c: CoverageCellView | null) => void;
}) {
  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={14}
      className="h-full w-full"
      scrollWheelZoom
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        attribution="&copy; OpenStreetMap &copy; CARTO"
      />
      {cells.map((c) => (
        <Rectangle
          key={c.key}
          bounds={gridBounds(c.key)}
          pathOptions={{
            color: stalenessColor(c.staleness),
            weight: 0.5,
            fillColor: stalenessColor(c.staleness),
            fillOpacity: c.count === 0 ? 0.32 : 0.5,
          }}
          eventHandlers={{
            mouseover: () => onHover?.(c),
            mouseout: () => onHover?.(null),
          }}
        />
      ))}
    </MapContainer>
  );
}

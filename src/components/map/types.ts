export type MapMarker = {
  id: string;
  lat: number;
  lng: number;
  kind?: "mission" | "runner" | "submission" | "start" | "target";
  priority?: number; // 1~5 (mission)
  status?: string;
  label?: string;
  pulse?: boolean;
  onClick?: () => void;
};

export type MapArea = {
  lat: number;
  lng: number;
  radius: number; // m
};

export type MapProps = {
  center: { lat: number; lng: number };
  zoom?: number;
  markers?: MapMarker[];
  polyline?: [number, number][];
  area?: MapArea | null;
  onClick?: (lat: number, lng: number) => void;
  className?: string;
  fitTo?: "markers" | "area" | "polyline" | null;
  interactive?: boolean;
  runnerHeading?: number;
};

/** 미션 우선순위 → 색/크기 */
export function missionStyle(priority = 3): { color: string; radius: number } {
  switch (priority) {
    case 5:
      return { color: "#4f46e5", radius: 9 }; // accent (고가치)
    case 4:
      return { color: "#059669", radius: 8 };
    case 3:
      return { color: "#10b981", radius: 7 };
    case 2:
      return { color: "#34d399", radius: 6 };
    default:
      return { color: "#94a3b8", radius: 5 };
  }
}

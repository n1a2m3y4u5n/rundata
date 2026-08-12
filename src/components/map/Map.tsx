"use client";

import dynamic from "next/dynamic";
import { type MapProps } from "./types";

const LeafletMap = dynamic(() => import("./LeafletMap"), {
  ssr: false,
  loading: () => (
    <div className="skeleton flex h-full w-full items-center justify-center rounded-2xl text-sm text-muted">
      지도 불러오는 중…
    </div>
  ),
});

export function Map(props: MapProps) {
  return (
    <div
      className={
        "overflow-hidden rounded-2xl border border-border " +
        (props.className ?? "")
      }
      style={{ height: "100%", width: "100%" }}
    >
      <LeafletMap {...props} className="h-full w-full" />
    </div>
  );
}
